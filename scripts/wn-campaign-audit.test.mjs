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

// ── Ligne de check : un cas rouge par code de `--fail-on-warning-codes` ──
//
// `campaign-audit-check` (web/package.json) est un garde bloquant de
// `npm run check`. Les codes sont relus dans la ligne elle-même : un code
// ajouté sans cas rouge ici rougit le banc, et un code retiré de la ligne
// rougit son cas (le garde serait redevenu muet sur lui).
//
// Mutations qui doivent rougir ce banc : supprimer le `warnings.push` d'un
// des sept codes de wn-campaign-audit.mjs → son cas rouge ; retirer un code
// de la ligne de check → son cas rouge (« … ne rougit pas la ligne ») ;
// ajouter un code à la ligne sans cas → test « chaque code a son cas ».
//
// Constat : la ligne ne passe pas `--root`, donc n'audite que la racine
// principale ; les trois codes de miroir (missing_in_mirror, extra_in_mirror,
// status_drift_between_roots) n'y peuvent pas sonner. Leurs cas passent
// `--root` en plus des drapeaux de la ligne : ils prouvent le mécanisme.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkLine = JSON.parse(fs.readFileSync(path.join(repoRoot, "web", "package.json"), "utf8"))
  .scripts["campaign-audit-check"];
// La ligne doit avoir exactement cette forme : un drapeau ajouté (`--no-fail`,
// `--root`…) changerait ce que le garde bloque sans que les cas le voient.
const checkLineForm = /^cd \.\. && node scripts\/wn-campaign-audit\.mjs --fail-on-warning-codes ([a-z_]+(?:,[a-z_]+)*)$/;
const checkCodes = (checkLine.match(checkLineForm) || [, ""])[1].split(",").filter(Boolean);

test("la ligne de check a la forme attendue, sans autre drapeau", () => {
  assert.match(checkLine, checkLineForm);
});

const PRIMARY = "docs/claude/campagnes";
const MIRROR = "miroir/campagnes";

function campaignFile(id, status, lotCourant = "aucun") {
  return `---
id: "${id}"
titre: "Campagne de banc"
statut: "${status}"
lot_courant: "${lotCourant}"
---

# Campagne de banc
`;
}

// `tree` : { "<racine>/<campagne>": { status, lotCourant, lots: [[fichier, id, statut]] } }.
function writeTree(root, tree) {
  for (const [rel, campaign] of Object.entries(tree)) {
    const dir = path.join(root, rel);
    fs.mkdirSync(path.join(dir, "lots"), { recursive: true });
    fs.writeFileSync(path.join(dir, "CAMPAGNE.md"), campaignFile(path.basename(rel), campaign.status, campaign.lotCourant));
    for (const [file, id, status] of campaign.lots || []) {
      fs.writeFileSync(path.join(dir, "lots", file), lotText(id, status));
    }
  }
}

// Joue le script avec la liste de codes donnée (par défaut celle de la ligne
// de check), sans `--no-fail` : le code de sortie est celui du garde.
function runCheck({ tree = {}, state, roots, codes = checkCodes } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-campaign-audit-check-"));
  try {
    writeTree(root, tree);
    if (state) {
      fs.mkdirSync(path.join(root, ".wn"), { recursive: true });
      fs.writeFileSync(path.join(root, ".wn", "state.json"), JSON.stringify(state));
    }
    const argv = [scriptPath, "--fail-on-warning-codes", codes.join(",")];
    if (roots) argv.push("--root", roots.join(","));
    const run = spawnSync(process.execPath, argv, { cwd: root, encoding: "utf8" });
    return { status: run.status, report: JSON.parse(run.stdout), stderr: run.stderr };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const closedLots = [["LOT-00-socle.md", "LOT-00", "terminé"]];

// Un cas conforme par code : seul ce code parmi ceux de la ligne sonne, et
// aucune erreur (`issues`) n'explique la sortie à sa place.
const redCases = {
  missing_audit_root: {},
  closed_campaign_with_open_lots: {
    tree: { [`${PRIMARY}/campagne-banc`]: { status: "terminée", lots: [["LOT-01-ouvert.md", "LOT-01", "en_cours"]] } },
  },
  inflight_without_active_lot: {
    tree: { [`${PRIMARY}/campagne-banc`]: { status: "en_cours", lots: closedLots } },
  },
  idle_with_active_fields: {
    tree: { [`${PRIMARY}/campagne-banc`]: { status: "terminée", lots: closedLots } },
    state: { schema_version: 1, status: "idle", active_campaign: "campagne-banc", active_lot: null },
  },
  missing_in_mirror: {
    tree: {
      [`${PRIMARY}/campagne-banc`]: { status: "terminée", lots: closedLots },
      [`${PRIMARY}/campagne-seule`]: { status: "terminée", lots: closedLots },
      [`${MIRROR}/campagne-banc`]: { status: "terminée", lots: closedLots },
    },
    roots: [PRIMARY, MIRROR],
  },
  extra_in_mirror: {
    tree: {
      [`${PRIMARY}/campagne-banc`]: { status: "terminée", lots: closedLots },
      [`${MIRROR}/campagne-banc`]: { status: "terminée", lots: closedLots },
      [`${MIRROR}/campagne-orpheline`]: { status: "terminée", lots: closedLots },
    },
    roots: [PRIMARY, MIRROR],
  },
  status_drift_between_roots: {
    tree: {
      [`${PRIMARY}/campagne-banc`]: { status: "terminée", lots: closedLots },
      [`${MIRROR}/campagne-banc`]: { status: "livrée", lots: closedLots },
    },
    roots: [PRIMARY, MIRROR],
  },
};

test("la ligne de check porte les sept codes attendus, sans doublon", () => {
  assert.deepEqual([...checkCodes].sort(), Object.keys(redCases).sort());
  assert.equal(new Set(checkCodes).size, checkCodes.length);
});

test("chaque code de la ligne de check a son cas rouge", () => {
  for (const code of checkCodes) assert.ok(redCases[code], `code ${code} sans cas rouge`);
});

for (const [code, fixture] of Object.entries(redCases)) {
  test(`garde rouge : ${code} rougit la ligne de check`, () => {
    const { status, report, stderr } = runCheck(fixture);
    assert.deepEqual(report.issues, [], "une erreur expliquerait la sortie à la place du code");
    const sounding = report.warnings.map((item) => item.code).filter((item) => checkCodes.includes(item));
    assert.deepEqual([...new Set(sounding)], [code]);
    assert.equal(status, 1, stderr);
  });

  test(`garde rouge : ${code} ne rougit plus une fois retiré de la ligne`, () => {
    // Attribue la sortie 1 au seul code : sans lui, la même fixture passe.
    const { status, stderr } = runCheck({ ...fixture, codes: checkCodes.filter((item) => item !== code) });
    assert.equal(status, 0, stderr);
  });
}

test("garde conforme : campagne en cours, lot courant présent, état actif cohérent → sortie 0", () => {
  const tree = {
    [`${PRIMARY}/campagne-banc`]: {
      status: "en_cours",
      lotCourant: "LOT-01",
      lots: [["LOT-00-socle.md", "LOT-00", "terminé"], ["LOT-01-courant.md", "LOT-01", "en_cours"]],
    },
  };
  const state = { schema_version: 1, status: "active", active_campaign: "campagne-banc", active_lot: "LOT-01" };
  const { status, report, stderr } = runCheck({ tree, state });
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(status, 0, stderr);
});

test("garde conforme : principal et miroir identiques → sortie 0", () => {
  const tree = {
    [`${PRIMARY}/campagne-banc`]: { status: "terminée", lots: closedLots },
    [`${MIRROR}/campagne-banc`]: { status: "Terminée", lots: closedLots },
  };
  const state = { schema_version: 1, status: "idle", active_campaign: null, active_lot: null };
  const { status, report, stderr } = runCheck({ tree, state, roots: [PRIMARY, MIRROR] });
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(status, 0, stderr);
});
