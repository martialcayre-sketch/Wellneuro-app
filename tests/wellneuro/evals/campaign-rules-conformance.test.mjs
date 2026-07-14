import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const auditScript = path.join(repoRoot, "scripts", "wn-campaign-audit.mjs");

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function setupRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-campaign-audit-"));
  const mainRoot = path.join(root, "docs", "claude", "campagnes");
  const mirrorRoot = path.join(root, "wellneuro_wn_campaigns", "wellneuro_wn_campaigns", "docs", "claude", "campagnes");

  write(path.join(mainRoot, "campaign-a", "CAMPAGNE.md"), `---
id: "campaign-a"
titre: "Campagne A"
statut: "à_faire"
lot_courant: "LOT-00"
branche_campagne: "campaign/campaign-a/integration"
branche_lot_courant: "campaign/campaign-a/lot-00"
cible_pr_lot: "campaign/campaign-a/integration"
cible_pr_campagne: "main"
---

# Campagne A
`);

  write(path.join(mainRoot, "campaign-a", "lots", "LOT-00-cadrage.md"), `---
id: "LOT-00-cadrage"
statut: "à_faire"
---

# LOT-00 cadrage
`);

  write(path.join(mainRoot, "campaign-b", "CAMPAGNE.md"), `---
id: "campaign-b"
titre: "Campagne B"
statut: "terminée"
lot_courant: "aucun"
---

# Campagne B
`);

  write(path.join(mainRoot, "campaign-c", "CAMPAGNE.md"), `---
id: "campaign-c"
titre: "Campagne C"
statut: "en_cours"
lot_courant: "LOT-00"
---

# Campagne C
`);
  write(path.join(mainRoot, "campaign-c", "lots", "LOT-00-cadrage.md"), `---
id: "LOT-00"
statut: "à_faire"
---

# LOT-00 cadrage
`);

  write(path.join(mirrorRoot, "campaign-a", "CAMPAGNE.md"), `---
id: "campaign-a"
titre: "Campagne A"
statut: "cadrée"
lot_courant: "aucun"
---

# Campagne A miroir
`);

  write(path.join(root, ".wn", "state.json"), `${JSON.stringify({
    schema_version: 2,
    status: "active",
    active_campaign: "campaign-a",
    active_lot: "LOT-00",
    parallel_campaigns: [{ campaign_id: "campaign-c", active_lot: "LOT-00", status: "active" }],
    updated_at: "2026-07-14T12:00:00Z"
  }, null, 2)}\n`);

  return root;
}

function runAudit(root, extraArgs = []) {
  return spawnSync(process.execPath, [auditScript, ...extraArgs], {
    cwd: root,
    encoding: "utf8"
  });
}

test("l'audit remonte les dérives principal/miroir et la conformité machine", () => {
  const root = setupRepo();
  const run = runAudit(root, ["--no-fail"]);
  assert.equal(run.status, 0, run.stderr);

  const report = JSON.parse(run.stdout);
  assert.equal(report.summary.totalCampaigns, 4);
  assert.equal(report.summary.errors, 0);
  assert.ok(report.summary.warnings >= 1);

  const warningCodes = report.warnings.map((item) => item.code);
  assert.ok(warningCodes.includes("missing_in_mirror"), "doit détecter la campagne absente du miroir");
});

test("l'audit contrôle les campagnes parallèles du schéma v2", () => {
  const root = setupRepo();
  const statePath = path.join(root, ".wn", "state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  state.parallel_campaigns.push({ campaign_id: "campaign-a", active_lot: "LOT-00", status: "active" });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  const run = runAudit(root);
  assert.equal(run.status, 1);
  const report = JSON.parse(run.stdout);
  assert.ok(report.issues.some((item) => item.code === "duplicate_active_campaign"));
});

test("l'audit échoue en cas d'état machine actif sur une campagne fermée", () => {
  const root = setupRepo();
  const statePath = path.join(root, ".wn", "state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  state.active_campaign = "campaign-b";
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  const run = runAudit(root);
  assert.equal(run.status, 1, "l'audit doit échouer avec au moins une erreur");

  const report = JSON.parse(run.stdout);
  const errorCodes = report.issues.map((item) => item.code);
  assert.ok(errorCodes.includes("active_campaign_closed"));
});

test("l'audit peut bloquer la CI sur warnings ciblés", () => {
  const root = setupRepo();

  const run = runAudit(root, ["--fail-on-warning-codes", "missing_in_mirror"]);
  assert.equal(run.status, 1, "la CI doit échouer si un warning ciblé est présent");

  const report = JSON.parse(run.stdout);
  const warningCodes = report.warnings.map((item) => item.code);
  assert.ok(warningCodes.includes("missing_in_mirror"));
});

test("l'audit peut bloquer la CI sur tout warning", () => {
  const root = setupRepo();

  const run = runAudit(root, ["--fail-on-warning"]);
  assert.equal(run.status, 1, "la CI doit échouer si au moins un warning est présent");

  const report = JSON.parse(run.stdout);
  assert.ok(report.summary.warnings > 0, "la fixture doit contenir au moins un warning");
});
