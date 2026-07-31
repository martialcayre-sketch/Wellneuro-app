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
  // Suspendu le 2026-07-30 pour un motif de CONTENU — 10 items servis là où la
  // source en porte 39 —, RECONSTRUIT et réactivé le 2026-07-31.
  //
  // La source n'était pas un questionnaire de fréquences : c'est une feuille de
  // calcul à cinq colonnes, avec un nombre de portions par ligne, une table de
  // protéines par portion, et deux totaux — grammes de protéines, calories. Le
  // servi en avait fait des indices de fréquence, soit l'exact contraire de ce
  // que son titre annonçait.
  //
  // Il est DÉBAPTISÉ parce qu'il est corrigé : deux constantes de la source sont
  // manifestement fausses (2 œufs et 150 g de poisson y valent 3,6 g de
  // protéines) et ses périodicités mélangent le jour et la semaine sans règle de
  // conversion. Trois écarts déclarés au registre, donc ce n'est plus « la
  // méthode Monnier » mais une grille qui en dérive. Aucun seuil : la source
  // n'en donne aucun.
  { id: 'Q_ALI_03', titre: 'Estimation des apports protéiques et caloriques (grille WellNeuro, dérivée de la méthode Monnier)', categorie: 'Alimentaire',
    description: `Indiquez, ligne par ligne, le nombre de portions que vous consommez. L'outil en estime vos apports quotidiens en protéines et en calories. Cette estimation n'est pas un verdict : elle s'apprécie avec le praticien, aucun seuil n'y est attaché.`, duree: '10 min', actif: true },

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
  // SUSPENDU le 2026-07-31, en même temps que son contenu était reconstruit
  // depuis sa source (WN-SRC-0445). Les deux gestes vont ensemble et aucun ne
  // se comprend sans l'autre.
  //
  // Ce qui était servi n'était PAS cet instrument : dix plaintes cognitives
  // auto-rapportées, cotées 0-3 dans le sens inverse sur 30, sans un libellé
  // commun avec la source. La reconstruction remet les dix épreuves
  // administrées de la source, cotées 0-2 sur 20 dans le sens des troubles.
  // Aucune assignation ni réponse n'existait en production (vérifié) : rien
  // n'est réécrit.
  //
  // Mais il n'est pas rouvert pour autant, et ce n'est pas une prudence de
  // principe. Sa source écrit en première ligne « Complétez ce questionnaire
  // avec votre patient en consultation », et ses items 3, 5 et 10 forment un
  // enregistrement puis deux rappels des MÊMES trois mots : auto-rempli, le
  // patient remonte la page et les deux items les plus discriminants deviennent
  // des points offerts. Il ne peut donc pas rester assignable.
  //
  // [ÉTAT DU 2026-07-31, SUPERSÉDÉ LE 2026-08-01 — conservé parce qu'il dit ce
  // que la réouverture a dû produire.] Il ne pouvait pas non plus rejoindre
  // `PASSATION_PRATICIEN` : cette liste porte l'AFFICHAGE de la grille, donc du
  // verbatim, et la décision du 2026-07-29 interdisait d'y laisser un instrument
  // sous réserve. L'origine du test n'était pas instruite, et conclure au
  // référentiel interne parce que le support ne cite pas ses sources aurait été
  // le renversement de charge commis sur le VQ11 le 2026-07-30.
  //
  // Rouvrir demandait DEUX pièces, dans cet ordre, et les DEUX ont été
  // produites le 2026-08-01 :
  //   1. L'IDENTITÉ est instruite — le servi correspond au document « MMT ou
  //      Mini Mental Test » diffusé par l'IEDM (PDF de 2005), dix items au mot
  //      près, mêmes bandes. Et il n'est pas le MMSE : sa bande 5-10 ordonne
  //      « Faire MMS ».
  //   2. La SURFACE est décidée — `PASSATION_PRATICIEN`, avec une entrée de
  //      catalogue `actif: false` qui maintient la route d'assignation fermée,
  //      et un aperçu qui refuse désormais le verbatim de tout instrument
  //      suspendu ET hors consultation.
  //
  // La réserve subsiste et n'est pas levée : le document IEDM ne nomme aucun
  // auteur, donc aucun ayant droit n'est identifiable pour être sollicité.
  { id: 'Q_NEU_06', titre: 'MMT — Mini Mental Test SIIN', categorie: 'Gérontologie',
    description: `Test cognitif administré en consultation : âge, heure, rappel de trois mots, soustractions de 7 (10 épreuves, 0-2, score /20).`, duree: '10 min', actif: false },
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
  // RÉACTIVÉ le 2026-07-31, et c'est bien la condition posée à sa fermeture qui
  // est remplie — « réactivation à la première source identifiée ».
  //
  // Il avait été suspendu le 2026-07-29 pour un motif de DOCUMENTATION et non de
  // droits : le registre ne nommait aucun auteur, on ne savait pas dire ce qu'il
  // était. On le sait : c'est le VQ11 de Ninot et al. (2010), établi par la revue
  // adversariale du 2026-07-30 sur la correspondance exacte des onze items et des
  // trois composantes publiées — fonctionnelle, psychologique, relationnelle.
  //
  // C'est l'instrument le mieux aligné du catalogue : le banc ne rend AUCUNE
  // divergence, d'aucune gravité, contre le support du dossier. Avec une réserve
  // que le banc ne pouvait pas voir, et qui est écrite au registre : le support
  // SIIN reproduit le VQ11 avec quatre niveaux de réponse là où la forme publiée
  // en compte cinq. Portée bornée — le servi ne porte aucune bande et n'applique
  // aucune norme publiée.
  //
  // Les droits de Ninot et al. restent entiers et non instruits : l'instrument
  // rouvre sous la déclaration étendue du 2026-07-29, réserve conservée au
  // registre, exactement comme les cinq autres laissés assignables sous réserve.
  { id: 'Q_PNE_01', titre: 'VQ11 — Qualité de vie dans la BPCO', categorie: 'Pneumologie',
    description: `Situez l'impact de votre maladie respiratoire sur votre vie quotidienne, selon trois composantes : fonctionnelle, psychologique et relationnelle (11 items). Trois sous-scores rapportés séparément, sans bande d'interprétation.`, duree: '10 min', actif: true },

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
  // RÉACTIVÉ le 2026-07-31, après reconstruction depuis la source — et c'est la
  // réactivation que sa suspension du 2026-07-27 annonçait en toutes lettres :
  // « Réactivation prévue à la reconstruction depuis la source, avec la
  // description corrigée. »
  //
  // Ce qui était servi n'était pas le MFI-20 : échelle d'accord 1→5 servie en
  // fréquence 0→4, aucune des 10 inversions appliquée, 5 sous-échelles servies
  // en 2 sections, et 3 bandes /80 alors que la source écrit qu'il n'existe pas
  // de barème. Le servi porte désormais les 20 items de la source, sa cotation
  // 1-5, ses cinq sous-échelles et sa clé d'inversion — cf. le commentaire de
  // `Q_SOM_07` dans `questionnaires/sommeil.ts`.
  //
  // LES QUATRE PASSATIONS DÉJÀ ENREGISTRÉES RESTENT NEUTRALISÉES, et elles ne
  // sont pas recalculables : elles portent sur d'autres items, sur une autre
  // échelle. C'est la frontière DATÉE de `passationsNonInterpretables.ts` qui
  // tient les deux ensemble — antérieures marquées, neuves lisibles. Sans elle,
  // réactiver aurait marqué à tort chaque nouvelle passation, et le garde du CI
  // aurait refusé le lot.
  { id: 'Q_SOM_07', titre: 'MFI-20 — Échelle multidimensionnelle de fatigue', categorie: 'Sommeil',
    description: `Situez cinq dimensions de la fatigue — générale, physique, mentale, réduction des activités, réduction de la motivation — en 20 affirmations à graduer de 1 à 5. Cinq sous-scores rapportés séparément : l'instrument ne définit pas de score global.`, duree: '10 min', actif: true },
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
  // TOUJOURS SUSPENDU, et pour le motif même de sa fermeture le 2026-07-29 :
  // aucun auteur nommé au registre, référence bibliographique à compléter. Les
  // droits, eux, sont couverts par la déclaration étendue du même jour — la
  // fermeture ne les concerne pas. Ni assignation ni réponse.
  //
  // Son CONTENU a été corrigé le 2026-07-31 sur arbitrage praticien, sans que
  // cela le rouvre : le plafond déclaré passe de 32 au maximum réellement
  // atteignable (36 — il faisait afficher « 34/32 »), et la grille
  // d'interprétation est alignée sur les trois bandes de la source au lieu des
  // quatre coupures locales. Les quatre conduites du cabinet sont conservées,
  // les deux plus sévères fusionnées puisque la source réunit leurs intervalles.
  //
  // Le dossier d'arbitrage du 2026-07-31 le classait « à réactiver après ces
  // corrections » : c'était une inconséquence. Lui appliquer une barre plus
  // basse qu'à `Q_NEU_06`, fermé la veille faute d'identité instruite, serait
  // refaire le renversement de charge du VQ11 — conclure de ce qu'un support ne
  // dit pas. Réactivation à l'identification de la source, comme pour
  // `Q_PNE_01`, dont c'est ce qui vient de lever la fermeture.
  { id: 'Q_TAB_04', titre: `Questionnaire d'évaluation du cannabis`, categorie: 'Tabacologie',
    description: `Évaluez votre consommation de cannabis et ses conséquences (16 items).`, duree: '10 min', actif: false },
  { id: 'Q_TAB_05', titre: 'Di Franza — Dépendance nicotinique adolescent (HONC)', categorie: 'Tabacologie',
    description: `Dépistez la dépendance à la nicotine chez l'adolescent en 10 questions oui/non.`, duree: '3 min', actif: true },

  // ── PÉDIATRIE (suite) ───────────────────────────────────────────────────────
  // Fermés le 2026-07-29, et leur sort DIVERGE depuis le 2026-07-30 : le banc de
  // certification y est enfin passé — ils en étaient les deux seuls absents,
  // parce que leur comparaison coûte des appels de modèle.
  //
  // L'ENSEIGNANT A ÉTÉ ROUVERT PUIS REFERMÉ LE MÊME JOUR, et le motif vaut d'être
  // lu avant toute nouvelle tentative. Son banc rend « 0 divergence critique » —
  // mais la source lue ne déclare ni sous-échelle, ni seuil, ni bornes, ni
  // barème : les deux seuls contrôles critiques possibles étaient le nombre
  // d'items et l'échelle de cotation, et les deux formes ont bien 28 items cotés
  // 0-3. Zéro critique voulait donc dire « les deux choses vérifiables l'étaient »,
  // pas « le servi est l'instrument ».
  //
  // Ce que les 27 divergences « mineures » disaient : la similarité item à item
  // est de 0,00 pour dix-sept d'entre elles. Le servi porte les critères DSM du
  // TDAH là où la source porte les items d'opposition de Conners. Et le sous-score
  // intitulé « Opposition / Impulsivité » repose sur cinq items d'IMPULSIVITÉ et
  // aucun d'opposition : un praticien y lirait un trouble oppositionnel chez un
  // enfant à qui la question n'a jamais été posée.
  //
  // Réouverture conditionnée à l'un des deux : reconstruire le servi sur les 28
  // items de la source, ou DÉBAPTISER — un dépistage TDAH local par l'enseignant,
  // sans le nom Conners ni les intitulés empruntés, ne pose ni le problème
  // d'identité ni celui de MHS.
  { id: 'Q_PED_02', titre: 'Conners Enseignant — Évaluation TDAH (forme courte)', categorie: 'Pédiatrie',
    description: `Évaluation du TDAH par l'enseignant : opposition, inattention, hyperactivité (28 items, 0-3).`, duree: '10 min', actif: false },
  // Le Conners parent RESTE FERMÉ, et son banc dit pourquoi : la lecture de la
  // source y trouve 110 items là où l'application en sert 108. Deux items
  // manquants ne sont pas un défaut de scoring, c'est un autre instrument —
  // précédent du MFI-20 (#418) et de la méthode Monnier. S'y ajoute que la
  // lecture croisée a échoué deux fois (sortie tronquée sur 108 items) : rien
  // n'est confirmé par deux lectures indépendantes. Les relances payantes ont
  // été arrêtées à deux essais.
  { id: 'Q_PED_03', titre: 'Conners Parents — Évaluation TDAH (forme courte)', categorie: 'Pédiatrie',
    description: `Évaluation du TDAH par les parents : opposition, inattention, hyperactivité (108 items, 0-3).`, duree: '30 min', actif: false },

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
  // Sa ligne `PASSATION_PRATICIEN` a été retirée EN PLUS le 2026-07-29, et pour
  // une autre raison : elle portait l'aperçu de la grille, donc l'usage en
  // consultation. Les deux gestes sont indépendants — celui-ci ferme la route,
  // celui-là ferme l'usage.
  //
  // [MISE À JOUR DU 2026-08-01] Le SECOND geste est repris, le premier non. La
  // ligne `PASSATION_PRATICIEN` est rétablie ; `actif: false` reste, donc la
  // route d'assignation reste fermée. Motif : une asymétrie qui ne se défendait
  // pas — six instruments portant la même classe de réserve de droits sont, eux,
  // ENVOYÉS AU PATIENT, ce qui expose davantage que d'afficher une grille au
  // praticien qui porte la déclaration d'usage. La réserve « © PAR, licence
  // requise » n'est pas levée pour autant, et le registre la porte.
  //
  // Suspendu sur arbitrage praticien : droits non dégagés (« © PAR, licence
  // requise » au registre), aucun usage, et trois instruments de dépistage
  // cognitif restent au catalogue (Q_GEO_03, Q_GEO_05, Q_GEO_06). Le MMSE est en
  // outre un test ADMINISTRÉ PAR UN CLINICIEN : sa place dans un portail patient
  // se pose indépendamment de la licence.
  { id: 'Q_GEO_04', titre: 'MMSE — Mini Mental State Examination (GRECO)', categorie: 'Gérontologie',
    description: `Test cognitif administré par le clinicien : orientation, apprentissage, attention, rappel, langage, praxie (30 points).`, duree: '15 min', actif: false },

  // ── LES QUATRE AUTRES INSTRUMENTS DE CONSULTATION ───────────────────────────
  //
  // Entrées AJOUTÉES le 2026-08-01, et elles ferment un trou que ce dépôt
  // nommait depuis #460 sans l'avoir refermé partout.
  //
  // Ces quatre-là n'avaient AUCUNE entrée ici : ils ne figuraient qu'en
  // `PASSATION_PRATICIEN`, une liste d'AFFICHAGE que les routes d'assignation ne
  // consultent pas. Mesuré le 2026-08-01 : les trois routes (`praticien/
  // assignations`, `packs/assign`, `assignBasePack`) n'exigent qu'une définition
  // une fois passé le filtre `IDS_SUSPENDUS` — elles ACCEPTAIENT donc les quatre
  // par appel direct. Trois tests cognitifs de gérontologie et un catalogue
  // mictionnel, administrés en consultation, pouvaient partir au portail patient.
  //
  // C'est exactement la position « invisible et assignable » contre laquelle ce
  // fichier met en garde plus haut, et que #460 a fermée sur le seul MMSE. Sans
  // entrée au catalogue, `actif: false` ne peut pas les atteindre.
  //
  // `actif: false` ne les retire de RIEN à l'écran : le rayon ne montrait déjà
  // pas ces entrées, et leur affichage vient de `PASSATION_PRATICIEN`, qui est
  // inchangé. Le seul effet est de fermer la route.
  { id: 'Q_GEO_03', titre: 'AQ — Questionnaire Alzheimer (Sabbagh 2010)', categorie: 'Gérontologie',
    description: `Repérage du risque de maladie d'Alzheimer, renseigné en consultation avec l'informant (21 items).`, duree: '10 min', actif: false },
  { id: 'Q_GEO_05', titre: 'QDRS — Quick Dementia Rating System (Galvin 2015)', categorie: 'Gérontologie',
    description: `Évaluation rapide du retentissement cognitif et fonctionnel, renseignée en consultation (10 domaines).`, duree: '10 min', actif: false },
  { id: 'Q_GEO_06', titre: 'Test des 5 mots — Dubois (rappel en 2 phases)', categorie: 'Gérontologie',
    description: `Test cognitif administré par le clinicien : encodage puis rappel de cinq mots, libre et indicé, en deux phases.`, duree: '10 min', actif: false },
  { id: 'Q_URO_02', titre: 'Catalogue Mictionnel — CHU de Nice', categorie: 'Urologie',
    description: `Relevé mictionnel renseigné avec le clinicien : horaires, volumes et fuites.`, duree: '24 h', actif: false },

  // ── CANCÉROLOGIE ────────────────────────────────────────────────────────────
  // RÉACTIVÉS le 2026-07-30, sur décision du praticien-propriétaire déclarant
  // l'usage couvert — la réserve « © EORTC, enregistrement requis » reste au
  // registre et n'est pas levée. Ce sont les deux seuls instruments de
  // cancérologie du catalogue : les rouvrir rouvre le domaine.
  //
  // La réserve technique posée à leur fermeture est traitée, pas contournée :
  // les bandes « douteuses » (« seuil source < 28 incohérent ») n'existent plus.
  // Les deux questionnaires suivent désormais la cotation officielle de leurs
  // manuels EORTC — quinze et huit échelles 0-100, aucune somme brute, aucun
  // score global. Le défaut que ces libellés signalaient était réel : la bande
  // « aucun problème signalé » du BR23 couvrait 0-13 pour un plancher de 23, et
  // la patiente sans aucune plainte ne pouvait donc jamais la recevoir.
  { id: 'Q_CAN_01', titre: 'QLQ-C30 — Qualité de vie oncologique (EORTC)', categorie: 'Cancérologie',
    description: `Questionnaire de qualité de vie validé pour les patients atteints de cancer (30 items, fonctions + symptômes).`, duree: '15 min', actif: true },
  { id: 'Q_CAN_02', titre: 'QLQ-BR23 — Module cancer du sein (EORTC)', categorie: 'Cancérologie',
    description: `Module complémentaire QLQ-C30 spécifique cancer du sein : image corporelle, symptômes traitement, bras, sein (23 items).`, duree: '10 min', actif: true },
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
