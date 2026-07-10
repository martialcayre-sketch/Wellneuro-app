#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "CLAUDE.md",
  ".claude/settings.json",
  ".claude/skills/wn/SKILL.md",
  ".claude/skills/wn-auto/SKILL.md",
  ".claude/skills/wn-campaign/SKILL.md",
  ".claude/skills/wn-docs/SKILL.md",
  ".claude/skills/wn-review/SKILL.md",
  ".github/copilot-instructions.md",
  ".github/agents/WellNeuro-Planner.agent.md",
  ".github/prompts/wn-plan.prompt.md",
  "scripts/wn-campaign.mjs",
  "scripts/wn-context-pack.mjs"
];

let failed = false;
for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "OK  " : "MISS"} ${rel}`);
  if (!ok) failed = true;
}

try {
  JSON.parse(fs.readFileSync(path.join(root, ".claude/settings.json"), "utf8"));
  console.log("OK   .claude/settings.json JSON valide");
} catch (error) {
  console.log(`ERREUR settings.json : ${error.message}`);
  failed = true;
}

const forbidden = [".env", "DATABASE_URL=", "ANTHROPIC_API_KEY=", "NEXTAUTH_SECRET="];
const managedRoots = [".claude/skills", ".claude/agents", ".github/prompts", ".github/agents"];
for (const managed of managedRoots) {
  const dir = path.join(root, managed);
  if (!fs.existsSync(dir)) continue;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else {
        const text = fs.readFileSync(full, "utf8");
        for (const needle of forbidden.slice(1)) {
          if (text.includes(needle)) {
            console.log(`ALERTE motif sensible dans ${path.relative(root, full)} : ${needle}`);
            failed = true;
          }
        }
      }
    }
  }
}

console.log(failed ? "NO-GO : corriger les éléments ci-dessus." : "GO : kit WellNeuro opérationnel.");
process.exit(failed ? 1 : 0);
