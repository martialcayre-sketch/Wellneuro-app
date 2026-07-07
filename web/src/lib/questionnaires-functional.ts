import type { QuestionnaireCatalogEntry } from '@/lib/questionnaires-catalog';

export type FunctionalCategoryId =
  | 'socle_clinique_initial'
  | 'mode_de_vie_et_rythmes'
  | 'stress_allostasie_burnout'
  | 'sommeil_chronobiologie'
  | 'neurochimie_humeur_motivation'
  | 'hyperexcitabilite_magnesienne'
  | 'douleur_nociplastique_migraine'
  | 'cognition_neurodegeneratif_aidants'
  | 'addictions_compulsions_tca'
  | 'digestif_intestin_cerveau'
  | 'cardio_metabolique_inflammation'
  | 'respiratoire_apnee_bpco'
  | 'urologie_hormonal'
  | 'oncologie_soins_support'
  | 'pediatrie_neurodeveloppement';

export type PackId =
  | 'pack_socle_initial_neuronutrition'
  | 'pack_stress_chronique_burnout'
  | 'pack_sommeil_chronobiologie'
  | 'pack_humeur_motivation_neurochimie'
  | 'pack_hyperexcitabilite_magnesienne'
  | 'pack_fibromyalgie_douleurs_nociplastiques'
  | 'pack_migraine_cephalees'
  | 'pack_digestif_intestin_cerveau'
  | 'pack_cardio_metabolique_poids_inflammation'
  | 'pack_addictions_compulsions_tca'
  | 'pack_tabacologie_officinale'
  | 'pack_cognition_vieillissement_aidants'
  | 'pack_respiratoire_apnee_bpco'
  | 'pack_oncologie_soins_support'
  | 'pack_pediatrie_neurodeveloppement_oralite'
  | 'pack_urologie_hormonal_qualite_de_vie';

type RolloutPhase = 'mvp' | 'phase_2';

export type FunctionalCategory = {
  id: FunctionalCategoryId;
  titre: string;
  phase: RolloutPhase;
};

export type PackRegistryItem = {
  id: PackId;
  titre: string;
  niveau: 'socle' | 'approfondissement' | 'specialise';
  phase: RolloutPhase;
};

export type QuestionnaireFunctionalMetadata = {
  categoriePrincipale: FunctionalCategoryId;
  categoriesSecondaires: FunctionalCategoryId[];
  packsRecommandes: PackId[];
  phase: RolloutPhase;
};

// V1: registre fonctionnel prêt pour brancher l'UI sans casser les catégories
// historiques utilisées en production.
export const FUNCTIONAL_CATEGORIES: FunctionalCategory[] = [
  { id: 'socle_clinique_initial', titre: 'Socle clinique initial', phase: 'mvp' },
  { id: 'mode_de_vie_et_rythmes', titre: 'Mode de vie et rythmes', phase: 'mvp' },
  { id: 'stress_allostasie_burnout', titre: 'Stress, allostasie et burnout', phase: 'mvp' },
  { id: 'sommeil_chronobiologie', titre: 'Sommeil et chronobiologie', phase: 'mvp' },
  { id: 'neurochimie_humeur_motivation', titre: 'Neurochimie, humeur et motivation', phase: 'mvp' },
  { id: 'hyperexcitabilite_magnesienne', titre: 'Hyperexcitabilite magnesienne', phase: 'phase_2' },
  { id: 'douleur_nociplastique_migraine', titre: 'Douleur nociplastique et migraine', phase: 'phase_2' },
  { id: 'cognition_neurodegeneratif_aidants', titre: 'Cognition, neurodegeneratif et aidants', phase: 'phase_2' },
  { id: 'addictions_compulsions_tca', titre: 'Addictions, compulsions et TCA', phase: 'phase_2' },
  { id: 'digestif_intestin_cerveau', titre: 'Digestif et intestin-cerveau', phase: 'mvp' },
  { id: 'cardio_metabolique_inflammation', titre: 'Cardio-metabolique et inflammation', phase: 'mvp' },
  { id: 'respiratoire_apnee_bpco', titre: 'Respiratoire, apnee et BPCO', phase: 'phase_2' },
  { id: 'urologie_hormonal', titre: 'Urologie et hormonal', phase: 'phase_2' },
  { id: 'oncologie_soins_support', titre: 'Oncologie et soins de support', phase: 'phase_2' },
  { id: 'pediatrie_neurodeveloppement', titre: 'Pediatrie et neurodeveloppement', phase: 'phase_2' },
];

const FUNCTIONAL_CATEGORY_BY_ID = new Map(FUNCTIONAL_CATEGORIES.map(c => [c.id, c]));

export const PACKS_REGISTRY: PackRegistryItem[] = [
  { id: 'pack_socle_initial_neuronutrition', titre: 'Socle initial neuronutrition', niveau: 'socle', phase: 'mvp' },
  { id: 'pack_stress_chronique_burnout', titre: 'Stress chronique et burnout', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_sommeil_chronobiologie', titre: 'Sommeil et chronobiologie', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_humeur_motivation_neurochimie', titre: 'Humeur, motivation et neurochimie', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_hyperexcitabilite_magnesienne', titre: 'Hyperexcitabilite et terrain magnesien', niveau: 'approfondissement', phase: 'phase_2' },
  { id: 'pack_fibromyalgie_douleurs_nociplastiques', titre: 'Fibromyalgie et douleurs nociplastiques', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_migraine_cephalees', titre: 'Migraine et cephalees', niveau: 'approfondissement', phase: 'phase_2' },
  { id: 'pack_digestif_intestin_cerveau', titre: 'Digestif et intestin-cerveau', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_cardio_metabolique_poids_inflammation', titre: 'Cardio-metabolique, poids et inflammation', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_addictions_compulsions_tca', titre: 'Addictions, compulsions et TCA', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_tabacologie_officinale', titre: 'Tabacologie officinale', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_cognition_vieillissement_aidants', titre: 'Cognition, vieillissement et aidants', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_respiratoire_apnee_bpco', titre: 'Respiratoire, apnee et BPCO', niveau: 'approfondissement', phase: 'phase_2' },
  { id: 'pack_oncologie_soins_support', titre: 'Oncologie et soins de support', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_pediatrie_neurodeveloppement_oralite', titre: 'Pediatrie, neurodeveloppement et oralite', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_urologie_hormonal_qualite_de_vie', titre: 'Urologie, hormonal et qualite de vie', niveau: 'approfondissement', phase: 'phase_2' },
];

type LegacyCategory = QuestionnaireCatalogEntry['categorie'];

const LEGACY_CATEGORY_MAP: Record<LegacyCategory, FunctionalCategoryId> = {
  Plaintes: 'socle_clinique_initial',
  Alimentaire: 'mode_de_vie_et_rythmes',
  Fibromyalgie: 'douleur_nociplastique_migraine',
  'Gastro-entérologie': 'digestif_intestin_cerveau',
  Gérontologie: 'cognition_neurodegeneratif_aidants',
  'Mode de vie': 'mode_de_vie_et_rythmes',
  'Neuro-psychologie': 'neurochimie_humeur_motivation',
  Cardiologie: 'cardio_metabolique_inflammation',
  Tabacologie: 'addictions_compulsions_tca',
  Pneumologie: 'respiratoire_apnee_bpco',
  Urologie: 'urologie_hormonal',
  Pédiatrie: 'pediatrie_neurodeveloppement',
  Rhumatologie: 'hyperexcitabilite_magnesienne',
  Sommeil: 'sommeil_chronobiologie',
  Stress: 'stress_allostasie_burnout',
  Cancérologie: 'oncologie_soins_support',
};

const QUESTIONNAIRE_OVERRIDES: Record<string, Partial<QuestionnaireFunctionalMetadata>> = {
  Q_PLAINTES: {
    categoriePrincipale: 'socle_clinique_initial',
    packsRecommandes: ['pack_socle_initial_neuronutrition'],
    phase: 'mvp',
  },
  Q_MOD_01: {
    categoriePrincipale: 'mode_de_vie_et_rythmes',
    categoriesSecondaires: ['socle_clinique_initial', 'cardio_metabolique_inflammation'],
    packsRecommandes: ['pack_socle_initial_neuronutrition', 'pack_cardio_metabolique_poids_inflammation'],
    phase: 'mvp',
  },
  Q_ALI_01: {
    categoriePrincipale: 'mode_de_vie_et_rythmes',
    categoriesSecondaires: ['socle_clinique_initial', 'digestif_intestin_cerveau'],
    packsRecommandes: ['pack_socle_initial_neuronutrition', 'pack_digestif_intestin_cerveau'],
    phase: 'mvp',
  },
  Q_INF_03: {
    categoriePrincipale: 'neurochimie_humeur_motivation',
    categoriesSecondaires: ['stress_allostasie_burnout', 'sommeil_chronobiologie'],
    packsRecommandes: [
      'pack_socle_initial_neuronutrition',
      'pack_stress_chronique_burnout',
      'pack_sommeil_chronobiologie',
      'pack_humeur_motivation_neurochimie',
    ],
    phase: 'mvp',
  },
  Q_STR_02: {
    categoriePrincipale: 'stress_allostasie_burnout',
    categoriesSecondaires: ['sommeil_chronobiologie'],
    packsRecommandes: ['pack_socle_initial_neuronutrition', 'pack_stress_chronique_burnout'],
    phase: 'mvp',
  },
  Q_SOM_01: {
    categoriePrincipale: 'sommeil_chronobiologie',
    categoriesSecondaires: ['socle_clinique_initial', 'stress_allostasie_burnout'],
    packsRecommandes: ['pack_socle_initial_neuronutrition', 'pack_sommeil_chronobiologie'],
    phase: 'mvp',
  },
  Q_GAS_01: {
    categoriePrincipale: 'digestif_intestin_cerveau',
    categoriesSecondaires: ['socle_clinique_initial'],
    packsRecommandes: ['pack_socle_initial_neuronutrition', 'pack_digestif_intestin_cerveau'],
    phase: 'mvp',
  },
  Q_CAR_01: {
    categoriePrincipale: 'cardio_metabolique_inflammation',
    categoriesSecondaires: ['mode_de_vie_et_rythmes'],
    packsRecommandes: ['pack_cardio_metabolique_poids_inflammation'],
    phase: 'mvp',
  },
  Q_NEU_11: {
    categoriePrincipale: 'neurochimie_humeur_motivation',
    categoriesSecondaires: ['stress_allostasie_burnout', 'sommeil_chronobiologie'],
    packsRecommandes: ['pack_socle_initial_neuronutrition', 'pack_humeur_motivation_neurochimie'],
    phase: 'mvp',
  },
  Q_NEU_12: {
    categoriePrincipale: 'neurochimie_humeur_motivation',
    categoriesSecondaires: ['sommeil_chronobiologie'],
    packsRecommandes: ['pack_humeur_motivation_neurochimie', 'pack_sommeil_chronobiologie'],
    phase: 'phase_2',
  },
};

function phaseParCategorie(categorie: FunctionalCategoryId): RolloutPhase {
  const found = FUNCTIONAL_CATEGORIES.find(c => c.id === categorie);
  return found?.phase ?? 'phase_2';
}

export function getQuestionnaireFunctionalMetadata(
  idQuestionnaire: string,
  legacyCategory: LegacyCategory,
): QuestionnaireFunctionalMetadata {
  const categorieParDefaut = LEGACY_CATEGORY_MAP[legacyCategory] ?? 'socle_clinique_initial';
  const override = QUESTIONNAIRE_OVERRIDES[idQuestionnaire];
  const categoriePrincipale = override?.categoriePrincipale ?? categorieParDefaut;

  return {
    categoriePrincipale,
    categoriesSecondaires: override?.categoriesSecondaires ?? [],
    packsRecommandes: override?.packsRecommandes ?? [],
    phase: override?.phase ?? phaseParCategorie(categoriePrincipale),
  };
}

export function getFunctionalCategoryLabel(id: string): string {
  return FUNCTIONAL_CATEGORY_BY_ID.get(id as FunctionalCategoryId)?.titre ?? id;
}

export function getFunctionalCategoryPhase(id: string): RolloutPhase {
  return FUNCTIONAL_CATEGORY_BY_ID.get(id as FunctionalCategoryId)?.phase ?? 'phase_2';
}
