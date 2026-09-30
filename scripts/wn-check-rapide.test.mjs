// Banc de `check:rapide` : ce qu'il saute, et surtout ce qu'il ne saute jamais.
//
//   node --test scripts/wn-check-rapide.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONDITIONNELLES, etapesDeCheck, selection } from "./wn-check-rapide.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = JSON.parse(fs.readFileSync(path.join(RACINE, "web", "package.json"), "utf8")).scripts.check;
const etapes = etapesDeCheck(check);

test("chaque étape conditionnelle existe dans `check` — sinon elle n'est plus jamais sautée, ni jouée", () => {
  for (const etape of CONDITIONNELLES.keys()) assert.ok(etapes.includes(etape), `absente de check : ${etape}`);
});

test("un diff web/ ordinaire saute les trois étapes lourdes, et rien d'autre", () => {
  const { jouees, sautees } = selection(etapes, ["web/src/app/page.tsx"]);
  assert.deepEqual([...sautees].sort(), [...CONDITIONNELLES.keys()].sort());
  assert.equal(jouees.length, etapes.length - CONDITIONNELLES.size);
});

test("les gardes cliniques et la passe anti-secrets de l'index ne sont JAMAIS sautés", () => {
  const { jouees } = selection(etapes, []);
  for (const etape of ["npm run scoring-check", "npm run certify-check", "npm run type-check", "bash ../scripts/check_no_secrets.sh --staged"]) {
    assert.ok(jouees.includes(etape), `sautée à tort : ${etape}`);
  }
});

test("un diff sous scripts/ ou .github/ rend dus les bancs d'outillage", () => {
  for (const f of ["scripts/wn-cycle.mjs", ".github/workflows/ci.yml"]) {
    assert.ok(selection(etapes, [f]).jouees.includes("npm run bancs-outillage-check"), f);
  }
});

test("un diff sous .claude/hooks, .claude/agents ou settings.json rend dû le banc des hooks", () => {
  for (const f of [".claude/hooks/block-risky-commands.mjs", ".claude/agents/wn-reviewer.md", ".claude/settings.json"]) {
    assert.ok(selection(etapes, [f]).jouees.includes("npm run hooks-check"), f);
  }
  assert.ok(!selection(etapes, [".claude/settings.local.json"]).jouees.includes("npm run hooks-check"));
});

test("l'anti-secrets du dépôt entier n'est jamais en rapide — il reste dû avant commit", () => {
  assert.ok(selection(etapes, ["scripts/x.mjs", ".claude/hooks/x.mjs"]).sautees.includes("bash ../scripts/check_no_secrets.sh"));
});
