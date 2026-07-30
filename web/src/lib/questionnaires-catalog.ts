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
// `Q_NEU_11`). Depuis le 2026-07-29, `Q_NEU_11` a sa PROPRE entrée : l'alias
// `Q_STR_07` n'est donc plus la seule exposition de cette grille, et son titre a
// été désambiguïsé pour que les deux ne se confondent pas au sélecteur.
// `Q_NEU_12` reste dans l'ancienne situation. Elles restent exposées pour
// préserver la liste offerte en production, avec les catégories affichées selon
// le regroupement courant.
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
  // Seuils provisoires, source non certifiée : la version servie est un
  // dépistage court de 14 items (/42), non une numérisation du questionnaire
  // SIIN d'origine (57 items, /90). Cf. le commentaire de Q_ALI_01 dans
  // questionnaires/alimentaire.ts et l'audit du 2026-07-26.
  { id: 'Q_ALI_01', titre: 'Questionnaire Alimentaire SIIN', categorie: 'Alimentaire',
    description: `Situez la qualité globale de votre alimentation : légumes, fruits, protéines, graisses, sucres et comportements alimentaires. Repérage d'habitudes, non validé comme instrument de mesure — les résultats orientent l'entretien, ils ne concluent pas.`, duree: '15 min', actif: true },
  { id: 'Q_ALI_02', titre: 'Alimentation — Diète méditerranéenne SIIN', categorie: 'Alimentaire',
    description: `Évaluez votre adhérence au régime méditerranéen en 14 questions (score /14).`, duree: '10 min', actif: true },
  // Suspendu le 2026-07-30 sur arbitrage praticien, pour un motif de CONTENU :
  // l'application sert 10 items là où la source (méthode Monnier) en compte 39 —
  // un quart d'un instrument n'est pas une adaptation, c'est un autre instrument.
  // Même précédent que Q_SOM_07 (« ce n'est pas un défaut de scoring, c'est un
  // autre instrument »). Les droits, eux, sont couverts. Sa réponse enregistrée
  // reste lisible ; réactivation à la reconstruction depuis la source.
  { id: 'Q_ALI_03', titre: 'Fréquences de consommation alimentaire (adapté de la méthode Monnier)', categorie: 'Alimentaire',
    description: `Situez vos fréquences de consommation par groupe d'aliments. Ne calcule ni apports caloriques ni apports protéiques : la version servie produit des indices de fréquence, pas des quantités. Source non certifiée.`, duree: '10 min', actif: false },

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
  // Entrée AJOUTÉE le 2026-07-29 sur arbitrage praticien. `Q_NEU_11` portait une
  // définition de scoring sans aucune entrée ici : il n'était donc proposé par
  // aucun écran — son ancien identifiant `Q_STR_07` figure bien au catalogue,
  // mais en ALIAS sans grille, que la route d'assignation refuse — et pourtant
  // un appel direct à `api/praticien/assignations` l'acceptait, cette route
  // n'exigeant qu'une définition. « Invisible et assignable » : la combinaison
  // que ce fichier désigne plus bas comme la pire, et que #460 a fermée sur le
  // MMSE pour cette raison même.
  //
  // Le rendre visible le rend surtout GOUVERNABLE : `actif: false` l'atteint
  // désormais, ce qui n'était pas le cas. C'est ce qui a décidé l'arbitrage —
  // HAD est sous licence tierce non instruite (« GL Assessment, copyright
  // déclaré, à vérifier ») ET la source UNIQUE du besoin 8 de « Mon équilibre »,
  // en grade A : le fermer coûtait un besoin entier, le laisser hors de portée
  // du mécanisme ordinaire coûtait la maîtrise. L'entrée résout les deux.
  //
  // Son alias `Q_STR_07` reste au catalogue : il pointe vers cette grille et
  // continue d'être refusé à l'assignation, ce qui est exactement ce qu'un alias
  // historique doit faire.
  { id: 'Q_NEU_11', titre: 'HAD — Échelle Hospitalière Anxiété-Dépression', categorie: 'Neuro-psychologie',
    description: `Dépistez anxiété (score A) et dépression (score D) en 14 questions.`, duree: '5 min', actif: true },

  // ── CARDIOLOGIE ─────────────────────────────────────────────────────────────
  { id: 'Q_CAR_01', titre: 'Questionnaire cardio-métabolique SIIN', categorie: 'Cardiologie',
    description: `Évaluez vos facteurs de risque cardiovasculaire personnels et familiaux (16 items, score /25).`, duree: '8 min', actif: true },

  // ── TABACOLOGIE ─────────────────────────────────────────────────────────────
  { id: 'Q_TAB_01', titre: `Test de motivation à l'arrêt du tabac — Lagrue & Légeron`, categorie: 'Tabacologie',
    description: `Évaluez votre motivation réelle à arrêter de fumer (4 questions, score /23).`, duree: '5 min', actif: true },
  { id: 'Q_TAB_02', titre: 'Test de dépendance à la nicotine — Fagerström', categorie: 'Tabacologie',
    description: `Mesurez votre dépendance physique à la nicotine (6 questions, score /10).`, duree: '5 min', actif: true },

  // ── PNEUMOLOGIE ─────────────────────────────────────────────────────────────
  // RÉACTIVÉ le 2026-07-30, à la condition que sa suspension avait elle-même
  // posée : « réactivation à la première source identifiée ». Elle l'est —
  // WN-SRC-0503, « Questionnaire BPCO Def PRO.pdf », dont les DEUX lectures du
  // banc ne relèvent que la mention de droits SIIN, sans aucune attribution
  // tierce. L'instrument n'est donc pas une échelle publiée dont l'auteur aurait
  // été perdu : c'est un questionnaire du référentiel interne, et « aucun auteur
  // nommé » était la description exacte de ce qu'il est.
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
  // Suspendu le 2026-07-27 : confronté au PDF source, l'instrument servi ici
  // n'est pas le MFI-20. Échelle d'accord 1→5 servie en fréquence 0→4, aucune
  // des 10 inversions appliquée, 5 sous-échelles publiées servies en 2 sections,
  // et 3 bandes /80 alors que la source écrit qu'il n'existe pas de barème.
  // Les libellés ne se recoupent qu'à moitié. `actif: false` retire l'entrée des
  // écrans ET la fait refuser par les trois chemins d'assignation (voir
  // IDS_SUSPENDUS plus bas) : un pack de production en contenait encore un.
  // Les réponses déjà enregistrées restent lisibles — aucune route de lecture
  // ne filtre sur ce champ — et ne sont PAS recalculables : elles portent sur
  // d'autres items, sur une autre échelle. Réactivation prévue à la
  // reconstruction depuis la source, avec la description corrigée.
  { id: 'Q_SOM_07', titre: 'MFI-20 — Échelle multidimensionnelle de fatigue', categorie: 'Sommeil',
    description: `Évaluez 5 dimensions de la fatigue : générale, physique, activité, motivation, mentale (20 items).`, duree: '10 min', actif: false },
  { id: 'Q_SOM_08', titre: 'IDTAS-AE — Dépression & Trouble Affectif Saisonnier', categorie: 'Sommeil',
    description: `Évaluez la présence d'une dépression saisonnière et ses variations mensuelles.`, duree: '15 min', actif: true },
  { id: 'Q_SOM_09', titre: 'Agenda du sommeil — 21 nuits', categorie: 'Sommeil',
    description: `Recueil interactif : chaque matin, le patient note sa nuit en une minute (frise sans chiffres). L'analyse (durée, efficacité, régularité) est transmise à la clôture des 21 nuits.`, duree: '1 min / matin', actif: true },

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
  // Titre DÉSAMBIGUÏSÉ le 2026-07-29, et c'est la contrepartie de l'entrée
  // `Q_NEU_11` ajoutée plus haut. Les deux portaient le même libellé exact — le
  // rayon les distingue par son badge « Alias historique », mais le SÉLECTEUR
  // d'assignation (`api/praticien/questionnaires`) ne filtre que sur `actif` et
  // n'affiche que « titre (catégorie) » : le praticien y voyait deux « HAD », et
  // celui-ci échoue en 404, faute de grille. Un échec devenu aléatoire coûte
  // plus cher en confiance qu'un échec total. Relevé en revue adversariale.
  { id: 'Q_STR_07', titre: 'HAD (ancien code) — remplacé par la grille Neuro-psychologie', categorie: 'Stress',
    description: `Entrée historique conservée pour les packs qui la référencent encore. La grille est servie sous « HAD — Échelle Hospitalière Anxiété-Dépression » (Neuro-psychologie) : c'est celle-là qu'il faut assigner.`, duree: '5 min', actif: true },
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
  // RÉACTIVÉ le 2026-07-30, même geste que `Q_PNE_01` et pour la même raison :
  // les sources WN-SRC-0494/0495 sont au dossier et ne portent que la mention de
  // droits SIIN, sans attribution tierce — l'absence d'auteur nommé décrivait un
  // questionnaire du référentiel interne, pas une échelle publiée égarée.
  // La réserve de sa fermeture est levée par une preuve, pas par un avis : le
  // plafond de grille (32) est sous le maximum atteignable (36), et le banc
  // `bandesInterpretation.guard.test.ts` vérifie qu'un 36 reçoit bien la bande de
  // tête « Dépendance probable » depuis la règle posée en #450.
  { id: 'Q_TAB_04', titre: `Questionnaire d'évaluation du cannabis`, categorie: 'Tabacologie',
    description: `Évaluez votre consommation de cannabis et ses conséquences (16 items).`, duree: '10 min', actif: true },
  { id: 'Q_TAB_05', titre: 'Di Franza — Dépendance nicotinique adolescent (HONC)', categorie: 'Tabacologie',
    description: `Dépistez la dépendance à la nicotine chez l'adolescent en 10 questions oui/non.`, duree: '3 min', actif: true },

  // ── PÉDIATRIE (suite) ───────────────────────────────────────────────────────
  // Suspendus le 2026-07-29 sur arbitrage praticien : droits non dégagés
  // (« © MHS, licence requise » au registre des instruments). Ni assignation ni
  // passation depuis l'ouverture, et le banc de certification ne les a jamais
  // comparés à leur source — ce sont les deux seuls du catalogue dans ce cas.
  // S'y ajoute une réserve scientifique déjà consignée : le seuil de 15 de
  // l'échelle de Conners vient d'un rapport non publié, et le laboratoire de son
  // propre auteur l'a désavoué en 1985 en recommandant d'abandonner
  // l'instrument. Réactivation possible sur licence obtenue ET reconstruction
  // depuis la source.
  { id: 'Q_PED_02', titre: 'Conners Enseignant — Évaluation TDAH (forme courte)', categorie: 'Pédiatrie',
    description: `Évaluation du TDAH par l'enseignant : opposition, inattention, hyperactivité (28 items, 0-3).`, duree: '10 min', actif: false },
  { id: 'Q_PED_03', titre: 'Conners Parents — Évaluation TDAH (forme courte)', categorie: 'Pédiatrie',
    description: `Évaluation du TDAH par les parents : opposition, inattention, hyperactivité (27 items, 0-3).`, duree: '10 min', actif: false },

  // ── GÉRONTOLOGIE (MMSE) ─────────────────────────────────────────────────────
  // Entrée AJOUTÉE le 2026-07-29 pour pouvoir suspendre l'instrument, et non
  // pour l'offrir — le rayon ne montre pas les entrées inactives. `Q_GEO_04`
  // n'avait aucune entrée ici : il ne figurait qu'en `PASSATION_PRATICIEN`, une
  // liste d'AFFICHAGE que les routes d'assignation ne consultent pas. Il n'était
  // donc pas proposé à l'écran, mais un appel direct à
  // `api/praticien/assignations` l'acceptait — il porte une définition, seule
  // condition de cette route après le filtre `IDS_SUSPENDUS`. « Invisible et
  // assignable » est la pire des combinaisons : c'est celle qu'un retrait de
  // l'écran seul produit, et que ce fichier met en garde contre juste en dessous.
  // Sans entrée au catalogue, `actif: false` ne pouvait pas l'atteindre.
  //
  // Sa ligne `PASSATION_PRATICIEN` est retirée EN PLUS, et pour une autre
  // raison : elle portait l'aperçu de la grille, donc l'usage en consultation.
  // Les deux gestes sont indépendants — celui-ci ferme la route, celui-là ferme
  // l'usage — et il fallait les deux pour que la fermeture veuille dire quelque
  // chose sur un instrument que le portail patient n'offrait déjà pas.
  //
  // Suspendu sur arbitrage praticien : droits non dégagés (« © PAR, licence
  // requise » au registre), aucun usage, et trois instruments de dépistage
  // cognitif restent au catalogue (Q_GEO_03, Q_GEO_05, Q_GEO_06). Le MMSE est en
  // outre un test ADMINISTRÉ PAR UN CLINICIEN : sa place dans un portail patient
  // se pose indépendamment de la licence.
  { id: 'Q_GEO_04', titre: 'MMSE — Mini Mental State Examination (GRECO)', categorie: 'Gérontologie',
    description: `Test cognitif administré par le clinicien : orientation, apprentissage, attention, rappel, langage, praxie (30 points).`, duree: '15 min', actif: false },

  // ── CANCÉROLOGIE ────────────────────────────────────────────────────────────
  // Suspendus le 2026-07-29 sur arbitrage praticien : droits non dégagés
  // (« © EORTC — enregistrement/autorisation requis » au registre). Aucun usage
  // ni sur l'un ni sur l'autre. Ce sont les deux SEULS instruments de
  // cancérologie du catalogue : les suspendre suspend le domaine, et c'est
  // assumé le temps de l'enregistrement — l'EORTC pratique une autorisation
  // gratuite pour l'usage clinique et académique, pas une licence payante.
  // Leurs bandes portent par ailleurs des libellés que le catalogue déclare déjà
  // douteux (« seuil source < 28 incohérent »), à revoir à la réactivation.
  { id: 'Q_CAN_01', titre: 'QLQ-C30 — Qualité de vie oncologique (EORTC)', categorie: 'Cancérologie',
    description: `Questionnaire de qualité de vie validé pour les patients atteints de cancer (30 items, fonctions + symptômes).`, duree: '15 min', actif: false },
  { id: 'Q_CAN_02', titre: 'QLQ-BR23 — Module cancer du sein (EORTC)', categorie: 'Cancérologie',
    description: `Module complémentaire QLQ-C30 spécifique cancer du sein : image corporelle, symptômes traitement, bras, sein (23 items).`, duree: '10 min', actif: false },
];

// Les instruments suspendus — `actif: false`. À importer par les routes
// d'assignation, jamais l'inverse : un questionnaire retiré doit l'être dans la
// route, pas seulement dans l'écran, sinon un appel direct ou un pack existant
// le contourne. C'est la règle que `api/praticien/assignations/route.ts` écrit
// déjà pour le dossier clos ; elle vaut ici pour la même raison.
//
// Volontairement l'ensemble des SUSPENDUS, et non son complément « assignables ».
// `IDS_ASSIGNABLES` (lib/bibliotheque.ts) exclut aussi les alias historiques et
// les passations praticien : s'en servir de garde refuserait des questionnaires
// qui passent aujourd'hui. Refuser exactement ce qui est suspendu ne change le
// comportement d'aucun autre instrument.
export const IDS_SUSPENDUS: ReadonlySet<string> = new Set(
  QUESTIONNAIRES_CATALOG.filter(q => !q.actif).map(q => q.id),
);

export const RAISON_QUESTIONNAIRE_SUSPENDU = 'questionnaire_suspendu';
export const MESSAGE_QUESTIONNAIRE_SUSPENDU =
  "Ce questionnaire est suspendu et ne peut plus être envoyé.";
