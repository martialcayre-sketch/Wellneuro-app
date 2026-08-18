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
  /**
   * Déclarations écartées par le moteur qu'AUCUNE ligne ne porte — panel
   * inactif, ou visé par aucune règle exploitable. Le moteur les remonte ;
   * l'écran les dit. Sans ce relais, elles disparaîtraient de la proposition
   * ET de l'écran (`DC-30`).
   */
  | { type: 'declaration_ecartee_hors_proposition'; motifs: string[] };

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
async function chargerPanels(): Promise<{ panels: PanelCatalogue[] }> {
  const lignes = await prisma.biologyPanel.findMany({
    select: {
      code: true,
      libelle: true,
      niveau: true,
      objectif: true,
      actif: true,
      items: {
        select: {
          analyte: { select: { code: true, libelle: true } },
          ratio: { select: { code: true, libelle: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });

  // Un item de panel porte SOIT un analyte SOIT un ratio (CHECK
  // `cible_unique`). Les deux sont composés ([[D-072]]) : écarter les ratios
  // affichait une composition amputée de ce que le bilan contient réellement.
  const panels = lignes.map(panel => ({
    code: panel.code,
    libelle: panel.libelle,
    niveau: panel.niveau,
    objectif: panel.objectif,
    actif: panel.actif,
    analytes: panel.items
      .map(item => item.analyte)
      .filter((analyte): analyte is { code: string; libelle: string } => analyte !== null),
    ratios: panel.items
      .map(item => item.ratio)
      .filter((ratio): ratio is { code: string; libelle: string } => ratio !== null),
  }));
  return { panels };
}

/**
 * Panels déclarés documentés hors outil, passés TELS QUELS au moteur.
 *
 * Le tri des déclarations douteuses — date illisible, date postérieure à la
 * référence — appartient au MOTEUR depuis [[D-072]], et à lui seul : une règle
 * clinique recopiée dans deux modules est une règle qu'on peut oublier de
 * corriger dans l'un des deux. Le moteur écarte, et le dit sur la ligne du
 * panel concerné.
 */
async function chargerDocumentes(idPatient: string): Promise<PanelDocumente[]> {
  const lignes = await prisma.panelBiologieDocumente.findMany({
    where: { idPatient },
    select: { panelCode: true, documenteLe: true },
  });
  return lignes.map(ligne => ({
    panelCode: ligne.panelCode,
    documenteLe: ligne.documenteLe.toISOString(),
  }));
}

/**
 * Passations du dossier, au même recalcul que le moteur d'orientation.
 *
 * NE PAS passer par `evaluerOrientationPourPatient` : ce service est gaté par
 * `WN_ENABLE_ORIENTATION_NNPP2`, et la proposition biologie deviendrait muette
 * pour une raison étrangère à la biologie. Seul
 * `scoresRecalculesPourRaisonnement` est réutilisé — c'est précisément pour
 * cela qu'il est exporté.
 *
 * LA RAISON D'ORIGINE DISAIT « drapeau non posé en production » : c'était FAUX
 * ([[D-074]], constat du 2026-08-18 — le panneau sert des recommandations,
 * donc le verrou est ouvert). Le découplage reste juste, mais il vaut par
 * l'indépendance des deux surfaces, jamais par l'état d'un drapeau : un état
 * qui bascule ne peut pas fonder une décision de conception.
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
    chargerDocumentes(idPatient),
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
    documentes,
    validationMedicale: new Set(analytesValidation.map(analyte => analyte.code)),
    // `remboursements` N'EST PAS PASSÉ, et la raison est plus précise que
    // « les tables NABM sont vides » — elles ne le sont pas : la nomenclature
    // porte 987 actes (lecture MCP du 2026-08-18). Ce qui est VIDE, c'est
    // `biology_analyte_nabm`, l'appariement analyte ↔ acte, que le schéma
    // exige MANUEL et SIGNÉ (jamais par rapprochement de libellés : le filtre
    // de la source rend des faux négatifs silencieux). Sans lui, rien ne
    // résout un analyte vers un acte. Le moteur pose déjà `non_evalue` par
    // défaut ; construire une carte de `non_evalue` reviendrait à affirmer
    // qu'on a évalué et conclu à rien.
    dateReference,
  });

  if (!proposition.ok) return { ok: false, motif: proposition.motif };

  const limites: LimiteProposition[] = [{ type: 'remboursement_non_evalue' }];
  if (proposition.declarationsIgnoreesHorsProposition.length > 0) {
    limites.push({
      type: 'declaration_ecartee_hors_proposition',
      motifs: proposition.declarationsIgnoreesHorsProposition.map(d => d.motif),
    });
  }
  return { ok: true, proposition, limites };
}
