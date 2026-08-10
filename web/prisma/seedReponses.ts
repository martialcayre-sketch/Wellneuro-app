/**
 * Données de réponses du seed de développement — patients fictifs uniquement.
 * Sophie Nicola, Jennifer Martin, Michel Dogné. Aucune donnée réelle.
 *
 * POURQUOI CE MODULE EXISTE, et pas trois constantes dans `seed.ts` : ce
 * dernier appelle `seed()` au chargement, donc l'importer depuis un banc
 * ouvrirait une connexion et écrirait en base. Les données vivent donc à part —
 * un module PUR, sans effet de bord — pour que
 * `seedCertification.guard.test.ts` puisse comparer chaque bloc au catalogue
 * servi. Sans cette séparation, l'affirmation « les valeurs sont recopiées du
 * catalogue » n'était tenue par rien : un `certification.status` qui bougerait
 * laisserait le seed déclarer l'ancienne valeur, la fiche du patient fictif
 * l'afficher, et l'E2E rester vert — il assère ce que le seed dit, pas ce que
 * le catalogue accorde. C'est exactement la classe de défaut que le LOT-04
 * existe pour empêcher, et elle était reproduite à l'intérieur du seed
 * (relevée en revue adversariale le 2026-08-09).
 */

// ─── Réponses questionnaires fictives ────────────────────────────────────────
//
// LA CLÉ `certification` EST CELLE QUE LE MOTEUR PRODUIT, et le seed la porte
// depuis le LOT-04 de la campagne 2026-08-08 (D-036).
//
// Tous les moteurs de `questions.ts` posent `certification: sc.certification ||
// null` dans leur résultat, et `api/patient/submit` la persiste dans
// `scores_json` ; la colonne « Qualité » de la fiche patient la relit
// (`libelleCertificationPassation`). Aucun bloc du seed ne la portait : la
// colonne retombait donc TOUJOURS sur « Historique », et aucun E2E ne voyait un
// seul des six libellés de passation — un seed qui ne peut pas mentir parce
// qu'il ne dit rien.
//
// Les valeurs sont RECOPIÉES du catalogue servi, jamais choisies : les 13 blocs
// concernés portent tous `{ source: 'drive', status: 'certifie' }` au
// 2026-08-09. Deux blocs restent nus, et pour deux raisons différentes — voir
// `Q_SOM_01` et `Q_SOM_07` ci-dessous.

/** Ce que le catalogue déclare pour les instruments certifiés d'origine Drive.
 *  Non exporté : aucun consommateur hors de ce fichier, et une surface publique
 *  gratuite invite à recopier la valeur plutôt qu'à la lire du catalogue. */
const CERTIFIE_DRIVE = { source: 'drive', status: 'certifie' } as const;

// Sophie Nicola : burnout + stress élevé + sommeil perturbé
export const REPONSES_SOPHIE = [
  {
    idReponse: 'REP_S01_STR01',
    idQuestionnaire: 'Q_STR_01',
    titre: 'Questionnaire de stress SIIN',
    dateReponse: new Date('2026-06-10'),
    scoresJson: {
      A: { total: 16, max: 20, label: 'Épuisement & énergie' },
      B: { total: 9, max: 12, label: 'Tension & anxiété' },
      C: { total: 7, max: 10, label: 'Somatisation' },
      global: 32,
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 32,
    interpretation: 'Stress élevé — protocole mixte dopaminergique + sérotoninergique (10 jours)',
  },
  {
    idReponse: 'REP_S01_STR02',
    idQuestionnaire: 'Q_STR_02',
    titre: 'Échelle de stress perçu (PSS-10)',
    dateReponse: new Date('2026-06-10'),
    scoresJson: {
      A: { total: 28, max: 40 },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 28,
    interpretation: 'Niveau élevé de stress — désadaptation (risque cardio-métabolique)',
  },
  {
    idReponse: 'REP_S01_STR05',
    idQuestionnaire: 'Q_STR_05',
    titre: 'BMS-10 — Burnout Mesure Short',
    dateReponse: new Date('2026-06-10'),
    scoresJson: {
      A: { total: 54, max: 70, label: 'Épuisement & Burnout' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 54,
    interpretation: 'Burnout sévère — épuisement professionnel avancé',
  },
  {
    idReponse: 'REP_S01_SOM01',
    idQuestionnaire: 'Q_SOM_01',
    titre: 'PSQI — Index de qualité du sommeil de Pittsburgh',
    dateReponse: new Date('2026-06-12'),
    // Longtemps NU parce que le catalogue ne déclarait rien — c'était le
    // plafond du seed, asséré par E2E. Le lot D-038 a levé ce silence : le
    // catalogue déclare `certifie`/`drive` pour `Q_SOM_01` (verdict certify du
    // 2026-07-31 au registre, 0 divergence critique), et le garde
    // `seedCertification.guard.test.ts` exige alors que le bloc la porte.
    scoresJson: {
      habitudes: { heureCoucher: '00h30', heureLever: '07h00', latence: 45, duree: 5.5 },
      perturbations: { total: 8, max: 18 },
      qualite: { total: 4, max: 6 },
      global: 12,
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 12,
    interpretation: 'Mauvais dormeur — qualité de sommeil très altérée (seuil > 5)',
  },
  {
    idReponse: 'REP_S01_INF03',
    idQuestionnaire: 'Q_INF_03',
    titre: 'DNST SIIN — Dopamine, Noradrénaline, Sérotonine, Mélatonine',
    dateReponse: new Date('2026-06-12'),
    scoresJson: {
      DA: { total: 8, max: 15, label: 'Dopamine — Énergie & motivation' },
      NA: { total: 6, max: 15, label: 'Noradrénaline — Confiance & persévérance' },
      SE: { total: 12, max: 15, label: 'Sérotonine — Humeur & impulsivité' },
      ME: { total: 11, max: 15, label: 'Mélatonine — Rythme & socialisation' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: null,
    interpretation:
      'Déficit dominant Dopamine + Noradrénaline — tableau épuisement motivationnel. Sérotonine et Mélatonine abaissées : perturbation nycthémérale.',
  },
];

// Jennifer Martin : anxiété + fatigue chronique + déficit magnésium
export const REPONSES_JENNIFER = [
  {
    idReponse: 'REP_J02_NEU11',
    idQuestionnaire: 'Q_NEU_11',
    titre: 'HAD — Échelle Hospitalière Anxiété-Dépression',
    dateReponse: new Date('2026-06-15'),
    scoresJson: {
      AD: { anxiete: 13, depression: 7 },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 13,
    interpretation:
      'Anxiété probable (≥ 11) — dépression limite (8–10). Suivi psychologique recommandé.',
  },
  {
    idReponse: 'REP_J02_SOM06',
    idQuestionnaire: 'Q_SOM_06',
    titre: 'Questionnaire de Pichot — Fatigue',
    dateReponse: new Date('2026-06-15'),
    scoresJson: {
      A: { total: 19, max: 24, label: 'Évaluation de la fatigue' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 19,
    interpretation: 'Fatigue sévère (≥ 12) — asthénie marquée nécessitant une prise en charge',
  },
  {
    idReponse: 'REP_J02_SOM07',
    idQuestionnaire: 'Q_SOM_07',
    titre: 'MFI-20 — Inventaire multidimensionnel de la fatigue',
    dateReponse: new Date('2026-06-15'),
    // NU, et il le RESTE depuis que le catalogue déclare (D-038) — seule
    // exemption du garde `seedCertification.guard.test.ts`, ancrée sur
    // `motifNonInterpretable` : cette passation est datée du 2026-06-15, donc
    // ANTÉRIEURE à la reconstruction du MFI-20 du 2026-07-31
    // (`passationsNonInterpretables.ts`). Une passation de juin n'a pas pu
    // enregistrer une certification que le moteur ne posait pas encore — la clé
    // ici serait fausse au dossier. Et elle serait inerte à l'écran : la route
    // rend `nonInterpretable`, branche qui PASSE AVANT celle du badge de
    // certification ; sa ligne affiche « Non interprétable », quoi qu'on écrive.
    scoresJson: {
      GF: { total: 17, max: 20, label: 'Fatigue générale & physique' },
      AM: { total: 14, max: 20, label: 'Fatigue mentale & motivation' },
      global: 31,
    },
    scorePrincipal: 31,
    interpretation: 'Fatigue multidimensionnelle sévère — composantes physique et mentale toutes deux impactées',
  },
  {
    idReponse: 'REP_J02_INF02',
    idQuestionnaire: 'Q_INF_02',
    titre: 'Questionnaire de dépistage magnésium / spasmophilie SIIN',
    dateReponse: new Date('2026-06-16'),
    scoresJson: {
      A: { total: 14, max: 24, label: 'Symptômes de déficit en magnésium' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 14,
    interpretation: 'Déficit probable en magnésium (≥ 10) — spasmophilie latente',
  },
  {
    idReponse: 'REP_J02_STR04',
    idQuestionnaire: 'Q_STR_04',
    titre: 'DASS-21 — Dépression, Anxiété, Stress',
    dateReponse: new Date('2026-06-16'),
    scoresJson: {
      D: { total: 10, max: 21, label: 'Humeur & vitalité — Dépression' },
      A: { total: 14, max: 21, label: "Sensations d'anxiété" },
      S: { total: 18, max: 21, label: 'Tension & stress' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: null,
    interpretation:
      'DASS-21 : dépression modérée (10), anxiété sévère (14), stress sévère (18)',
  },
];

// Michel Dogné : céphalées + stress perçu élevé + addiction travail
export const REPONSES_MICHEL = [
  {
    idReponse: 'REP_M03_INF04',
    idQuestionnaire: 'Q_INF_04',
    titre: 'HIT-6 — Test d\'impact des céphalées',
    dateReponse: new Date('2026-06-18'),
    scoresJson: {
      A: { total: 58, max: 78 },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 58,
    interpretation:
      'Impact sévère des céphalées (≥ 56) — forte invalidation dans les activités quotidiennes',
  },
  {
    idReponse: 'REP_M03_STR02',
    idQuestionnaire: 'Q_STR_02',
    titre: 'Échelle de stress perçu (PSS-10)',
    dateReponse: new Date('2026-06-18'),
    scoresJson: {
      A: { total: 31, max: 40 },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 31,
    interpretation: 'Niveau élevé de stress — désadaptation majeure',
  },
  {
    idReponse: 'REP_M03_STR08',
    idQuestionnaire: 'Q_STR_08',
    titre: "WART — Work Addiction Risk Test",
    dateReponse: new Date('2026-06-18'),
    scoresJson: {
      1: { total: 68, max: 100, label: 'Questions 1 à 25 — Addiction au travail' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 68,
    interpretation: 'Workaholisme probable (≥ 67) — profil à risque élevé d\'épuisement professionnel',
  },
  {
    idReponse: 'REP_M03_INF01',
    idQuestionnaire: 'Q_INF_01',
    titre: "Questionnaire d'hyperexcitabilité SIIN",
    dateReponse: new Date('2026-06-20'),
    scoresJson: {
      A: { total: 9, max: 12, label: 'Symptômes neuromusculaires' },
      B: { total: 7, max: 10, label: 'Symptômes cardio-respiratoires & sensoriels' },
      C: { total: 6, max: 10, label: 'Sensibilité & terrain allergique' },
      global: 22,
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: 22,
    interpretation: 'Hyperexcitabilité neuromusculaire sévère — terrain magnésio-dépendant probable',
  },
  {
    idReponse: 'REP_M03_INF03',
    idQuestionnaire: 'Q_INF_03',
    titre: 'DNST SIIN — Dopamine, Noradrénaline, Sérotonine, Mélatonine',
    dateReponse: new Date('2026-06-20'),
    scoresJson: {
      DA: { total: 11, max: 15, label: 'Dopamine — Énergie & motivation' },
      NA: { total: 13, max: 15, label: 'Noradrénaline — Confiance & persévérance' },
      SE: { total: 9, max: 15, label: 'Sérotonine — Humeur & impulsivité' },
      ME: { total: 7, max: 15, label: 'Mélatonine — Rythme & socialisation' },
      certification: CERTIFIE_DRIVE,
    },
    scorePrincipal: null,
    interpretation:
      'Dopamine et Noradrénaline élevées — profil hyperactivité-tension. Déficit Sérotonine + Mélatonine : impulsivité et dérèglement nycthéméral.',
  },
];
