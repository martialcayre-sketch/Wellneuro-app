import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { isCbPropositionEnabled } from './featureFlag';
import { scoresRecalculesPourRaisonnement } from '@/lib/clinical/orientationService';
import type { ReponseOrientation } from '@/lib/clinical/orientationEngine';
import type { OrientationClaimRef } from '@/lib/clinical/orientationRulesV1';
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_V1,
  GRILLES_INDICATIONS,
} from './indicationsBiologieV1';
import { SOURCE_NABM } from './catalogue';
import { deriverRemboursement, type CorrespondanceNabm, type Remboursement } from './remboursable';
import { deriverStatutsBiologie, STATUTS_PROPOSES } from './statuts';
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
  /**
   * Analyses des lignes proposées dont personne n'a encore tranché le
   * remboursement ([[D-316]] §4) : ni correspondance signée, ni constat
   * valable au millésime courant. Absente quand il n'en reste aucune.
   */
  | { type: 'remboursement_non_evalue'; analytes: string[] }
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
 * Analytes du catalogue : validation médicale ET remboursement, en une lecture.
 *
 * Le remboursement n'est PAS calculé ici : `deriverRemboursement`
 * (`remboursable.ts`) l'est une seule fois, et la fiche d'analyte de la
 * Bibliothèque (`catalogue.ts`) le lit déjà de la même façon — correspondances
 * signées vers un acte actif du millésime courant, sinon constat « aucun
 * acte » du millésime courant ([[D-316]] §1, lettre f). Les actes ne sont
 * chargés que pour les codes signés : sans pointeur ni signature, la requête
 * ne part pas.
 */
async function chargerAnalytes(): Promise<{
  validationMedicale: Set<string>;
  remboursements: Map<string, Remboursement>;
}> {
  const [analytes, pointeurNabm] = await Promise.all([
    prisma.biologyAnalyte.findMany({
      select: {
        code: true,
        validationMedicaleRequise: true,
        correspondancesNabm: { select: { codeActe: true, nature: true, verifiePar: true } },
        constatNabm: { select: { millesime: true } },
      },
    }),
    prisma.biologyCatalogVersionCourante.findUnique({
      where: { sourceProvenance: SOURCE_NABM },
      select: { versionSource: true },
    }),
  ]);

  const codesActes = [
    ...new Set(
      analytes.flatMap(a =>
        a.correspondancesNabm.filter(c => c.verifiePar !== null).map(c => c.codeActe),
      ),
    ),
  ];
  const actesCourants =
    pointeurNabm && codesActes.length > 0
      ? await prisma.biologyNabmActe.findMany({
          where: { versionSource: pointeurNabm.versionSource, codeActe: { in: codesActes } },
          select: {
            codeActe: true,
            inactif: true,
            ententePrealable: true,
            acteReserve: true,
            remboursementTotal: true,
          },
        })
      : [];

  const millesimeCourant = pointeurNabm?.versionSource ?? null;
  return {
    validationMedicale: new Set(
      analytes.filter(a => a.validationMedicaleRequise).map(a => a.code),
    ),
    remboursements: new Map(
      analytes.map(a => [
        a.code,
        deriverRemboursement(a.correspondancesNabm as CorrespondanceNabm[], actesCourants, {
          constat: a.constatNabm,
          millesimeCourant,
        }),
      ]),
    ),
  };
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

  const [catalogue, documentes, reponses, consultation, analytes] = await Promise.all([
    chargerPanels(),
    chargerDocumentes(idPatient),
    chargerReponses(idPatient),
    // La consultation VALIDÉE la plus récente qui porte une anamnèse —
    // sélection partagée depuis [[D-101]] (`consultationPorteuse.ts`), la même
    // que l'orientation, les contradictions, la synthèse et la chaîne C1.
    prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      select: { anamnese: true },
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
    }),
    chargerAnalytes(),
  ]);

  const proposition = deriverStatutsBiologie({
    panels: catalogue.panels,
    // VERBATIM — voir l'en-tête de ce module.
    regles: INDICATIONS_BIOLOGIE_V1,
    // Second terme du périmètre signé depuis le 2026-09-13 : les grilles que les
    // zones couleur de ces règles lisent. Verbatim pour la même raison.
    grilles: GRILLES_INDICATIONS,
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
    validationMedicale: analytes.validationMedicale,
    // Passé depuis la lettre f ([[D-316]] §1) : les correspondances sont
    // signées une à une par le responsable (M-3, G-3) et les constats « aucun
    // acte » journalisés (M-3c). Une analyse que personne n'a tranchée reste
    // `non_evalue` — la dérivation le rend elle-même, la carte n'invente rien.
    remboursements: analytes.remboursements,
    dateReference,
  });

  if (!proposition.ok) return { ok: false, motif: proposition.motif };

  const limites: LimiteProposition[] = [];
  // Les analyses des lignes PROPOSÉES seulement — celles qui partent au
  // courrier et au document patient. Dédupliquées PAR CODE, comme les mentions
  // des documents (`mentionsRemboursement`) : une analyse présente dans deux
  // bilans proposés ne se dit qu'une fois, et deux analyses de même libellé
  // restent deux.
  const nonEvaluees = [
    ...new Map(
      proposition.lignes
        .filter(ligne => STATUTS_PROPOSES.has(ligne.statut))
        .flatMap(ligne => ligne.analytes)
        .filter(analyte => analyte.remboursement.statut === 'non_evalue')
        .map(analyte => [analyte.code, analyte.libelle] as const),
    ).values(),
  ];
  if (nonEvaluees.length > 0) {
    limites.push({ type: 'remboursement_non_evalue', analytes: nonEvaluees });
  }
  if (proposition.declarationsIgnoreesHorsProposition.length > 0) {
    limites.push({
      type: 'declaration_ecartee_hors_proposition',
      motifs: proposition.declarationsIgnoreesHorsProposition.map(d => d.motif),
    });
  }
  return { ok: true, proposition, limites };
}

/**
 * Les claims que la proposition de bilan de ce dossier CITE — [[D-103]].
 *
 * Sert de déclencheur au moteur de conflits de sources : un conflit déclaré
 * n'atteint le praticien que si l'un de ses deux claims est cité par une sortie
 * de ce dossier. Sans cette liste, le registre resterait un document.
 *
 * TOUTES LES LIGNES COMPTENT, y compris `non_indique_actuellement` et
 * `deja_documente`. L'arbitrage n'allait pas de soi : on pourrait ne retenir
 * que les lignes qui proposent quelque chose. Mais chaque ligne est AFFICHÉE
 * avec ses claims, et le praticien peut agir sur n'importe laquelle ; taire un
 * conflit parce que la ligne qui cite le claim ne recommande rien reviendrait à
 * supprimer une divergence en silence, ce que `DC-30` refuse. Le sur-ensemble
 * est le côté sûr.
 *
 * DÉDUPLIQUÉ SUR LA PAIRE `(claimId, versionClaim)` : les quatre règles de
 * répétition annuelle citent toutes `WN-CL-0312-018`, et un conflit déclaré ne
 * doit pas être constaté quatre fois.
 *
 * Proposition indisponible — drapeau éteint, table non signée, catalogue vide —
 * ⇒ liste vide. Aucun claim n'est cité, donc aucun conflit ne pèse : c'est
 * exact, pas un repli.
 */
export async function claimsCitesParLaPropositionBilan(
  idPatient: string,
  dateReference: string,
): Promise<OrientationClaimRef[]> {
  const resultat = await deriverPropositionPourPatient(idPatient, dateReference);
  if (!resultat.ok) return [];

  const vus = new Map<string, OrientationClaimRef>();
  for (const ligne of resultat.proposition.lignes) {
    for (const claim of ligne.justificationClaims) {
      vus.set(`${claim.claimId}@${claim.versionClaim}`, claim);
    }
  }
  return [...vus.values()];
}
