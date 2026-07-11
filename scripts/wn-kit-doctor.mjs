#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const mode = process.argv[2] || "check";
const verbose = process.argv.includes("--verbose");

// ============= HELPERS =============

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function parseYaml(content) {
  // Minimal YAML parser for basic validation (no external deps)
  if (!content.includes("version:")) throw new Error("YAML missing 'version:'");
  if (!content.includes("project:")) throw new Error("YAML missing 'project:'");
  return true;
}

function parseJson(content) {
  return JSON.parse(content);
}

function readFile(rel) {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return null;
  }
}

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function dirExists(rel) {
  return fileExists(rel) && fs.statSync(path.join(root, rel)).isDirectory();
}

function gitStatus() {
  try {
    const status = execSync("git status --porcelain", { cwd: root, encoding: "utf8" });
    return status.trim() === "" ? "clean" : "dirty";
  } catch {
    return "unknown";
  }
}

function gitBranch() {
  try {
    return execSync("git branch --show-current", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function gitLastCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

// ============= CHECKLIST =============

class CheckList {
  constructor(name) {
    this.name = name;
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  add(name, ok, detail = "") {
    this.checks.push({ name, ok, detail });
    if (ok) this.passed++;
    else this.failed++;
  }

  print() {
    console.log(`\n[${this.name}]`);
    for (const c of this.checks) {
      const icon = c.ok ? "✓" : "✗";
      const detail = c.detail ? ` (${c.detail})` : "";
      log(icon, `${c.name}${detail}`);
    }
    const total = this.passed + this.failed;
    const pct = total > 0 ? Math.round((this.passed / total) * 100) : 0;
    log("→", `${this.passed}/${total} passed (${pct}%)`);
    return this.failed === 0;
  }

  isHealthy() {
    return this.failed === 0;
  }
}

// ============= CHECKS =============

function checkStructure() {
  const c = new CheckList("STRUCTURE");

  c.add(".wn exists", dirExists(".wn"));
  c.add(".wn/config.yml", fileExists(".wn/config.yml"));
  c.add(".wn/state.json", fileExists(".wn/state.json"));
  c.add(".wn/documentation.yml", fileExists(".wn/documentation.yml"));
  c.add(".wn/campaigns/active", dirExists(".wn/campaigns/active"));
  c.add(".wn/campaigns/archive", dirExists(".wn/campaigns/archive"));
  c.add(".wn/templates", dirExists(".wn/templates"));
  c.add(".wn/reports", dirExists(".wn/reports"));

  return c;
}

function checkDocumentation() {
  const c = new CheckList("DOCUMENTATION");

  c.add("README.md", fileExists("README.md"));
  c.add("CLAUDE.md", fileExists("CLAUDE.md"));
  c.add("AGENTS.md", fileExists("AGENTS.md"));
  c.add("docs/PROJECT_STATE.md", fileExists("docs/PROJECT_STATE.md"));
  c.add("docs/DECISIONS.md", fileExists("docs/DECISIONS.md"));
  c.add("docs/RUNBOOK.md", fileExists("docs/RUNBOOK.md"));
  c.add("docs/QUALITY_GATE.md", fileExists("docs/QUALITY_GATE.md"));
  c.add("docs/claude/SESSION_LOG.md", fileExists("docs/claude/SESSION_LOG.md"));

  return c;
}

function checkState() {
  const c = new CheckList("STATE");

  const stateFile = readFile(".wn/state.json");
  let stateValid = false;
  let stateDetail = "";

  if (!stateFile) {
    c.add(".wn/state.json parse", false, "file not found");
  } else {
    try {
      const state = parseJson(stateFile);
      stateValid = state.schema_version === 1;
      stateDetail = `schema_version=${state.schema_version}`;
      c.add(".wn/state.json parse", stateValid, stateDetail);
      c.add("schema_version=1", state.schema_version === 1);
      c.add("active_campaign coherent", state.active_campaign === null || typeof state.active_campaign === "string");
    } catch (e) {
      c.add(".wn/state.json parse", false, e.message);
    }
  }

  const configFile = readFile(".wn/config.yml");
  if (!configFile) {
    c.add(".wn/config.yml parse", false, "file not found");
  } else {
    try {
      parseYaml(configFile);
      c.add(".wn/config.yml parse", true);
    } catch (e) {
      c.add(".wn/config.yml parse", false, e.message);
    }
  }

  return c;
}

function checkTools() {
  const c = new CheckList("TOOLS");

  const skillDir = path.join(root, ".claude/skills");
  let skillCount = 0;
  if (dirExists(".claude/skills")) {
    skillCount = fs.readdirSync(skillDir).filter(f => dirExists(`.claude/skills/${f}`)).length;
  }
  c.add(".claude/skills detected", skillCount > 0, `${skillCount} skills`);

  const agentDir = path.join(root, ".claude/agents");
  let agentCount = 0;
  if (dirExists(".claude/agents")) {
    agentCount = fs.readdirSync(agentDir)
      .filter(f => f.endsWith(".md"))
      .length;
  }
  c.add(".claude/agents detected", agentCount > 0, `${agentCount} agents`);

  c.add("scripts/wn-campaign.mjs", fileExists("scripts/wn-campaign.mjs"));
  c.add("scripts/wn-kit-doctor.mjs", fileExists("scripts/wn-kit-doctor.mjs"));

  return c;
}

function checkGit() {
  const c = new CheckList("GIT");

  const status = gitStatus();
  c.add("git status", status === "clean", status);

  const branch = gitBranch();
  c.add("git branch", branch !== null, branch || "unknown");

  const commit = gitLastCommit();
  c.add("git HEAD", commit !== null, commit || "unknown");

  return c;
}

function checkNoSecrets() {
  const c = new CheckList("SECURITY");

  const forbidden = ["DATABASE_URL=", "ANTHROPIC_API_KEY=", "NEXTAUTH_SECRET=", "GOOGLE_CLIENT_SECRET="];
  const managedRoots = [".wn", ".claude/skills", ".claude/agents", ".github/prompts", "docs"];

  let foundSecrets = false;
  for (const managed of managedRoots) {
    if (!dirExists(managed)) continue;
    const stack = [path.join(root, managed)];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".git")) stack.push(full);
        else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".yml") || entry.name.endsWith(".json"))) {
          const text = fs.readFileSync(full, "utf8");
          for (const needle of forbidden) {
            if (text.includes(needle)) {
              log("✗", `Secret pattern '${needle}' in ${path.relative(root, full)}`);
              foundSecrets = true;
            }
          }
        }
      }
    }
  }

  c.add("No secrets in .wn/", !foundSecrets);
  c.add("No secrets in .claude/", !foundSecrets);
  c.add("No secrets in docs/", !foundSecrets);

  return c;
}

// ============= ACTIONS =============

function actionCheck() {
  console.log("=== WN-Kit Doctor: CHECK mode (read-only) ===\n");

  const checklists = [
    checkStructure(),
    checkDocumentation(),
    checkState(),
    checkTools(),
    checkGit(),
    checkNoSecrets()
  ];

  const allHealthy = checklists.every(c => (c.print(), c.isHealthy()));

  console.log(`\n=== OVERALL ===`);
  const passed = checklists.reduce((sum, c) => sum + c.passed, 0);
  const failed = checklists.reduce((sum, c) => sum + c.failed, 0);
  const total = passed + failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  log(allHealthy ? "✓" : "✗", `${passed}/${total} checks passed (${pct}%)`);

  if (allHealthy) {
    log("→", "Kit is healthy. Ready for campaigns.");
  } else {
    log("→", "Fix failures above, then re-run: node scripts/wn-kit-doctor.mjs check");
  }

  process.exit(allHealthy ? 0 : 1);
}

function actionBootstrap() {
  console.log("=== WN-Kit Doctor: BOOTSTRAP mode ===\n");

  const plan = [];

  // Check .wn structure
  const wn_dirs = [".wn", ".wn/campaigns/active", ".wn/campaigns/archive", ".wn/templates", ".wn/reports"];
  for (const d of wn_dirs) {
    if (!dirExists(d)) {
      plan.push(`mkdir -p ${d}`);
    }
  }

  // Check config.yml
  if (!fileExists(".wn/config.yml")) {
    plan.push("create .wn/config.yml (template provided in WN-0)");
  }

  // Check state.json
  if (!fileExists(".wn/state.json")) {
    plan.push("create .wn/state.json (template provided in WN-0)");
  }

  // Check docs
  const docs = ["docs/PROJECT_STATE.md", "docs/DECISIONS.md", "docs/RUNBOOK.md", "docs/QUALITY_GATE.md"];
  for (const doc of docs) {
    if (!fileExists(doc)) {
      plan.push(`create ${doc} (template provided in WN-0)`);
    }
  }

  if (plan.length === 0) {
    log("✓", "Kit is already complete. No bootstrap needed.");
    process.exit(0);
  }

  console.log("Plan:");
  plan.forEach((p, i) => log("→", `${i + 1}. ${p}`));

  log("\n→", "To apply: run 'node scripts/wn-kit-doctor.mjs repair'");
  process.exit(0);
}

function actionRepair() {
  console.log("=== WN-Kit Doctor: REPAIR mode (shows plan, no mutation) ===\n");

  // Same as bootstrap for now (future: actually repair)
  actionBootstrap();
}

// ============= MAIN =============

switch (mode) {
  case "check":
    actionCheck();
    break;
  case "bootstrap":
    actionBootstrap();
    break;
  case "repair":
    actionRepair();
    break;
  default:
    console.log("Usage: node scripts/wn-kit-doctor.mjs [check|bootstrap|repair] [--verbose]");
    console.log("  check     : validate kit (default)");
    console.log("  bootstrap : show bootstrap plan");
    console.log("  repair    : show repair plan (dry-run)");
    process.exit(1);
}
