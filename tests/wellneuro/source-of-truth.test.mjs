import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readCampaignTruth } from "../../scripts/wn-state.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const contextPackScript = path.join(repoRoot, "scripts", "wn-context-pack.mjs");

function setupRepo(state, viewText) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-bench-"));
  fs.mkdirSync(path.join(root, ".wn"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "claude", "campagnes"), { recursive: true });
  fs.writeFileSync(path.join(root, ".wn", "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(root, "docs", "claude", "campagnes", "ACTIVE_CAMPAIGN.md"), `${viewText}\n`, "utf8");
  return root;
}

function runContextPack(root) {
  return spawnSync(process.execPath, [contextPackScript, "--format", "json"], {
    cwd: root,
    encoding: "utf8"
  });
}

test("la source machine alimente le contexte compact", () => {
  const root = setupRepo(
    {
      schema_version: 1,
      project: { id: "wellneuro", name: "WellNeuro" },
      status: "active",
      active_campaign: "campaign-alpha",
      active_lot: "LOT-02",
      updated_at: "2026-07-14T10:15:16Z"
    },
    `# Campagne active

**Campagne** : campaign-alpha
**Titre** : Campagne alpha
**Statut** : active
**Lot actif** : LOT-02
**Mise à jour** : 2026-07-14

> La source de vérité machine est \`.wn/state.json\`.
`
  );

  const truth = readCampaignTruth(root);
  assert.equal(truth.activeCampaignId, "campaign-alpha");
  assert.equal(truth.activeLot, "LOT-02");
  assert.equal(truth.campaignStatus, "active");
  assert.equal(truth.view?.activeCampaignTitle, "Campagne alpha");
  assert.equal(truth.view?.sourceOfTruthMentioned, true);

  const result = runContextPack(root);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(result.stdout);
  assert.equal(data.machineState.activeCampaignId, "campaign-alpha");
  assert.equal(data.machineState.activeLot, "LOT-02");
  assert.equal(data.machineState.campaignStatus, "active");
  assert.equal(data.machineState.view.activeCampaignTitle, "Campagne alpha");
  assert.match(data.nextCampaign, /campaign-alpha/);
});

test("une campagne inactive reste sans activation implicite", () => {
  const root = setupRepo(
    {
      schema_version: 1,
      project: { id: "wellneuro", name: "WellNeuro" },
      status: "idle",
      active_campaign: null,
      active_lot: null,
      updated_at: "2026-07-14T10:15:16Z"
    },
    `# Campagne active

Aucune campagne active.

**Statut** : idle
**Mise à jour** : 2026-07-14
`
  );

  const truth = readCampaignTruth(root);
  assert.equal(truth.activeCampaignId, null);
  assert.equal(truth.activeLot, null);
  assert.equal(truth.campaignStatus, "idle");
  assert.equal(truth.view?.activeCampaignTitle, null);

  const result = runContextPack(root);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(result.stdout);
  assert.equal(data.machineState.activeCampaignId, null);
  assert.equal(data.machineState.activeLot, null);
  assert.equal(data.nextCampaign, "aucune campagne active");
});
