import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
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

  // D-372 §2 : la trace de session est la « Prochaine action exacte » du
  // dernier handoff, bornée — plus la queue de SESSION_LOG.md.
  const handoffs = path.join(root, "docs", "claude", "handoffs");
  fs.mkdirSync(handoffs, { recursive: true });
  const actions = Array.from({ length: 80 }, (_, index) => `TRACE ${String(index + 1).padStart(2, "0")} | action simulée`).join("\n");
  fs.writeFileSync(path.join(handoffs, "2026-07-14-1000-ancien.md"), "# Handoff\n\n## Prochaine action exacte\n\nANCIEN\n", "utf8");
  fs.writeFileSync(
    path.join(handoffs, "2026-07-14-1015-courant.md"),
    `# Handoff\n\n## Objectif\n\nOBJECTIF\n\n## Prochaine action exacte\n\n${actions}\n\n## Interdits encore actifs\n\nINTERDIT\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(handoffs, "README.md"), "# Convention\n", "utf8");
  fs.writeFileSync(path.join(handoffs, "notes.md"), "# Pas un handoff\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "claude", "SESSION_LOG.md"), "JOURNAL | ne doit plus être lu\n", "utf8");

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
  if (typeof data.handoff?.prochaineAction === "string") {
    const sessionLines = data.handoff.prochaineAction.split(/\r?\n/).filter(Boolean);
    if (sessionLines.length <= 32) score += 25;
    if (sessionLines[0] === "TRACE 01 | action simulée") score += 25;
    if (!data.handoff.prochaineAction.includes("TRACE 80")) score += 20;
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

  assert.equal(data.handoff.chemin, "docs/claude/handoffs/2026-07-14-1015-courant.md", "le dernier fragment au tri, ni README ni notes.md");
  const sessionLines = data.handoff.prochaineAction.split(/\r?\n/).filter(Boolean);
  assert.ok(sessionLines.length <= 32, "le contexte ne doit garder qu'une rubrique courte");
  assert.equal(sessionLines[0], "TRACE 01 | action simulée");
  assert.ok(!data.handoff.prochaineAction.includes("TRACE 80"), "la rubrique est bornée");
  assert.ok(!data.handoff.prochaineAction.includes("INTERDIT"), "la rubrique suivante n'est pas lue");
  assert.ok(!JSON.stringify(data).includes("JOURNAL"), "SESSION_LOG.md n'est plus lu (D-372)");
  assert.ok(scoreContextPack(data) >= 80, "le contexte compact doit rester dense et exploitable");
});

// D-372 §2 : le handoff créé par la branche courante prime sur le dernier au
// tri du dossier — même quand celui de `main` porte une date plus récente.
test("le handoff créé par la branche prime sur le dernier au tri", () => {
  const root = setupRepo();
  const g = (...args) =>
    execFileSync("git", ["-c", "user.name=banc", "-c", "user.email=banc@example.test", ...args], { cwd: root, encoding: "utf8" });
  try {
    g("init", "-q");
    g("add", ".");
    g("commit", "-q", "-m", "main");
    g("update-ref", "refs/remotes/origin/main", "HEAD");
    g("checkout", "-q", "-b", "lot");
    fs.writeFileSync(
      path.join(root, "docs", "claude", "handoffs", "2026-07-13-0900-lot.md"),
      "# Handoff\n\n## Prochaine action exacte\n\nACTION DU LOT\n",
      "utf8"
    );
    const nonSuivi = JSON.parse(runContextPack(root).stdout);
    assert.equal(nonSuivi.handoff.chemin, "docs/claude/handoffs/2026-07-13-0900-lot.md", "un fragment non encore suivi compte");
    g("add", ".");
    g("commit", "-q", "-m", "lot");
    const data = JSON.parse(runContextPack(root).stdout);
    assert.equal(data.handoff.chemin, "docs/claude/handoffs/2026-07-13-0900-lot.md");
    assert.equal(data.handoff.origine, "créé par la branche");
    assert.equal(data.handoff.prochaineAction, "ACTION DU LOT");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
