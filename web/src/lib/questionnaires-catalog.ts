// ═══════════════════════════════════════════════════════════════════════════════
// Catalogue des questionnaires assignables — métadonnées d'affichage
// ═══════════════════════════════════════════════════════════════════════════════
// Source de vérité de la liste proposée au praticien (id, titre affiché,
// catégorie, description patient, durée, actif). Ces métadonnées vivaient
// auparavant dans l'onglet Google Sheets « Questionnaires » (colonnes A–F),
// alimenté par la fonction `initCatalogue()` du code Google Apps Script archivé
// (`archive/gas-legacy/Code.gs`). Elles sont ici figées en code pour retirer la
// dépendance à l'API Google Sheets (lot E0).
//
// Le titre affiché ici peut différer du `titre` interne du catalogue de scoring
// (`web/src/lib/questions.ts`) : c'est volontaire, ce libellé est celui montré
// dans le sélecteur praticien.
//
// Note d'historique : certaines entrées héritées (`Q_SOM_08`, `Q_STR_07`) ont
// été remplacées dans le catalogue de scoring (respectivement par `Q_NEU_12` et
// `Q_NEU_11`). Elles restent exposées pour préserver la liste offerte en
// production, avec les catégories affichées selon le regroupement courant.
// Toute recuration relève d'une tâche clinique dédiée (documentation
// `CHANGELOG.md` requise).

export type QuestionnaireCatalogEntry = {
  id: string;
  titre: string;
  categorie: string;
  description: string;
  duree: string;
  actif: boolean;
};

export const QUESTIONNAIRES_CATALOG: QuestionnaireCatalogEntry[] = [
  // ── ALIMENTAIRE ─────────────────────────────────────────────────────────────
  { id: 'Q_ALI_01', titre: 'Questionnaire Alimentaire SIIN', categorie: 'Alimentaire',
    description: `Évaluez la qualité globale de votre alimentation : légumes, fruits, protéines, graisses, sucres et comportements alimentaires.`, duree: '15 min', actif: true },
  { id: 'Q_ALI_02', titre: 'Alimentation — Diète méditerranéenne SIIN', categorie: 'Alimentaire',
    description: `Évaluez votre adhérence au régime méditerranéen en 14 questions (score /14).`, duree: '10 min', actif: true },
  { id: 'Q_ALI_03', titre: 'Évaluation des apports caloriques et protéiques — Pr. L. Monnier', categorie: 'Alimentaire',
    description: `Estimez vos apports quotidiens en protéines et calories selon la méthode Monnier (repérage rapide validé).`, duree: '10 min', actif: true },

  // ── FIBROMYALGIE ────────────────────────────────────────────────────────────
  { id: 'Q_FIB_01', titre: 'FiRST — Dépistage de la fibromyalgie', categorie: 'Fibromyalgie',
    description: `Dépistage rapide de la fibromyalgie en 6 questions (sensibilité 90,5% pour score ≥ 5/6).`, duree: '3 min', actif: true },
  { id: 'Q_FIB_02', titre: `QIF — Questionnaire d'Impact de la Fibromyalgie`, categorie: 'Fibromyalgie',
    description: `Mesurez l'impact de la fibromyalgie sur vos activités quotidiennes, travail et qualité de vie.`, duree: '10 min', actif: true },
  { id: 'Q_FIB_03', titre: `ELFE — Liste Européenne d'évaluation de la Fibromyalgie`, categorie: 'Fibromyalgie',
    description: `Évaluation clinique approfondie des points douloureux fibromyalgiques (usage professionnel).`, duree: '20 min', actif: false },

  // ── GASTRO-ENTÉROLOGIE ──────────────────────────────────────────────────────
  { id: 'Q_GAS_01', titre: 'Troubles fonctionnels digestifs et intestinaux SIIN 2021', categorie: 'Gastro-entérologie',
    description: `Évaluation complète de vos troubles digestifs en 5 catégories (score /93).`, duree: '15 min', actif: true },
  { id: 'Q_GAS_02', titre: `Score de Francis — Syndrome de l'intestin irritable`, categorie: 'Gastro-entérologie',
    description: `Évaluez la sévérité du SII : douleurs, ballonnements, impact sur la vie quotidienne.`, duree: '10 min', actif: true },
  { id: 'Q_GAS_03', titre: 'Échelle de Bristol — Type de selles', categorie: 'Gastro-entérologie',
    description: `Identifiez votre type de transit intestinal selon les 7 types de la classification de Bristol.`, duree: '2 min', actif: true },

  // ── GÉRONTOLOGIE ────────────────────────────────────────────────────────────
  { id: 'Q_NEU_06', titre: 'MMT — Mini Mental Test SIIN', categorie: 'Gérontologie',
    description: `Dépistage des troubles cognitifs et mnésiques (10 questions, interprétation pour micronutrition).`, duree: '10 min', actif: true },
  { id: 'Q_NEU_09', titre: `Grille de Zarit — Fardeau de l'aidant`, categorie: 'Gérontologie',
    description: `Évaluez la charge globale des proches aidants (22 questions, score de léger à sévère).`, duree: '10 min', actif: true },

  // ── MODE DE VIE ─────────────────────────────────────────────────────────────
  { id: 'Q_MOD_01', titre: 'Questionnaire Mode de Vie SIIN', categorie: 'Mode de vie',
    description: `Évaluez vos habitudes de vie : activité physique, sédentarité, rythmes biologiques, stimulants et hydratation.`, duree: '10 min', actif: true },
  { id: 'Q_MOD_02', titre: 'Activité et dépense énergétique globale SIIN', categorie: 'Mode de vie',
    description: `Estimez votre dépense énergétique quotidienne (kcal/jour) selon votre niveau d'activité au travail et en dehors.`, duree: '5 min', actif: true },
  { id: 'Q_MOD_03', titre: 'Mes plaintes actuelles et troubles ressentis', categorie: 'Mode de vie',
    description: `Évaluez l'intensité actuelle de 7 plaintes : fatigue, douleurs, digestion, surpoids, insomnie, moral et mobilité (échelle 1–10).`, duree: '5 min', actif: true },

  // ── NEURO-PSYCHOLOGIE ───────────────────────────────────────────────────────
  { id: 'Q_INF_04', titre: 'HIT-6 — Impact de la migraine', categorie: 'Neuro-psychologie',
    description: `Évaluez l'impact de vos maux de tête et migraines sur la vie quotidienne (6 items).`, duree: '5 min', actif: true },
  { id: 'Q_NEU_01', titre: 'BDI — Inventaire de dépression de Beck', categorie: 'Neuro-psychologie',
    description: `Évaluez la sévérité de vos symptômes dépressifs en 13 questions (score /39).`, duree: '5 min', actif: true },
  { id: 'Q_NEU_02', titre: 'MADRS — Échelle de dépression de Montgomery-Åsberg', categorie: 'Neuro-psychologie',
    description: `Évaluation détaillée de la dépression sur 10 items (score de 0 à 60).`, duree: '10 min', actif: true },
  { id: 'Q_NEU_03', titre: 'SIGH-SAD-SA — Dépression saisonnière et atypique', categorie: 'Neuro-psychologie',
    description: `Évaluation du trouble affectif saisonnier et de la dépression atypique (deux groupes A/B).`, duree: '15 min', actif: true },
  { id: 'Q_NEU_04', titre: 'SCOFF — Dépistage des troubles du comportement alimentaire', categorie: 'Neuro-psychologie',
    description: `Dépistage rapide de l'anorexie et de la boulimie (5 questions oui/non).`, duree: '3 min', actif: true },
  { id: 'Q_NEU_05', titre: `UPPS — Questionnaire d'impulsivité`, categorie: 'Neuro-psychologie',
    description: `Évaluez 4 facettes de l'impulsivité : urgence, manque de préméditation, persévérance, recherche de sensations (45 items).`, duree: '15 min', actif: true },
  { id: 'Q_NEU_07', titre: `AUDIT — Consommation d'alcool`, categorie: 'Neuro-psychologie',
    description: `Dépistez un usage problématique de l'alcool (10 questions, score /40).`, duree: '5 min', actif: true },
  { id: 'Q_NEU_08', titre: 'ECAB — Dépendance cognitive aux benzodiazépines', categorie: 'Neuro-psychologie',
    description: `Évaluez la dépendance cognitive aux tranquillisants et somnifères (10 items vrai/faux).`, duree: '5 min', actif: true },
  { id: 'Q_NEU_10', titre: 'Dépendance à Internet', categorie: 'Neuro-psychologie',
    description: `Évaluez votre usage problématique d'Internet en 20 questions.`, duree: '10 min', actif: true },

  // ── CARDIOLOGIE ─────────────────────────────────────────────────────────────
  { id: 'Q_CAR_01', titre: 'Questionnaire cardio-métabolique SIIN', categorie: 'Cardiologie',
    description: `Évaluez vos facteurs de risque cardiovasculaire personnels et familiaux (16 items, score /25).`, duree: '8 min', actif: true },

  // ── TABACOLOGIE ─────────────────────────────────────────────────────────────
  { id: 'Q_TAB_01', titre: `Test de motivation à l'arrêt du tabac — Lagrue & Légeron`, categorie: 'Tabacologie',
    description: `Évaluez votre motivation réelle à arrêter de fumer (4 questions, score /23).`, duree: '5 min', actif: true },
  { id: 'Q_TAB_02', titre: 'Test de dépendance à la nicotine — Fagerström', categorie: 'Tabacologie',
    description: `Mesurez votre dépendance physique à la nicotine (6 questions, score /10).`, duree: '5 min', actif: true },

  // ── PNEUMOLOGIE ─────────────────────────────────────────────────────────────
  { id: 'Q_PNE_01', titre: 'Questionnaire de qualité de vie BPCO', categorie: 'Pneumologie',
    description: `Évaluez l'impact de votre maladie respiratoire sur votre qualité de vie (11 items, score /33 — comparatif).`, duree: '10 min', actif: true },

  // ── UROLOGIE ────────────────────────────────────────────────────────────────
  { id: 'Q_URO_01', titre: 'IPSS — Score International des Symptômes Prostatiques', categorie: 'Urologie',
    description: `Évaluez la sévérité de vos symptômes urinaires prostatiques (7 items + qualité de vie, score /35 + /6).`, duree: '5 min', actif: true },

  // ── PÉDIATRIE ───────────────────────────────────────────────────────────────
  { id: 'Q_PED_01', titre: 'Échelle de Matinalité-Vespéralité Enfant — Dr Caci', categorie: 'Pédiatrie',
    description: `Évaluez le chronotype de l'enfant : profil matin ou soir (10 items, score 10–43).`, duree: '5 min', actif: true },

  // ── NEURO-PSYCHOLOGIE ────────────────────────────────────────────────────────────
  { id: 'Q_INF_01', titre: `Questionnaire d'hyperexcitabilité SIIN`, categorie: 'Neuro-psychologie',
    description: `Évaluez les signes d'hyperexcitabilité neuro-musculaire : crampes, spasmes, palpitations, sensibilités (24 items).`, duree: '10 min', actif: true },
  { id: 'Q_INF_02', titre: 'Hypersensibilité au déficit en magnésium — Spasmophilie', categorie: 'Neuro-psychologie',
    description: `Identifiez les signes de déficit en magnésium et de spasmophilie (13 items, score /52).`, duree: '5 min', actif: true },

  // ── SOMMEIL ─────────────────────────────────────────────────────────────────
  { id: 'Q_SOM_01', titre: 'PSQI — Index de qualité du sommeil de Pittsburgh', categorie: 'Sommeil',
    description: `Évaluez la qualité globale de votre sommeil sur le dernier mois (7 composantes).`, duree: '10 min', actif: true },
  { id: 'Q_SOM_02', titre: `ESS — Échelle de somnolence d'Epworth`, categorie: 'Sommeil',
    description: `Évaluez votre tendance à vous endormir dans 8 situations de la vie quotidienne.`, duree: '5 min', actif: true },
  { id: 'Q_SOM_03', titre: 'Questionnaire de Berlin — Apnée du sommeil', categorie: 'Sommeil',
    description: `Dépistez un syndrome d'apnées obstructives du sommeil (3 catégories).`, duree: '5 min', actif: true },
  { id: 'Q_SOM_04', titre: 'IRLS — Syndrome des jambes sans repos', categorie: 'Sommeil',
    description: `Évaluez la sévérité du syndrome des jambes sans repos (10 questions, score /40).`, duree: '5 min', actif: true },
  { id: 'Q_SOM_05', titre: 'Chronotype de Horne — Matinalité/Vespéralité', categorie: 'Sommeil',
    description: `Déterminez votre chronotype (matin ou soir) pour adapter vos rythmes biologiques.`, duree: '10 min', actif: true },
  { id: 'Q_SOM_06', titre: 'Questionnaire de fatigue de Pichot', categorie: 'Sommeil',
    description: `Évaluez votre niveau de fatigue globale en 8 questions (seuil significatif > 22).`, duree: '5 min', actif: true },
  { id: 'Q_SOM_07', titre: 'MFI-20 — Échelle multidimensionnelle de fatigue', categorie: 'Sommeil',
    description: `Évaluez 5 dimensions de la fatigue : générale, physique, activité, motivation, mentale (20 items).`, duree: '10 min', actif: true },
  { id: 'Q_SOM_08', titre: 'IDTAS-AE — Dépression & Trouble Affectif Saisonnier', categorie: 'Sommeil',
    description: `Évaluez la présence d'une dépression saisonnière et ses variations mensuelles.`, duree: '15 min', actif: true },

  // ── NEURO-PSYCHOLOGIE ──────────────────────────────────────────────────────────────────
  { id: 'Q_INF_03', titre: 'Dopamine · Noradrénaline · Sérotonine · Mélatonine — SIIN', categorie: 'Neuro-psychologie',
    description: `Évaluez les signes d'insuffisance en neurotransmetteurs sur 4 axes (4×10 questions).`, duree: '15 min', actif: true },
  { id: 'Q_INF_05', titre: `Questionnaire d'auto-évaluation de l'anxiété`, categorie: 'Neuro-psychologie',
    description: `Évaluez vos symptômes d'anxiété somatique au cours des 7 derniers jours (11 items).`, duree: '5 min', actif: true },

  // ── STRESS ───────────────────────────────────────────────────────────────────────────────
  { id: 'Q_STR_01', titre: 'Questionnaire de stress SIIN', categorie: 'Stress',
    description: `Évaluez votre niveau de stress et ses manifestations (fatigue, tension, somatisation). Protocole dopaminergique/sérotoninergique/mixte.`, duree: '15 min', actif: true },
  { id: 'Q_STR_02', titre: 'PSS-10 — Échelle de stress perçu de Cohen', categorie: 'Stress',
    description: `Évaluez votre perception du stress au cours du dernier mois (10 questions).`, duree: '5 min', actif: true },
  { id: 'Q_STR_03', titre: 'Questionnaire de stress de Cungi', categorie: 'Stress',
    description: `Évaluez votre niveau de stress chronique dans 12 situations de vie quotidienne.`, duree: '5 min', actif: true },
  { id: 'Q_STR_04', titre: 'DASS-21 — Dépression Anxiété Stress', categorie: 'Stress',
    description: `Évaluez vos niveaux de dépression, d'anxiété et de stress (21 questions, 3 sous-scores).`, duree: '10 min', actif: true },
  { id: 'Q_STR_05', titre: 'BMS-10 — Burnout Measure Short', categorie: 'Stress',
    description: `Dépistez un état d'épuisement professionnel (burnout) en 10 questions.`, duree: '5 min', actif: true },
  { id: 'Q_STR_06', titre: 'Questionnaire de Karasek', categorie: 'Stress',
    description: `Évaluez votre stress au travail : latitude décisionnelle, demande psychologique, soutien social.`, duree: '10 min', actif: true },
  { id: 'Q_STR_07', titre: 'HAD — Échelle Hospitalière Anxiété-Dépression', categorie: 'Stress',
    description: `Dépistez anxiété (score A) et dépression (score D) en 14 questions.`, duree: '5 min', actif: true },
  { id: 'Q_STR_08', titre: `WART — Test d'addiction au travail`, categorie: 'Stress',
    description: `Identifiez les comportements de workaholisme et d'addiction au travail (25 items).`, duree: '10 min', actif: true },

  // ── GÉRONTOLOGIE (suite) ────────────────────────────────────────────────────
  { id: 'Q_GEO_01', titre: 'Grille de Tinetti — Équilibre et marche', categorie: 'Gérontologie',
    description: `Évaluez votre équilibre et votre marche — dépistage du risque de chute (score /28).`, duree: '10 min', actif: true },
  { id: 'Q_GEO_02', titre: 'SARC-F — Dépistage de la sarcopénie', categorie: 'Gérontologie',
    description: `Dépistez une perte de masse musculaire (sarcopénie) en 5 questions simples (score /10).`, duree: '3 min', actif: true },

  // ── TABACOLOGIE (suite) ─────────────────────────────────────────────────────
  { id: 'Q_TAB_03', titre: 'QCT2 de Gilliard — Comportement tabagique', categorie: 'Tabacologie',
    description: `Analysez votre profil tabagique selon 4 dimensions : Dépendance, Sevrage, Appétence, Habitude (28 items).`, duree: '10 min', actif: true },
  { id: 'Q_TAB_04', titre: `Questionnaire d'évaluation du cannabis`, categorie: 'Tabacologie',
    description: `Évaluez votre consommation de cannabis et ses conséquences (16 items).`, duree: '10 min', actif: true },
  { id: 'Q_TAB_05', titre: 'Di Franza — Dépendance nicotinique adolescent (HONC)', categorie: 'Tabacologie',
    description: `Dépistez la dépendance à la nicotine chez l'adolescent en 10 questions oui/non.`, duree: '3 min', actif: true },

  // ── PÉDIATRIE (suite) ───────────────────────────────────────────────────────
  { id: 'Q_PED_02', titre: 'Conners Enseignant — Évaluation TDAH (forme courte)', categorie: 'Pédiatrie',
    description: `Évaluation du TDAH par l'enseignant : opposition, inattention, hyperactivité (28 items, 0-3).`, duree: '10 min', actif: true },
  { id: 'Q_PED_03', titre: 'Conners Parents — Évaluation TDAH (forme courte)', categorie: 'Pédiatrie',
    description: `Évaluation du TDAH par les parents : opposition, inattention, hyperactivité (27 items, 0-3).`, duree: '10 min', actif: true },

  // ── CANCÉROLOGIE ────────────────────────────────────────────────────────────
  { id: 'Q_CAN_01', titre: 'QLQ-C30 — Qualité de vie oncologique (EORTC)', categorie: 'Cancérologie',
    description: `Questionnaire de qualité de vie validé pour les patients atteints de cancer (30 items, fonctions + symptômes).`, duree: '15 min', actif: true },
  { id: 'Q_CAN_02', titre: 'QLQ-BR23 — Module cancer du sein (EORTC)', categorie: 'Cancérologie',
    description: `Module complémentaire QLQ-C30 spécifique cancer du sein : image corporelle, symptômes traitement, bras, sein (23 items).`, duree: '10 min', actif: true },
];
