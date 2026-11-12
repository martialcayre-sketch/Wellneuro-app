// BANC CONTEXTUEL IDENTIFIANT–RUBRIQUE DU JOURNAL DU PLAN — D-502 §4
// (arbitrage du 2026-11-12, Q3 bis), appliquant D-325 §5 et D-251 §4.
//
// Le rubricage d'un claim est du contenu clinique : il vit au dossier privé,
// jamais au dépôt. Ce module repère, dans `docs/claude/plan-journal/`, une
// ligne qui associe un identifiant de claim (`WN-CL-0000-000` ou forme courte
// `0000-000`) et un nom de rubrique d'étiquetage.
//
// LES NOMS DE RUBRIQUE NE SONT PAS RECOPIÉS ICI : ils se lisent dans le code,
// dans la liste fermée `RUBRIQUES_FICHE_USAGE` de
// `web/src/lib/fiches-usage/vocabulaire.ts` (les clés de lien de D-321). Un
// nom à l'écran commence par le premier mot de son code (« Surveillance et
// arrêt » ↔ `surveillance_arret`) : ce premier mot, au singulier ou au
// pluriel, suffit à reconnaître la rubrique en prose.
//
// LE CONTEXTE. Un fragment du journal tient le plus souvent en UNE ligne
// longue, un paragraphe entier : la même ligne seule rapprocherait des mots
// sans lien (une liste générique de rubriques à côté d'une liste
// d'identifiants, « question à options »). L'association se lit donc :
//   - sur la même ligne qu'un identifiant de claim, ET
//   - soit un code de rubrique cité entre accents graves,
//   - soit un nom de rubrique dans les QUATRE mots qui suivent un mot de
//     l'acte : « rubrique(s) », « étiquet… », « sign… », « besoin(s) ».
// Quatre mots couvrent les tournures déjà rencontrées (« étiquetées au besoin
// 2, rubrique X », « signés au besoin 2, en X », « rubrique d'X ») sans
// atteindre une énumération qui suit « rubrique de la chaîne d'usage (… ».
// Un nom de rubrique seul, ou un identifiant seul, ne rougit pas. La mention
// « rubrique occultée (`D-502`) » (ou `D-504`) ne nomme aucune rubrique :
// elle passe.
//
// Module pur, sauf `lireRubriques` et `jugerJournal`, qui LISENT le disque.
// Aucune écriture. Le rapport est OPAQUE : chemin et ligne, jamais le nom
// de la rubrique ni l'identifiant.
//
// Banc : `scripts/lib/plan-journal-rubriques.test.mjs`. Ligne de commande :
// `scripts/wn-plan-journal-rubriques.mjs`.

import fs from "node:fs";
import path from "node:path";

import { JOURNAL } from "./plan-journal.mjs";

export const SOURCE_RUBRIQUES = "web/src/lib/fiches-usage/vocabulaire.ts";

/** Fenêtre, en mots, après un mot de l'acte. Justifiée en tête de module. */
export const FENETRE = 4;

const ID_CLAIM = /WN-CL-\d{4}-\d{3}|(?<![\w-])\d{4}-\d{3}(?![\w-])/;
const MOT_ACTE = /^(?:rubriques?|etiquet[a-z]*|sign[a-z]*|besoins?)$/;

/** Minuscules, sans accents, apostrophes unifiées. */
export function normaliser(texte) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'");
}

/** Codes de la liste fermée, lus dans le texte source du module de vocabulaire. */
export function codesDepuisSource(source) {
  const bloc = source.match(/export const RUBRIQUES_FICHE_USAGE = \[([\s\S]*?)\] as const;/);
  if (!bloc) throw new Error(`${SOURCE_RUBRIQUES} : liste RUBRIQUES_FICHE_USAGE introuvable`);
  const codes = [...bloc[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  if (codes.length === 0) throw new Error(`${SOURCE_RUBRIQUES} : liste RUBRIQUES_FICHE_USAGE vide`);
  return codes;
}

export function lireRubriques(racine) {
  return codesDepuisSource(fs.readFileSync(path.join(racine, SOURCE_RUBRIQUES), "utf8"));
}

/** Premier mot du code, sans « s » final : la racine qui se lit en prose. */
export function racinesDesCodes(codes) {
  return [...new Set(codes.map((c) => c.split("_")[0].replace(/s$/, "")))];
}

/**
 * Une ligne associe-t-elle un identifiant de claim et un nom de rubrique ?
 * Rend le nombre d'associations vues (0 si aucune) — jamais lesquelles.
 */
export function compterAssociations(ligne, codes) {
  if (!ID_CLAIM.test(ligne)) return 0;
  const texte = normaliser(ligne);
  let n = 0;
  for (const m of texte.matchAll(/`([a-z_]+)`/g)) if (codes.includes(m[1])) n++;
  const racines = racinesDesCodes(codes);
  const mots = texte.split(/[^a-z0-9_]+/).filter(Boolean);
  mots.forEach((mot, i) => {
    if (!MOT_ACTE.test(mot)) return;
    for (let k = i + 1; k <= i + FENETRE && k < mots.length; k++) {
      if (racines.some((r) => mots[k] === r || mots[k] === `${r}s`)) n++;
    }
  });
  return n;
}

/** Lignes en cause d'un texte : numéros (à partir de 1). */
export function lignesEnCause(texte, codes) {
  const out = [];
  texte.split("\n").forEach((ligne, i) => {
    if (compterAssociations(ligne, codes) > 0) out.push(i + 1);
  });
  return out;
}

/** Tout le journal : `{ chemin, ligne }`, chemin relatif à la racine, ordre stable. */
export function jugerJournal(racine, codes = lireRubriques(racine)) {
  const dossier = path.join(racine, JOURNAL);
  if (!fs.existsSync(dossier)) return [];
  const fichiers = [];
  const marcher = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marcher(p);
      else if (e.name.endsWith(".md")) fichiers.push(p);
    }
  };
  marcher(dossier);
  fichiers.sort();
  const out = [];
  for (const f of fichiers) {
    const chemin = path.relative(racine, f).split(path.sep).join("/");
    for (const ligne of lignesEnCause(fs.readFileSync(f, "utf8"), codes)) out.push({ chemin, ligne });
  }
  return out;
}
