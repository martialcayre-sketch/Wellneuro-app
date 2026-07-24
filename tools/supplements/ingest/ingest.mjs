// C4A — Étage ingest (production) : lit les fiches normalisées de parse.mjs et
// les POSTe vers /api/internal/supplements/ingest, par lots ≤ 500, en
// BROUILLONS (décision n°11 : une source externe ne produit que des candidats
// en statut 'importee', jamais 'verifiee').
//
// Même motif que tools/corpus/ingest/ingest.mjs. Deux modes :
//   --dry-run   hors-ligne : n'ouvre aucune connexion, ne lit pas le secret,
//               affiche la forme des lots (comptes + première fiche mappée).
//   (défaut)    POST réel vers $WN_SUPPLEMENTS_URL (défaut http://localhost:3000).
//
//   node tools/supplements/ingest/ingest.mjs \
//     [--fiches ~/.wellneuro/supplements/normalized/fiches.ndjson] \
//     [--batch 500] [--limit N] [--url https://app.wellneuro.fr] [--dry-run]
//
// Requiert (mode POST) : SUPPLEMENTS_INTERNAL_SECRET dans l'environnement —
// jamais en dur, jamais affiché. Le serveur re-valide vocabulaires, unités et
// force le statut brouillon. Aucune donnée patient.

import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const home = os.homedir();
const DEFAUT_FICHES = path.join(home, '.wellneuro', 'supplements', 'normalized', 'fiches.ndjson');
const MAX_BATCH = 500;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    fiches: DEFAUT_FICHES,
    batch: MAX_BATCH,
    limit: Infinity,
    url: process.env.WN_SUPPLEMENTS_URL || 'http://localhost:3000',
    dryRun: false,
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--fiches') o.fiches = a[++i];
    else if (a[i] === '--batch') o.batch = Math.min(Number(a[++i]), MAX_BATCH);
    else if (a[i] === '--limit') o.limit = Number(a[++i]);
    else if (a[i] === '--url') o.url = a[++i];
    else if (a[i] === '--dry-run') o.dryRun = true;
  }
  return o;
}

// parse.mjs → payload d'ingestion. La composition Compl'Alim est NOMINATIVE
// (noms de plantes/substances) : le schéma catalogue lie chaque composant au
// pivot clinique supplement_ingredients (FK). La résolution nominatif →
// ingrédient est un geste AVAL (LOT-03) — la voie d'ingestion importe donc le
// produit en brouillon SANS ligne de composition ; celle-ci est attachée à la
// résolution. Rien n'est perdu de traçable : provenance et complétude portent
// l'état.
export function ficheVersPayload(fiche) {
  const p = fiche.produit ?? {};
  const prov = fiche.provenance ?? {};
  const q = fiche.qualite ?? {};
  const identifiant = Number.isFinite(p.idComplAlim) ? String(p.idComplAlim) : fiche.sourceId;
  const incertitudes = Array.isArray(q.incertitudes) && q.incertitudes.length
    ? q.incertitudes.join(' ; ')
    : undefined;

  return {
    nomCommercial: p.nomCommercial ?? '(sans nom commercial)',
    marque: p.marque ?? '(marque non renseignée)',
    marche: 'FR',
    sourceProvenance: 'complalim',
    sourceIdentifiant: identifiant,
    sourceUrl: prov.urlFichier ?? prov.urlJeu ?? undefined,
    niveauCompletude: q.niveauCompletude,
    donneesManquantes: Array.isArray(q.donneesManquantes) ? q.donneesManquantes : [],
    incertitudes,
    labels: [],
    allergenes: [],
    excipients: [],
    compositions: [],
  };
}

function decouperLots(fiches, taille) {
  const lots = [];
  for (let i = 0; i < fiches.length; i += taille) lots.push(fiches.slice(i, i + taille));
  return lots;
}

async function chargerFiches(chemin, limit) {
  const brut = await fsp.readFile(chemin, 'utf8').catch(() => null);
  if (brut === null) {
    console.error(`Fiches introuvables : ${chemin} — lancer d'abord tools/supplements/import/parse.mjs.`);
    process.exit(1);
  }
  const fiches = brut.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return Number.isFinite(limit) ? fiches.slice(0, limit) : fiches;
}

async function modeDryRun(lots) {
  let total = 0;
  for (const lot of lots) total += lot.length;
  console.log(`Dry-run : ${lots.length} lot(s), ${total} fiche(s), taille max ${MAX_BATCH}.`);
  if (lots[0]?.[0]) {
    console.log('Première fiche mappée (payload) :');
    console.log(JSON.stringify(lots[0][0], null, 2));
  }
  console.log('\nAucun POST émis, aucun secret lu (dry-run).');
}

async function modePost(lots, url) {
  const secret = process.env.SUPPLEMENTS_INTERNAL_SECRET?.trim();
  if (!secret) {
    console.error('SUPPLEMENTS_INTERNAL_SECRET absent — impossible de POSTer.');
    process.exit(1);
  }
  const cumul = { creees: 0, nouvellesVersions: 0, inchangees: 0, echecs: 0 };
  let i = 0;
  for (const lot of lots) {
    i++;
    const r = await fetch(`${url}/api/internal/supplements/ingest`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ fiches: lot }),
    });
    const payload = await r.json().catch(() => ({}));
    if (r.ok) {
      const s = payload.resume ?? {};
      cumul.creees += s.creees ?? 0;
      cumul.nouvellesVersions += s.nouvellesVersions ?? 0;
      cumul.inchangees += s.inchangees ?? 0;
      cumul.echecs += s.echecs ?? 0;
      console.log(
        `  ✓ lot ${i}/${lots.length} : ${payload.statut} — créées ${s.creees ?? 0}, ` +
          `nouvelles versions ${s.nouvellesVersions ?? 0}, inchangées ${s.inchangees ?? 0}, échecs ${s.echecs ?? 0}`,
      );
    } else {
      console.log(`  ✗ lot ${i}/${lots.length} : HTTP ${r.status} — ${payload.error || JSON.stringify(payload)}`);
    }
  }
  console.log(
    `\nBilan : créées ${cumul.creees}, nouvelles versions ${cumul.nouvellesVersions}, ` +
      `inchangées ${cumul.inchangees}, échecs ${cumul.echecs}.`,
  );
}

async function main() {
  const o = parseArgs();
  const brut = await chargerFiches(o.fiches, o.limit);
  const fiches = brut.map(ficheVersPayload);
  const lots = decouperLots(fiches, o.batch);
  console.log(`Fiches : ${fiches.length} → ${lots.length} lot(s) (≤ ${o.batch}).\n`);

  if (o.dryRun) await modeDryRun(lots);
  else await modePost(lots, o.url);
}

// Exécuté en CLI seulement (import pour test → pas de main()).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
