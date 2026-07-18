import type { RecommendedPlateRef } from '@/lib/food-compass/types';

/**
 * Domaine du Journal alimentaire (JA5-01 / LOT-02) — TypeScript pur.
 *
 * Aucune persistance, aucune route API, aucun composant UI, aucune dépendance
 * Prisma. Interdits de conception (JA-00/JA-0T) : aucune valeur
 * nutritionnelle, aucun score, aucune projection vers Q_ALI_01/Q_ALI_02,
 * aucun mécanisme de rappel.
 */

export const VERSION_SCHEMA_FOOD_OBSERVATION = 'ja-domaine-v1' as const;
export const VERSION_REGISTRE_FRICTIONS = 'frictions-v1' as const;
export const VERSION_REGISTRE_MARQUEURS = 'marqueurs-ja-v1' as const;

/** Régimes de l'épisode (A7-11 amendé, adaptation du 2026-07-16). */
export type EpisodeRegime = 'calibrage' | 'essai' | 'silence';

/** Statut de vie de l'épisode ; la suspension est un geste sans justification (JA-00 A4). */
export type EpisodeStatut = 'prepare' | 'actif' | 'suspendu' | 'clos';

/** Issues d'une trace d'essai (amendement terrain n° 1) — l'adaptation et l'oubli sont des données, pas des échecs. */
export type TraceIssue = 'fait' | 'adapte' | 'partiel_empeche' | 'oublie_non_note';

/** Codes du registre de frictions v1 (JA-00 A2). Évolution par ajout uniquement. */
export type FrictionCode = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8';

/** Moments approximatifs d'une prise (marqueur structurel, JA-00 A1 — jamais d'heure exacte exigée). */
export type MomentPrise = 'matin' | 'midi' | 'soir' | 'hors_repas';

/** Étapes de la carrière d'action à travers les tours (A7-14). */
export type ActionCareerStage =
  | 'proposee'
  | 'essayee'
  | 'adaptee'
  | 'stabilisee'
  | 'integree'
  | 'abandonnee_informative';

/** Cycle du retour de décision au patient : court, concret, jamais automatique. */
export type DecisionFeedbackStage = 'relu' | 'valide' | 'envoye';

/**
 * Budget d'attention par épisode (amendement terrain n° 3) : borné 2 à 7
 * traces/semaine, jamais quotidien par défaut.
 */
export type AttentionBudget = {
  tracesParSemaine: number;
};

/** Action d'un essai, avec ses trois versions (idéale / simple / secours). */
export type TrialAction = {
  actionId: string;
  /** Libellé patient en français ; vocabulaire « essai », jamais « prescription » (R4). */
  labelPatient: string;
  idealPlan: string;
  simplePlan: string;
  secoursPlan?: string;
  /** Référence C5B optionnelle ; son absence conserve la compatibilité JA V1. */
  recommendedPlateRef?: RecommendedPlateRef;
};

/** Contenu du régime essai : hypothèse + action versionnée. */
export type EssaiRegimeContent = {
  regime: 'essai';
  hypothese: string;
  action: TrialAction;
};

/**
 * Contenu du régime calibrage (JA-00 A5 §12.2) : les trois questions du
 * bilan, sans seuil ni score.
 */
export type CalibrageRegimeContent = {
  regime: 'calibrage';
  questionsBilan: {
    structureDesPrises: true;
    regulariteHoraires: true;
    presenceMarqueursPertinents: true;
  };
  /** Marqueurs pertinents pour le besoin travaillé (sous-ensemble du registre A1). */
  marqueursPertinents: string[];
};

/**
 * Régime silence (protocole d'abstention) : aucune observation prescrite,
 * l'épisode n'existe que comme ancre de conversation.
 */
export type SilenceRegimeContent = {
  regime: 'silence';
  observationPrescrite: false;
};

export type RegimeContent = EssaiRegimeContent | CalibrageRegimeContent | SilenceRegimeContent;

export type FoodObservationEpisode = {
  episodeId: string;
  patientId: string;
  startDate: string;
  endDate: string;
  statut: EpisodeStatut;
  content: RegimeContent;
  budget: AttentionBudget;
  schemaVersion: typeof VERSION_SCHEMA_FOOD_OBSERVATION;
  frictionsVersion: typeof VERSION_REGISTRE_FRICTIONS;
};

/**
 * Trace d'essai — boucle courte à trois questions et quatre issues.
 * Le mot libre est court et toujours optionnel (jamais de texte long
 * obligatoire).
 */
export type TrialTrace = {
  traceId: string;
  episodeId: string;
  localDate: string;
  /** L'occasion s'est-elle présentée ? */
  occasionPresentee: boolean;
  /** Était-ce faisable ? (sans objet si l'occasion ne s'est pas présentée) */
  faisable: boolean | null;
  /** Qu'est-ce qui a compté ? — issue à quatre valeurs. */
  issue: TraceIssue;
  frictionCode?: FrictionCode;
  motLibre?: string;
  frictionsVersion: typeof VERSION_REGISTRE_FRICTIONS;
};

/**
 * Événement déclaré par le patient : « je n'ai pas pu cette semaine ».
 * Distinct de l'absence simple de trace (état neutre, amendement n° 2).
 * Motif optionnel en catégories fermées.
 */
export type PatientPauseEvent = {
  eventId: string;
  episodeId: string;
  semaineDu: string;
  motifCode?: FrictionCode;
};

/** Carrière d'une action à travers les tours (objet longitudinal, A7-14). */
export type ActionCareer = {
  careerId: string;
  actionId: string;
  patientId: string;
  stage: ActionCareerStage;
  /** Historique append-only des étapes traversées. */
  historique: Array<{ stage: ActionCareerStage; at: string }>;
};

/** Question du jour compilée : le praticien prépare, le patient répond. */
export type DailyQuestion = {
  questionId: string;
  episodeId: string;
  localDate: string;
  /** Question préparée par le praticien, en français. */
  questionPraticien: string;
  /** Réponse patient, optionnelle — l'absence de réponse est neutre. */
  reponsePatient?: string;
};

/**
 * Plan minimal (D7) : activation libre pour 1, 3 ou 7 jours, sans
 * justification. Le praticien voit uniquement le statut et la période.
 */
export type MinimalPlanEvent = {
  eventId: string;
  episodeId: string;
  from: string;
  dureeJours: 1 | 3 | 7;
  activatedBy: 'patient' | 'praticien';
  rationaleRequired: false;
};

/** Constats directs d'adhésion (D8) — observables non agrégés, jamais de cause inférée. */
export type DirectFindingCode =
  | 'absence_de_trace'
  | 'absence_d_occasion'
  | 'plan_minimal_actif'
  | 'action_declaree_impossible';

export type DirectFinding = {
  code: DirectFindingCode;
  /** Description factuelle en français, formulation neutre. */
  description: string;
};

/**
 * Quatre lectures jamais fusionnées (A7-11) :
 * déclaré / observé / vécu / interprété.
 */
export type FourReadings = {
  declare: string[];
  observe: string[];
  vecu: string[];
  interprete: string[];
};

/**
 * Profil observationnel issu du calibrage (JA-00 A5) : annexe éclairante du
 * ClinicalSnapshot, non scorée, jamais bloquante ni concluante seule.
 */
export type DietaryObservationProfile = {
  profileId: string;
  episodeId: string;
  /** Structure des prises : nombre et moments sur la journée. */
  nombrePrisesParJour: number;
  momentsObserves: MomentPrise[];
  /** Régularité et variabilité des horaires — description qualitative. */
  regulariteHoraires: string;
  /** Présence des marqueurs pertinents (libellés du registre A1, sans code Ciqual). */
  marqueursPresents: string[];
  /** Charge supportable déclarée : calibre le budget du régime essai. */
  chargeSupportableTracesParSemaine: number;
  /** Invariant : ce profil ne conclut jamais seul. */
  conclusionCliniqueAutonome: false;
};

/**
 * Delta de décision instrumenté (A7-14) : ce que les traces ont changé dans
 * une décision. Description courte et concrète.
 */
export type DecisionDelta = {
  deltaId: string;
  episodeId: string;
  decisionRef: string;
  /** Ce que les notes ont changé — court et concret (enseignement 5 JA-0T). */
  description: string;
  traceIds: string[];
};

/** Retour de décision au patient, cycle strictement ordonné relu → validé → envoyé. */
export type DecisionFeedback = {
  feedbackId: string;
  deltaId: string;
  stage: DecisionFeedbackStage;
  historique: Array<{ stage: DecisionFeedbackStage; at: string }>;
};

/**
 * Solution intra-épisode (D6) : « solution qui fonctionne pour moi », liée à
 * un contexte. Jamais transformée automatiquement en recommandation active ;
 * persistance inter-épisodes gatée par IDP (hors périmètre).
 */
export type IntraEpisodeSolution = {
  solutionId: string;
  episodeId: string;
  labelPatient: string;
  contexte: string;
};
