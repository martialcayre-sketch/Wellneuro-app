#!/usr/bin/env node
// BANC IDENTIFIANT–RUBRIQUE DU JOURNAL DU PLAN — D-502 §4 (Q3 bis), D-325 §5.
//
// Refuse une ligne de `docs/claude/plan-journal/` qui associe un identifiant
// de claim et un nom de rubrique d'étiquetage (règles de lecture :
// `scripts/lib/plan-journal-rubriques.mjs`). Contrairement au garde du
// journal, il BLOQUE : sortie 1 dès qu'une association est vue.
//
// Rapport opaque : chemin et ligne, jamais le nom de la rubrique ni
// l'identifiant — le dépôt est public (D-251 §4). Un écart trouvé ne se
// corrige pas par réécriture du fragment : il demande une décision (D-502 §4).
//
// Usage : node scripts/wn-plan-journal-rubriques.mjs

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { jugerJournal } from "./lib/plan-journal-rubriques.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function principal(env = process.env, racine = RACINE, sortie = console) {
  const enCI = env.GITHUB_ACTIONS === "true";
  const ecarts = jugerJournal(racine);
  if (ecarts.length === 0) {
    sortie.log("✓ Journal du plan : aucun identifiant de claim associé à une rubrique.");
    return 0;
  }
  for (const { chemin, ligne } of ecarts) {
    const prefixe = enCI ? `::error file=${chemin},line=${ligne}::` : "✗ ";
    sortie.log(
      `${prefixe}${chemin}:${ligne} — un identifiant de claim y est associé à un nom de rubrique. ` +
        "Le rubricage d'un claim ne va pas au dépôt (D-325 §5) ; un fragment ne se réécrit pas : l'écart demande une décision (D-502 §4).",
    );
  }
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(principal());
}
