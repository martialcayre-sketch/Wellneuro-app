// Banc des lanceurs de gardes déclarés dans `.claude/settings.json`.
//
//   node --test .claude/hooks/
//
// Ce que ce banc protège : en septembre 2026, environ la moitié du travail
// s'est faite dans des sessions dont la racine était `~/Developer`, pas le
// dépôt. `$CLAUDE_PROJECT_DIR` y valait `~/Developer`, `node` ne trouvait pas
// le script, sortait en code 1 — échec NON BLOQUANT — et l'outil passait. Les
// gardes existaient, se déclenchaient, et ne gardaient rien, sans un mot.
//
// Le lanceur résout désormais le script par `$CLAUDE_PROJECT_DIR`, puis par la
// racine Git du répertoire courant, et sort en code 2 (bloquant) s'il ne le
// trouve nulle part. Ce banc éprouve les quatre situations sur la commande
// RÉELLEMENT déclarée, pas sur une copie.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const settings = JSON.parse(fs.readFileSync(path.join(racine, ".claude", "settings.json"), "utf8"));

/** Toutes les commandes de hook, avec leur événement. */
function commandes() {
  const out = [];
  for (const [evenement, blocs] of Object.entries(settings.hooks || {})) {
    for (const bloc of blocs) {
      for (const h of bloc.hooks || []) out.push({ evenement, matcher: bloc.matcher, ...h });
    }
  }
  return out;
}

const gardes = commandes().filter((h) => h.evenement !== "PostToolUse");
const horsGit = fs.mkdtempSync(path.join(os.tmpdir(), "wn-garde-"));

function lancer(commande, { projet, cwd, entree }) {
  return spawnSync("sh", ["-c", commande], {
    input: JSON.stringify(entree),
    encoding: "utf8",
    cwd,
    env: { ...process.env, CLAUDE_PROJECT_DIR: projet, WN_ALLOW_RISKY_COMMAND: "" },
  });
}

test("chaque garde bloquant a un repli par la racine Git et échoue fermé", () => {
  assert.ok(gardes.length >= 6, `gardes trouvés : ${gardes.length}`);
  for (const h of gardes) {
    assert.match(h.command, /git rev-parse --show-toplevel/, h.command);
    assert.match(h.command, /exit 2/, h.command);
    assert.doesNotMatch(h.command, /^node /, `lanceur nu : ${h.command}`);
  }
});

test("le journal Bash reste asynchrone et hors des gardes", () => {
  const journal = commandes().filter((h) => h.evenement === "PostToolUse");
  assert.ok(journal.length >= 1);
  for (const h of journal) assert.equal(h.async, true);
});

const bash = gardes.find((h) => h.matcher === "Bash" && h.command.includes("block-risky-commands.mjs"));
const destructif = { tool_input: { command: ["rm", "-rf", "/"].join(" ") } };
const anodin = { tool_input: { command: "ls" } };

test("racine correcte : le garde tourne et laisse passer l'anodin", () => {
  const r = lancer(bash.command, { projet: racine, cwd: horsGit, entree: anodin });
  assert.equal(r.status, 0, r.stderr);
});

test("racine fausse mais répertoire courant dans le dépôt : repli, le garde MORD", () => {
  const r = lancer(bash.command, { projet: horsGit, cwd: racine, entree: destructif });
  assert.equal(r.status, 2, "le repli doit exécuter le vrai garde, qui refuse");
  assert.doesNotMatch(r.stderr, /introuvable/);
});

test("racine fausse et hors de tout dépôt : échec FERMÉ, jamais silencieux", () => {
  const r = lancer(bash.command, { projet: horsGit, cwd: horsGit, entree: anodin });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Garde WellNeuro introuvable/);
});

test("variable de projet absente : même repli", () => {
  const r = lancer(bash.command, { projet: "", cwd: racine, entree: anodin });
  assert.equal(r.status, 0, r.stderr);
});
