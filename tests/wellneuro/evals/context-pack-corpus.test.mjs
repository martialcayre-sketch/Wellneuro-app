import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const contextPackScript = path.join(repoRoot, "scripts", "wn-context-pack.mjs");

function setupRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-corpus-"));
  fs.mkdirSync(path.join(root, ".wn"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "claude", "campagnes", "_prepared", "campaign-corpus"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "claude", "corpus"), { recursive: true });

  fs.writeFileSync(path.join(root, ".wn", "state.json"), `${JSON.stringify({
    schema_version: 1,
    project: { id: "wellneuro", name: "Wellneuro" },
    status: "idle",
    active_campaign: null,
    active_lot: null,
    updated_at: "2026-07-14T10:15:16Z"
  }, null, 2)}\n`, "utf8");

  fs.writeFileSync(path.join(root, "docs", "claude", "campagnes", "_prepared", "campaign-corpus", "CAMPAGNE.md"), `---
id: "campaign-corpus"
titre: "Campagne corpus préparée"
statut: "préparée_non_active"
lot_courant: "LOT-00"
---

# Campagne corpus préparée
`, "utf8");

  fs.writeFileSync(path.join(root, "docs", "claude", "corpus", "source_registry.json"), `${JSON.stringify([
    {
      sourceId: "WN-SRC-0001",
      title: "Sommeil et chronobiologie",
      primaryNotebook: "02 — Sommeil et chronobiologie",
      documentType: "Cours / référence",
      requiredAction: "Indexer et découper",
      rightsStatus: "to_verify",
      clinicalReviewStatus: "not_reviewed",
      lifecycleStatus: "raw",
      auditDate: "2026-07-12"
    },
    {
      sourceId: "WN-SRC-0002",
      title: "Doublon sommeil",
      primaryNotebook: "02 — Sommeil et chronobiologie",
      documentType: "Protocole / outil décisionnel",
      requiredAction: "Relecture scientifique et sécurité",
      rightsStatus: "to_verify",
      clinicalReviewStatus: "not_reviewed",
      lifecycleStatus: "quarantined",
      doublon_de: "WN-SRC-0001",
      auditDate: "2026-07-13"
    }
  ], null, 2)}\n`, "utf8");

  return root;
}

function runContextPack(root) {
  return spawnSync(process.execPath, [contextPackScript, "--format", "json"], {
    cwd: root,
    encoding: "utf8"
  });
}

test("le contexte compact expose les campagnes préparées et le résumé du corpus", () => {
  const root = setupRepo();
  const result = runContextPack(root);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(result.stdout);
  assert.equal(data.preparedCampaigns.length, 1);
  assert.equal(data.preparedCampaigns[0].id, "campaign-corpus");
  assert.equal(data.preparedCampaigns[0].status, "préparée_non_active");
  assert.equal(data.preparedCampaigns[0].activeLot, "LOT-00");

  assert.equal(data.corpusRegistry.status, "loaded");
  assert.equal(data.corpusRegistry.entries, 2);
  assert.equal(data.corpusRegistry.clinicalCorpusVersion, "registry-2026-07-13");
  assert.match(data.corpusRegistry.corpusManifestHash, /^[a-f0-9]{12}$/);
  assert.equal(data.corpusRegistry.openSourceConflicts, 1);
  assert.equal(data.corpusRegistry.pilotDomain, "sleep_chronobiology");
  assert.ok(data.corpusRegistry.pendingClinicalGates.includes("G0"));
  assert.ok(data.corpusRegistry.pendingClinicalGates.includes("G1"));
  assert.ok(data.corpusRegistry.pendingClinicalGates.includes("G2"));
  assert.ok(data.corpusRegistry.pendingClinicalGates.includes("G3"));
});