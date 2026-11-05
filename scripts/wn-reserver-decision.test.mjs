// Banc de `scripts/wn-reserver-decision.mjs` (D-370 §1), sur API simulée.
// Aucune référence réelle n'est créée : ni réseau, ni jeton.
//
// Les morsures à prouver séparément : la référence se crée sur le premier
// numéro libre ; « déjà existante » — et elle seule — fait passer au suivant ;
// tout autre refus rend « inconnu », sans nouvel essai ; pour plusieurs
// numéros, les créés restent et le partiel est rendu ; la référence ne porte
// que le numéro.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { analyserArguments, apiGitHub, classerRefusCreation, principal, reserver } from "./wn-reserver-decision.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "wn-reserver-decision.mjs");
const SHA = "a".repeat(40);

const SHA_DOSSIER = "c".repeat(40);

/** L'arbre de `docs/decisions/` tel que l'API le rend (D-418 §5). */
function arbre(numeros, { archivees = [], tronque = false, intrus = [] } = {}) {
  const blob = (p) => ({ path: p, type: "blob" });
  const nom = (n) => `D-${String(n).padStart(3, "0")}.md`;
  return {
    sha: SHA_DOSSIER,
    truncated: tronque,
    tree: [
      ...numeros.map((n) => blob(nom(n))),
      ...(archivees.length ? [{ path: "archivees", type: "tree" }] : []),
      ...archivees.map((n) => blob(`archivees/${nom(n)}`)),
      ...intrus.map(blob),
    ],
  };
}

/**
 * Une API simulée : `issues` donne, par référence, l'issue de sa création
 * ("existe" ou "inconnu") ; toute autre référence est créée.
 */
function apiSimulee({ numeros = [389, 390], reservations = [], issues = {}, panne = null } = {}) {
  const creations = [];
  return {
    creations,
    teteMain() {
      if (panne === "main") throw new Error("gh: Bad credentials (HTTP 401)");
      return SHA;
    },
    numeros(sha) {
      assert.equal(sha, SHA, "le registre se lit sur la tête de main lue");
      if (panne === "registre") throw new Error("gh: Not Found (HTTP 404)");
      return [...numeros];
    },
    reservations() {
      if (panne === "reservations") throw new Error("gh: Service Unavailable (HTTP 503)");
      return new Set(reservations);
    },
    creer(ref, sha) {
      creations.push({ ref, sha });
      const issue = issues[ref];
      if (issue === "existe") return { issue: "existe", detail: "gh: Reference already exists (HTTP 422)" };
      if (issue === "inconnu") return { issue: "inconnu", detail: "gh: Object does not exist (HTTP 422)" };
      return { issue: "creee" };
    },
  };
}

const ref = (n) => `refs/tags/reserve/D-${n}`;

// ── Le premier numéro libre ─────────────────────────────────────────────────

test("crée la référence du premier numéro libre au-dessus de main", () => {
  const api = apiSimulee({ numeros: [388, 389, 390] });
  const r = reserver({ api });
  assert.equal(r.statut, "ok");
  assert.deepEqual(r.reserves, [391]);
  assert.deepEqual(api.creations, [{ ref: ref(391), sha: SHA }]);
});

test("saute les numéros déjà réservés sans tenter de les créer", () => {
  const api = apiSimulee({ reservations: [391, 392] });
  const r = reserver({ api });
  assert.deepEqual(r.reserves, [393]);
  assert.deepEqual(api.creations.map((c) => c.ref), [ref(393)]);
});

test("une réservation ancienne, sous le maximum de main, ne déplace rien", () => {
  const api = apiSimulee({ reservations: [12, 389] });
  assert.deepEqual(reserver({ api }).reserves, [391]);
});

// ── « Déjà existante » : la seule cause qui fait passer au suivant ─────────

test("référence déjà existante (course) ⇒ numéro suivant", () => {
  const api = apiSimulee({ issues: { [ref(391)]: "existe", [ref(392)]: "existe" } });
  const r = reserver({ api });
  assert.equal(r.statut, "ok");
  assert.deepEqual(r.reserves, [393]);
  assert.deepEqual(r.sautes, [391, 392]);
  assert.deepEqual(api.creations.map((c) => c.ref), [ref(391), ref(392), ref(393)]);
});

// ── Tout autre refus : inconnu, sans nouvel essai ───────────────────────────

test("tout autre refus ⇒ inconnu, une seule tentative, rien après", () => {
  const api = apiSimulee({ issues: { [ref(391)]: "inconnu" } });
  const r = reserver({ api });
  assert.equal(r.statut, "inconnu");
  assert.equal(r.inconnu, 391);
  assert.deepEqual(r.reserves, []);
  assert.equal(api.creations.length, 1, "aucun nouvel essai, ni sur 391 ni sur 392");
});

test("classerRefusCreation : le message décide, pas le statut HTTP", () => {
  assert.equal(classerRefusCreation("gh: Reference already exists (HTTP 422)"), "existe");
  assert.equal(classerRefusCreation("gh: Object does not exist (HTTP 422)"), "inconnu");
  assert.equal(classerRefusCreation("gh: Resource not accessible by integration (HTTP 403)"), "inconnu");
  assert.equal(classerRefusCreation("error connecting to api.github.com"), "inconnu");
  assert.equal(classerRefusCreation(""), "inconnu");
});

test("garde-fou : 50 « déjà existante » d'affilée ⇒ arrêt, sans issue inconnue", () => {
  const issues = {};
  for (let n = 391; n < 391 + 60; n += 1) issues[ref(n)] = "existe";
  const api = apiSimulee({ issues });
  const r = reserver({ api });
  assert.equal(r.statut, "epuise");
  assert.equal(r.inconnu, undefined, "aucun numéro dans un état inconnu");
  assert.equal(api.creations.length, 50);
  assert.equal(principal([], apiSimulee({ issues })), 3);
});

test("garde-fou : le compteur repart à chaque création réussie", () => {
  const api = apiSimulee();
  assert.equal(reserver({ nombre: 60, api }).statut, "ok");
  assert.equal(api.creations.length, 60);
});

// ── Plusieurs numéros : les créés restent, le partiel est rendu ─────────────

test("plusieurs numéros : tous créés, à la suite", () => {
  const api = apiSimulee({ reservations: [392] });
  const r = reserver({ nombre: 3, api });
  assert.equal(r.statut, "ok");
  assert.deepEqual(r.reserves, [391, 393, 394]);
});

test("plusieurs numéros : échec en route ⇒ les créés restent, partiel rendu", () => {
  const api = apiSimulee({ issues: { [ref(393)]: "inconnu" } });
  const r = reserver({ nombre: 3, api });
  assert.equal(r.statut, "inconnu");
  assert.deepEqual(r.reserves, [391, 392]);
  assert.equal(r.inconnu, 393);
  assert.equal(api.creations.length, 3, "aucune suppression, aucun nouvel essai");
});

// ── Rien n'est tenté si une lecture échoue ──────────────────────────────────

for (const panne of ["main", "registre", "reservations"]) {
  test(`lecture impossible (${panne}) ⇒ rien n'est créé`, () => {
    const api = apiSimulee({ panne });
    const r = reserver({ api });
    assert.equal(r.statut, "illisible");
    assert.deepEqual(api.creations, []);
  });
}

test("registre sans décision ⇒ rien n'est créé", () => {
  const api = apiSimulee({ numeros: [] });
  assert.equal(reserver({ api }).statut, "illisible");
  assert.deepEqual(api.creations, []);
});

// ── Codes de sortie et arguments ────────────────────────────────────────────

test("codes de sortie : 0 tout réservé, 3 inconnu, 2 rien tenté ou usage", () => {
  assert.equal(principal([], apiSimulee()), 0);
  assert.equal(principal(["--nombre", "2"], apiSimulee({ issues: { [ref(392)]: "inconnu" } })), 3);
  assert.equal(principal([], apiSimulee({ panne: "main" })), 2);
  assert.equal(principal(["--nombre", "0"], apiSimulee()), 2);
  assert.equal(principal(["--dry-run"], apiSimulee()), 2);
});

test("analyserArguments : --nombre N, rien d'autre", () => {
  assert.deepEqual(analyserArguments([]), { nombre: 1 });
  assert.deepEqual(analyserArguments(["--nombre", "4"]), { nombre: 4 });
  assert.ok("erreur" in analyserArguments(["--nombre"]));
  assert.ok("erreur" in analyserArguments(["3"]));
});

// ── L'adaptateur `gh` : la référence ne porte que le numéro ─────────────────
//
// Un faux `gh` sur le PATH tient lieu d'API GitHub. Il journalise chaque appel
// : c'est le journal qui prouve ce qui part réellement vers l'API.

function avecFauxGh(scenario, corps) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wn-reserver-"));
  try {
    const bin = path.join(tmp, "bin");
    fs.mkdirSync(bin);
    const journal = path.join(tmp, "appels.log");
    const fichierScenario = path.join(tmp, "scenario.json");
    fs.writeFileSync(fichierScenario, JSON.stringify(scenario));
    fs.writeFileSync(
      path.join(bin, "gh"),
      `#!/usr/bin/env node
const fs = require("node:fs");
const a = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(journal)}, JSON.stringify(a) + "\\n");
const s = JSON.parse(fs.readFileSync(${JSON.stringify(fichierScenario)}, "utf8"));
const chemin = a.find((x) => x.startsWith("repos/")) || "";
if (chemin.endsWith("/commits/main")) { process.stdout.write(JSON.stringify({ sha: s.sha })); process.exit(0); }
if (chemin.startsWith("repos/{owner}/{repo}/contents/docs?ref=")) { process.stdout.write(JSON.stringify(s.docs)); process.exit(0); }
if (chemin.includes("/git/trees/")) { process.stdout.write(JSON.stringify(s.arbre)); process.exit(0); }
if (chemin.includes("/git/matching-refs/")) { process.stdout.write(JSON.stringify([s.reservations.map((r) => ({ ref: r }))])); process.exit(0); }
if (chemin.endsWith("/git/refs") && a.includes("POST")) {
  const r = (a.find((x) => x.startsWith("ref=")) || "").slice(4);
  const issue = s.creation[r] || "creee";
  if (issue === "existe") { process.stdout.write('{"message":"Reference already exists","status":"422"}'); process.stderr.write("gh: Reference already exists (HTTP 422)\\n"); process.exit(1); }
  if (issue === "panne") { process.stderr.write("gh: Service Unavailable (HTTP 503)\\n"); process.exit(1); }
  process.stdout.write(JSON.stringify({ ref: r, object: { sha: s.sha } })); process.exit(0);
}
process.stderr.write("faux gh : appel imprévu\\n"); process.exit(9);
`,
      { mode: 0o755 },
    );
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
    const lancer = (args = []) => {
      try {
        return { code: 0, sortie: execFileSync(process.execPath, [SCRIPT, ...args], { cwd: tmp, encoding: "utf8", stdio: "pipe", env }) };
      } catch (e) {
        return { code: e.status, sortie: `${e.stdout ?? ""}${e.stderr ?? ""}` };
      }
    };
    const appels = () => fs.readFileSync(journal, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    return corps({ lancer, appels });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const SCENARIO = {
  sha: "b".repeat(40),
  docs: [
    { name: "DECISIONS.md", type: "file", sha: "d".repeat(40) },
    { name: "decisions", type: "dir", sha: SHA_DOSSIER },
  ],
  arbre: arbre([389, 390]),
  reservations: ["refs/tags/reserve/D-391"],
  creation: { "refs/tags/reserve/D-392": "existe" },
};

test("bout en bout : 391 réservé ailleurs, 392 pris par une course, 393 créé — code 0", () => {
  avecFauxGh(SCENARIO, ({ lancer, appels }) => {
    const r = lancer();
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /D-392 déjà réservé par ailleurs/);
    assert.match(r.sortie, /✓ D-393 réservé \(refs\/tags\/reserve\/D-393\)/);
    const posts = appels().filter((a) => a.includes("POST"));
    assert.equal(posts.length, 2);
    // La référence ne porte que le numéro : un nom, un sha déjà public, rien d'autre.
    for (const p of posts) {
      const champs = p.filter((x, i) => p[i - 1] === "-f" || p[i - 1] === "-F" || p[i - 1] === "--field" || p[i - 1] === "--raw-field");
      assert.deepEqual(champs.map((c) => c.split("=")[0]).sort(), ["ref", "sha"]);
      assert.ok(champs.includes(`sha=${SCENARIO.sha}`));
      assert.match(champs.find((c) => c.startsWith("ref=")), /^ref=refs\/tags\/reserve\/D-\d{3}$/);
      assert.ok(!p.includes("--input"));
    }
  });
});

test("bout en bout : le répertoire se lit sur la tête de main, puis son arbre récursif", () => {
  avecFauxGh(SCENARIO, ({ lancer, appels }) => {
    lancer();
    const lecture = appels().find((a) => a.some((x) => x.includes("/contents/")));
    assert.ok(lecture.some((x) => x === `repos/{owner}/{repo}/contents/docs?ref=${SCENARIO.sha}`));
    const arbreLu = appels().find((a) => a.some((x) => x.includes("/git/trees/")));
    assert.ok(arbreLu.some((x) => x === `repos/{owner}/{repo}/git/trees/${SHA_DOSSIER}?recursive=1`));
  });
});

// ── La lecture du répertoire (D-418 §5) : le plus haut des actives ET des
//    archivées ; ce qui n'est pas une décision ne compte pas ; une lecture
//    incomplète n'est jamais un maximum. ─────────────────────────────────────

function apiSurArbre(docs, arbreRendu) {
  return apiGitHub((args) => {
    const chemin = args.find((x) => x.startsWith("repos/")) ?? "";
    if (chemin.includes("/contents/docs?ref=")) return JSON.stringify(docs);
    if (chemin.includes("/git/trees/")) return JSON.stringify(arbreRendu);
    throw new Error(`appel imprévu : ${chemin}`);
  });
}

test("apiGitHub.numeros : actives et archivées, intrus ignorés", () => {
  const api = apiSurArbre(SCENARIO.docs, arbre([389, 390], { archivees: [395], intrus: ["D-42.md", "README.md", "D-400-titre.md", "sous/D-401.md"] }));
  assert.deepEqual(api.numeros(SHA).sort((a, b) => a - b), [389, 390, 395]);
});

test("apiGitHub.numeros : une archivée au-dessus des actives fixe le maximum", () => {
  const api = apiSurArbre(SCENARIO.docs, arbre([389, 390], { archivees: [391] }));
  const reservations = [];
  const r = reserver({
    api: { ...api, teteMain: () => SHA, reservations: () => new Set(), creer: (ref) => (reservations.push(ref), { issue: "creee" }) },
  });
  assert.equal(r.statut, "ok");
  assert.deepEqual(reservations, ["refs/tags/reserve/D-392"]);
});

test("apiGitHub.numeros : arbre tronqué ⇒ illisible, rien n'est créé", () => {
  const api = apiSurArbre(SCENARIO.docs, arbre([389, 390], { tronque: true }));
  assert.throws(() => api.numeros(SHA), /tronqué/);
});

test("apiGitHub.numeros : docs/decisions/ absent sur main ⇒ illisible", () => {
  const api = apiSurArbre([{ name: "DECISIONS.md", type: "file", sha: "d".repeat(40) }], arbre([1]));
  assert.throws(() => api.numeros(SHA), /absent sur main/);
});

test("bout en bout : registre sans décision sur main ⇒ code 2, aucun POST", () => {
  avecFauxGh({ ...SCENARIO, arbre: arbre([], { intrus: ["README.md"] }) }, ({ lancer, appels }) => {
    const r = lancer();
    assert.equal(r.code, 2, r.sortie);
    assert.match(r.sortie, /aucune décision lue dans docs\/decisions\//);
    assert.equal(appels().filter((a) => a.includes("POST")).length, 0);
  });
});

test("bout en bout : panne à la création ⇒ inconnu, code 3, un seul POST", () => {
  avecFauxGh({ ...SCENARIO, creation: { "refs/tags/reserve/D-392": "panne" } }, ({ lancer, appels }) => {
    const r = lancer();
    assert.equal(r.code, 3, r.sortie);
    assert.match(r.sortie, /D-392 : issue inconnue/);
    assert.equal(appels().filter((a) => a.includes("POST")).length, 1);
  });
});

test("apiGitHub : un sha de main illisible est une lecture impossible", () => {
  const api = apiGitHub(() => JSON.stringify({ sha: "pas-un-sha" }));
  assert.throws(() => api.teteMain(), /illisible/);
});
