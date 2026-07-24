// LOT-02a — Chargement dev-local des fiches Compl'Alim en BROUILLONS.
//
// Réplique le motif de tools/corpus/ingest/devlocal.mjs : client pg direct
// contre une base PostgreSQL ÉPHÉMÈRE dev-locale, transaction par lot,
// vérifications après coup. Ce n'est jamais un chemin vers la production —
// décision n°11 du moteur d'intention : une source externe ne produit que des
// brouillons de candidats (`statut = 'importee'`), soumis à revue praticien.
//
// Garde-fous codés en dur :
//   - `statut` inséré : toujours 'importee'. L'outil ne pose JAMAIS 'verifiee'.
//   - `derniere_verification` : toujours NULL à l'import.
//   - le ré-import ne met à jour QUE les fiches encore en 'importee' — une
//     fiche vérifiée ou inactivée par le praticien n'est jamais écrasée.
//   - refus de démarrer si l'URL cible n'est pas locale (localhost/127.0.0.1),
//     à moins de passer --force-non-local (réservé aux bases jetables de CI).
//
//   node tools/supplements/import/stage-devlocal.mjs \
//     [--fiches ~/.wellneuro/supplements/normalized/fiches.ndjson] \
//     [--pgurl postgresql://<user>@localhost:55433/wn_supplements_dev] \
//     [--ddl tools/supplements/import/ddl-attendu.sql] [--batch 500]

import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const home = os.homedir();
const ICI = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    fiches: path.join(home, '.wellneuro', 'supplements', 'normalized', 'fiches.ndjson'),
    pgurl: process.env.WN_PG_URL || `postgresql://${os.userInfo().username}@localhost:55433/wn_supplements_dev`,
    ddl: path.join(ICI, 'ddl-attendu.sql'),
    batch: 500,
    forceNonLocal: false,
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--fiches') o.fiches = a[++i];
    else if (a[i] === '--pgurl') o.pgurl = a[++i];
    else if (a[i] === '--ddl') o.ddl = a[++i];
    else if (a[i] === '--batch') o.batch = Number(a[++i]);
    else if (a[i] === '--force-non-local') o.forceNonLocal = true;
  }
  return o;
}

function verifieCibleLocale(pgurl, force) {
  const hote = new URL(pgurl).hostname;
  const locale = hote === 'localhost' || hote === '127.0.0.1' || hote === '::1';
  if (!locale && !force) {
    console.error(`Cible refusée : ${hote} n'est pas locale.`);
    console.error('Cet outil ne charge que des bases éphémères dev-locales (décision n°11 :');
    console.error('jamais d\'écriture directe en base active depuis une source externe).');
    process.exit(1);
  }
}

const STATUT_IMPORT = 'importee'; // seul statut que l'outil écrit, sans exception

async function insereFiche(client, fiche) {
  const p = fiche.produit;
  const q = fiche.qualite;
  const prov = fiche.provenance;
  const id = fiche.sourceId; // identifiant déterministe — ré-import idempotent

  const res = await client.query(
    `INSERT INTO supplement_products (
       id, source_id, id_complalim, teleicare_id, numero_declaration_teleicare,
       nom_commercial, marque, gamme, responsable, article_procedure,
       decision, date_decision, date_retrait, forme_galenique, dose_journaliere,
       mode_emploi, mises_en_garde, aromes, objectifs_effet, populations_cibles,
       facteurs_risques, source_libelle, source_url, source_licence,
       source_date_telechargement, statut, niveau_completude,
       donnees_manquantes, incertitudes, derniere_verification
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::date,$13::date,$14,$15,
       $16,$17,$18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22,$23,$24,
       $25::date,$26,$27,$28::jsonb,$29::jsonb,NULL
     )
     ON CONFLICT (source_id) DO UPDATE SET
       nom_commercial = EXCLUDED.nom_commercial, marque = EXCLUDED.marque,
       gamme = EXCLUDED.gamme, responsable = EXCLUDED.responsable,
       article_procedure = EXCLUDED.article_procedure, decision = EXCLUDED.decision,
       date_decision = EXCLUDED.date_decision, date_retrait = EXCLUDED.date_retrait,
       forme_galenique = EXCLUDED.forme_galenique, dose_journaliere = EXCLUDED.dose_journaliere,
       mode_emploi = EXCLUDED.mode_emploi, mises_en_garde = EXCLUDED.mises_en_garde,
       aromes = EXCLUDED.aromes, objectifs_effet = EXCLUDED.objectifs_effet,
       populations_cibles = EXCLUDED.populations_cibles, facteurs_risques = EXCLUDED.facteurs_risques,
       source_libelle = EXCLUDED.source_libelle, source_url = EXCLUDED.source_url,
       source_licence = EXCLUDED.source_licence,
       source_date_telechargement = EXCLUDED.source_date_telechargement,
       niveau_completude = EXCLUDED.niveau_completude,
       donnees_manquantes = EXCLUDED.donnees_manquantes,
       incertitudes = EXCLUDED.incertitudes,
       importe_le = now(), updated_at = now()
     WHERE supplement_products.statut = 'importee'
     RETURNING id`,
    [
      id, fiche.sourceId, p.idComplAlim, p.teleicareId, p.numeroDeclarationTeleicare,
      p.nomCommercial ?? '(sans nom)', p.marque, p.gamme, JSON.stringify(p.responsable),
      p.articleProcedure, p.decision, p.dateDecision, p.dateRetrait, p.formeGalenique,
      p.doseJournaliere, p.modeEmploi, p.misesEnGarde, JSON.stringify(p.aromes),
      JSON.stringify(p.objectifsEffet), JSON.stringify(p.populationsCibles),
      JSON.stringify(p.facteursRisques), prov.source, prov.urlFichier, prov.licence,
      prov.dateTelechargement, STATUT_IMPORT, q.niveauCompletude,
      JSON.stringify(q.donneesManquantes), JSON.stringify(q.incertitudes),
    ],
  );
  const protegee = res.rowCount === 0; // fiche vérifiée/inactivée : jamais écrasée
  if (protegee) return { protegee: true, composants: 0 };

  await client.query('DELETE FROM supplement_product_compositions WHERE product_id = $1', [id]);
  const c = fiche.composition;
  const composants = [
    ...c.plantes.map((x) => ['plante', x.nom, x, x.doseParDjr, x.unite]),
    ...c.microOrganismes.map((x) => ['micro_organisme', [x.genre, x.espece, x.souche].filter(Boolean).join(' ') || null, x, x.doseParDjr, x.unite]),
    ...c.substances.map((x) => ['substance', x.nom, x, x.doseParDjr, x.unite]),
    ...c.nutriments.map((x) => ['nutriment', x, {}, null, null]),
    ...c.autresIngredientsActifs.map((x) => ['autre_actif', x, {}, null, null]),
    ...c.ingredientsInactifs.map((x) => ['ingredient_inactif', x, {}, null, null]),
    ...c.additifs.map((x) => ['additif', x, {}, null, null]),
  ];
  let n = 0;
  for (const [type, nom, details, dose, unite] of composants) {
    n++;
    await client.query(
      `INSERT INTO supplement_product_compositions (id, product_id, type_composant, nom, details, dose_par_djr, unite)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [`${id}-${String(n).padStart(3, '0')}`, id, type, nom, JSON.stringify(details), dose, unite],
    );
  }
  return { protegee: false, composants: n };
}

async function main() {
  const o = parseArgs();
  const debut = Date.now();
  verifieCibleLocale(o.pgurl, o.forceNonLocal);

  const brut = await fsp.readFile(o.fiches, 'utf8').catch(() => null);
  if (brut === null) {
    console.error(`Fiches introuvables : ${o.fiches} — lancer d'abord import/parse.mjs.`);
    process.exit(1);
  }
  const fiches = brut.split('\n').filter(Boolean).map((l) => JSON.parse(l));

  const client = new pg.Client({ connectionString: o.pgurl });
  await client.connect();

  const ddl = await fsp.readFile(o.ddl, 'utf8');
  await client.query(ddl);
  console.log(`DDL appliqué (${path.basename(o.ddl)}) → ${o.pgurl}`);

  let inserees = 0;
  let protegees = 0;
  let composants = 0;
  for (let i = 0; i < fiches.length; i += o.batch) {
    const lot = fiches.slice(i, i + o.batch);
    await client.query('BEGIN');
    for (const fiche of lot) {
      const r = await insereFiche(client, fiche);
      if (r.protegee) protegees++;
      else { inserees++; composants += r.composants; }
    }
    await client.query('COMMIT');
  }

  // Vérifications après coup — l'outil prouve qu'il n'a produit QUE des brouillons.
  const statuts = await client.query(
    `SELECT statut, count(*)::int AS n FROM supplement_products GROUP BY statut ORDER BY n DESC`,
  );
  const niveaux = await client.query(
    `SELECT niveau_completude, count(*)::int AS n FROM supplement_products
     WHERE statut = 'importee' GROUP BY niveau_completude ORDER BY n DESC`,
  );
  const verif = await client.query(
    `SELECT count(*)::int AS n FROM supplement_products
     WHERE statut = 'importee' AND derniere_verification IS NOT NULL`,
  );
  await client.end();

  const s = (Date.now() - debut) / 1000;
  console.log(`\nFiches chargées en brouillon : ${inserees} (statut '${STATUT_IMPORT}')`);
  if (protegees > 0) console.log(`Fiches protégées non écrasées (vérifiées/inactivées) : ${protegees}`);
  console.log(`Composants de composition : ${composants}`);
  console.log(`Durée : ${s.toFixed(1)} s\n`);
  console.log('Statuts en base :', statuts.rows.map((r) => `${r.statut}=${r.n}`).join(', '));
  console.log('Complétude des brouillons :', niveaux.rows.map((r) => `${r.niveau_completude}=${r.n}`).join(', '));
  console.log(`Brouillons portant une date de vérification : ${verif.rows[0].n} (invariant : toujours 0 — jamais posée par l'outil)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
