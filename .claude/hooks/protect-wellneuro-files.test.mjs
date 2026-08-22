// Banc de test du garde-fou d'écriture de fichiers.
//
//   node --test .claude/hooks/
//
// Créé au Socle LOT-02, en même temps que le niveau « demande » clinique :
// jusque-là ce hook n'avait AUCUN banc — le mur d'écriture n'était éprouvé
// que pour les commandes (`block-risky-commands.test.mjs`). Le glob de
// `ci.yml` (« Hooks de garde-fous ») ramasse ce fichier sans qu'on le câble.
//
// Trois familles, dans l'ordre du hook : ce qui doit rester REFUSÉ, ce qui
// doit DEMANDER (Prisma d'un côté, clinique de l'autre — leurs motifs
// d'autorisation ne se confondent pas), ce qui doit passer en SILENCE. Les
// cas « silence » sont aussi importants que les autres : un motif trop court
// qui matcherait un voisin ferait demander une confirmation sans objet, et
// une garde qui crie tout le temps ne se lit plus.
//
// Convention `node:test`, comme `block-risky-commands.test.mjs`.
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "protect-wellneuro-files.mjs"
);

/** Verdict du hook pour un chemin : { verdict: 'passe'|'demande'|'refus', sortie }. */
function jugement(filePath) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: { file_path: filePath } }),
    encoding: "utf8",
  });
  if (res.status === 2) return { verdict: "refus", sortie: res.stderr || "" };
  const sortie = res.stdout || "";
  return { verdict: sortie.includes('"ask"') ? "demande" : "passe", sortie };
}

// ── Ce qui doit rester refusé ────────────────────────────────────────────────

for (const chemin of [
  "web/.env.local",
  "/Users/x/depot/.git/config",
  "web/node_modules/paquet/index.js",
]) {
  test(`refus dur : ${chemin}`, () => {
    assert.equal(jugement(chemin).verdict, "refus");
  });
}

// ── Ce qui doit demander — Prisma, verdict et motif inchangés ────────────────

for (const chemin of [
  "web/prisma/schema.prisma",
  "web/prisma/migrations/20260822000000_x/migration.sql",
]) {
  test(`demande Prisma : ${chemin}`, () => {
    const j = jugement(chemin);
    assert.equal(j.verdict, "demande");
    // Le motif Prisma reste le motif Prisma : release-db, migration additive.
    assert.match(j.sortie, /release-db/);
  });
}

// ── Ce qui doit demander — fichiers cliniques (Socle LOT-02) ─────────────────
// Un cas par motif, avec la casse RÉELLE des fichiers du dépôt : c'est la
// normalisation en minuscules du hook qui est éprouvée, pas une casse choisie
// pour matcher.

for (const chemin of [
  "web/src/lib/clinical/orientationRulesV1.ts",
  "web/src/lib/clinical/stopRulesV1.ts",
  "web/src/lib/clinical/priorityRulesV1.ts",
  "web/src/lib/clinical/contradictionsV1.ts",
  "web/src/lib/clinical/corpusSyntheseV1.ts",
  "web/src/lib/biology-library/indicationsBiologieV1.ts",
  "web/src/lib/equilibre/constants.ts",
  "web/src/lib/questions.ts",
]) {
  test(`demande clinique : ${chemin}`, () => {
    const j = jugement(chemin);
    assert.equal(j.verdict, "demande");
    // Le motif clinique cite la constitution, jamais release-db : les deux
    // demandes ne se confondent pas.
    assert.match(j.sortie, /D-xxx/);
    assert.match(j.sortie, /DC-17/);
    assert.doesNotMatch(j.sortie, /release-db/);
  });
}

// ── Ce qui doit passer en silence ────────────────────────────────────────────

for (const chemin of [
  // Les compagnons de test : le sha épinglé s'y ré-épingle librement.
  "web/src/lib/clinical/orientationRulesV1.test.ts",
  "web/src/lib/questions.test.ts",
  // Le candidat non tranché du LOT-02 : silence tant que la décision n'est
  // pas prise — ce cas ÉCHOUERA le jour où on l'ajoute, et c'est voulu :
  // il forcera la mise à jour du banc en même temps que la liste.
  "web/src/lib/clinical/stopRulesLibelles.ts",
  // Un voisin ordinaire, et le module de garde lui-même.
  "web/src/lib/documents/vocabulaire.ts",
  "web/src/lib/consultation/email.ts",
  "docs/claude/SESSION_LOG.md",
]) {
  test(`silence : ${chemin}`, () => {
    assert.equal(jugement(chemin).verdict, "passe");
  });
}

// ── Robustesse d'entrée ──────────────────────────────────────────────────────

test("entrée illisible : silence, jamais un crash", () => {
  const res = spawnSync("node", [hook], { input: "{pas du json", encoding: "utf8" });
  assert.equal(res.status, 0);
});

test("chemin absent : silence", () => {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: {} }),
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.equal((res.stdout || "").includes('"ask"'), false);
});

test("antislashs Windows et casse mélangée : le motif clinique matche quand même", () => {
  const j = jugement("web\\src\\lib\\clinical\\OrientationRulesV1.TS");
  assert.equal(j.verdict, "demande");
});
