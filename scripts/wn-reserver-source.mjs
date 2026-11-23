#!/usr/bin/env node
// RÉSERVATION D'UN NUMÉRO DE SOURCE DU CORPUS (`WN-SRC-NNNN`) — piège
// « réservation WN-SRC » du lot `autonomie-pieges-restes`, partie 13.
//
// À lancer à la RÉDACTION de la notice, et toujours AVANT d'ingérer en base
// sous ce numéro : la base est la partie irréversible (claims immuables,
// aucune route pour retirer un passage). Le 2026-11-01, deux sessions ont
// pris `WN-SRC-0577` à `0582` le même jour, l'une au registre, l'autre en
// base (#1808, #1810).
//
// Même mécanique que `scripts/wn-reserver-decision.mjs` (D-370 §1), dont il
// reprend la boucle `reserver()` : il lit le plus haut numéro du registre
// `docs/claude/corpus/source_registry.json` sur la tête de `main` et les
// réservations existantes, puis crée par l'API GitHub la référence
// `refs/tags/reserve/WN-SRC-NNNN` du premier numéro libre. La référence pointe
// sur la tête de `main` et ne porte que le numéro (dépôt public : ni titre, ni
// auteur, ni rien de la source). Elle reste après le merge — aucun nettoyage.
//
// Les mêmes quatre issues : **créée** (le numéro est à vous jusqu'au merge),
// **déjà existante** (seule cause du passage au numéro suivant), **inconnu**
// (tout autre refus : aucun nouvel essai, relancer), **partiel** (les numéros
// créés restent réservés).
//
// Codes de sortie : 0 = tous les numéros demandés réservés ; 3 = inconnu, ou
// garde-fou de 50 « déjà existante » d'affilée ; 2 = rien n'a été tenté
// (usage, `main`, registre ou réservations illisibles).
//
// Usage :
//   node scripts/wn-reserver-source.mjs            un numéro
//   node scripts/wn-reserver-source.mjs --nombre 6 six numéros
//
// Le garde `scripts/lib/sources-numerotation.mjs` refuse un doublon au
// registre et signale, sur une PR, une source ajoutée sans réservation.
// Banc : `scripts/wn-reserver-source.test.mjs`, sur API simulée.

import { pathToFileURL } from "node:url";

import {
  auditerRegistre,
  ghParDefaut,
  lireReservationsSources,
  nomSource,
  referenceSource,
  REGISTRE_SOURCES,
} from "./lib/sources-numerotation.mjs";
import { analyserArguments, apiGitHub, reserver } from "./wn-reserver-decision.mjs";

/**
 * L'API GitHub par `gh` : celle des décisions, sauf la lecture des numéros
 * (le registre des sources à `sha`, en brut — le fichier frôle la limite de
 * 1 Mo de l'API `contents` en JSON) et celle des réservations.
 * @param {(args: string[]) => string} gh
 */
export function apiSources(gh = ghParDefaut) {
  return {
    ...apiGitHub(gh),
    numeros(sha) {
      const texte = gh([
        "api",
        "-H",
        "Accept: application/vnd.github.raw+json",
        `repos/{owner}/{repo}/contents/${REGISTRE_SOURCES}?ref=${sha}`,
      ]);
      const r = auditerRegistre(texte);
      if (r.violations.length > 0) {
        throw new Error(`${REGISTRE_SOURCES} en défaut sur main : ${r.violations[0]}`);
      }
      if (r.numeros.length === 0) throw new Error(`aucune notice lue dans ${REGISTRE_SOURCES} sur main`);
      return r.numeros;
    },
    reservations() {
      return lireReservationsSources(gh);
    },
  };
}

/** @returns {number} le code de sortie */
export function principal(argv, api = apiSources()) {
  const args = analyserArguments(argv);
  if ("erreur" in args) {
    console.error(`✗ ${args.erreur} — usage : node scripts/wn-reserver-source.mjs [--nombre N]`);
    return 2;
  }
  const r = reserver({ nombre: args.nombre, api, reference: referenceSource });
  for (const n of r.sautes) console.log(`· ${nomSource(n)} déjà réservé par ailleurs — numéro suivant.`);
  for (const n of r.reserves) console.log(`✓ ${nomSource(n)} réservé (${referenceSource(n)}).`);
  if (r.statut === "illisible") {
    console.error(`✗ Rien n'a été réservé : ${r.detail}.`);
    return 2;
  }
  if (r.statut === "epuise") {
    console.error(
      `✗ Arrêt : ${r.detail} — aucune référence laissée dans un état inconnu ; relancer le script.` +
        (r.reserves.length > 0 ? ` Les numéros ci-dessus restent réservés.` : ""),
    );
    return 3;
  }
  if (r.statut === "inconnu") {
    console.error(
      `✗ ${nomSource(r.inconnu)} : issue inconnue (${r.detail}) — la référence a pu être créée ou non. ` +
        `Aucun nouvel essai : relancer le script, qui saute les numéros déjà réservés. N'ingérer sous ` +
        `${nomSource(r.inconnu)} qu'après avoir constaté ${referenceSource(r.inconnu)}.` +
        (r.reserves.length > 0 ? ` Les numéros ci-dessus restent réservés.` : ""),
    );
    return 3;
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(principal(process.argv.slice(2)));
}
