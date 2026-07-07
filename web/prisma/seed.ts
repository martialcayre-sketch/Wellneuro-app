/**
 * Seed de développement — patients fictifs uniquement.
 * Patients autorisés : Sophie Nicola, Jennifer Martin, Michel Dogne.
 * Aucune donnée réelle. Ne jamais exécuter en production.
 */
import { PrismaClient } from '../src/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSupabaseSslMode } from '../src/lib/postgres';
import { verifierMoteurEquilibre } from '../src/lib/equilibre/score.check';
import { verifierNiveauxPreuve } from '../src/lib/equilibre/evidence.check';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://node@localhost:5433/wellneuro_dev?host=/home/node/pgdata&schema=public';

const pool = new Pool({ connectionString: withSupabaseSslMode(DATABASE_URL) });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PRATICIEN = 'martialcayre@wellneuro.fr';

const PATIENTS = [
  {
    idPatient: 'PAT_SEED_01',
    email: 'sophie.nicola@fictif.wellneuro.fr',
    prenom: 'Sophie',
    nom: 'Nicola',
    dateNaissance: '1985-03-12',
    telephone: '06 11 22 33 44',
    praticienEmail: PRATICIEN,
  },
  {
    idPatient: 'PAT_SEED_02',
    email: 'jennifer.martin@fictif.wellneuro.fr',
    prenom: 'Jennifer',
    nom: 'Martin',
    dateNaissance: '1979-07-28',
    telephone: '06 55 66 77 88',
    praticienEmail: PRATICIEN,
  },
  {
    idPatient: 'PAT_SEED_03',
    email: 'michel.dogne@fictif.wellneuro.fr',
    prenom: 'Michel',
    nom: 'Dogne',
    dateNaissance: '1971-11-05',
    telephone: '06 99 00 11 22',
    praticienEmail: PRATICIEN,
  },
];

// ─── Réponses questionnaires fictives ────────────────────────────────────────
// Sophie Nicola : burnout + stress élevé + sommeil perturbé
const REPONSES_SOPHIE = [
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
    },
    scorePrincipal: 54,
    interpretation: 'Burnout sévère — épuisement professionnel avancé',
  },
  {
    idReponse: 'REP_S01_SOM01',
    idQuestionnaire: 'Q_SOM_01',
    titre: 'PSQI — Index de qualité du sommeil de Pittsburgh',
    dateReponse: new Date('2026-06-12'),
    scoresJson: {
      habitudes: { heureCoucher: '00h30', heureLever: '07h00', latence: 45, duree: 5.5 },
      perturbations: { total: 8, max: 18 },
      qualite: { total: 4, max: 6 },
      global: 12,
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
    },
    scorePrincipal: null,
    interpretation:
      'Déficit dominant Dopamine + Noradrénaline — tableau épuisement motivationnel. Sérotonine et Mélatonine abaissées : perturbation nycthémérale.',
  },
];

// Jennifer Martin : anxiété + fatigue chronique + déficit magnésium
const REPONSES_JENNIFER = [
  {
    idReponse: 'REP_J02_NEU11',
    idQuestionnaire: 'Q_NEU_11',
    titre: 'HAD — Échelle Hospitalière Anxiété-Dépression',
    dateReponse: new Date('2026-06-15'),
    scoresJson: {
      AD: { anxiete: 13, depression: 7 },
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
    },
    scorePrincipal: 19,
    interpretation: 'Fatigue sévère (≥ 12) — asthénie marquée nécessitant une prise en charge',
  },
  {
    idReponse: 'REP_J02_SOM07',
    idQuestionnaire: 'Q_SOM_07',
    titre: 'MFI-20 — Inventaire multidimensionnel de la fatigue',
    dateReponse: new Date('2026-06-15'),
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
    },
    scorePrincipal: null,
    interpretation:
      'DASS-21 : dépression modérée (10), anxiété sévère (14), stress sévère (18)',
  },
];

// Michel Dogne : céphalées + stress perçu élevé + addiction travail
const REPONSES_MICHEL = [
  {
    idReponse: 'REP_M03_INF04',
    idQuestionnaire: 'Q_INF_04',
    titre: 'HIT-6 — Test d\'impact des céphalées',
    dateReponse: new Date('2026-06-18'),
    scoresJson: {
      A: { total: 58, max: 78 },
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
    },
    scorePrincipal: null,
    interpretation:
      'Dopamine et Noradrénaline élevées — profil hyperactivité-tension. Déficit Sérotonine + Mélatonine : impulsivité et dérèglement nycthéméral.',
  },
];

async function seed() {
  console.log('Seed démarré...\n');

  for (const patient of PATIENTS) {
    await prisma.patient.upsert({
      where: { idPatient: patient.idPatient },
      update: {},
      create: patient,
    });
    console.log(`Patient créé/existant : ${patient.prenom} ${patient.nom} (${patient.idPatient})`);
  }

  const allReponses = [
    { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr', reponses: REPONSES_SOPHIE },
    { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr', reponses: REPONSES_JENNIFER },
    { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr', reponses: REPONSES_MICHEL },
  ];

  for (const { idPatient, email, reponses } of allReponses) {
    for (const r of reponses) {
      await prisma.questionnaireReponse.upsert({
        where: { idReponse: r.idReponse },
        update: {},
        create: {
          idReponse: r.idReponse,
          idPatient,
          emailPatient: email,
          idQuestionnaire: r.idQuestionnaire,
          titre: r.titre,
          dateReponse: r.dateReponse,
          scoresJson: r.scoresJson,
          scorePrincipal: r.scorePrincipal,
          interpretation: r.interpretation,
        },
      });
    }
    console.log(`  → ${reponses.length} questionnaires insérés pour ${idPatient}`);
  }

  console.log('\nSeed terminé.');

  // Vérification zéro-dépendance du moteur "Mon équilibre" (feat/e2-scoring-engine).
  // N'écrit rien en base — purement du calcul en mémoire.
  if (process.env.SEED_VERIFY_EQUILIBRE_SCORE === '1') {
    verifierMoteurEquilibre();
    verifierNiveauxPreuve();
  }
}

seed()
  .catch(e => {
    console.error('Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
