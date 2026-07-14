#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const questionsPath = path.join(root, "web", "src", "lib", "questions.ts");

function stripModuleSource(source) {
  return source
    .replace(/^\s*import\s+[^;]*?from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s+\*\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, "")
    .replace(/^export\s+(const|function|class|let|var)\b/gm, "$1")
    .replace(/^export\s+default\s+/gm, "");
}

function stripDuplicateHelpers(source) {
  if (!source.includes("QUESTIONNAIRE_CATALOGUE")) return source;
  const names = new Set(["O_RPS", "O_JPT", "O_04", "O_03jt", "O_YN", "O_UPPS", "O_YOUNG", "O_BMS", "O_CUNGI", "O_PAS", "O_ZARIT", "O_DASS", "O_CONNERS"]);
  return source.split("\n").filter((line) => {
    const match = line.match(/^const ([A-Za-z0-9_]+)\s*=/);
    return !(match && names.has(match[1])) && !/^function q(n|s)?\(/.test(line);
  }).join("\n");
}

function inlineModule(file, seen, parts) {
  const absolute = path.resolve(file);
  if (seen.has(absolute)) return;
  seen.add(absolute);
  const source = fs.readFileSync(absolute, "utf8");
  const imports = /(import\s+[^;]*?from\s+['"](\.[^'"]*)['"])|(export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.[^'"]*)['"])/g;
  for (const match of source.matchAll(imports)) {
    const relative = match[2] || match[4];
    if (!relative) continue;
    let dependency = path.resolve(path.dirname(absolute), relative);
    if (!dependency.endsWith(".ts")) dependency += ".ts";
    inlineModule(dependency, seen, parts);
  }
  parts.push(stripDuplicateHelpers(stripModuleSource(source)));
}

const parts = [];
inlineModule(questionsPath, new Set(), parts);
const { QUESTIONNAIRE_CATALOGUE } = new Function(`${parts.join("\n")}\nreturn { QUESTIONNAIRE_CATALOGUE };`)();
const pilots = {
  Q_NEU_03: ["micro_batch", "autorisé — certifié"],
  Q_MOD_02: ["focus", "bloqué — certification + fixture"],
  Q_ALI_01: ["guided_sections", "bloqué — certification + fixture"],
  Q_ALI_03: ["compact_repeated_scale", "candidat — certification requise"]
};

const rows = Object.values(QUESTIONNAIRE_CATALOGUE).sort((a, b) => a.id.localeCompare(b.id)).map((questionnaire) => {
  const questions = questionnaire.sections.flatMap((section) => section.questions);
  const types = [...new Set(questions.map((question) => question.type))].sort().join(", ");
  const certification = questionnaire.scoring?.certification?.status || "non_certifié";
  const [renderer, gate] = pilots[questionnaire.id] || ["standard", "politique stricte par défaut"];
  return `| ${questionnaire.id} | ${String(questionnaire.titre).replaceAll("|", "\\|")} | ${questions.length} | ${questionnaire.sections.length} | ${types} | ${certification} | strict | fixed | ${renderer} | ${gate} |`;
});

if (rows.length !== 63) throw new Error(`Catalogue attendu : 63 questionnaires, reçu : ${rows.length}`);

process.stdout.write(`# Inventaire UX des 63 questionnaires\n\n_Généré depuis le catalogue clinique par \`scripts/qx-questionnaire-inventory.mjs\`. Cet inventaire ne constitue pas une certification clinique._\n\nRègle générale : administration \`strict\`, ordre des items et options \`fixed\`. \`shuffle_nominal\` reste uniquement spécifié et n'est jamais exécuté.\n\n| ID | Titre | Items | Sections | Types | Certification catalogue | Administration | Ordre | Renderer cible | Gate |\n|---|---|---:|---:|---|---|---|---|---|---|\n${rows.join("\n")}\n`);
