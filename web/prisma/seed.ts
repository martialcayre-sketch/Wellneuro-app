/**
 * Seed de développement — patients fictifs uniquement.
 * Patients autorisés : Sophie Nicola, Jennifer Martin, Michel Dogné.
 * Aucune donnée réelle. Ne jamais exécuter en production.
 */
import { PrismaClient } from '../src/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSupabaseSslMode, supabasePoolSsl } from '../src/lib/postgres';
import { REPONSES_SOPHIE, REPONSES_JENNIFER, REPONSES_MICHEL } from './seedReponses';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://node@localhost:5433/wellneuro_dev?host=/home/node/pgdata&schema=public';

const pool = new Pool({
  connectionString: withSupabaseSslMode(DATABASE_URL),
  ssl: supabasePoolSsl(DATABASE_URL),
});
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
    nom: 'Dogné',
    dateNaissance: '1971-11-05',
    telephone: '06 99 00 11 22',
    praticienEmail: PRATICIEN,
  },
];

// Les réponses fictives vivent dans `seedReponses.ts` — un module de données
// PUR, importé en tête de ce fichier. La raison est écrite dans son en-tête :
// `seed()` s'exécute au chargement de CE fichier-ci, qui n'est donc pas
// importable depuis un banc.

// Pack de base assigné automatiquement en fin d'onboarding portail
// (`/api/portail/valider`). La composition reflète l'état réel de production
// (5 qids, `Q_SOM_09` inclus depuis son ajout au pack ; réaligné le
// 2026-08-06) — sans lui, une base fraîchement provisionnée (CI, nouvel
// environnement de dev) n'a aucun pack et l'onboarding échoue.
// Le miroir relationnel de ce pack est écrit juste après, et ce n'est plus
// facultatif depuis le LOT-03. Ce seed ne l'écrivait pas, au motif que le repli
// legacy de `resolvePackQuestionnaireIds` protégeait la LECTURE — c'était vrai.
// Mais l'ÉCRITURE refuse désormais un qid sans `QuestionnaireDefinition`
// (`syncPackToRegistry`) : sans définitions, toute création, modification ou
// désactivation de pack rendrait 409 sur une base seedée, et l'écran des packs
// serait inutilisable en développement. Un garde qui casse le dev finit par
// recevoir une exception ; on rend plutôt le seed fidèle.
const PACK_BASE = {
  idPack: 'PACK_SEED_BASE',
  nom: 'Base de consultation',
  thematique: null,
  description: null,
  qids: ['Q_MOD_03', 'Q_MOD_01', 'Q_INF_03', 'Q_SOM_09', 'Q_ALI_01'],
  actif: true,
  parDefaut: true,
};

// Le miroir relationnel du pack de base : une catégorie, une définition par
// qid, puis les items du pack — la même forme que produit `syncPackToRegistry`.
//
// POURQUOI EN DUR PLUTÔT QU'EN APPELANT LE BACKFILL. `backfillQuestionnaireRegistry.ts`
// crée les 66 définitions du catalogue et resynchronise TOUS les packs : c'est
// un outil d'administration, pas un seed. Ici on ne pose que ce que le pack de
// base référence, avec des titres neutres — l'écran des questionnaires lit le
// catalogue de code, jamais ces lignes.
//
// Idempotent : le seed est rejoué à chaque provisionnement de base éphémère.
async function seedMiroirRelationnel() {
  // Le pack de base n'est créé que s'il n'existe aucun pack par défaut actif.
  // Écrire son miroir sans lui produirait un MIROIR ORPHELIN — précisément ce
  // que `prisma/checks/packs_registre_coherence_v1.sql` refuse.
  //
  // ON MIROITE `packBase.qids`, LA LIGNE EN BASE — JAMAIS `PACK_BASE.qids`, LA
  // CONSTANTE. Les deux divergent dès que la ligne existait déjà : l'upsert
  // ci-dessus est un `update: {}`, il ne réaligne rien. Deux chemins ordinaires
  // y mènent — un pack de base édité depuis l'écran en dev, et tout changement
  // futur de la constante (il y en a eu un, `Q_SOM_09` ajouté le 2026-08-06).
  // Miroiter la constante fabriquerait alors exactement la dérive du
  // 2026-08-05, sur le pack qui part à CHAQUE onboarding.
  const packBase = await prisma.pack.findUnique({
    where: { idPack: PACK_BASE.idPack },
    select: { idPack: true, nom: true, actif: true, qids: true },
  });
  if (!packBase) {
    console.log('Miroir relationnel : pack de base du seed absent, rien à écrire');
    return;
  }
  const qids = Array.from(new Set(packBase.qids));

  const categorie = await prisma.questionnaireCategory.upsert({
    where: { code: 'SEED_BASE' },
    update: {},
    create: { code: 'SEED_BASE', labelFr: 'Pack de base (seed)', ordreAffichage: 0, actif: true },
    select: { id: true },
  });

  for (const qid of qids) {
    await prisma.questionnaireDefinition.upsert({
      where: { questionnaireId: qid },
      update: {},
      create: {
        questionnaireId: qid,
        slug: qid.toLowerCase().replace(/_/g, '-'),
        titre: qid,
        categoriePrincipaleId: categorie.id,
        niveau: 'socle',
        publicCible: 'adulte',
      },
      select: { id: true },
    });
  }

  const miroir = await prisma.questionnairePack.upsert({
    where: { packId: packBase.idPack },
    update: { titre: packBase.nom, actif: packBase.actif },
    create: {
      packId: packBase.idPack,
      titre: packBase.nom,
      niveau: 'approfondissement',
      actif: packBase.actif,
    },
    select: { id: true },
  });

  const definitions = await prisma.questionnaireDefinition.findMany({
    where: { questionnaireId: { in: qids } },
    select: { id: true, questionnaireId: true },
  });
  const parQid = new Map(definitions.map(d => [d.questionnaireId, d.id]));

  // Purge puis recréation, comme `syncPackToRegistry` : c'est ce qui rend le
  // geste idempotent et l'ordre fidèle à ce que porte la ligne `packs`.
  await prisma.questionnairePackQuestionnaire.deleteMany({ where: { packId: miroir.id } });
  await prisma.questionnairePackQuestionnaire.createMany({
    data: qids.map((qid, ordre) => ({
      packId: miroir.id,
      questionnaireId: parQid.get(qid) as string,
      ordre,
    })),
  });

  console.log(`Miroir relationnel du pack de base : ${qids.length} questionnaire(s) (lus en base)`);
}

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

  const parDefautExistant = await prisma.pack.findFirst({ where: { parDefaut: true, actif: true } });
  if (!parDefautExistant) {
    await prisma.pack.upsert({
      where: { idPack: PACK_BASE.idPack },
      update: {},
      create: PACK_BASE,
    });
    console.log(`Pack par défaut créé : ${PACK_BASE.nom} (${PACK_BASE.idPack})`);
  } else {
    console.log(`Pack par défaut déjà présent : ${parDefautExistant.nom} (${parDefautExistant.idPack})`);
  }

  await seedMiroirRelationnel();

  const allReponses = [
    { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr', reponses: REPONSES_SOPHIE },
    { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr', reponses: REPONSES_JENNIFER },
    { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr', reponses: REPONSES_MICHEL },
  ];

  for (const { idPatient, email, reponses } of allReponses) {
    for (const r of reponses) {
      await prisma.questionnaireReponse.upsert({
        where: { idReponse: r.idReponse },
        // `update: {}` — CET UPSERT NE RÉALIGNE RIEN, et c'est voulu : un seed
        // qui réécrirait les passations existantes effacerait le travail en
        // cours sur une base de dev.
        //
        // CE QU'IL FAUT EN SAVOIR AVANT DE DÉBOGUER (LOT-04, 2026-08-09) : les
        // clés `certification` posées plus haut ne sont donc écrites QUE sur
        // une base où les lignes `REP_*` n'existent pas encore — base éphémère
        // de `test:worktree`, CI, environnement neuf. Sur une base de dev déjà
        // seedée, elles restent absentes, la colonne « Qualité » de la fiche
        // continue d'afficher « Historique », et `e2e/fiche-detail-reponses`
        // échoue sur un symptôme qui ne dit rien du code. Le remède est de
        // supprimer les lignes concernées, pas de toucher à cet `update`.
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

  // Vérification zéro-dépendance du moteur "Mon équilibre" est maintenant
  // couverte par Vitest (packRegistryLogic.test.ts, objetsCliniques.test.ts, etc.).
  // Cette variable env n'est plus utilisée.
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
