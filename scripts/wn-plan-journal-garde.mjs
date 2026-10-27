#!/usr/bin/env node
// GARDE DU JOURNAL DU PLAN — D-371 §3 (plan, fiche H90).
//
// Un fragment de `docs/claude/plan-journal/` ne se réécrit pas : on en
// ajoute un, on n'en modifie pas. Ce garde AVERTIT d'une modification, d'une
// suppression ou d'un renommage d'un fragment existant sur la base — il ne
// bloque JAMAIS : une donnée sensible doit pouvoir être retirée d'urgence.
// Un ajout est silencieux.
//
// Base comparée : `--base <ref>` si donné ; en CI (`GITHUB_ACTIONS=true`),
// `HEAD^1` (sur une PR, la tête de la branche cible du commit de fusion ; sur
// `main`, le commit précédent) ; au poste, l'ancêtre commun avec
// `origin/main`. Le côté comparé est l'arbre de travail : au poste, une
// modification non commitée se voit aussi.
//
// Code de sortie : toujours 0, y compris quand la base est illisible (le
// garde le dit et se tait).
//
// Usage :
//   node scripts/wn-plan-journal-garde.mjs [--base <ref>]
//
// Banc : `scripts/wn-plan-journal-garde.test.mjs`, sur un dépôt fabriqué.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { JOURNAL } from "./lib/plan-journal.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(racine, args) {
  return execFileSync("git", args, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Lignes de `git diff --name-status` → `{ statut, chemin, vers }` hors ajouts. */
export function changementsInterdits(sortieDiff) {
  const out = [];
  for (const ligne of sortieDiff.split("\n")) {
    if (ligne.trim() === "") continue;
    const [statut, chemin, vers] = ligne.split("\t");
    if (statut.startsWith("A")) continue;
    if (!chemin.startsWith(`${JOURNAL}/`)) continue;
    out.push({ statut: statut[0], chemin, vers });
  }
  return out;
}

const LIBELLE = { M: "modifié", D: "supprimé", R: "renommé", T: "changé de type", C: "copié" };

export function principal(argv, env = process.env, racine = RACINE, sortie = console) {
  const enCI = env.GITHUB_ACTIONS === "true";
  const prefixe = enCI ? "::warning::" : "⚠ ";
  let base = null;
  const i = argv.indexOf("--base");
  if (i !== -1) base = argv[i + 1] ?? null;
  const inconnus = argv.filter((a, k) => !(a === "--base" || (k === i + 1 && i !== -1)));
  if (inconnus.length > 0 || (i !== -1 && !base)) {
    sortie.log(`${prefixe}Journal du plan : arguments non lus (${argv.join(" ")}) — garde sans objet. Usage : [--base <ref>]`);
    return 0;
  }
  try {
    if (base === null) base = enCI ? "HEAD^1" : git(racine, ["merge-base", "HEAD", "origin/main"]).trim();
    const diff = git(racine, ["diff", "--name-status", "-M", base, "--", JOURNAL]);
    const changes = changementsInterdits(diff);
    if (changes.length === 0) {
      sortie.log("✓ Journal du plan : aucun fragment existant modifié, renommé ou supprimé.");
      return 0;
    }
    for (const c of changes) {
      const fichier = enCI ? `::warning file=${c.chemin}::` : "⚠ ";
      sortie.log(
        `${fichier}Fragment du journal du plan ${LIBELLE[c.statut] ?? c.statut}${c.vers ? ` (→ ${c.vers})` : ""} : ${c.chemin}. ` +
          "Un fragment ne se réécrit pas — ajouter un fragment neuf ; seul un retrait d'urgence (donnée sensible) le justifie (D-371 §3).",
      );
    }
    return 0;
  } catch (e) {
    sortie.log(`${prefixe}Journal du plan : base illisible (${base ?? "ancêtre commun avec origin/main"}) — garde sans objet.`);
    return 0;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(principal(process.argv.slice(2)));
}
