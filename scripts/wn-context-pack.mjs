#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readCampaignTruth } from "./wn-state.mjs";

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

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end < 0) return {};
  const block = text.slice(4, end);
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    value = value.replace(/^['\"]/, "").replace(/['\"]$/, "");
    data[key] = value;
  }
  return data;
}

function scanPreparedCampaigns(root) {
  const preparedRoot = path.join(root, "docs", "claude", "campagnes", "_prepared");
  if (!fs.existsSync(preparedRoot)) return [];

  const campaigns = [];
  const stack = [preparedRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile() || entry.name !== "CAMPAGNE.md") continue;
      const text = fs.readFileSync(full, "utf8");
      const frontmatter = parseFrontmatter(text);
      campaigns.push({
        id: frontmatter.id || path.basename(path.dirname(full)),
        title: frontmatter.titre || text.match(/^#\s+(.+)$/m)?.[1] || path.basename(path.dirname(full)),
        status: frontmatter.statut || "inconnu",
        activeLot: frontmatter.lot_courant || null,
        path: path.relative(root, path.dirname(full))
      });
    }
  }

  return campaigns.sort((a, b) => a.id.localeCompare(b.id));
}

function readCorpusRegistry(root) {
  const registryPath = path.join(root, "docs", "claude", "corpus", "source_registry.json");
  if (!fs.existsSync(registryPath)) {
    return {
      status: "absent",
      entries: 0,
      latestAuditDate: null,
      clinicalCorpusVersion: null,
      corpusManifestHash: null,
      corpusBuildStatus: "none",
      openSourceConflicts: 0,
      pendingClinicalGates: [],
      pilotDomain: "unknown"
    };
  }

  const raw = fs.readFileSync(registryPath, "utf8");
  let registry;
  try {
    registry = JSON.parse(raw);
  } catch {
    return {
      status: "invalid",
      entries: 0,
      latestAuditDate: null,
      clinicalCorpusVersion: null,
      corpusManifestHash: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12),
      corpusBuildStatus: "none",
      openSourceConflicts: 0,
      pendingClinicalGates: [],
      pilotDomain: "unknown"
    };
  }

  const entries = Array.isArray(registry) ? registry : [];
  const corpusManifestHash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
  const latestAuditDate = entries
    .map((entry) => entry.auditDate)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const openSourceConflicts = entries.reduce((count, entry) => {
    const action = String(entry.requiredAction || "").toLowerCase();
    return count + (entry.doublon_de || action.includes("dédupliquer") || action.includes("dedupliquer") ? 1 : 0);
  }, 0);

  const pendingClinicalGates = new Set();
  if (entries.some((entry) => String(entry.rightsStatus || "").toLowerCase() === "to_verify" || String(entry.clinicalReviewStatus || "").toLowerCase() === "not_reviewed")) {
    pendingClinicalGates.add("G0");
  }
  if (entries.some((entry) => String(entry.lifecycleStatus || "").toLowerCase() === "raw")) {
    pendingClinicalGates.add("G1");
  }
  if (entries.some((entry) => /indexer|découper|decouper/i.test(String(entry.requiredAction || "")))) {
    pendingClinicalGates.add("G2");
  }
  if (entries.some((entry) => /relecture|audit/i.test(String(entry.requiredAction || "")) || /protocole/i.test(String(entry.documentType || "")))) {
    pendingClinicalGates.add("G3");
  }
  if (entries.some((entry) => /outil|questionnaire|échelle|echelle/i.test(String(entry.documentType || "")))) {
    pendingClinicalGates.add("G4");
  }

  const pilotDomain = entries.some((entry) => /sommeil|chronobiologie/i.test(`${entry.title || ""} ${entry.primaryNotebook || ""}`))
    ? "sleep_chronobiology"
    : "unknown";

  return {
    status: "loaded",
    entries: entries.length,
    latestAuditDate,
    clinicalCorpusVersion: latestAuditDate ? `registry-${latestAuditDate}` : `registry-${entries.length}`,
    corpusManifestHash,
    corpusBuildStatus: "none",
    openSourceConflicts,
    pendingClinicalGates: [...pendingClinicalGates],
    pilotDomain
  };
}

const campaignTruth = readCampaignTruth(cwd);
const preparedCampaigns = scanPreparedCampaigns(cwd);
const corpusRegistry = readCorpusRegistry(cwd);

const data = {
  generatedAt: new Date().toISOString(),
  branch: run(["branch", "--show-current"]) || "inconnue",
  status: run(["status", "--short"]) || "arbre propre",
  recentCommits: run(["log", "-n", "5", "--oneline"]),
  diffStat: run(["diff", "--stat"]) || "aucun diff non commité",
  nextCampaign: campaignTruth.activeCampaignId
    ? `${campaignTruth.activeCampaignId}${campaignTruth.activeLot ? ` | ${campaignTruth.activeLot}` : ""}${campaignTruth.campaignStatus ? ` | ${campaignTruth.campaignStatus}` : ""}`
    : "aucune campagne active",
  machineState: campaignTruth,
  preparedCampaigns,
  corpusRegistry,
  clinicalCorpusVersion: corpusRegistry.clinicalCorpusVersion,
  corpusManifestHash: corpusRegistry.corpusManifestHash,
  corpusBuildStatus: corpusRegistry.corpusBuildStatus,
  openSourceConflicts: corpusRegistry.openSourceConflicts,
  pendingClinicalGates: corpusRegistry.pendingClinicalGates,
  pilotDomain: corpusRegistry.pilotDomain,
  sessionTail: tail("docs/claude/SESSION_LOG.md", 32) || "aucune entrée disponible"
};

if (format === "json") {
  console.log(JSON.stringify(data, null, 2));
} else {
  console.log(`# Contexte compact WellNeuro

Généré : ${data.generatedAt}

## Git

- Branche : ${data.branch}
- Campagne active : ${data.nextCampaign}

## État machine

- Source de vérité : \\.wn/state.json
- ID campagne active : ${data.machineState.activeCampaignId || "aucune"}
- Titre campagne active : ${data.machineState.view?.activeCampaignTitle || "aucun"}
- Lot actif : ${data.machineState.activeLot || "aucun"}
- Statut machine : ${data.machineState.campaignStatus}
- Mise à jour : ${data.machineState.updatedAt || "inconnue"}

## Corpus

- Version clinique : ${data.clinicalCorpusVersion || "aucune"}
- Hash manifeste : ${data.corpusManifestHash || "aucun"}
- Statut build : ${data.corpusBuildStatus}
- Conflits ouverts : ${data.openSourceConflicts}
- Gates en attente : ${data.pendingClinicalGates.length ? data.pendingClinicalGates.join(", ") : "aucun"}
- Domaine pilote : ${data.pilotDomain}

## Campagnes préparées

${data.preparedCampaigns.length ? data.preparedCampaigns.map((campaign) => `- ${campaign.id} | ${campaign.status} | ${campaign.activeLot || "aucun"} | ${campaign.path}`).join("\n") : "- aucune"}

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
