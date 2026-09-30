#!/usr/bin/env node
// `npm run check:rapide` — le palier T1 après chaque édition, `npm run check`
// complet restant dû avant chaque commit.
//
// Mesure du 2026-09-30 (`npm run check`, 61 s) : trois postes font 46 s et ne
// regardent qu'une partie du dépôt — les bancs d'outillage (21 s, `scripts/` et
// `.github/`), le banc des hooks (16 s, `.claude/`) et l'anti-secrets du dépôt
// ENTIER (9 s ; sa passe `--staged` reste jouée). Tout le reste dure moins de
// 5 s et est TOUJOURS joué — scoring et certification compris : aucun garde
// clinique ne dépend du diff.
//
// La liste n'est pas recopiée : elle est lue dans le script `check` de
// `web/package.json`. Une étape ajoutée à `check` entre ici d'office ; seules
// les trois ci-dessous deviennent conditionnelles.
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Étapes lourdes → motif des chemins qui les rendent dues (`null` : jamais en rapide). */
export const CONDITIONNELLES = new Map([
  // Plusieurs de ces bancs lisent `web/package.json` (parité, drapeau ALI_01,
  // réexpédition, ce banc-ci) : un manifeste touché les rend dus (revue #1264).
  ["npm run bancs-outillage-check", /^((scripts|\.github)\/|(web\/)?package\.json$)/],
  ["npm run hooks-check", /^\.claude\/(hooks\/|settings\.json$|agents\/)/],
  ["bash ../scripts/check_no_secrets.sh", null],
]);

/** Découpe le script `check` en étapes. */
export function etapesDeCheck(scriptCheck) {
  return scriptCheck.split("&&").map((s) => s.trim()).filter(Boolean);
}

/**
 * Sépare les étapes à jouer de celles sautées, d'après les fichiers touchés.
 * @returns {{ jouees: string[], sautees: string[] }}
 */
export function selection(etapes, fichiers) {
  const jouees = [];
  const sautees = [];
  for (const etape of etapes) {
    if (!CONDITIONNELLES.has(etape)) {
      jouees.push(etape);
      continue;
    }
    const motif = CONDITIONNELLES.get(etape);
    if (motif && fichiers.some((f) => motif.test(f))) jouees.push(etape);
    else sautees.push(etape);
  }
  return { jouees, sautees };
}

function fichiersTouches() {
  const git = (...args) => {
    try {
      return execFileSync("git", args, { cwd: RACINE, encoding: "utf8" }).split("\n");
    } catch {
      return null;
    }
  };
  const listes = [
    git("diff", "--name-only", "origin/main...HEAD"),
    git("diff", "--name-only"),
    git("diff", "--name-only", "--cached"),
    git("ls-files", "--others", "--exclude-standard"),
  ];
  // Une seule requête illisible et un fichier touché pourrait manquer : on ne
  // devine pas, tout est dû (revue #1264 — échec fermé sur chaque requête).
  if (listes.some((l) => l === null)) return null;
  return listes.flat().filter(Boolean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(fs.readFileSync(path.join(RACINE, "web", "package.json"), "utf8"));
  const etapes = etapesDeCheck(pkg.scripts.check);
  const fichiers = fichiersTouches();
  const { jouees, sautees } =
    fichiers === null ? { jouees: etapes, sautees: [] } : selection(etapes, fichiers);
  if (fichiers === null) console.log("check:rapide — diff illisible : check complet.");
  for (const etape of sautees) console.log(`check:rapide — sautée (diff hors périmètre) : ${etape}`);
  for (const etape of jouees) {
    const r = spawnSync(etape, { cwd: path.join(RACINE, "web"), stdio: "inherit", shell: "/bin/bash" });
    if (r.status !== 0) {
      console.error(`check:rapide — ÉCHEC : ${etape}`);
      process.exit(r.status || 1);
    }
  }
  console.log(`check:rapide — ${jouees.length} étapes vertes, ${sautees.length} sautées. Avant commit : npm run check.`);
}
