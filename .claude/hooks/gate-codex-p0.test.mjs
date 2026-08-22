// Banc de test du rappel Codex P0 — `gate-codex-p0.mjs`.
//
//   node --test .claude/hooks/
//
// Créé après l'incident du 2026-08-22 (Alliance LOT-06, PR #760) : un diff
// touchant une route portail par token — classe Auth/P0 de
// `docs/claude/POLITIQUE_REVUE.md` — a été mergé sans que la passe Codex
// obligatoire n'ait été demandée. Ce hook ne peut pas prouver qu'une passe a
// eu lieu (il ne voit ni la conversation ni un Codex lancé hors dépôt) ; il
// ne fait que refuser le SILENCE quand aucune trace n'est visible dans le
// dépôt. D'où « ask », jamais « deny » — vérifié ci-dessous.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "gate-codex-p0.mjs");

function run(command, cwd) {
  const result = spawnSync("git", command, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function invoke(cwd, command) {
  return spawnSync("node", [hook], {
    cwd,
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd }),
    encoding: "utf8",
  });
}

function assertSilence(resultat) {
  assert.equal(resultat.status, 0, resultat.stderr);
  assert.equal(resultat.stdout.trim(), "", "silence attendu : rien à signaler");
}

function assertDemande(resultat) {
  assert.equal(resultat.status, 0, resultat.stderr);
  const sortie = JSON.parse(resultat.stdout);
  assert.equal(sortie.hookSpecificOutput?.permissionDecision, "ask");
}

function assertAutoriseAvecTrace(resultat) {
  assert.equal(resultat.status, 0, resultat.stderr);
  const sortie = JSON.parse(resultat.stdout);
  assert.equal(sortie.hookSpecificOutput, undefined, "P0 avec trace : pas de blocage");
  assert.match(sortie.systemMessage || "", /codex/i);
}

// Base + feature branch avec origin/main réel (comme `git-freshness.test.mjs`) :
// le hook lit `merge-base HEAD origin/main`, un simple dépôt local sans remote
// ne l'exercerait pas de la même façon.
function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-codex-p0-test-"));
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  run(["init", "--bare", remote], root);
  run(["clone", remote, work], root);
  run(["config", "user.email", "test@wellneuro.invalid"], work);
  run(["config", "user.name", "Test WellNeuro"], work);
  fs.writeFileSync(path.join(work, "README.md"), "test\n");
  run(["add", "README.md"], work);
  run(["commit", "-m", "initial"], work);
  run(["branch", "-M", "main"], work);
  run(["push", "-u", "origin", "main"], work);
  run(["checkout", "-b", "feature"], work);
  return work;
}

function ecrire(work, fichier, contenu) {
  fs.mkdirSync(path.dirname(path.join(work, fichier)), { recursive: true });
  fs.writeFileSync(path.join(work, fichier), contenu);
}

test("silence : commande non gh pr create/merge", () => {
  const work = repo();
  ecrire(work, "web/src/app/api/portail/dossier/route.ts", "x");
  run(["add", "-A"], work);
  run(["commit", "-m", "feat: portail"], work);
  assertSilence(invoke(work, "gh pr view 1"));
});

test("silence : gh pr create mentionné en prose, pas en tête de segment", () => {
  const work = repo();
  ecrire(work, "web/src/app/api/portail/dossier/route.ts", "x");
  run(["add", "-A"], work);
  run(["commit", "-m", "feat: portail"], work);
  assertSilence(invoke(work, 'echo "penser a gh pr create plus tard"'));
});

test("silence : diff sans fichier P0", () => {
  const work = repo();
  ecrire(work, "web/src/app/api/rapports/route.ts", "x");
  run(["add", "-A"], work);
  run(["commit", "-m", "feat: rapports"], work);
  assertSilence(invoke(work, "gh pr create --title x --body y"));
});

for (const [nom, chemin] of [
  ["route portail (auth)", "web/src/app/api/portail/dossier/route.ts"],
  ["migration Prisma", "prisma/migrations/2026_x/migration.sql"],
  ["règle clinique signée", "web/src/lib/clinical/priorityRulesV1.ts"],
]) {
  test(`demande : ${nom}, aucune trace Codex`, () => {
    const work = repo();
    ecrire(work, chemin, "x");
    run(["add", "-A"], work);
    run(["commit", "-m", "feat: p0"], work);
    assertDemande(invoke(work, "gh pr create --title x --body y"));
  });
}

test("demande : gh pr merge déclenche la même classification", () => {
  const work = repo();
  ecrire(work, "web/src/app/api/portail/dossier/route.ts", "x");
  run(["add", "-A"], work);
  run(["commit", "-m", "feat: portail"], work);
  assertDemande(invoke(work, "gh pr merge --squash"));
});

test("autorisé avec trace : fragment changelog.d mentionnant Codex", () => {
  const work = repo();
  ecrire(work, "web/src/app/api/portail/dossier/route.ts", "x");
  ecrire(work, "changelog.d/2026-08-23-test.md", "Revue Codex effectuée, P0 confirmé.\n");
  run(["add", "-A"], work);
  run(["commit", "-m", "feat: portail + changelog"], work);
  assertAutoriseAvecTrace(invoke(work, "gh pr create --title x --body y"));
});

test("autorisé avec trace : message de commit mentionnant Codex", () => {
  const work = repo();
  ecrire(work, "web/src/app/api/portail/dossier/route.ts", "x");
  run(["add", "-A"], work);
  run(["commit", "-m", "feat: portail\n\nPasse Codex obligatoire effectuée, P0 confirmé."], work);
  assertAutoriseAvecTrace(invoke(work, "gh pr create --title x --body y"));
});
