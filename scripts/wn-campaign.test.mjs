import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "wn-campaign.mjs");

function campaignText(id, title, lot = "LOT-00") {
  return `---
id: "${id}"
titre: "${title}"
statut: "à_faire"
lot_courant: "${lot}"
---

# ${title}
`;
}

function lotText(id, status) {
  return `---
id: "${id}"
statut: "${status}"
---

# ${id}
`;
}

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-campaign-"));
  const campaigns = path.join(root, "docs", "claude", "campagnes");
  fs.mkdirSync(path.join(campaigns, "campaign-a", "lots"), { recursive: true });
  fs.mkdirSync(path.join(campaigns, "_prepared", "campaign-b", "lots"), { recursive: true });
  fs.mkdirSync(path.join(root, ".wn"), { recursive: true });
  fs.writeFileSync(path.join(campaigns, "campaign-a", "CAMPAGNE.md"), campaignText("campaign-a", "Campagne A", "LOT-01"));
  fs.writeFileSync(path.join(campaigns, "campaign-a", "lots", "LOT-00-audit.md"), lotText("LOT-00", "terminé"));
  fs.writeFileSync(path.join(campaigns, "campaign-a", "lots", "LOT-01-build.md"), lotText("LOT-01", "à_faire"));
  fs.writeFileSync(path.join(campaigns, "_prepared", "campaign-b", "CAMPAGNE.md"), campaignText("campaign-b", "Campagne préparée"));
  fs.writeFileSync(path.join(campaigns, "_prepared", "campaign-b", "lots", "LOT-00-audit.md"), lotText("LOT-00", "à_faire"));
  fs.writeFileSync(path.join(root, ".wn", "state.json"), `${JSON.stringify({
    schema_version: 1,
    project: { id: "wellneuro", name: "Wellneuro" },
    status: "idle",
    active_campaign: null,
    active_lot: null
  }, null, 2)}\n`);
  return root;
}

function run(root, ...args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: "utf8"
  });
}

test("next ne sélectionne aucune campagne implicitement", () => {
  const root = setup();
  const result = run(root, "next");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Aucune campagne active dans \.wn\/state\.json/);
});

test("une campagne _prepared exige puis accepte une activation explicite", () => {
  const root = setup();
  const result = run(root, "activate", "campaign-b", "--lot", "LOT-00");
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(root, ".wn", "state.json"), "utf8"));
  assert.equal(state.active_campaign, "campaign-b");
  assert.equal(state.active_lot, "LOT-00");
  const view = fs.readFileSync(path.join(root, "docs", "claude", "campagnes", "ACTIVE_CAMPAIGN.md"), "utf8");
  assert.match(view, /source de vérité machine est `\.wn\/state\.json`/);
  assert.match(view, /Campagne préparée/);
});

test("next suit exclusivement le lot déclaré dans state.json", () => {
  const root = setup();
  assert.equal(run(root, "activate", "campaign-a", "--lot", "LOT-01").status, 0);
  const result = run(root, "next");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /campaign-a.*LOT-01-build\.md/s);
});

test("deactivate neutralise l'état et régénère la vue humaine", () => {
  const root = setup();
  assert.equal(run(root, "activate", "campaign-a").status, 0);
  const result = run(root, "deactivate");
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(root, ".wn", "state.json"), "utf8"));
  assert.equal(state.status, "idle");
  assert.equal(state.active_campaign, null);
  assert.match(fs.readFileSync(path.join(root, "docs", "claude", "campagnes", "ACTIVE_CAMPAIGN.md"), "utf8"), /Aucune campagne active/);
});
