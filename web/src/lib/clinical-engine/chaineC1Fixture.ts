import { PRIORITY_RULES_METADATA } from '@/lib/clinical/priorityRulesV1';
import { confirmAssessmentEpisode } from './assessmentEpisode';
import { construireChaineC1, type ChaineC1 } from './chaineC1';
import {
  DATE_RIDEAU_FIXTURE,
  PLAINTES_DIGESTIF_ET_PONDERAL,
  reponsesRuntimeRideauT0,
} from './dossierT0Fixture';
import { adaptRuntimeInputs, proposeRuntimeEpisode } from './runtimeFromPrisma';
import type { ConfirmedAssessmentEpisode, DecisionPrioritySelection } from './types';

/**
 * UNE CHAÎNE C1 RÉELLE, pour les bancs des deux points de persistance
 * ([[D-054]], arbitrage 5).
 *
 * POURQUOI CE MODULE EXISTE. Les bancs de `protocoles` et `protocoles/versions`
 * postaient une carte de décision FORGÉE (`inputHash: 'HASH_DEC'`) — elle
 * passait, et c'était précisément le défaut que le recalcul serveur referme. Une
 * carte forgée ne peut plus servir de décor : les fixtures doivent désormais
 * porter une chaîne que le serveur sait reproduire.
 *
 * CE MODULE EST DE TEST, et il n'est importé que par des bancs qui doublent
 * `@/lib/prisma` : `construireChaineC1` tire `orientationService`, dont le module
 * instancie un client Prisma au chargement.
 */

/** Horodatage unique de la chaîne de référence — `asOf` et les deux `createdAt`. */
export const HORODATAGE_C1_FIXTURE = '2026-01-03T00:00:00.000Z';

/** Date de signature SIMULÉE : ISO canonique, comme la vraie devra l'être. */
// ALIGNÉE SUR LA DATE RÉELLEMENT LIVRÉE (finding F4) : la table est signée au
// 2026-08-15 ([[D-061]]), et une date simulée différente faisait produire aux
// bancs une chaîne qu'aucune production ne sert — trois empreintes divergentes
// de celles du dossier réel, pour la seule raison que la date entre dans
// `validation.validatedAt`.
export const DATE_SIGNATURE_SIMULEE = '2026-08-15T00:00:00.000Z';

/**
 * Anamnèse de la chaîne de référence — patient fictif autorisé, aucun contenu
 * réel. Elle sert aux DEUX lectures : les préconditions T0 exigent un motif
 * principal, le recalcul serveur reconstruit `patientContext` à partir d'elle.
 */
export const ANAMNESE_C1_FIXTURE = {
  anamnese: {
    motif_principal: 'Ballonnements et prise de poids depuis un an.',
    objectif_prioritaire: 'Retrouver un confort digestif',
  },
};

/**
 * Le candidat de rang 1 sur le dossier de référence : la plainte dominante est
 * le surpoids (9/10), et c'est donc la règle pondérale qui remonte. Écrit ici
 * plutôt que dérivé, pour que le banc de sélection dise ce qu'il sélectionne.
 */
export const CANDIDAT_RANG_1 = 'priority:PRIO-PON-01';
export const CANDIDAT_RANG_2 = 'priority:PRIO-DIG-01';

/**
 * CE MODULE NE S'EXÉCUTE QUE SOUS VITEST, et le garde est ici plutôt que dans un
 * commentaire.
 *
 * Il expose une fonction qui OUVRE LE VERROU d'une table clinique. Écrite dans
 * `src/`, elle est importable par n'importe quel module de production — et son
 * nom invite précisément à s'en servir pour « activer la fonctionnalité ». La
 * signature d'une table est un ACTE PRATICIEN posé dans le dépôt, jamais un
 * appel de fonction ; ce garde rend l'usage détourné impossible plutôt
 * qu'improbable.
 */
function assertBanc(): void {
  if (process.env.VITEST !== 'true') {
    throw new Error(
      'chaineC1Fixture est un module de banc : la signature d’une table clinique est un acte praticien, pas un appel de fonction.',
    );
  }
}

// LA TABLE EST SIGNÉE DEPUIS LE 2026-08-15 ([[D-061]]). Ces helpers ont donc
// changé de sens : `signerTablePriorites` ne fait plus que forcer une date de
// signature simulée (la table l'est déjà), et le besoin réel du banc est
// désormais l'inverse — simuler le verrou FERMÉ. `retablirTablePriorites`
// restaure l'état LIVRÉ, qui est aujourd'hui l'état signé : l'écrire en dur à
// `false` rendrait l'isolation des bancs mensongère.
//
// COPIE GELÉE, et ce n'est pas cosmétique (finding F3 de la revue du
// 2026-08-16) : cet objet est la référence que TOUS les `afterEach` restaurent.
// Non gelé, un banc pouvait y écrire — par mégarde ou en croyant « ajuster
// l'état livré » — et graver un faux état livré que chaque restauration aurait
// ensuite propagé à tous les cas suivants. La capture, elle, reste celle du
// PREMIER import : ce module doit être importé avant toute simulation de verrou.
const ETAT_LIVRE = Object.freeze({
  validationExterne: PRIORITY_RULES_METADATA.validationExterne,
  dateValidation: PRIORITY_RULES_METADATA.dateValidation,
});

/** Force la signature (date simulée) — `beforeEach` d'un banc qui l'exige. */
export function signerTablePriorites(): void {
  assertBanc();
  PRIORITY_RULES_METADATA.validationExterne = true;
  PRIORITY_RULES_METADATA.dateValidation = DATE_SIGNATURE_SIMULEE;
}

/** Simule le verrou FERMÉ — le cas qui n'est plus celui de la production. */
export function designerTablePriorites(): void {
  assertBanc();
  PRIORITY_RULES_METADATA.validationExterne = false;
  PRIORITY_RULES_METADATA.dateValidation = null;
}

/** Restaure l'état LIVRÉ, quel qu'il soit — `afterEach` obligatoire. */
export function retablirTablePriorites(): void {
  // MÊME GARDE QUE SES DEUX VOISINES (finding F2) : elle écrit elle aussi dans
  // la métadonnée d'une table clinique, et son nom la rend d'autant plus
  // appelable depuis un module de production.
  assertBanc();
  PRIORITY_RULES_METADATA.validationExterne = ETAT_LIVRE.validationExterne;
  PRIORITY_RULES_METADATA.dateValidation = ETAT_LIVRE.dateValidation;
}

/**
 * Les passations du dossier de référence, sous la forme que lisent les DEUX
 * requêtes des routes (préconditions T0 et recalcul C1). Les champs
 * supplémentaires (`idReponse`) sont inertes pour la première.
 */
export function passationsC1Fixture() {
  return reponsesRuntimeRideauT0(DATE_RIDEAU_FIXTURE, PLAINTES_DIGESTIF_ET_PONDERAL);
}

export type ChaineC1Fixture = ChaineC1 & { episode: ConfirmedAssessmentEpisode };

/**
 * La chaîne C1 du dossier de référence, telle que le serveur la recalculera.
 *
 * `selection` est le geste praticien : `null` reproduit la sortie du cockpit
 * (aucune priorité sélectionnée), un candidat produit une carte sur laquelle un
 * protocole peut être construit. La table doit être SIGNÉE au moment de l'appel
 * ET au moment de la requête — sans quoi le recalcul rendrait une autre carte.
 */
export function chaineC1DeReference(options: {
  idPatient?: string;
  selection?: string | null;
  /**
   * Épisode de remplacement — contournement tracé, jalon de suivi, variante.
   *
   * L'ÉPISODE ENTRE DANS LES TROIS EMPREINTES : un banc qui retoucherait
   * l'épisode soumis sans reconstruire la carte obtiendrait 409, et lirait ce
   * refus comme une régression alors qu'il décrit exactement ce que la garde
   * existe pour faire.
   */
  episode?: ConfirmedAssessmentEpisode;
} = {}): ChaineC1Fixture {
  assertBanc();
  const idPatient = options.idPatient ?? 'PAT_1';
  const inputs = adaptRuntimeInputs(
    { idPatient, createdAt: DATE_RIDEAU_FIXTURE },
    passationsC1Fixture(),
    ANAMNESE_C1_FIXTURE,
  );
  const { proposal } = proposeRuntimeEpisode(inputs, 'T0');
  const episode = options.episode ?? confirmAssessmentEpisode(
    proposal,
    proposal.inWindowResponseIds,
    HORODATAGE_C1_FIXTURE,
  );
  const selectionPraticien: DecisionPrioritySelection | null = options.selection
    ? {
        candidateId: options.selection,
        selectedAt: HORODATAGE_C1_FIXTURE,
        selectedBy: 'practitioner',
        rationale: 'Sélection praticien de fixture, sans portée clinique.',
      }
    : null;
  return {
    episode,
    ...construireChaineC1({
      snapshotId: 'runtime-snapshot-T0-fixture',
      reviewId: 'runtime-review-T0-fixture',
      decisionCardId: 'runtime-decision-T0-fixture',
      patientId: idPatient,
      horodatage: HORODATAGE_C1_FIXTURE,
      episode,
      patientContext: inputs.patientContext,
      responses: inputs.responses,
      selectionPraticien,
    }),
  };
}
