import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const questionsPath = path.join(repoRoot, "web", "src", "lib", "questions.ts");
const miniSynthesePath = path.join(repoRoot, "web", "src", "lib", "scoring", "miniSynthese.ts");
const fixturesPath = path.join(repoRoot, "tests", "wellneuro", "fixtures", "scoring-golden.json");

function stripModuleSource(source) {
  return source
    .replace(/^\s*import\s+[^;]*?from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s+\*\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^export\s+(const|function|class|let|var)\b/gm, "$1")
    .replace(/^export\s+default\s+/gm, "");
}

function stripDuplicateQuestionHelpers(source) {
  if (!source.includes("QUESTIONNAIRE_CATALOGUE")) return source;
  const duplicateNames = new Set(["O_RPS", "O_JPT", "O_04", "O_03jt", "O_YN", "O_UPPS", "O_YOUNG", "O_BMS", "O_CUNGI", "O_PAS", "O_ZARIT", "O_DASS", "O_CONNERS"]);
  return source.split("\n").filter(line => {
    const constMatch = line.match(/^const ([A-Za-z0-9_]+)\s*=/);
    if (constMatch && duplicateNames.has(constMatch[1])) return false;
    if (/^function q(n|s)?\(/.test(line)) return false;
    return true;
  }).join("\n");
}

function inlineModule(file, seen, parts) {
  const abs = path.resolve(file);
  if (seen.has(abs)) return;
  seen.add(abs);

  const source = fs.readFileSync(abs, "utf8");
  const importRegex = /(import\s+[^;]*?from\s+['"](\.[^'"]*)['"])|(export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.[^'"]*)['"])/g;
  let match;
  while ((match = importRegex.exec(source))) {
    const rel = match[2] || match[4];
    if (!rel) continue;
    let dep = path.resolve(path.dirname(abs), rel);
    if (!dep.endsWith(".ts")) dep += ".ts";
    inlineModule(dep, seen, parts);
  }

  parts.push(stripDuplicateQuestionHelpers(stripModuleSource(source)));
}

function loadQuestionsModule() {
  const parts = [];
  inlineModule(questionsPath, new Set(), parts);
  const source = parts.join("\n");
  return new Function(`${source}\nreturn { QUESTIONNAIRE_CATALOGUE, calculateScore };`)();
}

function loadMiniSynthese() {
  const source = fs.readFileSync(miniSynthesePath, "utf8")
    .replace(/^\s*import\s+type\s+[^;]*;?\s*$/gm, "")
    .replace(/^type ScoreInput = .*$/gm, "")
    .replace(/^const SEVERITE: Record<string, number> =/gm, "const SEVERITE =")
    .replace(/function estPerturbe\(interp\?: ScoreInterpretation \| null\): boolean/g, "function estPerturbe(interp)")
    .replace(/export function buildMiniSynthese\(scores: ScoreInput\): string/g, "function buildMiniSynthese(scores)")
    .replace(/\s+as\s+[A-Za-z0-9_<>{}\[\]\|,\s?.]+(?=[;\n])/g, "")
    .replace(/!\./g, ".")
    .replace(/^export\s+/gm, "");

  return new Function(`${source}\nreturn { buildMiniSynthese };`)();
}

const { calculateScore } = loadQuestionsModule();
const { buildMiniSynthese } = loadMiniSynthese();
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

function assertInterpretation(actual, expected) {
  assert.equal(actual?.label, expected.label);
  assert.equal(actual?.color, expected.color);
  if (expected.protocol !== undefined) {
    assert.equal(actual?.protocol, expected.protocol);
  }
  if (expected.detail !== undefined) {
    assert.equal(actual?.detail, expected.detail);
  }
}

for (const fixture of fixtures) {
  test(`${fixture.name} reste stable`, () => {
    const result = calculateScore(fixture.questionnaireId, fixture.answers);

    assert.equal(result.type, fixture.expected.type);
    assert.equal(result.total, fixture.expected.total);
    if (fixture.expected.interpretation) {
      assertInterpretation(result.interpretation, fixture.expected.interpretation);
    } else {
      assert.equal(result.interpretation, undefined);
    }
    assert.equal(buildMiniSynthese(result), fixture.expected.miniSynthese);

    if (fixture.expected.subScores) {
      for (const [subId, expectedSubScore] of Object.entries(fixture.expected.subScores)) {
        const actualSubScore = result.subScores.find(subScore => subScore.id === subId);
        assert.ok(actualSubScore, `${fixture.questionnaireId} expose le sous-score ${subId}`);
        assert.equal(actualSubScore.total, expectedSubScore.total);
        assert.equal(actualSubScore.label, expectedSubScore.label);
        if (expectedSubScore.interpretation) {
          assertInterpretation(actualSubScore.interpretation, expectedSubScore.interpretation);
        } else {
          assert.equal(actualSubScore.interpretation, undefined);
        }
      }
    }
  });
}

test("un questionnaire inconnu renvoie une erreur stable", () => {
  const result = calculateScore("Q_INEXISTANT", {});
  assert.deepEqual(result, { error: "Questionnaire introuvable" });
  assert.equal(buildMiniSynthese(result), "");
});
