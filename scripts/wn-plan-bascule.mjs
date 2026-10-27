#!/usr/bin/env node
// BASCULE DU JOURNAL DU PLAN — D-371 §2 (plan, fiche H90).
//
// Sort les « Mise à jour » datées des fiches Fnn et Hnn de
// `docs/claude/PLAN_WELLNEURO.md` vers `docs/claude/plan-journal/<fiche>/`,
// un fragment par mise à jour, et pose une ligne de renvoi par fiche. Les
// lignes « Mise à jour » hors fiche restent en place. Découpage et
// reconstruction : `scripts/lib/plan-journal.mjs`.
//
// À BLANC PAR DÉFAUT : sans `--ecrire`, rien n'est écrit — le script découpe
// en mémoire, contrôle l'aller-retour et rend son rapport. Avec `--ecrire`,
// et seulement si l'aller-retour en mémoire est exact à l'octet près :
// fragments créés sans jamais en écraser un (`wx`), puis plan remplacé, puis
// aller-retour rejoué depuis le disque.
//
// Une fiche irrégulière (mises à jour non contiguës, date en recul, titre
// illisible) est ÉCARTÉE : laissée intacte, nommée au rapport. La remettre en
// ordre est un geste sur le texte, jamais celui du script.
//
// Codes de sortie : 0 = aller-retour exact (et, avec `--ecrire`, bascule
// écrite et reconstatée) ; 1 = bascule refusée ou aller-retour faux, rien
// écrit ; 2 = usage ; 3 = écriture commencée puis échec — l'état se lit au
// `git status` ; reprise : `git checkout -- docs/claude/PLAN_WELLNEURO.md`,
// puis retrait des fragments non suivis de `docs/claude/plan-journal/`
// (`git clean -fd` sur ce dossier) et d'un `PLAN_WELLNEURO.md.bascule-<pid>`
// resté sur place.
//
// Usage :
//   node scripts/wn-plan-bascule.mjs                    à blanc, sur le plan du dépôt
//   node scripts/wn-plan-bascule.mjs --ecrire           bascule écrite
//   node scripts/wn-plan-bascule.mjs --plan P --journal J [--ecrire]
//
// Banc : `scripts/lib/plan-journal.test.mjs`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { basculer, JOURNAL, journalDepuisFragments, lireJournal, PLAN, reconstruire } from "./lib/plan-journal.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function lireArguments(argv) {
  const opts = { ecrire: false, plan: path.join(RACINE, PLAN), journal: path.join(RACINE, JOURNAL) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ecrire") opts.ecrire = true;
    else if (a === "--plan" || a === "--journal") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} attend un chemin`);
      opts[a.slice(2)] = path.resolve(v);
    } else throw new Error(`argument inconnu : ${a}`);
  }
  // L'un sans l'autre écrirait les fragments d'une copie dans le journal du
  // dépôt, ou ceux du dépôt hors de lui.
  if (argv.includes("--plan") !== argv.includes("--journal")) throw new Error("--plan et --journal vont ensemble");
  const dansDepot = (p) => {
    const r = path.relative(RACINE, p);
    return !r.startsWith("..") && !path.isAbsolute(r);
  };
  if (dansDepot(opts.plan) !== dansDepot(opts.journal)) throw new Error("--plan et --journal doivent être tous deux dans le dépôt, ou tous deux hors de lui");
  return opts;
}

function rapport(texte, r) {
  const fiches = new Set(r.fragments.map((f) => f.fiche));
  const lignes = [
    `Plan : ${Buffer.byteLength(texte)} octets → ${Buffer.byteLength(r.plan)} octets après bascule.`,
    `Fragments : ${r.fragments.length}, sur ${fiches.size} fiches.`,
  ];
  if (r.ecartees.length > 0) {
    lignes.push(`Fiches écartées, laissées intactes : ${r.ecartees.length}.`);
    for (const e of r.ecartees) lignes.push(`  - ${e.fiche} : ${e.motifs.join(" ; ")}`);
  }
  return lignes.join("\n");
}

export function principal(argv, sortie = console) {
  let opts;
  try {
    opts = lireArguments(argv);
  } catch (e) {
    sortie.error(`✗ ${e.message}`);
    sortie.error("Usage : node scripts/wn-plan-bascule.mjs [--ecrire] [--plan P] [--journal J]");
    return 2;
  }
  const texte = fs.readFileSync(opts.plan, "utf8");
  const r = basculer(texte);
  if (r.refus.length > 0) {
    sortie.error(`✗ Bascule refusée :\n${r.refus.map((x) => `  - ${x}`).join("\n")}`);
    return 1;
  }
  sortie.log(rapport(texte, r));
  if (reconstruire(r.plan, journalDepuisFragments(r.fragments)) !== texte) {
    sortie.error("✗ Aller-retour faux en mémoire : le plan ne se reconstruit pas à l'octet près. Rien n'est écrit.");
    return 1;
  }
  sortie.log("✓ Aller-retour exact en mémoire, à l'octet près.");
  if (!opts.ecrire) {
    sortie.log("À blanc : rien n'est écrit. `--ecrire` joue la bascule.");
    return 0;
  }
  // La bascule se joue sur un journal vierge : l'aller-retour en mémoire
  // n'a été jugé que sur les fragments neufs.
  const existant = lireJournal(opts.journal);
  if (existant.size > 0) {
    sortie.error(`✗ Journal déjà présent (${[...existant.keys()].join(", ")}) — la bascule se joue sur un journal vierge ; rien n'est écrit.`);
    return 1;
  }
  try {
    for (const f of r.fragments) {
      fs.mkdirSync(path.join(opts.journal, f.fiche), { recursive: true });
      fs.writeFileSync(path.join(opts.journal, f.fiche, f.nom), f.contenu, { flag: "wx" });
    }
    const provisoire = `${opts.plan}.bascule-${process.pid}`;
    fs.writeFileSync(provisoire, r.plan, { flag: "wx" });
    fs.renameSync(provisoire, opts.plan);
  } catch (e) {
    sortie.error(`✗ Écriture interrompue : ${e.message}`);
    return 3;
  }
  let relu;
  try {
    relu = reconstruire(fs.readFileSync(opts.plan, "utf8"), lireJournal(opts.journal));
  } catch (e) {
    sortie.error(`✗ Relecture impossible après écriture : ${e.message}`);
    return 3;
  }
  if (relu !== texte) {
    sortie.error("✗ Aller-retour faux depuis le disque après écriture.");
    return 3;
  }
  sortie.log(`✓ Bascule écrite : ${r.fragments.length} fragments ; aller-retour reconstaté depuis le disque.`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(principal(process.argv.slice(2)));
}
