import { confirmAssessmentEpisode, proposeAssessmentEpisode } from './assessmentEpisode';
import { buildClinicalReview } from './clinicalReview';
import { buildClinicalSnapshot } from './clinicalSnapshot';
import { buildDecisionCard } from './decisionCard';
import type {
  ClinicalReview,
  ClinicalSnapshot,
  DecisionCard,
  QuestionnaireResponseInput,
  ValidatedClinicalRuleRef,
} from './types';

// Harnais de validation ergonomique C1 (grille
// docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/GRILLE_VALIDATION_ERGONOMIQUE_C1.md).
//
// Le cockpit patient reste câblé sur `null` tant que le gate SP-RUN n'est pas
// levé ; or la grille exige une fixture C1 préparée pour être exécutée. Ce
// module casse cette dépendance circulaire : il alimente le cockpit de la
// fiche patient avec une chaîne C1 complète, 100 % fictive, construite par les
// usines réelles du moteur clinique (mêmes validations, mêmes hashes).
//
// Double verrou, jamais actif en production :
// 1. `estModeValidationErgoActif` n'accepte que NODE_ENV=development ET le
//    paramètre d'URL explicite `?validationErgo=c1` ;
// 2. `buildValidationErgoC1Fixture` refuse de construire quoi que ce soit si
//    NODE_ENV=production.
// Aucune donnée n'est lue ni écrite : tout reste local à la page.

export type ValidationErgoC1Fixture = {
  snapshot: ClinicalSnapshot;
  review: ClinicalReview;
  decisionCard: DecisionCard;
};

/**
 * Le mode validation ergonomique n'est actif qu'en développement local avec le
 * paramètre d'URL explicite `?validationErgo=c1`. Toute autre combinaison
 * (production, préproduction, paramètre absent, répété ou différent) le laisse
 * inactif — le cockpit garde alors son câblage `null` actuel.
 */
export function estModeValidationErgoActif(
  nodeEnv: string | undefined,
  paramValue: string | string[] | undefined,
): boolean {
  return nodeEnv === 'development' && paramValue === 'c1';
}

const MENTION_FICTIVE = 'Contenu fictif — harnais de validation ergonomique C1, sans portée clinique.';

// Horodatages ISO canoniques figés : la fixture est déterministe, ses hashes
// aussi — deux chargements de la page produisent exactement les mêmes objets.
const T_OBSERVED = '2026-07-01T08:00:00.000Z';
const T_CONFIRMED = '2026-07-02T08:00:00.000Z';
const T_REVIEW = '2026-07-03T08:00:00.000Z';
const T_DECISION = '2026-07-04T08:00:00.000Z';

const RESPONSE_ID = 'ergo-reponse-1';

// Réponse questionnaire calculable par le scoring réel (même forme que la
// fixture technique de c1Flow.test.ts).
const RESPONSE: QuestionnaireResponseInput = {
  responseId: RESPONSE_ID,
  questionnaireId: 'Q_SOM_06',
  observedAt: T_OBSERVED,
  scoreVersion: 'fixture-ergo-v1',
  scoresJson: { rawAnswers: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' } },
};

const RULE: ValidatedClinicalRuleRef = {
  ruleId: 'RULE_VALIDATION_ERGO_C1',
  version: 'fixture-ergo-v1',
  lifecycle: 'clinically_validated',
  validation: {
    validatedAt: T_OBSERVED,
    validatorRole: 'practitioner',
    sourceReference: 'harnais-validation-ergonomique-sans-portee-clinique',
  },
};

/**
 * Construit la chaîne C1 fictive complète (snapshot → revue → carte de
 * décision) destinée aux Épreuves 1 et 2 de la grille. Le ProtocolDraft n'est
 * pas pré-construit : c'est précisément le geste que l'Épreuve 2 mesure, via
 * le ProtocolMiniBuilder.
 */
export function buildValidationErgoC1Fixture(): ValidationErgoC1Fixture {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le harnais de validation ergonomique C1 est interdit en production.');
  }

  const proposal = proposeAssessmentEpisode({
    assessmentEpisodeId: 'ergo-episode-1',
    patientId: 'ergo-patient-fictif',
    milestone: 'T0',
    targetAt: T_OBSERVED,
    responses: [RESPONSE],
  });
  const episode = confirmAssessmentEpisode(proposal, [RESPONSE_ID], T_CONFIRMED);

  const snapshot = buildClinicalSnapshot({
    snapshotId: 'ergo-snapshot-1',
    patientId: 'ergo-patient-fictif',
    asOf: T_CONFIRMED,
    assessmentEpisode: episode,
    responses: [RESPONSE],
    patientContext: {
      mainReason: 'Fatigue en fin de journée malgré des nuits complètes (contenu fictif).',
      priorityGoal: 'Retrouver une énergie stable sur la journée (contenu fictif).',
      expectations: ['Des actions simples à tenir sur 21 jours (contenu fictif).'],
      constraints: ['Déjeuners souvent pris en déplacement (contenu fictif).'],
    },
  });

  const review = buildClinicalReview({
    reviewId: 'ergo-review-1',
    createdAt: T_REVIEW,
    snapshot,
    rules: [RULE],
    findings: {
      abstention: { status: 'not_required', ruleIds: [RULE.ruleId], limitations: [] },
      missingData: [{
        findingId: 'ergo-manque-1',
        kind: 'missing_data',
        confidence: 'probable',
        priority: 'critical_for_decision',
        ruleId: RULE.ruleId,
        uncertaintyExplanation: 'Le contenu et l’horaire du repas du soir ne sont pas documentés.',
        potentialDecisionImpact: 'Sans cette information, l’arbitrage entre stabilité des repas et routine du soir reste incertain.',
        provenance: { responseIds: [RESPONSE_ID], needIds: [], clinicalObjectCodes: [] },
        limitations: [MENTION_FICTIVE],
      }],
      discordances: [{
        findingId: 'ergo-discordance-1',
        kind: 'discordance',
        audience: 'practitioner_only',
        interpretation: 'point_to_explore',
        confidence: 'fragile',
        ruleId: RULE.ruleId,
        signal: 'Le sommeil déclaré satisfaisant contraste avec la fatigue rapportée en journée.',
        questionToExplore: 'Comment se déroulent les 30 dernières minutes avant le coucher ?',
        possibleProtocolImpact: 'Pourrait déplacer l’action prioritaire vers une routine d’apaisement.',
        provenance: { responseIds: [RESPONSE_ID], needIds: [], clinicalObjectCodes: [] },
        limitations: [MENTION_FICTIVE],
      }],
    },
  });

  const decisionCard = buildDecisionCard({
    decisionCardId: 'ergo-decision-1',
    createdAt: T_DECISION,
    snapshot,
    review,
    candidates: [
      {
        candidateId: 'ergo-priorite-1',
        origin: 'engine',
        label: 'Stabiliser le rythme des repas sur la journée',
        rank: 1,
        confidence: 'probable',
        ruleId: RULE.ruleId,
        rationale: 'Priorité fictive préparée pour la grille de validation ergonomique.',
        provenance: { responseIds: [RESPONSE_ID], needIds: [], clinicalObjectCodes: [] },
        limitations: [MENTION_FICTIVE],
      },
      {
        candidateId: 'ergo-priorite-2',
        origin: 'engine',
        label: 'Consolider la routine d’endormissement',
        rank: 2,
        confidence: 'fragile',
        ruleId: RULE.ruleId,
        rationale: 'Alternative fictive préparée pour la grille de validation ergonomique.',
        provenance: { responseIds: [RESPONSE_ID], needIds: [], clinicalObjectCodes: [] },
        limitations: [MENTION_FICTIVE],
      },
    ],
    proposedMainPriorityId: 'ergo-priorite-1',
    selectedMainPriority: {
      candidateId: 'ergo-priorite-1',
      selectedAt: T_DECISION,
      selectedBy: 'practitioner',
      rationale: 'Sélection fictive préparée pour la grille de validation ergonomique.',
    },
    counterfactuals: [{
      counterfactualId: 'ergo-contrefactuel-1',
      candidateId: 'ergo-priorite-2',
      condition: 'Si un journal de sommeil confirmait des réveils systématiques en seconde partie de nuit.',
      expectedImpact: 'La priorité basculerait vers la consolidation de la routine d’endormissement.',
      provenance: { responseIds: [RESPONSE_ID], needIds: [], clinicalObjectCodes: [] },
      limitations: [MENTION_FICTIVE],
    }],
  });

  return { snapshot, review, decisionCard };
}
