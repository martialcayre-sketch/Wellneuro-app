#!/usr/bin/env node
// Moisson du référentiel officiel Compl'Alim (API publique, lecture seule).
//
// POLITESSE ENVERS UN SERVICE PUBLIC — ces règles ne sont pas décoratives :
//   — une requête à la fois, jamais de parallélisme ;
//   — 250 ms entre deux appels (~4/s au plus) ;
//   — User-Agent qui nous identifie par le domaine de l'application, SANS
//     donnée personnelle ;
//   — pause longue sur 429 ou 5xx : le service demande de ralentir, on obéit ;
//   — reprise sur cache, jamais relance : un arrêt ne refait pas le travail.
//
// L'API ne propose pas d'énumération : on parcourt les identifiants et on
// ignore les 404 (les identifiants sont troués). `POST /search/` refuse les
// termes courts, il ne permet donc pas d'énumérer non plus.
//
// Usage : node moisson.mjs [dossier-de-sortie]
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'https://compl-alim.beta.gouv.fr/api/v1';
const UA = 'Wellneuro-app/1.0 (+https://app.wellneuro.fr) referentiel-complalim';
const PAUSE_MS = 250;
const SORTIE = process.argv[2] ?? './referentiel';

// Bornes constatées le 2026-07-31 (404 au-delà). Volontairement larges : un
// identifiant absent ne coûte qu'une requête, un identifiant manqué coûte un
// ingrédient introuvable à l'import.
const TYPES = [
  { nom: 'substances', max: 1200 },
  { nom: 'plants', max: 2200 },
  { nom: 'other-ingredients', max: 2200 },
  { nom: 'microorganisms', max: 400 },
];

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

function dejaVus(fichier) {
  if (!existsSync(fichier)) return new Set();
  const vus = new Set();
  for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
    if (!ligne.trim()) continue;
    try { vus.add(JSON.parse(ligne).id); } catch { /* ligne tronquée : on la refera */ }
  }
  return vus;
}

if (!existsSync(SORTIE)) mkdirSync(SORTIE, { recursive: true });

for (const { nom, max } of TYPES) {
  const fichier = join(SORTIE, `ref-${nom}.ndjson`);
  const vus = dejaVus(fichier);
  let trouves = vus.size;
  let absents = 0;
  let erreurs = 0;
  console.log(`\n=== ${nom} (1..${max}) — ${vus.size} déjà en cache ===`);

  for (let id = 1; id <= max; id += 1) {
    if (vus.has(id)) continue;
    let rep;
    try {
      rep = await fetch(`${BASE}/${nom}/${id}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    } catch {
      erreurs += 1;
      if (erreurs > 40) { console.error(`  ABANDON ${nom} : trop d'erreurs réseau.`); break; }
      await dodo(3000);
      id -= 1;
      continue;
    }
    if (rep.status === 404) { absents += 1; await dodo(PAUSE_MS); continue; }
    if (rep.status === 429 || rep.status >= 500) {
      console.log(`  ${rep.status} sur ${id} — pause 15 s.`);
      await dodo(15000);
      id -= 1;
      continue;
    }
    if (!rep.ok) { erreurs += 1; await dodo(PAUSE_MS); continue; }
    appendFileSync(fichier, `${JSON.stringify({ ...(await rep.json()), _type: nom })}\n`, 'utf8');
    trouves += 1;
    if (trouves % 200 === 0) console.log(`  ${nom} : ${trouves} récupérés (id ${id}/${max}).`);
    await dodo(PAUSE_MS);
  }
  console.log(`  ${nom} TERMINÉ : ${trouves} fiches, ${absents} identifiants absents, ${erreurs} erreurs.`);
}

// Les sept vocabulaires tiennent en UN appel.
const champs = await fetch(`${BASE}/declarationFieldData/`, { headers: { 'User-Agent': UA } });
writeFileSync(join(SORTIE, 'ref-vocabulaires.json'), JSON.stringify(await champs.json(), null, 2), 'utf8');
console.log('\nVocabulaires groupés écrits.');
