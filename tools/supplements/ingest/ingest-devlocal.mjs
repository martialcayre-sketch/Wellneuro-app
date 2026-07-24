// C4A — Ingestion dev-local par harnais DIRECT Postgres.
//
// Réplique fidèlement la logique de web/src/lib/supplement-library/ingest.ts
// (pointeur version courante → no-op si empreinte identique → sinon nouvelle
// version + déplacement du pointeur dans la MÊME transaction) et l'empreinte de
// web/src/lib/supplement-library/validation.ts, contre une base Postgres
// ÉPHÉMÈRE dev-locale. Ce n'est pas le serveur Next : le contrat de la route
// est prouvé par les tests Vitest ; ici on prouve la chaîne
// parse.mjs → mapping → écriture Postgres → idempotence → versionnage sur
// données réelles.
//
//   node tools/supplements/ingest/ingest-devlocal.mjs \
//     [--fiches ~/.wellneuro/supplements/normalized/fiches.ndjson] \
//     [--pgurl postgresql://<user>@localhost:55434/wn_supplements_ingest] \
//     [--ddl tools/supplements/ingest/ddl-catalogue-devlocal.sql] [--limit N]
//
// Garde-fous (décision n°11) : statut TOUJOURS 'importee' ; verifie_par /
// verifie_le / date_derniere_verification JAMAIS écrits ; cible locale
// uniquement. Aucune donnée patient, aucune activation clinique.

import { createHash, randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { ficheVersPayload } from './ingest.mjs';

const home = os.homedir();
const ICI = path.dirname(fileURLToPath(import.meta.url));
const STATUT_IMPORT = 'importee';

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    fiches: path.join(home, '.wellneuro', 'supplements', 'normalized', 'fiches.ndjson'),
    pgurl: process.env.WN_PG_URL || `postgresql://${os.userInfo().username}@localhost:55434/wn_supplements_ingest`,
    ddl: path.join(ICI, 'ddl-catalogue-devlocal.sql'),
    limit: Infinity,
    forceNonLocal: false,
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--fiches') o.fiches = a[++i];
    else if (a[i] === '--pgurl') o.pgurl = a[++i];
    else if (a[i] === '--ddl') o.ddl = a[++i];
    else if (a[i] === '--limit') o.limit = Number(a[++i]);
    else if (a[i] === '--force-non-local') o.forceNonLocal = true;
  }
  return o;
}

function verifieCibleLocale(pgurl, force) {
  const hote = new URL(pgurl).hostname;
  const locale = hote === 'localhost' || hote === '127.0.0.1' || hote === '::1';
  if (!locale && !force) {
    console.error(`Cible refusée : ${hote} n'est pas locale.`);
    console.error("Cet outil ne charge que des bases éphémères dev-locales (décision n°11).");
    process.exit(1);
  }
}

// ── Empreinte déterministe — réplique de validation.ts contenuSha256ForFiche ──
function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalise(value[key]);
    return out;
  }
  return value;
}

function contenuSha256(fiche) {
  const composition = [...(fiche.compositions ?? [])]
    .map((c, i) => ({
      ingredientId: c.ingredientId,
      formeId: c.formeId ?? null,
      doseParPortion: c.doseParPortion ?? null,
      unite: c.unite ?? null,
      position: c.position ?? i,
    }))
    .sort((a, b) => {
      const parIng = a.ingredientId.localeCompare(b.ingredientId);
      return parIng !== 0 ? parIng : (a.formeId ?? '').localeCompare(b.formeId ?? '');
    });
  const empreinte = canonicalise({
    nomCommercial: fiche.nomCommercial,
    marque: fiche.marque,
    marche: fiche.marche ?? 'FR',
    sourceProvenance: fiche.sourceProvenance,
    sourceIdentifiant: fiche.sourceIdentifiant,
    sourceUrl: fiche.sourceUrl ?? null,
    niveauCompletude: fiche.niveauCompletude,
    donneesManquantes: [...(fiche.donneesManquantes ?? [])].sort(),
    incertitudes: fiche.incertitudes ?? null,
    labels: [...(fiche.labels ?? [])].sort(),
    allergenes: [...(fiche.allergenes ?? [])].sort(),
    excipients: [...(fiche.excipients ?? [])].sort(),
    composition,
  });
  return createHash('sha256').update(JSON.stringify(empreinte), 'utf8').digest('hex');
}

// ── Réplique per-fiche de ingest.ts, en transaction pg (BEGIN/COMMIT) ──
async function ingestUneFiche(client, fiche) {
  const hash = contenuSha256(fiche);
  const cle = [fiche.sourceProvenance, fiche.sourceIdentifiant];
  await client.query('BEGIN');
  try {
    const ptr = await client.query(
      'SELECT product_id FROM supplement_product_versions_courantes WHERE source_provenance=$1 AND source_identifiant=$2',
      cle,
    );
    let courant = null;
    if (ptr.rows[0]) {
      const r = await client.query(
        'SELECT id, version_formulation, contenu_sha256 FROM supplement_products WHERE id=$1',
        [ptr.rows[0].product_id],
      );
      courant = r.rows[0] ?? null;
    }
    if (courant && courant.contenu_sha256 === hash) {
      await client.query('COMMIT');
      return { action: 'inchangee' };
    }

    const agg = await client.query(
      'SELECT max(version_formulation) AS m FROM supplement_products WHERE source_provenance=$1 AND source_identifiant=$2',
      cle,
    );
    const version = (agg.rows[0].m ?? 0) + 1;
    const id = randomUUID();
    await client.query(
      `INSERT INTO supplement_products (
         id, nom_commercial, marque, marche, version_formulation, source_provenance,
         source_identifiant, source_url, statut_fiche, niveau_completude, contenu_sha256,
         donnees_manquantes, incertitudes, labels, allergenes, excipients
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id, fiche.nomCommercial, fiche.marque, fiche.marche ?? 'FR', version, fiche.sourceProvenance,
        fiche.sourceIdentifiant, fiche.sourceUrl ?? null, STATUT_IMPORT, fiche.niveauCompletude, hash,
        fiche.donneesManquantes ?? [], fiche.incertitudes ?? null, fiche.labels ?? [],
        fiche.allergenes ?? [], fiche.excipients ?? [],
        // verifie_par / verifie_le / date_derniere_verification : jamais écrits.
      ],
    );
    let position = 0;
    for (const c of fiche.compositions ?? []) {
      await client.query(
        `INSERT INTO supplement_product_compositions (id, product_id, ingredient_id, forme_id, dose_par_portion, unite, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), id, c.ingredientId, c.formeId ?? null, c.doseParPortion ?? null, c.unite ?? null, c.position ?? position],
      );
      position++;
    }

    if (courant) {
      await client.query(
        'UPDATE supplement_product_versions_courantes SET product_id=$1, updated_at=now() WHERE source_provenance=$2 AND source_identifiant=$3',
        [id, ...cle],
      );
      await client.query('COMMIT');
      return { action: 'nouvelle_version', version, versionPrecedente: courant.version_formulation };
    }
    await client.query(
      'INSERT INTO supplement_product_versions_courantes (id, source_provenance, source_identifiant, product_id) VALUES ($1,$2,$3,$4)',
      [randomUUID(), ...cle, id],
    );
    await client.query('COMMIT');
    return { action: 'creee', version };
  } catch (e) {
    await client.query('ROLLBACK');
    if (e && e.code === '23505') return { action: 'echec', erreur: `Conflit d'unicité ${cle.join('::')}` };
    throw e;
  }
}

async function ingestLot(client, fiches) {
  const cumul = { creee: 0, nouvelle_version: 0, inchangee: 0, echec: 0 };
  for (const f of fiches) {
    const r = await ingestUneFiche(client, f);
    cumul[r.action]++;
  }
  return cumul;
}

async function invariants(client, contexte) {
  const statuts = await client.query(
    'SELECT statut_fiche, count(*)::int n FROM supplement_products GROUP BY statut_fiche ORDER BY n DESC',
  );
  const nonBrouillon = await client.query(
    "SELECT count(*)::int n FROM supplement_products WHERE statut_fiche <> 'importee'",
  );
  const verifies = await client.query(
    'SELECT count(*)::int n FROM supplement_products WHERE verifie_par IS NOT NULL OR verifie_le IS NOT NULL OR date_derniere_verification IS NOT NULL',
  );
  const pointeurs = await client.query('SELECT count(*)::int n FROM supplement_product_versions_courantes');
  console.log(`\n[${contexte}] statuts :`, statuts.rows.map((r) => `${r.statut_fiche}=${r.n}`).join(', '));
  console.log(`[${contexte}] fiches hors 'importee' : ${nonBrouillon.rows[0].n} (invariant : 0)`);
  console.log(`[${contexte}] fiches avec vérification posée : ${verifies.rows[0].n} (invariant : 0)`);
  console.log(`[${contexte}] pointeurs version courante : ${pointeurs.rows[0].n}`);
}

async function demoComposition(client) {
  console.log('\n=== Démo composition + versionnage (FK ingrédient réelle) ===');
  await client.query(
    `INSERT INTO supplement_ingredients (id, code, nom_fr) VALUES
       ('ing_magnesium','magnesium','Magnésium'), ('ing_vitamine_b6','vitamine_b6','Vitamine B6')
     ON CONFLICT (id) DO NOTHING`,
  );
  await client.query(
    `INSERT INTO supplement_ingredient_formes (id, ingredient_id, code, label_fr) VALUES
       ('forme_bisglycinate','ing_magnesium','bisglycinate','Bisglycinate')
     ON CONFLICT (id) DO NOTHING`,
  );

  const base = {
    nomCommercial: 'Magnésium démo',
    marque: 'Labo démo',
    marche: 'FR',
    sourceProvenance: 'saisie_praticien',
    sourceIdentifiant: 'demo-compo-1',
    niveauCompletude: 'bien_documentee',
    donneesManquantes: [],
    labels: [],
    allergenes: [],
    excipients: [],
    compositions: [
      { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParPortion: 300, unite: 'mg', position: 0 },
      { ingredientId: 'ing_vitamine_b6', doseParPortion: 1.4, unite: 'mg', position: 1 },
    ],
  };

  const r1 = await ingestUneFiche(client, base);
  console.log(`  v1 : ${JSON.stringify(r1)}`);
  const r2 = await ingestUneFiche(client, base);
  console.log(`  ré-import identique : ${JSON.stringify(r2)} (attendu inchangee)`);
  const doseModifiee = { ...base, compositions: [{ ...base.compositions[0], doseParPortion: 200 }, base.compositions[1]] };
  const r3 = await ingestUneFiche(client, doseModifiee);
  console.log(`  dose modifiée : ${JSON.stringify(r3)} (attendu nouvelle_version)`);

  const versions = await client.query(
    `SELECT p.version_formulation, count(comp.id)::int AS composants,
            (v.product_id = p.id) AS courante
     FROM supplement_products p
     LEFT JOIN supplement_product_compositions comp ON comp.product_id = p.id
     LEFT JOIN supplement_product_versions_courantes v
       ON v.source_provenance = p.source_provenance AND v.source_identifiant = p.source_identifiant
     WHERE p.source_identifiant = 'demo-compo-1'
     GROUP BY p.version_formulation, courante ORDER BY p.version_formulation`,
  );
  console.log('  versions conservées (append-only) :',
    versions.rows.map((r) => `v${r.version_formulation}(${r.composants} composants${r.courante ? ', COURANTE' : ''})`).join(', '));
}

async function main() {
  const o = parseArgs();
  const debut = Date.now();
  verifieCibleLocale(o.pgurl, o.forceNonLocal);

  const brut = await fsp.readFile(o.fiches, 'utf8').catch(() => null);
  if (brut === null) {
    console.error(`Fiches introuvables : ${o.fiches} — lancer d'abord tools/supplements/import/parse.mjs.`);
    process.exit(1);
  }
  let fiches = brut.split('\n').filter(Boolean).map((l) => JSON.parse(l)).map(ficheVersPayload);
  if (Number.isFinite(o.limit)) fiches = fiches.slice(0, o.limit);

  const client = new pg.Client({ connectionString: o.pgurl });
  await client.connect();
  const ddl = await fsp.readFile(o.ddl, 'utf8');
  await client.query(ddl);
  console.log(`DDL appliqué (${path.basename(o.ddl)}) → ${o.pgurl}`);
  console.log(`Fiches Compl'Alim mappées : ${fiches.length}`);

  const passe1 = await ingestLot(client, fiches);
  console.log(`\nPasse 1 (import) :`, JSON.stringify(passe1));
  await invariants(client, 'après import');

  const passe2 = await ingestLot(client, fiches);
  console.log(`\nPasse 2 (ré-import identique) :`, JSON.stringify(passe2),
    passe2.creee === 0 && passe2.nouvelle_version === 0 ? '→ idempotent ✓' : '→ NON idempotent ✗');

  await demoComposition(client);
  await invariants(client, 'final');

  await client.end();
  console.log(`\nDurée : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
