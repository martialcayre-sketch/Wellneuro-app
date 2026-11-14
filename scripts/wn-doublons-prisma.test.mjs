// Banc de scripts/wn-doublons-prisma.sh (P2 de wn-reviewer sur #2074 : un
// répertoire « * 2 » n'était pas vu, un dossier absent passait en silence, et
// aucun banc ne couvrait le contrôle).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "wn-doublons-prisma.sh");

function lancer(...args) {
  return spawnSync("bash", [SCRIPT, ...args], { encoding: "utf8" });
}

function client(t, entrees) {
  const racine = mkdtempSync(path.join(tmpdir(), "wn-doublons-"));
  t.after(() => rmSync(racine, { recursive: true, force: true }));
  for (const [chemin, type] of entrees) {
    const p = path.join(racine, chemin);
    if (type === "dossier") mkdirSync(p, { recursive: true });
    else {
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, "");
    }
  }
  return racine;
}

test("client propre : 0", (t) => {
  const d = client(t, [["index.d.ts"], ["edge.js"], ["runtime/library.js"], ["runtime", "dossier"]]);
  const r = lancer(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout, "");
});

for (const [cas, entrees, attendu] of [
  ["fichier « * 2.* »", [["index.d.ts"], ["index.d 2.ts"]], "index.d 2.ts"],
  ["fichier profond « * 2.* »", [["runtime/library 2.js"]], "library 2.js"],
  ["répertoire « * 2 »", [["runtime 2", "dossier"]], "runtime 2"],
  ["fichier sans extension « * 2 »", [["schema 2"]], "schema 2"],
]) {
  test(`doublon vu : ${cas} → 1, listé`, (t) => {
    const r = lancer(client(t, entrees));
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(attendu.replace(/\./g, "\\.")));
  });
}

test("un nom qui finit par « 2 » sans espace n'est pas un doublon", (t) => {
  const r = lancer(client(t, [["v2.js"], ["edge2"], ["wasm-2.js"]]));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("répertoire absent : 2, jamais « aucun doublon »", (t) => {
  const d = client(t, []);
  const r = lancer(path.join(d, "absent"));
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /introuvable/);
});

test("usage : sans argument → 2", () => {
  assert.equal(lancer().status, 2);
});
