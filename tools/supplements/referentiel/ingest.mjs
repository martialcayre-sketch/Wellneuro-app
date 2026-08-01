#!/usr/bin/env node
// Projette le référentiel moissonné sur le modèle ingrédient × forme, puis
// l'envoie à /api/internal/supplements/referentiel.
//
// LA PROJECTION SUIT LA RELATION OFFICIELLE, JAMAIS LE LIBELLÉ. Compl'Alim
// relie explicitement une forme d'apport à sa ou ses substances
// (`other-ingredients[].substances`). Lire le libellé à la place conduit à des
// erreurs cliniques : « Hydrogénosélénite de sodium » se lit « sodium » alors
// que le nutriment est le SÉLÉNIUM, et « iodure de potassium » se lit
// « potassium » alors que c'est l'IODE.
//
// Une forme peut relever de PLUSIEURS substances (69 cas mesurés, dont
// « D-pantothénate de calcium » → vitamine B5 ET calcium) : elle est alors
// rattachée à chacune. C'est voulu, et c'est pourquoi l'unicité côté forme
// porte sur (ingrédient, code) et non sur l'identifiant source.
//
// Usage :
//   node ingest.mjs --url https://app.wellneuro.fr [--source ./referentiel] [--dry-run]
// Secret lu dans SUPPLEMENTS_INTERNAL_SECRET (jamais en argument : la ligne de
// commande est visible des autres processus).
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// La projection vit dans `lib/projection.mjs` : l'outil de projection des
// compositions doit résoudre les libellés contre EXACTEMENT cet index-là.
// Deux copies divergeraient en silence.
import { projeterReferentiel } from './lib/projection.mjs';

const args = process.argv.slice(2);
const opt = (nom, defaut = null) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const URL_BASE = opt('--url');
// Même emplacement durable que la moisson (voir moisson.mjs) : hors du
// worktree, qui se supprime après sa PR.
const SOURCE = opt('--source', join(homedir(), '.wellneuro/supplements/referentiel'));
const DRY = args.includes('--dry-run');
const LOT = 400; // sous SUPPLEMENTS_MAX_BATCH_SIZE (500)

if (!URL_BASE && !DRY) {
  console.error('Usage : node ingest.mjs --url <base> [--source <dossier>] [--dry-run]');
  process.exit(2);
}
const SECRET = process.env.SUPPLEMENTS_INTERNAL_SECRET?.trim();
if (!DRY && (!SECRET || SECRET.length < 32)) {
  console.error('SUPPLEMENTS_INTERNAL_SECRET absent ou trop court (32 caractères minimum).');
  process.exit(2);
}

function charger(nom) {
  const chemin = join(SOURCE, `ref-${nom}.ndjson`);
  if (!existsSync(chemin)) {
    console.error(`Fichier absent : ${chemin} — lancer moisson.mjs d'abord.`);
    process.exit(2);
  }
  return readFileSync(chemin, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/**
 * Format exigé par le service (`parseReferentielPayload`). Le connaître ICI
 * permet de refuser AVANT d'écrire quoi que ce soit — voir la validation
 * préalable plus bas.
 */
const CODE_ATTENDU = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const substances = charger('substances');
const formes = charger('other-ingredients');
const plantes = charger('plants');
const micro = charger('microorganisms');

// ── Projection ─────────────────────────────────────────────────────────────
const ingredients = projeterReferentiel({ substances, formes, plantes, micro });

// ── Validation préalable ───────────────────────────────────────────────────
// TOUTE la projection est vérifiée AVANT le premier envoi. Le service valide
// lot par lot : un code mal formé au 3e lot sur 9 laisse 800 ingrédients écrits
// et la campagne à moitié faite. C'est arrivé le 2026-07-31. Une campagne
// s'arrête avant d'écrire, ou elle va au bout — pas entre les deux.
const malFormes = [];
for (const e of ingredients) {
  if (!CODE_ATTENDU.test(e.code)) malFormes.push(`${e.sourceIdentifiant} → « ${e.code} »`);
  for (const f of e.formes) {
    if (!CODE_ATTENDU.test(f.code)) malFormes.push(`${f.sourceIdentifiant} → « ${f.code} »`);
  }
}
if (malFormes.length > 0) {
  console.error(`\n${malFormes.length} code(s) au format refusé par le service — RIEN n'a été envoyé :`);
  for (const m of malFormes.slice(0, 20)) console.error(`  ${m}`);
  if (malFormes.length > 20) console.error(`  … et ${malFormes.length - 20} autres.`);
  process.exit(1);
}

const nbFormes = ingredients.reduce((n, i) => n + i.formes.length, 0);
// Les formes d'apport orphelines se relisent sur la PROJECTION, la variable
// intermédiaire vivant désormais dans `lib/projection.mjs`. Le chiffre est le
// même — la ligne le comptait déjà après coup.
const nbOrphelines = ingredients.filter((i) => i.sourceIdentifiant.startsWith('form_of_supply:')).length;
console.log(`Projection : ${ingredients.length} ingrédients, ${nbFormes} formes.`);
console.log(`  substances ${substances.length} · formes d'apport sans substance ${nbOrphelines}`
  + ` · plantes ${plantes.length} · micro-organismes ${micro.length}`);

if (DRY) {
  console.log('\n--- 3 exemples ---');
  for (const e of ingredients.filter((i) => i.formes.length > 0).slice(0, 3)) {
    console.log(` ${e.code} (${e.sourceIdentifiant}) « ${e.nomFr} »`);
    for (const f of e.formes.slice(0, 4)) console.log(`     ${f.code} — ${f.labelFr}`);
  }
  process.exit(0);
}

// ── Découpage en lots ──────────────────────────────────────────────────────
// Deux bornes, parce que le service en applique deux : le NOMBRE d'ingrédients
// et le nombre total de FORMES. Découper sur les seuls ingrédients laisserait
// passer un lot de 400 entrées lourdement fournies, refusé côté serveur après
// que l'opérateur a lancé la campagne.
const FORMES_MAX = 5000;
const lots = [];
let courant = [];
let formesCourant = 0;
for (const e of ingredients) {
  if (courant.length >= LOT || formesCourant + e.formes.length > FORMES_MAX) {
    lots.push(courant); courant = []; formesCourant = 0;
  }
  courant.push(e);
  formesCourant += e.formes.length;
}
if (courant.length > 0) lots.push(courant);

// ── Envoi ──────────────────────────────────────────────────────────────────
let envoyes = 0;
const cumul = {};
const codesConserves = [];

/** Un bilan partiel n'est pas un détail : c'est ce qui dit où reprendre. */
const cumuler = (resume) => {
  for (const [k, v] of Object.entries(resume ?? {})) {
    if (typeof v === 'number') cumul[k] = (cumul[k] ?? 0) + v;
  }
  if (Array.isArray(resume?.codesConserves)) codesConserves.push(...resume.codesConserves);
};

for (const [n, lot] of lots.entries()) {
  const rep = await fetch(`${URL_BASE}/api/internal/supplements/referentiel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ provenance: 'complalim', ingredients: lot }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    console.error(`Lot ${n + 1}/${lots.length} refusé (HTTP ${rep.status}) : ${corps.error ?? '—'}`);
    // Le lot s'arrête au premier conflit, mais ce qui précédait est commité.
    cumuler(corps.resume);
    console.error('Écrit avant l’arrêt (cumul) :', JSON.stringify(cumul));
    console.error(`Reprise : l’ingestion est idempotente, relancer après arbitrage rejouera sans doublon.`);
    process.exit(1);
  }
  cumuler(corps.resume);
  envoyes += lot.length;
  console.log(`  lot ${n + 1}/${lots.length} : ${envoyes}/${ingredients.length}`);
}
console.log('\nBilan cumulé :', JSON.stringify(cumul));
if (codesConserves.length > 0) {
  // Ni une erreur ni un succès muet : un arbitrage à porter au praticien.
  console.log(`\n${codesConserves.length} code(s) CONSERVÉ(S) — la source en proposait un autre :`);
  for (const c of codesConserves) console.log(`  ${c}`);
}
