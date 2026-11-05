// Banc de la lecture du registre (D-418 §4) : `scripts/wn-decisions.mjs` et
// `scripts/lib/registre-decisions.mjs`. Ce qu'il garde : l'ordre du plus
// récent au plus ancien, la lecture par numéro (active ou archivée), et le
// refus de rendre une sortie vide en succès.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyserArguments, principal } from "./wn-decisions.mjs";
import { lireDecision, lireDecisions, numeroDemande, numeroDuNom } from "./lib/registre-decisions.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function avecRegistre(fichiers, corps) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wn-decisions-lire-"));
  try {
    for (const [chemin, texte] of Object.entries(fichiers)) {
      fs.mkdirSync(path.join(tmp, path.dirname(chemin)), { recursive: true });
      fs.writeFileSync(path.join(tmp, chemin), texte);
    }
    return corps(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const TROIS = {
  "docs/decisions/D-002.md": "# D-002 — deux\n\ncorps deux\n",
  "docs/decisions/D-010.md": "# D-010 — dix\n",
  "docs/decisions/archivees/D-001.md": "# D-001 — un\n",
  "docs/decisions/README.md": "# pas une décision\n",
};

function lancer(argv, racine) {
  let sortie = "";
  let erreur = "";
  const code = principal(argv, { racine, ecrire: (t) => (sortie += t), erreur: (t) => (erreur += t) });
  return { code, sortie, erreur };
}

test("numeroDuNom : le seul nom canonique", () => {
  assert.equal(numeroDuNom("D-042.md"), 42);
  assert.equal(numeroDuNom("D-1042.md"), 1042);
  for (const n of ["D-42.md", "D-0042.md", "D-042-x.md", "README.md", "D-042.MD"]) assert.equal(numeroDuNom(n), null, n);
});

test("numeroDemande : D-418, d-418, 418, D-0418", () => {
  for (const x of ["D-418", "d-418", "418", "D-0418"]) assert.equal(numeroDemande(x), 418, x);
  assert.equal(numeroDemande("D-x"), null);
});

test("lireDecisions : du plus récent au plus ancien, archivées comprises, intrus ignorés", () => {
  avecRegistre(TROIS, (tmp) => {
    assert.deepEqual(lireDecisions(tmp).map((d) => [d.id, d.section]), [
      ["D-010", "actives"],
      ["D-002", "actives"],
      ["D-001", "archivées"],
    ]);
  });
});

test("lireDecisions : répertoire absent ou sans décision ⇒ lève, jamais une liste vide", () => {
  avecRegistre({}, (tmp) => assert.throws(() => lireDecisions(tmp), /introuvable/));
  avecRegistre({ "docs/decisions/README.md": "x" }, (tmp) => assert.throws(() => lireDecisions(tmp), /aucune décision/));
});

test("lireDecision : par son numéro, archivée comprise ; absente ⇒ lève", () => {
  avecRegistre(TROIS, (tmp) => {
    assert.equal(lireDecision(tmp, "D-001").contenu, "# D-001 — un\n");
    assert.equal(lireDecision(tmp, "2").id, "D-002");
    assert.throws(() => lireDecision(tmp, "D-003"), /D-003 absente/);
  });
});

test("arguments : rien, un numéro, --titres ; tout le reste refusé", () => {
  assert.deepEqual(analyserArguments([]), { mode: "tout" });
  assert.deepEqual(analyserArguments(["--titres"]), { mode: "titres" });
  assert.deepEqual(analyserArguments(["D-418"]), { mode: "une", numero: 418 });
  for (const a of [["--json"], ["D-1", "D-2"], ["--titres", "D-1"]]) assert.ok("erreur" in analyserArguments(a), a.join(" "));
});

test("sorties : tout, une, titres ; codes 0, 1, 2", () => {
  avecRegistre(TROIS, (tmp) => {
    const tout = lancer([], tmp);
    assert.equal(tout.code, 0);
    assert.equal(tout.sortie, "# D-010 — dix\n\n# D-002 — deux\n\ncorps deux\n\n# D-001 — un\n");
    assert.equal(lancer(["D-002"], tmp).sortie, "# D-002 — deux\n\ncorps deux\n");
    assert.equal(lancer(["--titres"], tmp).sortie, "D-010 — dix\nD-002 — deux\nD-001 — un (archivée)\n");
    const absente = lancer(["D-003"], tmp);
    assert.equal(absente.code, 1);
    assert.match(absente.erreur, /D-003 absente/);
    assert.equal(lancer(["--json"], tmp).code, 2);
  });
  avecRegistre({}, (tmp) => {
    const r = lancer([], tmp);
    assert.equal(r.code, 2);
    assert.equal(r.sortie, "", "rien n'est écrit sur la sortie standard");
  });
});

test("le dépôt : D-418 se lit par son numéro, et la liste commence au plus haut", () => {
  assert.match(lancer(["D-418"], RACINE).sortie, /^# D-418 — Le registre des décisions passe à un fichier par décision/);
  const titres = lancer(["--titres"], RACINE).sortie.split("\n").filter(Boolean);
  const numeros = titres.map((t) => Number(/^D-(\d+)/.exec(t)[1]));
  assert.deepEqual(numeros, [...numeros].sort((a, b) => b - a));
  assert.ok(numeros.length >= 442);
});
