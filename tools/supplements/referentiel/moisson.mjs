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
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = 'https://compl-alim.beta.gouv.fr/api/v1';
const UA = 'Wellneuro-app/1.0 (+https://app.wellneuro.fr) referentiel-complalim';
const PAUSE_MS = 250;
// EMPLACEMENT DURABLE PAR DÉFAUT, hors du dépôt.
//
// Le défaut était `./referentiel`, donc un dossier DANS le worktree. Or une
// session = un worktree, et un worktree se supprime après sa PR : le cache
// mourait avec lui, et la moisson suivante repartait de zéro — 25 minutes et
// ~6 000 requêtes à un service public, pour rien. Le NDJSON des fiches, lui,
// vit sous `~/.wellneuro/supplements/` depuis toujours et a survécu à toutes
// les sessions. Le cache du référentiel le rejoint.
const SORTIE = process.argv[2] ?? join(homedir(), '.wellneuro/supplements/referentiel');

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

/**
 * Les identifiants ABSENTS (404) sont mémorisés eux aussi. Sans cela, la
 * reprise annoncée plus haut n'en est pas une : sur `plants`, 1..2200 pour
 * ~1 021 fiches, un arrêt coûterait ~1 179 requêtes refaites au service
 * public — précisément ce que la politesse cherche à éviter.
 */
function absentsConnus(fichier) {
  if (!existsSync(fichier)) return new Set();
  return new Set(
    readFileSync(fichier, 'utf8').split('\n')
      .map((l) => Number.parseInt(l, 10))
      .filter((n) => Number.isInteger(n)),
  );
}

if (!existsSync(SORTIE)) mkdirSync(SORTIE, { recursive: true });

for (const { nom, max } of TYPES) {
  const fichier = join(SORTIE, `ref-${nom}.ndjson`);
  const fichierAbsents = join(SORTIE, `ref-${nom}.absents`);
  const vus = dejaVus(fichier);
  const absentsVus = absentsConnus(fichierAbsents);
  let trouves = vus.size;
  let absents = 0;
  let erreurs = 0;
  console.log(`\n=== ${nom} (1..${max}) — ${vus.size} déjà en cache ===`);

  // Nombre de ralentissements consécutifs sur le MÊME identifiant. Sans borne,
  // un 503 de maintenance prolongée ferait boucler indéfiniment, toutes les
  // 15 s, contre un service public — l'inverse de la politesse annoncée.
  let ralentis = 0;

  for (let id = 1; id <= max; id += 1) {
    if (vus.has(id) || absentsVus.has(id)) { if (absentsVus.has(id)) absents += 1; continue; }
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
    if (rep.status === 404) {
      absents += 1;
      ralentis = 0;
      appendFileSync(fichierAbsents, `${id}\n`, 'utf8');
      await dodo(PAUSE_MS);
      continue;
    }
    if (rep.status === 429 || rep.status >= 500) {
      ralentis += 1;
      if (ralentis > 8) {
        console.error(`  ABANDON ${nom} : le service répond ${rep.status} depuis 8 tentatives sur l'id ${id}. Relancer plus tard — le cache reprendra ici.`);
        break;
      }
      console.log(`  ${rep.status} sur ${id} (${ralentis}/8) — pause 15 s.`);
      await dodo(15000);
      id -= 1;
      continue;
    }
    ralentis = 0;
    if (!rep.ok) { erreurs += 1; await dodo(PAUSE_MS); continue; }
    appendFileSync(fichier, `${JSON.stringify({ ...(await rep.json()), _type: nom })}\n`, 'utf8');
    trouves += 1;
    if (trouves % 200 === 0) console.log(`  ${nom} : ${trouves} récupérés (id ${id}/${max}).`);
    await dodo(PAUSE_MS);
  }
  console.log(`  ${nom} TERMINÉ : ${trouves} fiches, ${absents} identifiants absents, ${erreurs} erreurs.`);
}

// Les sept vocabulaires tiennent en UN appel. Enveloppé : après vingt minutes
// de moisson, une réponse inattendue ne doit pas se solder par une trace de
// pile — le NDJSON, lui, est déjà sur disque et reste exploitable.
await dodo(PAUSE_MS);
try {
  const champs = await fetch(`${BASE}/declarationFieldData/`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!champs.ok) throw new Error(`statut ${champs.status}`);
  writeFileSync(join(SORTIE, 'ref-vocabulaires.json'), JSON.stringify(await champs.json(), null, 2), 'utf8');
  console.log('\nVocabulaires groupés écrits.');
} catch (e) {
  console.error(`\nVocabulaires groupés NON récupérés (${e.message}). Les fiches sont sauves ; relancer pour ce seul appel.`);
  process.exitCode = 1;
}
