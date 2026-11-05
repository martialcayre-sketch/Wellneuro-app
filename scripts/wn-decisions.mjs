#!/usr/bin/env node
// Lecture du registre des décisions, un fichier par décision (D-418 §4).
//
// Usage :
//   node scripts/wn-decisions.mjs              tout, du plus récent au plus ancien
//   node scripts/wn-decisions.mjs D-418        une décision par son numéro (D-418, 418)
//   node scripts/wn-decisions.mjs --titres     les titres seuls, du plus récent au plus ancien
//
// Aucun index n'est versionné : la lecture d'ensemble se calcule ici, à chaque
// appel. Codes de sortie : 0 lu ; 1 décision demandée absente ; 2 usage, ou
// registre introuvable ou vide — jamais une sortie vide rendue 0.

import { pathToFileURL } from "node:url";

import { REPERTOIRE, lireDecisions, nomDecision, numeroDemande } from "./lib/registre-decisions.mjs";

/**
 * @param {string[]} argv
 * @returns {{mode: "tout" | "titres"} | {mode: "une", numero: number} | {erreur: string}}
 */
export function analyserArguments(argv) {
  if (argv.length === 0) return { mode: "tout" };
  if (argv.length === 1 && argv[0] === "--titres") return { mode: "titres" };
  if (argv.length === 1 && numeroDemande(argv[0]) !== null) return { mode: "une", numero: numeroDemande(argv[0]) };
  return { erreur: `argument inconnu : ${argv.join(" ")}` };
}

const marqueArchive = (d) => (d.section === "archivées" ? " (archivée)" : "");

/**
 * @param {string[]} argv
 * @param {{racine?: string, ecrire?: (t: string) => void, erreur?: (t: string) => void}} [io]
 * @returns {number} le code de sortie
 */
export function principal(argv, io = {}) {
  const racine = io.racine ?? process.cwd();
  const ecrire = io.ecrire ?? ((t) => process.stdout.write(t));
  const erreur = io.erreur ?? ((t) => process.stderr.write(t));
  const args = analyserArguments(argv);
  if ("erreur" in args) {
    erreur(`✗ ${args.erreur} — usage : node scripts/wn-decisions.mjs [D-NNN | --titres]\n`);
    return 2;
  }
  let decisions;
  try {
    decisions = lireDecisions(racine);
  } catch (e) {
    erreur(`✗ ${e.message} — lancer depuis la racine du dépôt.\n`);
    return 2;
  }
  if (args.mode === "une") {
    const d = decisions.find((x) => x.numero === args.numero);
    if (!d) {
      erreur(`✗ ${nomDecision(args.numero)} absente de ${REPERTOIRE}/.\n`);
      return 1;
    }
    ecrire(d.contenu);
    return 0;
  }
  if (args.mode === "titres") {
    ecrire(`${decisions.map((d) => `${d.contenu.split("\n", 1)[0].replace(/^# /, "")}${marqueArchive(d)}`).join("\n")}\n`);
    return 0;
  }
  ecrire(decisions.map((d) => d.contenu).join("\n"));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // `… | head` ferme le tube avant la fin : une lecture tronquée voulue, pas une panne.
  process.stdout.on("error", (e) => {
    if (e.code === "EPIPE") process.exit(0);
    throw e;
  });
  process.exitCode = principal(process.argv.slice(2));
}
