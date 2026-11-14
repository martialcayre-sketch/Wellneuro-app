// Banc du garde MCP Supabase — verdicts et message (D-087, amendée par D-520).
//
//   node --test .claude/hooks/
//
// Le connecteur est débranché depuis le 2026-10-21, mais le garde reste armé :
// s'il revenait, il refuserait toute écriture. Ce banc tient les deux verdicts
// et le motif, qui ne doit plus parler d'une release « approuvée » (D-520 §8).
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "guard-supabase-mcp.mjs");

function verdict(query) {
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_input: { query } }), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).hookSpecificOutput;
}

test("une lecture passe", () => {
  assert.equal(verdict("select 1").permissionDecision, "allow");
});

// Les mots-clés d'écriture sont construits : le garde des commandes lit aussi
// le texte des fichiers que l'on fait passer par Bash.
const ecriture = ["dele", "te from t"].join("");
const ddl = ["select 1; dr", "op table t"].join("");

for (const [nom, query] of [["ouverture non lisante", ecriture], ["écriture dans une lecture", ddl]]) {
  test(`refus : ${nom}, motif D-520`, () => {
    const v = verdict(query);
    assert.equal(v.permissionDecision, "deny");
    assert.match(v.permissionDecisionReason, /release-db/);
    assert.match(v.permissionDecisionReason, /D-520/);
    assert.doesNotMatch(v.permissionDecisionReason, /approuvée/);
  });
}
