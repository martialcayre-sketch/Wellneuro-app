/**
 * Backfill R3 — registre relationnel packs/questionnaires.
 *
 * Seed idempotent de QuestionnaireCategory + QuestionnaireDefinition depuis
 * les catalogues statiques (aucune donnée patient), puis synchronisation de
 * QuestionnairePackQuestionnaire pour chaque Pack existant via la même
 * fonction (`syncPackToRegistry`) que la route praticien /api/praticien/packs
 * utilise en production — pas de logique dupliquée.
 *
 * N'écrit jamais dans `packs.qids` (source legacy, inchangée) : ce script ne
 * fait qu'alimenter le registre dérivé, en overwrite idempotent (upsert par
 * clé unique) — aucune suppression hors du périmètre déjà géré par
 * syncPackToRegistry (deleteMany borné à un seul packId avant recreate).
 *
 * Usage (depuis web/) :
 *   node prisma/runWithAlias.js prisma/backfillQuestionnaireRegistry.ts --dry-run
 *   node prisma/runWithAlias.js prisma/backfillQuestionnaireRegistry.ts --apply
 *
 * --dry-run (ou aucun flag) : aperçu uniquement, aucune écriture.
 * --apply : exécute réellement le seed + la synchronisation.
 */
import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSupabaseSslMode, supabasePoolSsl } from '@/lib/postgres';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import { FUNCTIONAL_CATEGORIES, getQuestionnaireFunctionalMetadata } from '@/lib/questionnaires-functional';
import { syncPackToRegistry } from '@/lib/consultation/packRegistry';

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

// Placeholders documentés : ces deux colonnes sont requises par le schéma
// mais n'ont aucune source de vérité par questionnaire aujourd'hui, et ne
// sont lues par aucun code applicatif — métadonnée de catalogue, pas un
// seuil clinique. À curer plus tard si un besoin de lecture apparaît.
const NIVEAU_PLACEHOLDER = 'standard';
const PUBLIC_CIBLE_PLACEHOLDER = 'patient';

type DefinitionSource = { id: string; titre: string; legacyCategory: string; actif: boolean };

// Ids réellement référencés par des packs mais absents de QUESTIONNAIRES_CATALOG
// (catalogue d'affichage) : recatégorisations connues où le nouvel id existe
// dans le catalogue de scoring (web/src/lib/questions.ts) mais n'a jamais été
// ajouté au catalogue d'affichage — Q_STR_07 → Q_NEU_11 et Q_SOM_08 → Q_NEU_12
// (cf. en-têtes de questionnaires-catalog.ts et questions.ts). Un override
// explicite existe déjà pour ces deux ids dans questionnaires-functional.ts
// (QUESTIONNAIRE_OVERRIDES), donc categoriePrincipale ne dépend pas de la
// `legacyCategory` indicative fournie ici — elle trace juste la lignée.
const EXTRA_DEFINITIONS: DefinitionSource[] = [
  { id: 'Q_NEU_11', titre: 'HAD — Échelle Hospitalière Anxiété-Dépression', legacyCategory: 'Stress', actif: true },
  { id: 'Q_NEU_12', titre: 'IDTAS-AE — Inventaire Diagnostique des Troubles Affectifs Saisonniers (auto-évaluation)', legacyCategory: 'Sommeil', actif: true },
];

function buildDefinitionSources(): DefinitionSource[] {
  const byId = new Map<string, DefinitionSource>();
  for (const entry of QUESTIONNAIRES_CATALOG) {
    byId.set(entry.id, { id: entry.id, titre: entry.titre, legacyCategory: entry.categorie, actif: entry.actif });
  }
  for (const extra of EXTRA_DEFINITIONS) {
    if (!byId.has(extra.id)) byId.set(extra.id, extra);
  }
  return Array.from(byId.values());
}

function slugify(questionnaireId: string): string {
  return questionnaireId.toLowerCase().replace(/_/g, '-');
}

async function main() {
  const apply = process.argv.includes('--apply');

  // 1. Pré-vérification de couverture : tout qid référencé par un pack
  //    existant doit être couvert par les sources de définition (catalogue
  //    d'affichage + extras connus ci-dessus), sinon on arrête avant toute
  //    écriture (c'est précisément le type de trou qui a rendu
  //    syncPackToRegistry silencieusement vide depuis son déploiement).
  const definitionSources = buildDefinitionSources();
  const packs = await prisma.pack.findMany();
  const catalogueIds = new Set(definitionSources.map(d => d.id));
  const manquants: { idPack: string; nom: string; qid: string }[] = [];
  for (const pack of packs) {
    for (const qid of pack.qids) {
      if (!catalogueIds.has(qid)) manquants.push({ idPack: pack.idPack, nom: pack.nom, qid });
    }
  }
  if (manquants.length > 0) {
    console.error('Abandon : qids référencés par des packs mais absents de toute source de définition connue :');
    for (const m of manquants) console.error(`  - ${m.qid} (pack "${m.nom}" / ${m.idPack})`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const totalQidsReferences = packs.reduce((sum, p) => sum + p.qids.length, 0);
  console.log('=== Aperçu (aucune écriture pour l\'instant) ===');
  console.log(`Catégories à upsert         : ${FUNCTIONAL_CATEGORIES.length}`);
  console.log(`Définitions de questionnaire à upsert : ${definitionSources.length} (${QUESTIONNAIRES_CATALOG.length} catalogue affichage + ${definitionSources.length - QUESTIONNAIRES_CATALOG.length} extras connus)`);
  console.log(`Packs existants à synchroniser        : ${packs.length}`);
  console.log(`Total qids référencés (tous packs)    : ${totalQidsReferences}`);
  console.log(`Couverture                            : OK (0 qid manquant)`);

  if (!apply) {
    console.log('\nMode dry-run (par défaut) : aucune écriture effectuée. Relancer avec --apply pour exécuter.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n=== Exécution (--apply) ===');

  // 2. Seed QuestionnaireCategory (idempotent, clé unique `code`).
  const categoryIdByCode = new Map<string, string>();
  for (const [index, cat] of FUNCTIONAL_CATEGORIES.entries()) {
    const row = await prisma.questionnaireCategory.upsert({
      where: { code: cat.id },
      create: { code: cat.id, labelFr: cat.titre, ordreAffichage: index, actif: true },
      update: { labelFr: cat.titre },
      select: { id: true },
    });
    categoryIdByCode.set(cat.id, row.id);
  }
  console.log(`Catégories upsert : ${categoryIdByCode.size}/${FUNCTIONAL_CATEGORIES.length}`);

  // 3. Seed QuestionnaireDefinition (idempotent, clé unique `questionnaireId`).
  let definitionsUpserted = 0;
  for (const entry of definitionSources) {
    const metadata = getQuestionnaireFunctionalMetadata(entry.id, entry.legacyCategory);
    const categoriePrincipaleId = categoryIdByCode.get(metadata.categoriePrincipale);
    if (!categoriePrincipaleId) {
      console.error(`Abandon : catégorie "${metadata.categoriePrincipale}" introuvable pour ${entry.id} (ne devrait pas arriver, catégories seedées juste avant).`);
      await prisma.$disconnect();
      process.exit(1);
    }
    await prisma.questionnaireDefinition.upsert({
      where: { questionnaireId: entry.id },
      create: {
        questionnaireId: entry.id,
        slug: slugify(entry.id),
        titre: entry.titre,
        categoriePrincipaleId,
        niveau: NIVEAU_PLACEHOLDER,
        publicCible: PUBLIC_CIBLE_PLACEHOLDER,
        actif: entry.actif,
      },
      update: {
        titre: entry.titre,
        categoriePrincipaleId,
        actif: entry.actif,
      },
    });
    definitionsUpserted += 1;
  }
  console.log(`Définitions de questionnaire upsert : ${definitionsUpserted}/${definitionSources.length}`);

  // 4. Backfill QuestionnairePackQuestionnaire pour chaque pack existant, via
  //    la même fonction que la route praticien (une transaction par pack).
  let matches = 0;
  for (const pack of packs) {
    await prisma.$transaction(tx =>
      syncPackToRegistry(tx, {
        idPack: pack.idPack,
        nom: pack.nom,
        description: pack.description,
        actif: pack.actif,
        qids: pack.qids,
      })
    );
    const count = await prisma.questionnairePackQuestionnaire.count({
      where: { pack: { packId: pack.idPack } },
    });
    const statut = count === pack.qids.length ? 'MATCH' : `MISMATCH (registre=${count}, legacy=${pack.qids.length})`;
    if (count === pack.qids.length) matches += 1;
    console.log(`  - ${pack.nom} (${pack.idPack}) : ${statut}`);
  }
  console.log(`\nPacks synchronisés : ${matches}/${packs.length} en MATCH exact.`);

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('Erreur backfill :', err instanceof Error ? err.message : String(err));
  await prisma.$disconnect();
  process.exit(1);
});
