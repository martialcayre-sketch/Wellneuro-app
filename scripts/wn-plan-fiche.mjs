#!/usr/bin/env node
// LECTURE D'UNE FICHE DU PLAN AVEC SON JOURNAL — D-371 §1 (plan, fiche H90).
//
// Rend une fiche Fnn ou Hnn telle que le plan reconstruit la porte : sa ligne
// de renvoi remplacée par ses fragments de `docs/claude/plan-journal/<fiche>/`,
// dans l'ordre des noms. Avant la bascule, la fiche est rendue telle quelle.
// Lecture seule.
//
// Codes de sortie : 0 = fiche rendue ; 1 = fiche introuvable, ou journal
// illisible (un fragment sans ligne de renvoi, un nom non conforme) ;
// 2 = usage.
//
// Usage :
//   node scripts/wn-plan-fiche.mjs H90
//   node scripts/wn-plan-fiche.mjs H90 --plan P --journal J
//
// Banc : `scripts/wn-plan-fiche.test.mjs`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ID_FICHE, JOURNAL, lireFiche, lireJournal, PLAN } from "./lib/plan-journal.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function principal(argv, sortie = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }) {
  let fiche = null;
  const opts = { plan: path.join(RACINE, PLAN), journal: path.join(RACINE, JOURNAL) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plan" || a === "--journal") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) return usage(sortie, `${a} attend un chemin`);
      opts[a.slice(2)] = path.resolve(v);
    } else if (ID_FICHE.test(a) && fiche === null) fiche = a;
    else return usage(sortie, `argument inattendu : ${a}`);
  }
  if (fiche === null) return usage(sortie, "fiche attendue (Fnn ou Hnn)");
  let texte;
  try {
    texte = lireFiche(fs.readFileSync(opts.plan, "utf8"), lireJournal(opts.journal), fiche);
  } catch (e) {
    sortie.err(`✗ ${e.message}\n`);
    return 1;
  }
  if (texte === null) {
    sortie.err(`✗ Fiche ${fiche} introuvable dans le plan.\n`);
    return 1;
  }
  sortie.out(texte);
  return 0;
}

function usage(sortie, message) {
  sortie.err(`✗ ${message}\nUsage : node scripts/wn-plan-fiche.mjs <Fnn|Hnn> [--plan P --journal J]\n`);
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(principal(process.argv.slice(2)));
}
