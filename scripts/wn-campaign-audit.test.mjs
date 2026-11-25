// Banc de `wn-campaign-audit` — statut « transféré » reconnu comme fermé
// (arbitrage du 2026-11-25, autonomie-pieges-restes partie 19).
//
// Mutations qui doivent rougir ce banc :
//   M1 retirer `|| isTransferredStatus(low)` de `isClosedStatus` → tests 1 et 3 rouges ;
//   M2 remplacer la regex par `low.startsWith("transfer")` → tests 2 et 3 rouges ;
//   M3 retirer l'ancre `^` → test 2 rouge (« non transféré ») ;
//   M4 retirer le lookahead `(?![a-z])` → test 2 rouge (« transférer »).
// Les deux derniers tests témoignent des autres usages d'`isClosedStatus`
// (ordinal dupliqué, campagne active fermée) : M1 les rougit aussi.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "wn-campaign-audit.mjs");

function campaignText(id, status) {
  return `---
id: "${id}"
titre: "Campagne de banc"
statut: "${status}"
lot_courant: "aucun"
---

# Campagne de banc
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

// Par défaut, une campagne fermée et deux lots : LOT-00 terminé, LOT-01 au
// statut donné. `lots` remplace ces deux fiches ; `state` écrit .wn/state.json.
function audit(lotStatus, campaignStatus = "terminée (banc)", { lots, state } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-campaign-audit-"));
  try {
    const dir = path.join(root, "docs", "claude", "campagnes", "campagne-banc");
    fs.mkdirSync(path.join(dir, "lots"), { recursive: true });
    fs.writeFileSync(path.join(dir, "CAMPAGNE.md"), campaignText("campagne-banc", campaignStatus));
    const fiches = lots || [["LOT-00-socle.md", "LOT-00", "terminé"], ["LOT-01-parti.md", "LOT-01", lotStatus]];
    for (const [file, id, status] of fiches) {
      fs.writeFileSync(path.join(dir, "lots", file), lotText(id, status));
    }
    if (state) {
      fs.mkdirSync(path.join(root, ".wn"), { recursive: true });
      fs.writeFileSync(path.join(root, ".wn", "state.json"), JSON.stringify(state));
    }
    const run = spawnSync(process.execPath, [scriptPath, "--no-fail"], { cwd: root, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function openLotWarning(report) {
  return report.warnings.find((item) => item.code === "closed_campaign_with_open_lots");
}

test("un lot « transféré » ne bloque plus la clôture de sa campagne", () => {
  for (const status of [
    "transféré",
    "TRANSFÉRÉ le 2026-11-25 au plan",
    "transférée (D-xxx)",
    "transférés",
    "transféré, au plan",
  ]) {
    assert.equal(openLotWarning(audit(status)), undefined, `statut « ${status} » compté ouvert`);
  }
});

test("un statut voisin qui ne commence pas par « transféré » reste ouvert", () => {
  for (const status of ["transférer plus tard", "transfert prévu", "non transféré", "à transférer", "en_cours"]) {
    const warning = openLotWarning(audit(status));
    assert.ok(warning, `statut « ${status} » compté fermé`);
    assert.match(warning.message, /LOT-01-parti\.md/);
  }
});

test("une campagne « transférée » compte comme fermée", () => {
  // Fermée ⇒ ses lots ouverts sont signalés ; ouverte, rien ne le serait.
  const warning = openLotWarning(audit("en_cours", "transférée au plan"));
  assert.ok(warning, "campagne « transférée » comptée ouverte");
  assert.equal(openLotWarning(audit("en_cours", "transfert prévu")), undefined);
});

test("témoin : les quatre préfixes historiques restent fermés", () => {
  for (const status of ["terminé", "livré", "abandonné ici", "fait"]) {
    assert.equal(openLotWarning(audit(status)), undefined, `statut « ${status} » compté ouvert`);
  }
});

test("témoin : dans une campagne « transférée », un ordinal dupliqué n'est qu'un avertissement", () => {
  const lots = [["LOT-00-a.md", "LOT-00", "terminé"], ["LOT-00-b.md", "LOT-00", "terminé"]];
  const report = audit("", "transférée au plan", { lots });
  assert.ok(report.warnings.some((item) => item.code === "duplicate_lot_ordinal"));
  assert.ok(!report.issues.some((item) => item.code === "duplicate_lot_ordinal"));
});

test("témoin : un état machine qui pointe une campagne « transférée » est une erreur", () => {
  const state = { schema_version: 1, status: "active", active_campaign: "campagne-banc", active_lot: "LOT-01" };
  const report = audit("en_cours", "transférée au plan", { state });
  assert.ok(report.issues.some((item) => item.code === "active_campaign_closed"));
});
