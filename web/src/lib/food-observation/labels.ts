import type {
  ActionCareerStage,
  DecisionFeedbackStage,
  DirectFindingCode,
  EpisodeRegime,
  EpisodeStatut,
  TraceIssue,
} from './types';

/**
 * Vocabulaire UI du Journal alimentaire, en français.
 * Vocabulaire patient acté : « essai » ; « recommandation » — jamais
 * « prescription » (R4), jamais « jumeau » (D11).
 */

// « Mon carnet alimentaire » depuis SP-CONV LOT-05 (réouverture d'A7, décision
// utilisateur du 2026-07-22) : « Spirale » est réservée à la trajectoire
// globale du parcours — la marque du produit n'appartient pas à un sous-module.
export const LABEL_INSTRUMENT_PATIENT = 'Mon carnet alimentaire';
export const LABEL_INSTRUMENT_PRATICIEN = 'Trajectoire alimentaire';

export const LABELS_REGIME: Record<EpisodeRegime, string> = {
  calibrage: 'Bilan de calibrage',
  essai: 'Essai en cours',
  silence: 'Période sans observation',
};

export const LABELS_STATUT: Record<EpisodeStatut, string> = {
  prepare: 'Préparé',
  actif: 'Actif',
  suspendu: 'Suspendu',
  clos: 'Clos',
};

/** Les quatre issues d'une trace — l'adaptation et l'oubli sont des données, pas des échecs. */
export const LABELS_ISSUE_TRACE: Record<TraceIssue, string> = {
  fait: 'Je l’ai fait',
  adapte: 'J’ai adapté',
  partiel_empeche: 'En partie, ou empêché·e',
  oublie_non_note: 'Oublié ou pas noté',
};

export const LABELS_CARRIERE_ACTION: Record<ActionCareerStage, string> = {
  proposee: 'Proposée',
  essayee: 'Essayée',
  adaptee: 'Adaptée',
  stabilisee: 'Stabilisée',
  integree: 'Intégrée',
  abandonnee_informative: 'Mise de côté (information utile)',
};

export const LABELS_RETOUR_DECISION: Record<DecisionFeedbackStage, string> = {
  relu: 'Relu',
  valide: 'Validé',
  envoye: 'Envoyé',
};

/** Constats directs (D8) — formulations neutres, jamais de cause inférée. */
export const LABELS_CONSTATS_DIRECTS: Record<DirectFindingCode, string> = {
  absence_de_trace: 'Aucune trace sur la période',
  absence_d_occasion: 'L’occasion ne s’est pas présentée',
  plan_minimal_actif: 'Plan minimal actif',
  action_declaree_impossible: 'Action déclarée impossible',
};

/** Terme acté pour toute action proposée au patient (R4). */
export const LABEL_RECOMMANDATION = 'recommandation';

/** Silence utile explicite côté patient (droit au silence, JA-0T 5/5). */
export const MESSAGE_SILENCE_UTILE = 'Rien à noter aujourd’hui, nous en savons assez.';

/** Déclaration patient distincte de l'absence simple de trace. */
export const LABEL_PAUSE_PATIENT = 'Je n’ai pas pu cette semaine';
