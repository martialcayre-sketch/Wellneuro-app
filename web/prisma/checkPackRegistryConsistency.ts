/**
 * R3 — rapport de cohérence, lecture seule, entre `packs.qids` (legacy) et le
 * registre relationnel (QuestionnairePack / QuestionnairePackQuestionnaire).
 * N'écrit rien. Utile après le backfill pour vérifier qu'aucun questionnaire
 * n'a été perdu, et plus tard (R4+) comme preuve pour une éventuelle
 * décommission de `packs.qids`.
 *
 * Usage (depuis web/) :
 *   node prisma/runWithAlias.js prisma/checkPackRegistryConsistency.ts
 *
 * Code de sortie non nul si au moins un MISMATCH est trouvé (EMPTY-REGISTRY
 * n'est qu'un avertissement : resolvePackQuestionnaireIds retombe sur le
 * legacy dans ce cas, sans casser l'assignation).
 *
 * TROISIÈME ÉCRITURE DU MÊME PRÉDICAT, ET ELLE DIVERGE DÉLIBÉRÉMENT (LOT-03).
 * `prisma/checks/packs_registre_coherence_v1.sql` — le préflight de production
 * de `release-db.yml` — traite le miroir PRÉSENT MAIS VIDE face à un pack non
 * vide comme un ÉCHEC DUR, là où ce script n'en fait qu'un avertissement. Ce
 * n'est pas une incohérence : ce script sert à CONSTATER après un backfill, le
 * contrat sert à BARRER une release. Un audit et une porte n'ont pas le même
 * seuil. Ne pas « aligner » l'un sur l'autre sans décider lequel fait autorité.
 */
import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSupabaseSslMode, supabasePoolSsl } from '@/lib/postgres';
import { PACKS_REGISTRY, packDoctrineDepuisIdBase } from '@/lib/questionnaires-functional';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL est absent (web/.env.local).');
  process.exit(1);
}

const pool = new Pool({
  connectionString: withSupabaseSslMode(DATABASE_URL),
  ssl: supabasePoolSsl(DATABASE_URL),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const packs = await prisma.pack.findMany({ orderBy: { nom: 'asc' } });
  let mismatches = 0;
  let empty = 0;

  for (const pack of packs) {
    const registryPack = await prisma.questionnairePack.findUnique({
      where: { packId: pack.idPack },
      include: {
        questionnaires: {
          orderBy: { ordre: 'asc' },
          include: { questionnaire: { select: { questionnaireId: true } } },
        },
      },
    });

    if (!registryPack || registryPack.questionnaires.length === 0) {
      empty += 1;
      console.log(`EMPTY-REGISTRY  ${pack.nom} (${pack.idPack}) — legacy=${pack.qids.length} qids`);
      continue;
    }

    const registryQids = registryPack.questionnaires.map(item => item.questionnaire.questionnaireId);
    const registrySet = new Set(registryQids);
    const legacySet = new Set(pack.qids);
    const sameMembers = registrySet.size === legacySet.size && pack.qids.every(qid => registrySet.has(qid));

    if (sameMembers) {
      console.log(`MATCH           ${pack.nom} (${pack.idPack}) — ${registryQids.length} qids`);
    } else {
      mismatches += 1;
      const manquantsRegistre = pack.qids.filter(q => !registrySet.has(q));
      const enTropRegistre = registryQids.filter(q => !legacySet.has(q));
      console.log(`MISMATCH        ${pack.nom} (${pack.idPack})`);
      if (manquantsRegistre.length > 0) console.log(`    absents du registre : ${manquantsRegistre.join(', ')}`);
      if (enTropRegistre.length > 0) console.log(`    en trop dans le registre : ${enTropRegistre.join(', ')}`);
    }
  }

  console.log(`\n${packs.length} pack(s) — MATCH=${packs.length - mismatches - empty} MISMATCH=${mismatches} EMPTY-REGISTRY=${empty}`);

  // Deuxième axe (LOT-03) : la correspondance base ↔ doctrine. Le CI ne peut
  // pas la vérifier — il n'a pas cette base — donc c'est ici, et seulement ici,
  // qu'on voit si un `id_pack` de doctrine a disparu ou si un pack de base
  // reste inconnu du code.
  console.log('\nCorrespondance base ↔ doctrine :');
  const idsBaseVus = new Set(packs.map(pack => pack.idPack));
  let orphelinsDoctrine = 0;

  for (const pack of packs) {
    const doctrine = packDoctrineDepuisIdBase(pack.idPack);
    if (doctrine) {
      console.log(`DOCTRINE        ${pack.nom} (${pack.idPack}) → ${doctrine.id}${doctrine.axeId ? ` [axe ${doctrine.axeId}]` : ''}`);
    } else {
      // Pas une anomalie : un pack composé par le praticien n'a pas de
      // doctrine, et ne doit jamais être une cible d'orientation.
      console.log(`HORS-DOCTRINE   ${pack.nom} (${pack.idPack}) — jamais proposé par l'orientation`);
    }
  }

  for (const item of PACKS_REGISTRY) {
    if (item.idPackBase === null) continue;
    if (!idsBaseVus.has(item.idPackBase)) {
      orphelinsDoctrine += 1;
      console.log(`ORPHELIN        ${item.id} déclare idPackBase=${item.idPackBase}, absent de la base`);
    }
  }

  if (orphelinsDoctrine > 0) {
    console.log(`\n${orphelinsDoctrine} correspondance(s) de doctrine pointent vers un pack absent : le moteur d'orientation ne pourra pas les proposer.`);
  }

  await prisma.$disconnect();
  if (mismatches > 0 || orphelinsDoctrine > 0) process.exit(1);
}

main().catch(async err => {
  console.error('Erreur :', err instanceof Error ? err.message : String(err));
  await prisma.$disconnect();
  process.exit(1);
});
