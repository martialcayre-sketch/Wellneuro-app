import type { BesoinDefinition, SourceQuestionnaire, StrateCode } from './types';

// Cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md — méthodologie actée pour
// l'indicateur "Mon équilibre" (patient) / "Cartographie neuro-fonctionnelle"
// (praticien). Un changement de valeur ici (poids, seuils, mapping) doit
// s'accompagner d'un bump de VERSION_SCORE_EQUILIBRE.
export const VERSION_SCORE_EQUILIBRE = 'v1' as const;

export const POIDS_STRATE: Record<StrateCode, number> = {
  CORPS: 0.6,
  ANCRAGE: 0.2,
  ESPRIT: 0.2,
};

// 12 besoins fondamentaux, docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md.
export const BESOINS: BesoinDefinition[] = [
  { id: 1, libellePatient: "L'équilibre de votre assiette", libellePraticien: 'Équilibre de l’assiette', pilier: 1, strate: 'CORPS' },
  { id: 2, libellePatient: 'Vos micronutriments essentiels', libellePraticien: 'Micronutriments essentiels', pilier: 1, strate: 'CORPS' },
  { id: 3, libellePatient: 'Votre rythme alimentaire', libellePraticien: 'Rythme alimentaire (chronobiologie)', pilier: 1, strate: 'CORPS' },
  { id: 4, libellePatient: 'Votre confort corporel', libellePraticien: 'Perception et sensations corporelles', pilier: 2, strate: 'CORPS' },
  { id: 5, libellePatient: 'Votre mouvement et votre repos', libellePraticien: 'Mouvement, fonctions corporelles et repos', pilier: 2, strate: 'CORPS' },
  { id: 6, libellePatient: 'Votre respiration', libellePraticien: 'Besoin de respirer (oxygénation)', pilier: 2, strate: 'CORPS' },
  { id: 7, libellePatient: 'Vos sensations favorables', libellePraticien: 'Sensations favorables (cinq sens)', pilier: 3, strate: 'ANCRAGE' },
  { id: 8, libellePatient: 'Vos sensations plaisantes', libellePraticien: 'Sensations plaisantes (anhédonie)', pilier: 3, strate: 'ANCRAGE' },
  { id: 9, libellePatient: 'Votre gestion du stress', libellePraticien: 'Sensations-émotions fondamentales (stress)', pilier: 3, strate: 'ANCRAGE' },
  { id: 10, libellePatient: 'Vos pensées', libellePraticien: 'Pensées fonctionnelles, positives et stables', pilier: 4, strate: 'ESPRIT' },
  { id: 11, libellePatient: 'Votre sens et vos valeurs', libellePraticien: 'Besoins de sens et de valeurs', pilier: 4, strate: 'ESPRIT' },
  { id: 12, libellePatient: 'Votre lien aux autres', libellePraticien: 'Besoins de reliance', pilier: 4, strate: 'ESPRIT' },
];

// Fondations critiques (MON_EQUILIBRE_CONTEXTE.md §2) : sommeil effondré,
// carences objectivées, troubles digestifs/hyperexcitabilité, stress
// chronique, déséquilibre alimentaire — si l'une est effondrée, le score
// global est plafonné quel que soit le niveau des autres besoins/strates.
export const BESOINS_FONDATIONS_CRITIQUES = [1, 2, 4, 5, 9] as const;

// Calibrage v1 — seuil et plafond initiaux, à valider par le praticien et
// ajuster si besoin (bump de VERSION_SCORE_EQUILIBRE en cas de changement).
export const SEUIL_EFFONDREMENT = 0.34;
export const PLAFOND_FONDATION_CRITIQUE = 50;

// Mapping besoin → questionnaire(s) existants (web/src/lib/questions.ts).
// Besoins 3, 6, 7, 11 : aucun questionnaire disponible dans le catalogue
// actuel — non évaluables en v1 (retournent une couverture null), plutôt
// que d'inventer une source. Voir docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md
// pour la justification clinique de chaque source retenue.
export const BESOIN_SOURCES: Record<number, SourceQuestionnaire[]> = {
  1: [{ idQuestionnaire: 'Q_ALI_01', max: 42, inverser: false }],
  2: [{ idQuestionnaire: 'Q_SOM_06', max: 32, inverser: true }],
  3: [],
  4: [
    { idQuestionnaire: 'Q_GAS_01', max: 93, inverser: true },
    { idQuestionnaire: 'Q_INF_01', max: 96, inverser: true },
  ],
  5: [
    { idQuestionnaire: 'Q_SOM_01', max: 21, inverser: true },
    { idQuestionnaire: 'Q_MOD_01', sousScore: 'ACTIVITE_PHYSIQUE', max: 20, inverser: false },
  ],
  6: [],
  7: [],
  8: [{ idQuestionnaire: 'Q_NEU_11', sousScore: 'D', max: 21, inverser: true }],
  9: [
    { idQuestionnaire: 'Q_STR_01', max: 42, inverser: true },
    { idQuestionnaire: 'Q_STR_02', max: 40, inverser: true },
    { idQuestionnaire: 'Q_STR_03', max: 55, inverser: true },
  ],
  10: [
    { idQuestionnaire: 'Q_INF_03', sousScore: 'DA', max: 40, inverser: true },
    { idQuestionnaire: 'Q_INF_03', sousScore: 'NA', max: 40, inverser: true },
    { idQuestionnaire: 'Q_INF_03', sousScore: 'SE', max: 40, inverser: true },
  ],
  11: [],
  12: [{ idQuestionnaire: 'Q_INF_03', sousScore: 'ME', max: 40, inverser: true }],
};
