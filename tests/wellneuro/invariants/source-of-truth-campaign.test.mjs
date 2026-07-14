import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readCampaignTruth } from "../../../scripts/wn-state.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const contextPackScript = path.join(repoRoot, "scripts", "wn-context-pack.mjs");

function setupRepo(state, viewText) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-invariant-"));
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

test("la vérité machine prime sur une vue dérivée divergente", () => {
  const root = setupRepo(
    {
      schema_version: 1,
      project: { id: "wellneuro", name: "Wellneuro" },
      status: "active",
      active_campaign: "campaign-alpha",
      active_lot: "LOT-02",
      updated_at: "2026-07-14T10:15:16Z"
    },
    `# Campagne active

**Campagne** : campaign-beta
**Titre** : Campagne bêta
**Statut** : active
**Lot actif** : LOT-99
**Mise à jour** : 2026-07-14

> La source de vérité machine est \`.wn/state.json\`.
`
  );

  const truth = readCampaignTruth(root);
  assert.equal(truth.activeCampaignId, "campaign-alpha");
  assert.equal(truth.activeLot, "LOT-02");
  assert.equal(truth.view?.activeCampaignId, "campaign-beta");
  assert.equal(truth.view?.activeLot, "LOT-99");

  const result = runContextPack(root);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(result.stdout);
  assert.equal(data.machineState.activeCampaignId, "campaign-alpha");
  assert.equal(data.machineState.activeLot, "LOT-02");
  assert.equal(data.machineState.view.activeCampaignId, "campaign-beta");
  assert.equal(data.machineState.view.activeLot, "LOT-99");
  assert.match(data.nextCampaign, /campaign-alpha/);
  assert.doesNotMatch(data.nextCampaign, /campaign-beta/);
});

test("une campagne idle reste inactive même si la vue humaine est en retard", () => {
  const root = setupRepo(
    {
      schema_version: 1,
      project: { id: "wellneuro", name: "Wellneuro" },
      status: "idle",
      active_campaign: null,
      active_lot: null,
      updated_at: "2026-07-14T10:15:16Z"
    },
    `# Campagne active

**Campagne** : campaign-gamma
**Titre** : Campagne gamma
**Statut** : active
**Lot actif** : LOT-03
**Mise à jour** : 2026-07-14

> La source de vérité machine est \`.wn/state.json\`.
`
  );

  const truth = readCampaignTruth(root);
  assert.equal(truth.activeCampaignId, null);
  assert.equal(truth.activeLot, null);
  assert.equal(truth.view?.activeCampaignId, "campaign-gamma");

  const result = runContextPack(root);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(result.stdout);
  assert.equal(data.machineState.activeCampaignId, null);
  assert.equal(data.machineState.activeLot, null);
  assert.equal(data.nextCampaign, "aucune campagne active");
});
