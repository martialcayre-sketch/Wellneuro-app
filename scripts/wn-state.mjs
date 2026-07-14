import fs from "node:fs";
import path from "node:path";

function resolvePath(root, segments) {
  return path.join(root, ...segments);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function stripQuotes(value) {
  return String(value || "").trim().replace(/^['\"]/, "").replace(/['\"]$/, "");
}

function parseActiveCampaignView(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.includes("Aucune campagne active.")) {
    return {
      activeCampaignId: null,
      activeCampaignTitle: null,
      activeLot: null,
      status: "idle",
      updatedAt: null,
      sourceOfTruthMentioned: false,
    };
  }

  const primaryBlock = trimmed.match(/## Activité primaire([\s\S]*?)(?=\n## |$)/i)?.[1] || trimmed;
  const parallelBlock = trimmed.match(/## Activités parallèles([\s\S]*?)(?=\n\*\*Statut global|$)/i)?.[1] || "";
  const campaignMatch = primaryBlock.match(/\*\*Campagne\*\*\s*:\s*(.+)/i);
  const titleMatch = primaryBlock.match(/\*\*Titre\*\*\s*:\s*(.+)/i);
  const statusMatch = primaryBlock.match(/\*\*Statut\*\*\s*:\s*(.+)/i) || trimmed.match(/\*\*Statut global\*\*\s*:\s*(.+)/i);
  const lotMatch = primaryBlock.match(/\*\*Lot actif\*\*\s*:\s*(.+)/i);
  const updatedAtMatch = trimmed.match(/\*\*Mise à jour\*\*\s*:\s*(.+)/i);
  const parallelCampaignIds = [...parallelBlock.matchAll(/^###\s+(.+)$/gim)].map((match) => stripQuotes(match[1]));
  return {
    activeCampaignId: campaignMatch ? stripQuotes(campaignMatch[1]) : null,
    activeCampaignTitle: titleMatch ? stripQuotes(titleMatch[1]) : null,
    activeLot: lotMatch ? stripQuotes(lotMatch[1]) : null,
    status: statusMatch ? stripQuotes(statusMatch[1]) : null,
    updatedAt: updatedAtMatch ? stripQuotes(updatedAtMatch[1]) : null,
    parallelCampaignIds,
    sourceOfTruthMentioned: /source de vérité machine est `\.wn\/state\.json`/i.test(trimmed),
  };
}

export function readMachineState(root = process.cwd()) {
  return readJsonIfExists(resolvePath(root, [".wn", "state.json"])) || {};
}

export function writeMachineState(root = process.cwd(), nextState) {
  fs.mkdirSync(resolvePath(root, [".wn"]), { recursive: true });
  fs.writeFileSync(resolvePath(root, [".wn", "state.json"]), `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
}

export function readActiveCampaignView(root = process.cwd()) {
  const viewPath = resolvePath(root, ["docs", "claude", "campagnes", "ACTIVE_CAMPAIGN.md"]);
  if (!fs.existsSync(viewPath)) return null;
  return parseActiveCampaignView(fs.readFileSync(viewPath, "utf8"));
}

export function readCampaignTruth(root = process.cwd()) {
  const state = readMachineState(root);
  const view = readActiveCampaignView(root);
  return {
    sourceOfTruthPath: resolvePath(root, [".wn", "state.json"]),
    activeCampaignViewPath: resolvePath(root, ["docs", "claude", "campagnes", "ACTIVE_CAMPAIGN.md"]),
    activeCampaignId: state.active_campaign ?? null,
    activeLot: state.active_lot ?? null,
    parallelCampaigns: Array.isArray(state.parallel_campaigns) ? state.parallel_campaigns : [],
    campaignStatus: state.status ?? "unknown",
    updatedAt: state.updated_at ?? null,
    state,
    view,
  };
}
