// Banc du garde MCP Prisma.
//
//   node --test .claude/hooks/guard-prisma-mcp.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "guard-prisma-mcp.mjs");

function verdict(entree) {
  const r = spawnSync("node", [script], {
    input: typeof entree === "string" ? entree : JSON.stringify(entree),
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision;
}

test("migrate-status passe sans interruption", () => {
  assert.equal(verdict({ tool_name: "mcp__plugin_prisma_Prisma-Local__migrate-status" }), "allow");
});

test("migrate-dev est refusé", () => {
  assert.equal(verdict({ tool_name: "mcp__plugin_prisma_Prisma-Local__migrate-dev" }), "deny");
});

test("Prisma-Studio est refusé", () => {
  assert.equal(verdict({ tool_name: "mcp__plugin_prisma_Prisma-Local__Prisma-Studio" }), "deny");
});

test("un outil Prisma inconnu est refusé (liste blanche)", () => {
  assert.equal(verdict({ tool_name: "mcp__plugin_prisma_Prisma-Remote__create-prisma-postgres-database" }), "deny");
});

test("une entrée illisible échoue fermé", () => {
  assert.equal(verdict("pas du json"), "deny");
  assert.equal(verdict({}), "deny");
});
