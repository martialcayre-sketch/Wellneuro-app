#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const jsonMode = process.argv.includes("--json");
const noGh = process.argv.includes("--no-gh");
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) || 10 : 10;

function readText(relativePath) {
  const fullPath = path.join(cwd, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath) {
  const text = readText(relativePath);
  return text ? JSON.parse(text) : null;
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function gh(args) {
  if (noGh) {
    return {
      ok: true,
      output: "",
      error: null
    };
  }
  try {
    return {
      ok: true,
      output: execFileSync("gh", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(),
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      output: "",
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

function parseGhJson(output) {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function labelNames(item) {
  return Array.isArray(item?.labels) ? item.labels.map((label) => label?.name).filter(Boolean) : [];
}

function hasAnyLabel(item, names) {
  const labels = new Set(labelNames(item));
  return names.some((name) => labels.has(name));
}

function loadConfig() {
  return readJson(".wn/orchestrator.json");
}

function loadState() {
  return readJson(".wn/state.json");
}

function collectIssues(config) {
  const result = gh([
    "issue",
    "list",
    "--state",
    "open",
    "--limit",
    String(config?.issue_policy?.open_issue_limit || limit),
    "--json",
    "number,title,url,labels,assignees,updatedAt"
  ]);
  return {
    items: parseGhJson(result.output),
    disabled: noGh,
    error: result.ok || noGh ? null : result.error
  };
}

function collectPrs() {
  const result = gh([
    "pr",
    "list",
    "--state",
    "open",
    "--limit",
    String(limit),
    "--json",
    "number,title,url,isDraft,headRefName,updatedAt"
  ]);
  return {
    items: parseGhJson(result.output),
    disabled: noGh,
    error: result.ok || noGh ? null : result.error
  };
}

function chooseIssue(issues, config) {
  const readyLabels = config?.issue_policy?.ready_labels || [];
  const blockedLabels = config?.issue_policy?.blocked_labels || [];
  const campaignLabels = config?.issue_policy?.campaign_labels || [];

  const ready = issues.filter((issue) => hasAnyLabel(issue, readyLabels));
  const blocked = issues.filter((issue) => hasAnyLabel(issue, blockedLabels));
  const campaign = issues.filter((issue) => hasAnyLabel(issue, campaignLabels));
  const pool = ready.length ? ready : campaign.length ? campaign : issues;

  return {
    ready,
    blocked,
    campaign,
    next: pool[0] || null
  };
}

function isDirtyTree(snapshot) {
  if (typeof snapshot?.git?.dirty === "boolean") {
    return snapshot.git.dirty;
  }

  return Boolean(snapshot?.git?.status && snapshot.git.status !== "arbre propre");
}

function violatesBranchPolicy(snapshot) {
  const branch = snapshot?.git?.branch || "";
  const policy = snapshot?.config?.branch_policy;

  if (!policy?.require_dedicated_branch) {
    return false;
  }

  if (!branch || branch === policy.default_branch) {
    return true;
  }

  if (policy.branch_prefix && !branch.startsWith(policy.branch_prefix)) {
    return true;
  }

  return false;
}

function recommend(snapshot) {
  if (snapshot.config?.branch_policy?.require_clean_tree_before_action && isDirtyTree(snapshot)) {
    return "Arbre sale: nettoyer ou isoler les modifications avant d'ouvrir une action GitHub.";
  }

  if (violatesBranchPolicy(snapshot)) {
    const prefix = snapshot.config?.branch_policy?.branch_prefix || "une branche dédiée";
    return `Branche non conforme détectée (${snapshot.git.branch}): utiliser ${prefix} avant toute écriture GitHub.`;
  }

  if (snapshot.github?.issues?.error || snapshot.github?.prs?.error) {
    const message = snapshot.github.issues.error || snapshot.github.prs.error;
    return `Lecture GitHub impossible: ${message}.`;
  }

  if (snapshot.state?.active_campaign) {
    const lot = snapshot.state?.active_lot ? ` et lot ${snapshot.state.active_lot}` : "";
    const parallels = Array.isArray(snapshot.state.parallel_campaigns) ? snapshot.state.parallel_campaigns : [];
    const parallelLabel = parallels.length ? `, en parallèle avec ${parallels.map((entry) => `${entry.campaign_id}${entry.active_lot ? `/${entry.active_lot}` : ""}`).join(", ")}` : "";
    return `Campagne primaire détectée (${snapshot.state.active_campaign}${lot}${parallelLabel}) : poursuivre uniquement ces périmètres actifs avant de déplacer le focus vers un autre issue.`;
  }

  if (snapshot.issues.next) {
    return `Issue à prendre en priorité: #${snapshot.issues.next.number} - ${snapshot.issues.next.title}.`;
  }

  if (snapshot.prs.open.length) {
    const draft = snapshot.prs.open.find((pr) => pr.isDraft);
    if (draft) {
      return `PR brouillon ouverte à finaliser: #${draft.number} - ${draft.title}.`;
    }
    return `PR ouverte détectée: #${snapshot.prs.open[0].number} - ${snapshot.prs.open[0].title}.`;
  }

  return "Aucune issue ou PR ouverte: préparer un cadrage ou créer la prochaine campagne avant toute écriture.";
}

const config = loadConfig();
const state = loadState();
const gitStatus = git(["status", "--short"]);
const gitBranch = git(["branch", "--show-current"]) || "inconnue";
const gitHead = git(["rev-parse", "--short", "HEAD"]) || "inconnue";
const issues = collectIssues(config);
const prs = collectPrs();
const issueSelection = chooseIssue(issues.items, config);

const snapshot = {
  generatedAt: new Date().toISOString(),
  config,
  state,
  git: {
    branch: gitBranch,
    head: gitHead,
    dirty: Boolean(gitStatus),
    status: gitStatus || "arbre propre"
  },
  issues: {
    open: issues.items.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      labels: labelNames(issue)
    })),
    blocked: issueSelection.blocked.map((issue) => ({ number: issue.number, title: issue.title, url: issue.url })),
    ready: issueSelection.ready.map((issue) => ({ number: issue.number, title: issue.title, url: issue.url })),
    campaign: issueSelection.campaign.map((issue) => ({ number: issue.number, title: issue.title, url: issue.url })),
    next: issueSelection.next
      ? { number: issueSelection.next.number, title: issueSelection.next.title, url: issueSelection.next.url }
      : null
  },
  github: {
    issues: {
      disabled: issues.disabled,
      error: issues.error
    },
    prs: {
      disabled: prs.disabled,
      error: prs.error
    }
  },
  prs: {
    open: prs.items.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      isDraft: Boolean(pr.isDraft),
      headRefName: pr.headRefName
    }))
  },
  recommendation: ""
};

snapshot.recommendation = recommend(snapshot);

if (jsonMode) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log(`# Orchestrateur GitHub WellNeuro\n`);
  console.log(`Généré : ${snapshot.generatedAt}`);
  console.log(`\n## Git\n`);
  console.log(`- Branche : ${snapshot.git.branch}`);
  console.log(`- HEAD : ${snapshot.git.head}`);
  console.log(`- État : ${snapshot.git.status}`);
  console.log(`\n## État WN\n`);
  console.log(`- Campagne active : ${snapshot.state?.active_campaign || "aucune"}`);
  console.log(`- Lot actif : ${snapshot.state?.active_lot || "aucun"}`);
  const parallelCampaigns = Array.isArray(snapshot.state?.parallel_campaigns) ? snapshot.state.parallel_campaigns : [];
  console.log(`- Campagnes parallèles : ${parallelCampaigns.length ? parallelCampaigns.map((entry) => `${entry.campaign_id}/${entry.active_lot || "aucun"}`).join(", ") : "aucune"}`);
  console.log(`- Prochaine action : ${snapshot.state?.next_action || "non définie"}`);
  console.log(`\n## File GitHub\n`);
  if (snapshot.issues.open.length === 0) {
    console.log(`- Aucune issue ouverte détectée.`);
  } else {
    for (const issue of snapshot.issues.open.slice(0, limit)) {
      const labels = issue.labels.length ? ` [${issue.labels.join(", ")}]` : "";
      console.log(`- #${issue.number} ${issue.title}${labels}`);
    }
  }
  console.log(`\n## PR ouvertes\n`);
  if (snapshot.prs.open.length === 0) {
    console.log(`- Aucune PR ouverte détectée.`);
  } else {
    for (const pr of snapshot.prs.open.slice(0, limit)) {
      const draft = pr.isDraft ? " (draft)" : "";
      console.log(`- #${pr.number} ${pr.title}${draft}`);
    }
  }
  console.log(`\n## Recommandation conservatrice\n`);
  console.log(`- ${snapshot.recommendation}`);
}
