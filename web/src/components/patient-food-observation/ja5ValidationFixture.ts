import type {
  DailyQuestion,
  FoodObservationEpisode,
} from '@/lib/food-observation';

export const JA5_VALIDATION_PATIENT = {
  patientId: 'patient-fictif-sophie-nicola',
  displayName: 'Sophie Nicola',
} as const;

export const JA5_VALIDATION_EPISODE: FoodObservationEpisode = {
  episodeId: 'ja5-02-episode-fictif',
  patientId: JA5_VALIDATION_PATIENT.patientId,
  startDate: '2026-07-13',
  endDate: '2026-08-02',
  statut: 'actif',
  content: {
    regime: 'essai',
    hypothese: 'Un déjeuner simple préparé à l’avance pourrait être plus facile les jours chargés.',
    action: {
      actionId: 'ja5-02-action-fictive',
      labelPatient: 'Préparer une base simple pour le déjeuner',
      idealPlan: 'Préparer le déjeuner complet la veille.',
      simplePlan: 'Préparer seulement une base à compléter au moment du repas.',
      secoursPlan: 'Choisir une option simple déjà disponible.',
    },
  },
  budget: { tracesParSemaine: 3 },
  schemaVersion: 'ja-domaine-v1',
  frictionsVersion: 'frictions-v1',
};

export const JA5_VALIDATION_SILENCE_EPISODE: FoodObservationEpisode = {
  ...JA5_VALIDATION_EPISODE,
  episodeId: 'ja5-02-silence-fictif',
  content: { regime: 'silence', observationPrescrite: false },
};

export const JA5_VALIDATION_DAILY_QUESTION: DailyQuestion = {
  questionId: 'ja5-02-question-fictive',
  episodeId: JA5_VALIDATION_EPISODE.episodeId,
  localDate: '2026-07-17',
  questionPraticien: 'Qu’est-ce qui a rendu ce déjeuner plus simple aujourd’hui ?',
};

