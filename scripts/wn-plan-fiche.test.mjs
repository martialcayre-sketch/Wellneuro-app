// Banc de `scripts/wn-plan-fiche.mjs` (D-371 §1, fiche H90).
//
// Ce qu'il protège : une fiche se lit avec son journal en une commande, et
// la lecture rend, après la bascule, exactement ce que la fiche portait
// avant — pour chaque fiche du plan réel. Lecture seule, sur des copies.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { analyserFiches, basculer, JOURNAL, lireFiche, lireJournal, PLAN, reconstruire } from "./lib/plan-journal.mjs";
import { principal } from "./wn-plan-fiche.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, "..");
const SCRIPT = path.join(ICI, "wn-plan-fiche.mjs");

function capter() {
  const s = { out: "", err: "" };
  return { s, sortie: { out: (t) => (s.out += t), err: (t) => (s.err += t) } };
}

/** Plan et journal basculés, écrits dans un dossier temporaire. */
function basculeSurDisque(texte) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "plan-fiche-"));
  const r = basculer(texte);
  assert.deepEqual(r.refus, []);
  const plan = path.join(d, "PLAN.md");
  const journal = path.join(d, "plan-journal");
  fs.writeFileSync(plan, r.plan);
  for (const f of r.fragments) {
    fs.mkdirSync(path.join(journal, f.fiche), { recursive: true });
    fs.writeFileSync(path.join(journal, f.fiche, f.nom), f.contenu);
  }
  return { d, plan, journal };
}

const PLAN_REEL = fs.readFileSync(path.join(RACINE, PLAN), "utf8");
const DEJA_BASCULE = analyserFiches(PLAN_REEL.split("\n")).some((f) => f.renvois.length > 0);
const PLAN_COMPLET = DEJA_BASCULE ? reconstruire(PLAN_REEL, lireJournal(path.join(RACINE, JOURNAL))) : PLAN_REEL;

test("plan réel : chaque fiche se lit après la bascule exactement comme avant", () => {
  const { plan, journal } = basculeSurDisque(PLAN_COMPLET);
  const ids = analyserFiches(PLAN_COMPLET.split("\n")).map((f) => f.id);
  assert.ok(ids.length >= 100, `seulement ${ids.length} fiches lues`);
  const vide = new Map();
  for (const id of ids) {
    const { s, sortie } = capter();
    assert.equal(principal([id, "--plan", plan, "--journal", journal], sortie), 0, id);
    assert.equal(s.out, lireFiche(PLAN_COMPLET, vide, id), id);
  }
});

test("la commande, lancée comme processus, rend la fiche du dépôt", () => {
  const sortie = execFileSync("node", [SCRIPT, "H90"], { cwd: os.tmpdir(), encoding: "utf8" });
  assert.match(sortie, /^#### H90 · /);
  assert.match(sortie, /- \*\*Critère de fin\*\* :/);
});

test("fiche introuvable : code 1 ; usage : code 2", () => {
  const { plan, journal } = basculeSurDisque("#### H01 · a\n- **Rang** : 1.\n");
  let c = capter();
  assert.equal(principal(["H77", "--plan", plan, "--journal", journal], c.sortie), 1);
  assert.match(c.s.err, /H77 introuvable/);
  for (const argv of [[], ["X1"], ["H01", "H02"], ["H01", "--plan"], ["H01", "--inconnu"]]) {
    c = capter();
    assert.equal(principal(argv, c.sortie), 2, argv.join(" "));
    assert.equal(c.s.out, "");
  }
});

test("journal orphelin (fragments sans renvoi) : code 1, rien rendu", () => {
  const { plan, journal } = basculeSurDisque("#### H01 · a\n- **Rang** : 1.\n");
  fs.mkdirSync(path.join(journal, "H05"), { recursive: true });
  fs.writeFileSync(path.join(journal, "H05", "2026-10-01-01-x.md"), "- **Mise à jour (2026-10-01)** : x.\n");
  const { s, sortie } = capter();
  assert.equal(principal(["H01", "--plan", plan, "--journal", journal], sortie), 1);
  assert.match(s.err, /H05 : aucune ligne de renvoi/);
  assert.equal(s.out, "");
});
