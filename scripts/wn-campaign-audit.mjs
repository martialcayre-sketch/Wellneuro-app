#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const args = process.argv.slice(2);

const defaultRoots = [
  "docs/claude/campagnes",
  "wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes"
];

const requiredCampaignFields = ["id", "titre", "statut", "lot_courant"];
const requiredGitFields = ["branche_campagne", "branche_lot_courant", "cible_pr_lot", "cible_pr_campagne"];
const requiredLotFields = ["id", "statut"];

function hasFlag(name) {
  return args.includes(name);
}

function flag(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function csvFlag(name) {
  const raw = flag(name, "");
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isClosedStatus(value) {
  const low = normalize(value);
  return low.startsWith("termine") || low.startsWith("livre") || low.startsWith("abandon") || low.startsWith("fait");
}

function isInFlightStatus(value) {
  const low = normalize(value);
  return low.startsWith("en_cours") || low.startsWith("a_faire") || low.startsWith("a faire") || low.startsWith("active");
}

function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end < 0) return {};
  const block = text.slice(4, end);
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    value = value.replace(/^['\"]/, "").replace(/['\"]$/, "");
    data[key] = value;
  }
  return data;
}

function rootFromArgs() {
  const fromFlag = flag("--root", "");
  if (!fromFlag) return defaultRoots;
  return fromFlag.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function loadState() {
  const statePath = path.join(cwd, ".wn", "state.json");
  if (!fs.existsSync(statePath)) return { statePath, state: null };
  try {
    return { statePath, state: JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch {
    return { statePath, state: null };
  }
}

function listCampaignDirs(rootAbs) {
  if (!fs.existsSync(rootAbs)) return [];
  return fs.readdirSync(rootAbs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootAbs, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, "CAMPAGNE.md")))
    .sort((a, b) => a.localeCompare(b));
}

function listLotFiles(campaignDir) {
  const lotsDir = path.join(campaignDir, "lots");
  if (!fs.existsSync(lotsDir)) return [];
  return fs.readdirSync(lotsDir)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));
}

function findLotByPrefix(lotFiles, lotPrefix) {
  return lotFiles.find((file) => file.startsWith(`${lotPrefix}-`)) || null;
}

function auditCampaign(rootRel, campaignDir, issues, warnings) {
  const campaignPath = path.join(campaignDir, "CAMPAGNE.md");
  const campaignText = readFileSafe(campaignPath);
  const fm = parseFrontmatter(campaignText);
  const relPath = path.relative(cwd, campaignPath);
  const dirName = path.basename(campaignDir);

  for (const field of requiredCampaignFields) {
    if (!fm[field]) issues.push({ severity: "error", code: "missing_campaign_field", path: relPath, message: `Champ frontmatter requis manquant: ${field}` });
  }

  if (fm.id && fm.id !== dirName) {
    issues.push({ severity: "error", code: "campaign_id_mismatch", path: relPath, message: `id (${fm.id}) différent du dossier (${dirName})` });
  }

  const lotFiles = listLotFiles(campaignDir);
  const lotStates = [];
  for (const lotFile of lotFiles) {
    const lotPath = path.join(campaignDir, "lots", lotFile);
    const lotFm = parseFrontmatter(readFileSafe(lotPath));
    const lotRel = path.relative(cwd, lotPath);
    for (const field of requiredLotFields) {
      if (!lotFm[field]) {
        issues.push({ severity: "error", code: "missing_lot_field", path: lotRel, message: `Champ frontmatter lot requis manquant: ${field}` });
      }
    }
    if (lotFm.id && !/^LOT-\d{2}/.test(lotFm.id)) {
      issues.push({ severity: "error", code: "lot_id_format", path: lotRel, message: `Format lot id invalide: ${lotFm.id}` });
    }
    lotStates.push({
      file: lotFile,
      id: lotFm.id || "",
      status: lotFm.statut || ""
    });
  }

  const campaignStatus = fm.statut || "";
  const lotCourant = fm.lot_courant || "";

  if (isInFlightStatus(campaignStatus) && lotFiles.length === 0) {
    issues.push({
      severity: "error",
      code: "missing_lots_for_active_campaign",
      path: relPath,
      message: "Campagne active/à faire sans dossier lots/ exploitable"
    });
  }

  if (lotCourant && lotCourant !== "aucun") {
    const lotFound = findLotByPrefix(lotFiles, lotCourant);
    if (!lotFound) {
      issues.push({ severity: "error", code: "active_lot_missing", path: relPath, message: `lot_courant=${lotCourant} introuvable dans lots/` });
    }
  }

  const hasAnyGitField = requiredGitFields.some((field) => Boolean(fm[field]));
  const hasAllGitFields = requiredGitFields.every((field) => Boolean(fm[field]));
  if (hasAnyGitField && !hasAllGitFields) {
    const missing = requiredGitFields.filter((field) => !fm[field]);
    issues.push({
      severity: "error",
      code: "partial_git_metadata",
      path: relPath,
      message: `Métadonnées Git partielles (champs manquants: ${missing.join(", ")})`
    });
  }

  if (isClosedStatus(campaignStatus) && lotStates.length > 0) {
    const openLots = lotStates.filter((lot) => !isClosedStatus(lot.status));
    if (openLots.length > 0) {
      warnings.push({
        severity: "warning",
        code: "closed_campaign_with_open_lots",
        path: relPath,
        message: `Campagne fermée avec lots non fermés: ${openLots.map((lot) => lot.file).join(", ")}`
      });
    }
  }

  if (lotCourant === "aucun" && isInFlightStatus(campaignStatus)) {
    warnings.push({
      severity: "warning",
      code: "inflight_without_active_lot",
      path: relPath,
      message: "Campagne en cours/à faire avec lot_courant=aucun"
    });
  }

  return {
    root: rootRel,
    id: fm.id || dirName,
    title: fm.titre || dirName,
    status: campaignStatus || "inconnu",
    lotCourant: lotCourant || "",
    lotCount: lotFiles.length,
    path: relPath,
    hasGitMetadata: hasAllGitFields
  };
}

function auditMachineState(campaignsById, issues, warnings) {
  const { statePath, state } = loadState();
  const relStatePath = path.relative(cwd, statePath);
  if (!state) {
    warnings.push({ severity: "warning", code: "missing_or_invalid_state", path: relStatePath, message: "État machine absent ou invalide" });
    return;
  }
  const status = String(state.status || "");
  const activeCampaign = state.active_campaign;
  const activeLot = state.active_lot;

  function validateActiveEntry(campaignId, lotId, kind) {
    const campaign = campaignsById.get(campaignId);
    if (!campaign) {
      issues.push({ severity: "error", code: `${kind}_campaign_missing`, path: relStatePath, message: `${kind} campaign introuvable: ${campaignId}` });
      return;
    }
    if (isClosedStatus(campaign.status)) {
      issues.push({ severity: "error", code: `${kind}_campaign_closed`, path: relStatePath, message: `${kind} campaign fermée: ${campaignId}` });
    }
    if (lotId && lotId !== "aucun") {
      const campaignDir = path.dirname(path.join(cwd, campaign.path));
      const lotFound = findLotByPrefix(listLotFiles(campaignDir), lotId);
      if (!lotFound) {
        issues.push({ severity: "error", code: `${kind}_state_lot_missing`, path: relStatePath, message: `${kind} lot introuvable: ${campaignId}/${lotId}` });
      }
    }
  }

  if (status === "active") {
    if (!activeCampaign) {
      issues.push({ severity: "error", code: "active_without_campaign", path: relStatePath, message: "status=active sans active_campaign" });
      return;
    }
    validateActiveEntry(activeCampaign, activeLot, "active");
  }

  const parallelCampaigns = state.parallel_campaigns;
  if (state.schema_version === 2 && !Array.isArray(parallelCampaigns)) {
    issues.push({ severity: "error", code: "parallel_campaigns_invalid", path: relStatePath, message: "schema_version=2 exige parallel_campaigns[]" });
  }
  if (Array.isArray(parallelCampaigns)) {
    const seen = new Set(activeCampaign ? [activeCampaign] : []);
    for (const entry of parallelCampaigns) {
      const campaignId = entry?.campaign_id;
      if (!campaignId || typeof campaignId !== "string") {
        issues.push({ severity: "error", code: "parallel_campaign_invalid", path: relStatePath, message: "Entrée parallèle sans campaign_id valide" });
        continue;
      }
      if (seen.has(campaignId)) {
        issues.push({ severity: "error", code: "duplicate_active_campaign", path: relStatePath, message: `Campagne active dupliquée: ${campaignId}` });
        continue;
      }
      seen.add(campaignId);
      validateActiveEntry(campaignId, entry.active_lot, "parallel");
    }
  }

  if (status === "idle" && (activeCampaign || activeLot)) {
    warnings.push({ severity: "warning", code: "idle_with_active_fields", path: relStatePath, message: "status=idle avec active_campaign/active_lot non nuls" });
  }
}

function compareRoots(primaryCampaigns, mirrorCampaigns, warnings) {
  const primaryById = new Map(primaryCampaigns.map((entry) => [entry.id, entry]));
  const mirrorById = new Map(mirrorCampaigns.map((entry) => [entry.id, entry]));

  for (const [id, campaign] of primaryById.entries()) {
    if (!mirrorById.has(id)) {
      warnings.push({
        severity: "warning",
        code: "missing_in_mirror",
        path: campaign.path,
        message: `Campagne absente du miroir: ${id}`
      });
    }
  }

  for (const [id, campaign] of mirrorById.entries()) {
    if (!primaryById.has(id)) {
      warnings.push({
        severity: "warning",
        code: "extra_in_mirror",
        path: campaign.path,
        message: `Campagne miroir non présente côté principal: ${id}`
      });
      continue;
    }
    const primary = primaryById.get(id);
    if (normalize(primary.status) !== normalize(campaign.status)) {
      warnings.push({
        severity: "warning",
        code: "status_drift_between_roots",
        path: campaign.path,
        message: `Dérive statut principal (${primary.status}) vs miroir (${campaign.status}) pour ${id}`
      });
    }
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Audit de conformité des campagnes");
  lines.push("");
  lines.push(`- Date: ${new Date().toISOString()}`);
  lines.push(`- Campagnes auditées: ${report.summary.totalCampaigns}`);
  lines.push(`- Erreurs: ${report.summary.errors}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Statut global: ${report.summary.ok ? "PASS" : "FAIL"}`);
  lines.push("");

  lines.push("## Règles appliquées");
  lines.push("");
  lines.push("- Frontmatter minimal requis sur chaque CAMPAGNE.md: id, titre, statut, lot_courant.");
  lines.push("- Cohérence id/dossier campagne.");
  lines.push("- Cohérence lot_courant avec un fichier de lot existant.");
  lines.push("- Cohérence partielle/interdite des métadonnées Git (branche/pr cibles).");
  lines.push("- Lots actifs requis pour une campagne en_cours/à_faire.");
  lines.push("- Cohérence état machine .wn/state.json avec les campagnes.");
  lines.push("- Cohérence des campagnes parallèles du schéma d'état v2 (unicité, campagne et lot existants).");
  lines.push("- Comparaison principal/miroir: présence et dérive de statut.");
  lines.push("");

  lines.push("## Détail des écarts");
  lines.push("");
  const allFindings = [...report.issues, ...report.warnings];
  if (!allFindings.length) {
    lines.push("Aucun écart détecté.");
  } else {
    for (const item of allFindings) {
      lines.push(`- [${item.severity.toUpperCase()}] ${item.code} :: ${item.path} :: ${item.message}`);
    }
  }
  lines.push("");

  lines.push("## Inventaire audité");
  lines.push("");
  for (const campaign of report.campaigns) {
    lines.push(`- ${campaign.id} | ${campaign.status} | lot_courant=${campaign.lotCourant || ""} | lots=${campaign.lotCount} | ${campaign.path}`);
  }
  lines.push("");
  return `${lines.join("\n").trimEnd()}\n`;
}

function run() {
  const roots = rootFromArgs();
  const issues = [];
  const warnings = [];
  const campaigns = [];

  for (const rootRel of roots) {
    const rootAbs = path.join(cwd, rootRel);
    for (const campaignDir of listCampaignDirs(rootAbs)) {
      campaigns.push(auditCampaign(rootRel, campaignDir, issues, warnings));
    }
  }

  const campaignsById = new Map();
  for (const campaign of campaigns) {
    if (campaign.root !== "docs/claude/campagnes") continue;
    campaignsById.set(campaign.id, campaign);
  }

  auditMachineState(campaignsById, issues, warnings);

  const primaryCampaigns = campaigns.filter((entry) => entry.root === "docs/claude/campagnes");
  const mirrorCampaigns = campaigns.filter((entry) => entry.root !== "docs/claude/campagnes");
  if (primaryCampaigns.length && mirrorCampaigns.length) {
    compareRoots(primaryCampaigns, mirrorCampaigns, warnings);
  }

  const report = {
    summary: {
      totalCampaigns: campaigns.length,
      errors: issues.length,
      warnings: warnings.length,
      ok: issues.length === 0
    },
    issues,
    warnings,
    campaigns
  };

  const format = flag("--format", "json");
  const outputFile = flag("--write", "");
  const output = format === "markdown" ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`;
  if (outputFile) {
    const outputPath = path.resolve(cwd, outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, "utf8");
  }
  process.stdout.write(output);

  const failOnAnyWarning = hasFlag("--fail-on-warning");
  const failOnWarningCodes = new Set(csvFlag("--fail-on-warning-codes"));
  const warningMatched = failOnAnyWarning
    ? warnings.length > 0
    : (failOnWarningCodes.size > 0 && warnings.some((item) => failOnWarningCodes.has(item.code)));

  if (!hasFlag("--no-fail") && (issues.length > 0 || warningMatched)) {
    process.exit(1);
  }
}

run();
