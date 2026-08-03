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
  /** Slug canonique, stable et signable — l'identifiant que le code manipule. */
  id: PackId;
  /**
   * L'`id_pack` de la table `packs` quand le pack existe RÉELLEMENT en base,
   * `null` sinon.
   *
   * Ce champ existe parce que les deux espaces de noms sont disjoints : le code
   * dit `pack_socle_initial_neuronutrition`, la base dit `PACK_SOCLE_INIT`. Sans
   * traduction, un `Set.has()` entre les deux ne rend jamais rien — c'est ce qui
   * rendait le moteur d'orientation structurellement incapable de désigner un
   * pack (LOT-03, campagne du 2026-08-03).
   *
   * `null` n'est pas un trou à combler : il dit que le pack n'existe pas en base,
   * donc qu'il n'est pas assignable, donc que le moteur ne doit pas le proposer.
   */
  idPackBase: string | null;
  /**
   * Axe du registre des sources d'intervention NNPP2
   * (`docs/claude/corpus/nnpp2_interventions_registry.json`, LOT-00), ou `null`
   * quand aucun axe ne correspond. C'est le lien entre un pack et la doctrine
   * qui le motive.
   */
  axeId: string | null;
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

// Registre de DOCTRINE. Il décrit l'identité d'un pack — son slug canonique, le
// pack de base auquel il correspond, l'axe d'intervention qui le motive. Il ne
// décrit PAS sa composition : celle-ci vit dans `packs.qids` et fait foi
// (arbitrage du 2026-08-03, option C). Recopier ici les questionnaires d'un pack
// créerait une redondance qui dérive ; en inventer pour un pack qui n'existe pas
// serait un acte clinique.
//
// `idPackBase` renseigné = le pack existe en base et peut être proposé.
// `idPackBase: null` = déclaré en doctrine, jamais créé en base, donc non
// assignable — vérifié en production le 2026-08-03 (8 packs en base, dont 2
// créés par le praticien et volontairement absents d'ici).
//
// Trois points relevés à la revue du 2026-08-03, tranchés ici :
// - `PACK_HUMEUR_NEURO` est `actif: false` en base. Sa correspondance reste
//   déclarée : elle dit « ce pack EST ce pack », pas « ce pack est
//   disponible ». La disponibilité se lit sur `actif`, que la route filtre déjà.
// - `axeId: null` sur le socle et le cardio-métabolique n'est pas un oubli :
//   rattacher un pack à un axe d'intervention est un acte clinique, et aucun
//   axe ne s'impose pour un socle d'entrée ni pour un pack transverse. À
//   renseigner par le praticien, pas à deviner.
// - Le praticien peut éditer les `qids` d'un pack de doctrine. C'est assumé :
//   `packs.qids` fait foi (option C). Le registre décrit l'identité du pack,
//   jamais son contenu.
export const PACKS_REGISTRY: PackRegistryItem[] = [
  { id: 'pack_socle_initial_neuronutrition', idPackBase: 'PACK_SOCLE_INIT', axeId: null, titre: 'Socle initial neuronutrition', niveau: 'socle', phase: 'mvp' },
  { id: 'pack_stress_chronique_burnout', idPackBase: 'PACK_STRESS_BURNOUT', axeId: 'stress-burnout', titre: 'Stress chronique et burnout', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_sommeil_chronobiologie', idPackBase: 'PACK_SOMMEIL_CHRONO', axeId: 'sommeil-chronobiologie', titre: 'Sommeil et chronobiologie', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_humeur_motivation_neurochimie', idPackBase: 'PACK_HUMEUR_NEURO', axeId: 'humeur', titre: 'Humeur, motivation et neurochimie', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_hyperexcitabilite_magnesienne', idPackBase: null, axeId: null, titre: 'Hyperexcitabilite et terrain magnesien', niveau: 'approfondissement', phase: 'phase_2' },
  { id: 'pack_fibromyalgie_douleurs_nociplastiques', idPackBase: null, axeId: 'douleurs-chroniques', titre: 'Fibromyalgie et douleurs nociplastiques', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_migraine_cephalees', idPackBase: null, axeId: 'douleurs-chroniques', titre: 'Migraine et cephalees', niveau: 'approfondissement', phase: 'phase_2' },
  { id: 'pack_digestif_intestin_cerveau', idPackBase: 'PACK_DIGESTIF_INTESTIN', axeId: 'intestin-cerveau', titre: 'Digestif et intestin-cerveau', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_cardio_metabolique_poids_inflammation', idPackBase: 'PACK_CARDIO_METABO', axeId: null, titre: 'Cardio-metabolique, poids et inflammation', niveau: 'approfondissement', phase: 'mvp' },
  { id: 'pack_addictions_compulsions_tca', idPackBase: null, axeId: 'cas-complexes', titre: 'Addictions, compulsions et TCA', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_tabacologie_officinale', idPackBase: null, axeId: 'cas-complexes', titre: 'Tabacologie officinale', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_cognition_vieillissement_aidants', idPackBase: null, axeId: 'cognition-memoire', titre: 'Cognition, vieillissement et aidants', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_respiratoire_apnee_bpco', idPackBase: null, axeId: null, titre: 'Respiratoire, apnee et BPCO', niveau: 'approfondissement', phase: 'phase_2' },
  { id: 'pack_oncologie_soins_support', idPackBase: null, axeId: null, titre: 'Oncologie et soins de support', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_pediatrie_neurodeveloppement_oralite', idPackBase: null, axeId: null, titre: 'Pediatrie, neurodeveloppement et oralite', niveau: 'specialise', phase: 'phase_2' },
  { id: 'pack_urologie_hormonal_qualite_de_vie', idPackBase: null, axeId: null, titre: 'Urologie, hormonal et qualite de vie', niveau: 'approfondissement', phase: 'phase_2' },
];

// Traduction base → code. C'est la pièce qui manquait : sans elle, comparer un
// `id_pack` de la base à un `PackId` du code ne rend jamais rien.
const PACK_ID_PAR_ID_BASE: ReadonlyMap<string, PackId> = new Map(
  PACKS_REGISTRY.filter(pack => pack.idPackBase !== null).map(pack => [pack.idPackBase as string, pack.id]),
);

/**
 * Le `PackId` de doctrine correspondant à un `id_pack` de la table `packs`, ou
 * `null` si ce pack n'est pas un pack de doctrine (pack créé par le praticien,
 * par exemple). Un `null` n'est pas une erreur : il dit « hors doctrine », et
 * l'appelant doit alors s'abstenir plutôt que deviner.
 */
export function packIdDepuisIdBase(idPackBase: string): PackId | null {
  return PACK_ID_PAR_ID_BASE.get(idPackBase) ?? null;
}

/** L'entrée de doctrine d'un `id_pack` de base, ou `null` hors doctrine. */
export function packDoctrineDepuisIdBase(idPackBase: string): PackRegistryItem | null {
  const packId = packIdDepuisIdBase(idPackBase);
  if (packId === null) return null;
  return PACKS_REGISTRY.find(pack => pack.id === packId) ?? null;
}

/**
 * Traduction doctrine → base : l'`id_pack` à passer à `/api/praticien/packs/assign`,
 * ou `null` si le pack n'existe pas en base.
 *
 * Sans elle, une recommandation d'orientation serait un cul-de-sac : elle
 * désigne un `PackId`, alors que le seul point d'assignation cherche un
 * `id_pack`. Livrer la traduction dans un seul sens en corrigeant un défaut de
 * traduction reporterait la moitié du défaut.
 */
export function idBaseDepuisPackId(packId: PackId): string | null {
  return PACKS_REGISTRY.find(pack => pack.id === packId)?.idPackBase ?? null;
}

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

// Exporté pour que le banc puisse ITÉRER dessus au lieu d'en recopier les clés :
// un test qui redéclare sa source ne la garde pas — une 11e entrée fautive
// resterait verte.
export const QUESTIONNAIRE_OVERRIDES: Record<string, Partial<QuestionnaireFunctionalMetadata>> = {
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
