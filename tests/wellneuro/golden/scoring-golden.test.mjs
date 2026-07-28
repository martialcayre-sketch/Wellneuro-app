import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const questionsPath = path.join(repoRoot, "web", "src", "lib", "questions.ts");
const miniSynthesePath = path.join(repoRoot, "web", "src", "lib", "scoring", "miniSynthese.ts");
const fixturesPath = path.join(repoRoot, "tests", "wellneuro", "fixtures", "scoring-golden.json");

// `web/` porte les dépendances (pas de node_modules à la racine du dépôt) ;
// `tests/` est un dossier FRÈRE, pas un descendant — la résolution ESM/CJS de
// Node ne remonte jamais chez un frère. D'où le chemin explicite.
const require = createRequire(path.join(repoRoot, "web", "package.json"));
const ts = require("typescript");

// Efface la syntaxe propre à TypeScript (annotations de type sur paramètres,
// variables et retours, `interface`, `export type`/`import type`, `as`, `!`
// non-null…) via le VRAI compilateur plutôt qu'un jeu de regex. Conserve la
// syntaxe ESM (`import`/`export`) telle quelle : `stripModuleSyntax` s'en
// charge ensuite. Une ancienne version de ce banc faisait ce travail à la main
// avec des regex qui ne couvraient qu'un sous-ensemble figé de la syntaxe —
// chaque nouvelle annotation de type dans `questions.ts` la cassait (dernière
// casse connue : `export type QuestionOption` puis les paramètres typés de
// `q`/`qn`/`qs`, ni l'un ni l'autre couverts). Passer par le compilateur ferme
// la classe entière plutôt qu'un exemple à la fois.
function eraseTypes(source) {
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  assert.equal(diagnostics.length, 0, `TS invalide : ${diagnostics.map(d => d.messageText).join("; ")}`);
  return outputText;
}

// Ce qui reste après `eraseTypes` : de l'ESM valide (import/export), à réduire
// en script plat pour la concaténation + `new Function`. Un fichier qui ne
// contenait QUE des types (ex. questionnaire-types.ts) ressort de
// `transpileModule` comme `export {};` — un marqueur de module vide, sans
// valeur d'exécution, à effacer comme le reste.
function stripModuleSyntax(source) {
  return source
    .replace(/^\s*import\s+[^;]*?from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s+\*\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s*\{\s*\}\s*;?\s*$/gm, "")
    .replace(/^export\s+(const|function|class|let|var)\b/gm, "$1")
    .replace(/^export\s+default\s+/gm, "");
}

// Opère sur le texte ORIGINAL (avant `eraseTypes`) : `q`/`qn`/`qs` et les
// jeux d'options dupliqués y sont chacun sur une seule ligne physique, telle
// qu'écrite à la main dans questions.ts — condition dont ce filtre ligne à
// ligne dépend. Le compilateur, lui, RÉ-IMPRIME le code (`ts.transpileModule`
// n'est pas un diff minimal) et peut refendre un `if` sans accolades sur deux
// lignes : appliqué après coup, ce filtre couperait la signature en laissant
// le corps de la fonction orphelin en tête de fichier — un `return` hors
// fonction, `SyntaxError` garantie. D'où l'ordre : dédoublonner d'abord, sur
// du texte encore fidèle à sa mise en forme d'auteur ; effacer les types après.
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

  // Les chemins d'import sont des littéraux de chaîne, valides identiquement
  // en TS et en JS : les repérer par regex sur le texte brut ne dépend pas de
  // la syntaxe de type environnante, pas besoin du compilateur ici.
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

  const deduped = stripDuplicateQuestionHelpers(source);
  parts.push(stripModuleSyntax(eraseTypes(deduped)));
}

function loadQuestionsModule() {
  const parts = [];
  inlineModule(questionsPath, new Set(), parts);
  const source = parts.join("\n");
  return new Function(`${source}\nreturn { QUESTIONNAIRE_CATALOGUE, calculateScore };`)();
}

function loadMiniSynthese() {
  const source = stripModuleSyntax(eraseTypes(fs.readFileSync(miniSynthesePath, "utf8")));
  return new Function(`${source}\nreturn { buildMiniSynthese };`)();
}

const { calculateScore } = loadQuestionsModule();
const { buildMiniSynthese } = loadMiniSynthese();
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

// `protocol` n'est plus lu ici : `separerConduite` (questions.ts) le retire de
// `interpretation` avant que le moteur ne rende son résultat — les 17 moteurs y
// passent tous. Une bande d'interprétation dit CE QUE VAUT la mesure ; ce que
// cela vaut de FAIRE vit désormais dans `result.conduite`, vérifié plus bas.
function assertInterpretation(actual, expected) {
  assert.equal(actual?.label, expected.label);
  assert.equal(actual?.color, expected.color);
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
    if (fixture.expected.conduite !== undefined) {
      assert.equal(result.conduite, fixture.expected.conduite);
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
