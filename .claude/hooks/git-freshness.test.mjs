import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "git-freshness.mjs");

function run(command, cwd) {
  const result = spawnSync("git", command, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function invoke(cwd, input) {
  return spawnSync("node", [hook], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
}

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-freshness-test-"));
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
  return { root, work };
}

test("une session fraîche autorise Edit", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `fresh-${Date.now()}`;
  const start = invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  assert.equal(start.status, 0);
  assert.match(start.stdout, /Freshness Git vérifiée/);
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assert.equal(edit.status, 0);
  assert.doesNotMatch(edit.stdout, /permissionDecision/);
});

test("Edit est refusé sans preuve de début de session", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: `missing-${Date.now()}`, cwd: work, tool_name: "Edit" });
  assert.match(edit.stdout, /"permissionDecision":"deny"/);
});

test("un commit local après la vérification n'interrompt pas la session", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `changed-${Date.now()}`;
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  fs.writeFileSync(path.join(work, "second.txt"), "second\n");
  run(["add", "second.txt"], work);
  run(["commit", "-m", "second"], work);
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Write" });
  assert.doesNotMatch(edit.stdout, /permissionDecision/);
});

test("Edit est refusé si origin/main change après la vérification", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `origin-changed-${Date.now()}`;
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  fs.writeFileSync(path.join(work, "remote-change.txt"), "change\n");
  run(["add", "remote-change.txt"], work);
  run(["commit", "-m", "remote change"], work);
  run(["update-ref", "refs/remotes/origin/main", "HEAD"], work);
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Write" });
  assert.match(edit.stdout, /"permissionDecision":"deny"/);
});
