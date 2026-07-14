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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-eval-"));
  fs.mkdirSync(path.join(root, ".wn"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "claude", "campagnes"), { recursive: true });

  fs.writeFileSync(path.join(root, ".wn", "state.json"), `${JSON.stringify({
    schema_version: 1,
    project: { id: "wellneuro", name: "Wellneuro" },
    status: "active",
    active_campaign: "campaign-density",
    active_lot: "LOT-04",
    updated_at: "2026-07-14T10:15:16Z"
  }, null, 2)}\n`, "utf8");

  fs.writeFileSync(path.join(root, "docs", "claude", "campagnes", "ACTIVE_CAMPAIGN.md"), `# Campagne active

**Campagne** : campaign-density
**Titre** : Campagne densité
**Statut** : active
**Lot actif** : LOT-04
**Mise à jour** : 2026-07-14

> La source de vérité machine est \`.wn/state.json\`.
`, "utf8");

  const sessionLines = Array.from({ length: 80 }, (_, index) => `TRACE ${String(index + 1).padStart(2, "0")} | événement simulé`).join("\n");
  fs.mkdirSync(path.join(root, "docs", "claude"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "claude", "SESSION_LOG.md"), `${sessionLines}\n`, "utf8");

  return root;
}

function runContextPack(root) {
  return spawnSync(process.execPath, [contextPackScript, "--format", "json"], {
    cwd: root,
    encoding: "utf8"
  });
}

function scoreContextPack(data) {
  let score = 0;
  if (data.branch === "inconnue") score += 5;
  if (data.nextCampaign === "campaign-density | LOT-04 | active") score += 25;
  if (typeof data.sessionTail === "string") {
    const sessionLines = data.sessionTail.split(/\r?\n/).filter(Boolean);
    if (sessionLines.length <= 32) score += 25;
    if (sessionLines.at(-1) === "TRACE 80 | événement simulé") score += 25;
    if (!data.sessionTail.includes("TRACE 01")) score += 20;
  }
  return score;
}

test("le contexte compact reste dense et borné", () => {
  const root = setupRepo();
  const result = runContextPack(root);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(result.stdout);
  assert.equal(data.machineState.activeCampaignId, "campaign-density");
  assert.equal(data.machineState.activeLot, "LOT-04");
  assert.equal(data.machineState.view.activeCampaignId, "campaign-density");
  assert.equal(data.machineState.view.activeLot, "LOT-04");

  const sessionLines = data.sessionTail.split(/\r?\n/).filter(Boolean);
  assert.ok(sessionLines.length <= 32, "le contexte ne doit garder qu'une queue courte de session");
  assert.equal(sessionLines.at(-1), "TRACE 80 | événement simulé");
  assert.ok(!data.sessionTail.includes("TRACE 01"), "les premières lignes ne doivent pas revenir dans le contexte compact");
  assert.ok(scoreContextPack(data) >= 80, "le contexte compact doit rester dense et exploitable");
});