import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { isCbPropositionEnabled } from './featureFlag';
import { scoresRecalculesPourRaisonnement } from '@/lib/clinical/orientationService';
import type { ReponseOrientation } from '@/lib/clinical/orientationEngine';
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_V1,
} from './indicationsBiologieV1';
import { deriverStatutsBiologie } from './statuts';
import type { PanelCatalogue, PanelDocumente, PropositionBilan } from './statuts';

// Premier appelant de production de `deriverStatutsBiologie` ([[D-071]] §4).
//
// CE MODULE NE FAIT PAS : ni authentification, ni contrôle d'appartenance, ni
// journalisation d'accès. L'appelant en est responsable — même partage des
// rôles que `orientationService`. Il vit en `lib/` et non dans la route parce
// qu'un `route.ts` Next ne peut pas exporter de valeur, et parce que le moteur
// importe `createHash` : l'évaluation reste SERVEUR, seul le résultat traverse
// la frontière HTTP, jamais la table de règles.
//
// CONTRAT M-B — la table canonique et sa signature sont passées VERBATIM, deux
// imports et zéro transformation. Le verrou hache `entree.regles` tel qu'il
// arrive : un `filter`, un `sort`, un `map` ou un aller-retour JSON fermerait
// le verrou EN PERMANENCE sous un motif qui ment sur la cause. `sort()` sans
// copie serait pire — la table n'est ni `readonly` ni gelée, l'export serait
// empoisonné pour tout le processus Node.

/**
 * Ce que l'écran doit dire à voix haute, en plus des lignes. Une limite tue
 * n'est pas une limite : `DC-25` demande de réduire la conclusion, pas de la
 * présenter comme entière.
 */
export type LimiteProposition =
  | { type: 'remboursement_non_evalue' }
  | { type: 'items_ratio_ignores'; panels: string[] }
  | { type: 'declaration_ecartee'; panels: string[] };

export type ResultatProposition =
  | { ok: false; motif: string }
  | { ok: true; proposition: Extract<PropositionBilan, { ok: true }>; limites: LimiteProposition[] };

/**
 * Composition des panels, lue du catalogue publié.
 *
 * `actif` n'est PAS filtré côté SQL : le moteur refuse lui-même un catalogue
 * sans panel actif, avec un motif propre. Filtrer ici rendrait ce fail-closed
 * indiscernable d'une requête vide.
 */
async function chargerPanels(): Promise<{ panels: PanelCatalogue[]; panelsAvecRatio: string[] }> {
  const lignes = await prisma.biologyPanel.findMany({
    select: {
      code: true,
      libelle: true,
      niveau: true,
      objectif: true,
      actif: true,
      items: {
        select: {
          ratioCode: true,
          analyte: { select: { code: true, libelle: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });

  // `PanelCatalogue.analytes` ne connaît que les analytes ; un item de panel
  // porte SOIT un analyte SOIT un ratio (CHECK `cible_unique`). Les items
  // ratio sont donc écartés de la composition — et DITS, jamais laissés
  // tomber en silence : une composition amputée sans trace est un mensonge
  // discret sur ce que le bilan contient.
  const panelsAvecRatio: string[] = [];
  const panels = lignes.map(panel => {
    if (panel.items.some(item => item.ratioCode !== null)) panelsAvecRatio.push(panel.code);
    return {
      code: panel.code,
      libelle: panel.libelle,
      niveau: panel.niveau,
      objectif: panel.objectif,
      actif: panel.actif,
      analytes: panel.items
        .map(item => item.analyte)
        .filter((analyte): analyte is { code: string; libelle: string } => analyte !== null),
    };
  });
  return { panels, panelsAvecRatio };
}

/**
 * Panels déclarés documentés hors outil.
 *
 * DEUX REPLIS FAIL-OPEN DU MOTEUR SONT FERMÉS ICI ([[D-071]] §2 bis). Une date
 * illisible comme une date postérieure à la référence font conclure
 * `deja_documente` au moteur — donc RETIRENT le panel des propositions. Une
 * donnée aberrante produirait ainsi la conclusion rassurante, ce que `DC-24`
 * et `DC-25` refusent. Une déclaration douteuse est donc ÉCARTÉE (le panel
 * repasse au régime normal, il sera proposé) et SIGNALÉE à l'écran.
 *
 * Le sens du repli n'est pas arbitraire : écarter propose un bilan de trop,
 * garder en tairait un. Entre les deux, `DC-25` tranche pour la conclusion la
 * plus réduite.
 */
async function chargerDocumentes(
  idPatient: string,
  dateReference: string,
): Promise<{ documentes: PanelDocumente[]; ecartes: string[] }> {
  const lignes = await prisma.panelBiologieDocumente.findMany({
    where: { idPatient },
    select: { panelCode: true, documenteLe: true },
  });

  const reference = Date.parse(dateReference);
  const documentes: PanelDocumente[] = [];
  const ecartes: string[] = [];
  for (const ligne of lignes) {
    const documenteLe = ligne.documenteLe.getTime();
    if (Number.isNaN(documenteLe) || Number.isNaN(reference) || documenteLe > reference) {
      ecartes.push(ligne.panelCode);
      continue;
    }
    documentes.push({
      panelCode: ligne.panelCode,
      documenteLe: ligne.documenteLe.toISOString(),
    });
  }
  return { documentes, ecartes };
}

/**
 * Passations du dossier, au même recalcul que le moteur d'orientation.
 *
 * NE PAS passer par `evaluerOrientationPourPatient` : ce service est gaté par
 * `WN_ENABLE_ORIENTATION_NNPP2`, non posé en production. La proposition
 * biologie deviendrait muette pour une raison étrangère à la biologie. Seul
 * `scoresRecalculesPourRaisonnement` est réutilisé — c'est précisément pour
 * cela qu'il est exporté.
 */
async function chargerReponses(idPatient: string): Promise<ReponseOrientation[]> {
  const lignes = await prisma.questionnaireReponse.findMany({
    where: { idPatient },
    select: {
      idReponse: true,
      idQuestionnaire: true,
      dateReponse: true,
      scoresJson: true,
      statutValidite: true,
    },
    orderBy: { dateReponse: 'desc' },
  });

  return lignes.map(ligne => ({
    idReponse: ligne.idReponse,
    idQuestionnaire: ligne.idQuestionnaire,
    dateReponse: ligne.dateReponse.toISOString(),
    scores: scoresRecalculesPourRaisonnement(
      ligne.idQuestionnaire,
      ligne.scoresJson as Record<string, unknown> | null,
      ligne.dateReponse,
      ligne.statutValidite,
    ),
    statutValidite: ligne.statutValidite,
  }));
}

/**
 * Dérive la proposition de bilan du dossier déjà stocké.
 *
 * Ne propose que des EXPLORATIONS : aucune assignation, aucune prescription,
 * aucun envoi. L'appelant est responsable d'avoir vérifié que ce praticien a
 * le droit de lire ce patient.
 *
 * `dateReference` est fournie par l'appelant, jamais lue de l'horloge ici —
 * même discipline que le moteur, qui juge les répétitions sur elle.
 */
export async function deriverPropositionPourPatient(
  idPatient: string,
  dateReference: string,
): Promise<ResultatProposition> {
  // Le verrou est re-vérifié ICI même si la route l'a déjà consulté, au patron
  // exact d'`evaluerOrientationPourPatient` : c'est ce qui garantit qu'aucun
  // FUTUR appelant — courrier médecin, carte de Fil — ne puisse lire le
  // dossier à travers ce module et en dériver une sortie clinique sans que le
  // drapeau soit passé. La lecture Prisma est en aval de ce test, jamais en
  // amont.
  if (!isCbPropositionEnabled()) {
    return {
      ok: false,
      motif: 'La proposition de bilan biologique n’est pas activée sur cet environnement.',
    };
  }

  const [catalogue, documentes, reponses, consultation, analytesValidation] = await Promise.all([
    chargerPanels(),
    chargerDocumentes(idPatient, dateReference),
    chargerReponses(idPatient),
    // La consultation la plus récente QUI PORTE UNE ANAMNÈSE, et non la plus
    // récente tout court : une consultation naît sans anamnèse et ne la reçoit
    // qu'à la validation du patient. Même sélection qu'`orientationService`.
    prisma.consultation.findFirst({
      where: { idPatient, NOT: { anamnese: { equals: Prisma.DbNull } } },
      select: { anamnese: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.biologyAnalyte.findMany({
      where: { validationMedicaleRequise: true },
      select: { code: true },
    }),
  ]);

  const proposition = deriverStatutsBiologie({
    panels: catalogue.panels,
    // VERBATIM — voir l'en-tête de ce module.
    regles: INDICATIONS_BIOLOGIE_V1,
    signature: INDICATIONS_BIOLOGIE_METADATA,
    reponses,
    // Aucune consultation, ou aucune anamnèse : on ne passe RIEN plutôt qu'un
    // objet aux drapeaux vides. Le moteur distingue les deux — des drapeaux
    // absents n'atteignent aucun déclencheur, alors que des drapeaux vides
    // affirmeraient que le patient n'a rien déclaré.
    drapeaux: consultation?.anamnese == null
      ? undefined
      : extraireDrapeauxAnamnese(consultation.anamnese),
    documentes: documentes.documentes,
    validationMedicale: new Set(analytesValidation.map(analyte => analyte.code)),
    // `remboursements` N'EST PAS PASSÉ : les tables NABM sont vides, et le
    // moteur pose déjà `non_evalue` par défaut. Construire une carte de
    // `non_evalue` reviendrait à affirmer qu'on a évalué et conclu à rien.
    dateReference,
  });

  if (!proposition.ok) return { ok: false, motif: proposition.motif };

  const limites: LimiteProposition[] = [{ type: 'remboursement_non_evalue' }];
  if (catalogue.panelsAvecRatio.length > 0) {
    limites.push({ type: 'items_ratio_ignores', panels: catalogue.panelsAvecRatio });
  }
  if (documentes.ecartes.length > 0) {
    limites.push({ type: 'declaration_ecartee', panels: documentes.ecartes });
  }
  return { ok: true, proposition, limites };
}
