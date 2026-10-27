// Banc de `scripts/wn-plan-journal-garde.mjs` (D-371 §3, fiche H90).
//
// Ce qu'il protège : modifier, supprimer ou renommer un fragment existant
// AVERTIT, ajouter un fragment se tait, et le garde ne bloque JAMAIS — code
// 0 dans tous les cas, base illisible comprise. Sur un dépôt Git fabriqué.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { JOURNAL } from "./lib/plan-journal.mjs";
import { changementsInterdits, principal } from "./wn-plan-journal-garde.mjs";

function git(d, ...args) {
  return execFileSync("git", ["-c", "user.email=banc@exemple.invalid", "-c", "user.name=banc", "-c", "commit.gpgSign=false", ...args], {
    cwd: d,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Dépôt avec deux fragments commités ; rend `{ d, base }`. */
function depot() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "plan-garde-"));
  git(d, "init", "-q");
  fs.mkdirSync(path.join(d, JOURNAL, "H01"), { recursive: true });
  fs.writeFileSync(path.join(d, JOURNAL, "H01", "2026-10-01-01-a.md"), "- **Mise à jour (2026-10-01)** : a.\n");
  fs.writeFileSync(path.join(d, JOURNAL, "H01", "2026-10-02-01-b.md"), "- **Mise à jour (2026-10-02)** : b, assez long pour qu'un renommage reste reconnu.\n");
  fs.writeFileSync(path.join(d, "autre.md"), "x\n");
  git(d, "add", "-A");
  git(d, "commit", "-q", "-m", "base");
  return { d, base: git(d, "rev-parse", "HEAD") };
}

function jouer(d, argv, env = {}) {
  const lignes = [];
  const code = principal(argv, env, d, { log: (t) => lignes.push(t) });
  return { code, texte: lignes.join("\n") };
}

test("rien de changé, ou un fragment ajouté : silence, code 0", () => {
  const { d, base } = depot();
  assert.match(jouer(d, ["--base", base]).texte, /^✓/);
  fs.writeFileSync(path.join(d, JOURNAL, "H01", "2026-10-03-01-c.md"), "c\n");
  fs.writeFileSync(path.join(d, "autre.md"), "modifié hors du journal\n");
  git(d, "add", "-A");
  git(d, "commit", "-q", "-m", "ajout");
  const r = jouer(d, ["--base", base]);
  assert.equal(r.code, 0);
  assert.match(r.texte, /^✓/);
  assert.doesNotMatch(r.texte, /⚠/);
});

test("fragment modifié : avertissement nommant le fichier, code 0", () => {
  const { d, base } = depot();
  fs.appendFileSync(path.join(d, JOURNAL, "H01", "2026-10-01-01-a.md"), "ajout.\n");
  const r = jouer(d, ["--base", base]);
  assert.equal(r.code, 0);
  assert.match(r.texte, /⚠ Fragment du journal du plan modifié : docs\/claude\/plan-journal\/H01\/2026-10-01-01-a\.md/);
});

test("fragment modifié dans l'index puis restauré dans l'arbre : avertissement, une seule fois", () => {
  const { d, base } = depot();
  const f = path.join(d, JOURNAL, "H01", "2026-10-01-01-a.md");
  const original = fs.readFileSync(f, "utf8");
  fs.writeFileSync(f, "modifié\n");
  git(d, "add", "-A");
  fs.writeFileSync(f, original);
  let r = jouer(d, ["--base", base]);
  assert.equal(r.code, 0);
  assert.equal(r.texte.match(/modifié : /g)?.length, 1, r.texte);
  // Modifié dans l'index ET dans l'arbre : toujours une seule ligne.
  fs.writeFileSync(f, "modifié\n");
  r = jouer(d, ["--base", base]);
  assert.equal(r.texte.match(/modifié : /g)?.length, 1, r.texte);
});

test("fragment supprimé (commité) : avertissement, code 0", () => {
  const { d, base } = depot();
  git(d, "rm", "-q", `${JOURNAL}/H01/2026-10-01-01-a.md`);
  git(d, "commit", "-q", "-m", "retrait");
  const r = jouer(d, ["--base", base]);
  assert.equal(r.code, 0);
  assert.match(r.texte, /supprimé : docs\/claude\/plan-journal\/H01\/2026-10-01-01-a\.md/);
});

test("fragment renommé : avertissement, code 0", () => {
  const { d, base } = depot();
  git(d, "mv", `${JOURNAL}/H01/2026-10-02-01-b.md`, `${JOURNAL}/H01/2026-10-02-01-renomme.md`);
  const r = jouer(d, ["--base", base]);
  assert.equal(r.code, 0);
  assert.match(r.texte, /renommé \(→ docs\/claude\/plan-journal\/H01\/2026-10-02-01-renomme\.md\) : docs\/claude\/plan-journal\/H01\/2026-10-02-01-b\.md/);
});

test("en CI : annotation `::warning file=…::`, et HEAD^1 pour base par défaut", () => {
  const { d } = depot();
  fs.appendFileSync(path.join(d, JOURNAL, "H01", "2026-10-01-01-a.md"), "x\n");
  git(d, "commit", "-q", "-am", "modif");
  const r = jouer(d, [], { GITHUB_ACTIONS: "true" });
  assert.equal(r.code, 0);
  assert.match(r.texte, /^::warning file=docs\/claude\/plan-journal\/H01\/2026-10-01-01-a\.md::/);
});

test("base illisible, ou arguments non lus : avertissement « sans objet », jamais bloquant", () => {
  const { d } = depot();
  let r = jouer(d, ["--base", "n-existe-pas"]);
  assert.equal(r.code, 0);
  assert.match(r.texte, /base illisible/);
  // Pas d'origin/main dans le dépôt fabriqué : l'ancêtre commun manque.
  r = jouer(d, []);
  assert.equal(r.code, 0);
  assert.match(r.texte, /base illisible/);
  for (const argv of [["--base"], ["--inconnu"]]) {
    r = jouer(d, argv);
    assert.equal(r.code, 0);
    assert.match(r.texte, /sans objet/);
  }
});

test("lecture du diff : seuls les fragments existants comptent, ajouts exclus", () => {
  const diff = [
    `A\t${JOURNAL}/H01/n.md`,
    `M\t${JOURNAL}/H01/m.md`,
    `D\t${JOURNAL}/H01/d.md`,
    `R087\t${JOURNAL}/H01/r.md\t${JOURNAL}/H01/r2.md`,
    "M\tdocs/claude/PLAN_WELLNEURO.md",
    `M\t${JOURNAL}-autre/x.md`,
  ].join("\n");
  assert.deepEqual(
    changementsInterdits(diff).map((c) => c.statut + " " + c.chemin),
    [`M ${JOURNAL}/H01/m.md`, `D ${JOURNAL}/H01/d.md`, `R ${JOURNAL}/H01/r.md`],
  );
});
