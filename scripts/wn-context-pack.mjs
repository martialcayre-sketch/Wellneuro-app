#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const format = process.argv.includes("--format")
  ? process.argv[process.argv.indexOf("--format") + 1]
  : "markdown";

function run(args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}
function tail(file, lines) {
  const p = path.join(cwd, file);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8").split(/\r?\n/).slice(-lines).join("\n").trim();
}
function nextCampaign() {
  try {
    return execFileSync(process.execPath, [path.join(cwd, "scripts", "wn-campaign.mjs"), "next", "--quiet"], {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

const data = {
  generatedAt: new Date().toISOString(),
  branch: run(["branch", "--show-current"]) || "inconnue",
  status: run(["status", "--short"]) || "arbre propre",
  recentCommits: run(["log", "-n", "5", "--oneline"]),
  diffStat: run(["diff", "--stat"]) || "aucun diff non commité",
  nextCampaign: nextCampaign() || "aucune campagne active",
  sessionTail: tail("docs/claude/SESSION_LOG.md", 32) || "aucune entrée disponible"
};

if (format === "json") {
  console.log(JSON.stringify(data, null, 2));
} else {
  console.log(`# Contexte compact WellNeuro

Généré : ${data.generatedAt}

## Git

- Branche : ${data.branch}
- Campagne : ${data.nextCampaign}

### État

\`\`\`text
${data.status}
\`\`\`

### Diff

\`\`\`text
${data.diffStat}
\`\`\`

### Commits récents

\`\`\`text
${data.recentCommits}
\`\`\`

## Dernière trace de session

${data.sessionTail}
`);
}
