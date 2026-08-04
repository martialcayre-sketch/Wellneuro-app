// Banc de `scripts/lib/decisions-numerotation.mjs`.
//
// Trois morsures à prouver séparément — doublon, trou, désordre —, et le
// silence sur l'état réel du dépôt. Un garde qui n'attrape que l'une des trois
// ressemblerait aux deux autres fois où la collision est passée.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { auditerDecisions, extraireDecisions, lireFichier, FICHIER } from "./decisions-numerotation.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, "..", "..");
const SCRIPT = path.join(ICI, "decisions-numerotation.mjs");

function registre(corpsActif, corpsArchive = "") {
  return [
    "# Registre des décisions Wellneuro",
    "",
    "> Append-only. Ajouter une nouvelle décision en tête de la section active.",
    "",
    "## Décisions actives",
    "",
    corpsActif,
    "## Décisions archivées",
    "",
    corpsArchive,
  ].join("\n");
}

function decision(numero, titre = "titre quelconque") {
  return `### D-${String(numero).padStart(3, "0")} — ${titre}\n\n- Date : 2026-08-04\n`;
}

function auditer(texte) {
  return auditerDecisions(extraireDecisions(texte));
}

const genres = (r) => r.violations.map((v) => v.genre);

test("un registre sain ne rend aucune violation", () => {
  const r = auditer(registre(decision(3) + decision(2) + decision(1)));
  assert.deepEqual(r.violations, []);
  assert.equal(r.comptees, 3);
  assert.equal(r.max, 3);
});

// ── Morsure 1 : le doublon ──────────────────────────────────────────────────
// Le défaut d'origine. Deux branches parallèles posent chacune leur décision en
// tête et prennent le même numéro : D-013 le 2026-08-03, D-014 le 2026-08-04.

test("doublon : le même D-NNN porté par deux titres est refusé", () => {
  const r = auditer(registre(decision(14, "côté A") + decision(14, "côté B") + decision(13) + decision(12)));
  assert.ok(genres(r).includes("doublon"));
  const v = r.violations.find((x) => x.genre === "doublon");
  assert.match(v.message, /D-014/);
  assert.match(v.message, /2 décisions/);
});

test("doublon : le constat pointe la SECONDE occurrence, celle à renuméroter", () => {
  const texte = registre(decision(2, "première") + decision(2, "seconde") + decision(1));
  const d = extraireDecisions(texte).filter((x) => x.numero === 2);
  const v = auditerDecisions(extraireDecisions(texte)).violations.find((x) => x.genre === "doublon");
  assert.equal(v.ligne, d[1].ligne);
});

test("doublon : il compte même à cheval sur les deux sections", () => {
  const r = auditer(registre(decision(3) + decision(2), decision(2, "archivée")));
  assert.ok(genres(r).includes("doublon"));
});

// ── Morsure 2 : le trou ─────────────────────────────────────────────────────
// Un numéro absent est soit une décision perdue, soit un renvoi vers le vide.

test("trou : un numéro manquant dans la suite est refusé", () => {
  const r = auditer(registre(decision(5) + decision(4) + decision(2) + decision(1)));
  assert.ok(genres(r).includes("trou"));
  assert.match(r.violations.find((v) => v.genre === "trou").message, /D-003/);
});

test("trou : plusieurs manquants sont tous nommés", () => {
  const r = auditer(registre(decision(6) + decision(3) + decision(1)));
  const v = r.violations.find((x) => x.genre === "trou");
  assert.match(v.message, /D-002/);
  assert.match(v.message, /D-004/);
  assert.match(v.message, /D-005/);
});

test("trou : la suite pleine à travers les deux sections ne troue pas", () => {
  const r = auditer(registre(decision(4) + decision(3), decision(2) + decision(1)));
  assert.deepEqual(genres(r), []);
});

// ── Morsure 3 : le désordre ─────────────────────────────────────────────────
// La section active se lit du plus récent au plus ancien. Une entrée insérée
// au mauvais endroit après une résolution de conflit ne se voit qu'ici.

test("désordre : une décision insérée sous une plus ancienne est refusée", () => {
  const r = auditer(registre(decision(3) + decision(1) + decision(2)));
  assert.ok(genres(r).includes("désordre"));
  assert.match(r.violations.find((v) => v.genre === "désordre").message, /D-002 suit D-001/);
});

test("désordre : la section archivée n'est PAS soumise à l'ordre", () => {
  // Les archives sont un dépôt, pas une pile : leur ordre n'a jamais été tenu.
  const r = auditer(registre(decision(4) + decision(3), decision(1) + decision(2)));
  assert.deepEqual(genres(r), []);
});

test("désordre : deux titres égaux en numéro sortent en doublon, pas en désordre", () => {
  const r = auditer(registre(decision(2) + decision(2) + decision(1)));
  assert.ok(genres(r).includes("doublon"));
  assert.ok(!genres(r).includes("désordre"));
});

// ── Ce que le garde ne fait pas ─────────────────────────────────────────────

test("un titre de niveau 3 qui n'est pas une décision est ignoré", () => {
  const texte = registre(decision(2) + "### Une note quelconque\n\n" + decision(1));
  assert.equal(extraireDecisions(texte).length, 2);
});

test("la section d'appartenance est bien lue", () => {
  const d = extraireDecisions(registre(decision(2), decision(1)));
  assert.equal(d[0].section, "actives");
  assert.equal(d[1].section, "archivées");
});

// ── L'état réel du dépôt ────────────────────────────────────────────────────
// Un garde câblé en CI et dans `npm run check` doit être vert sur ce qu'il
// garde — sinon il sera débranché avant d'avoir servi.

test(`${FICHIER} du dépôt : sans doublon, sans trou, section active en ordre`, () => {
  const texte = lireFichier(RACINE);
  assert.ok(texte !== null, `${FICHIER} introuvable depuis ${RACINE}`);
  const decisions = extraireDecisions(texte);
  assert.ok(decisions.length > 0, "aucune décision lue — le motif de titre a dû dériver");
  assert.deepEqual(auditerDecisions(decisions).violations, []);
});

test("le fichier gardé n'est PAS déclaré merge=union", () => {
  // `union` duplique en silence une ligne modifiée des deux côtés. Sur un
  // fichier dont l'écriture se fait EN TÊTE, ce serait un doublon fabriqué par
  // la fusion elle-même — exactement ce que ce garde existe pour refuser.
  const attributs = fs.readFileSync(path.join(RACINE, ".gitattributes"), "utf8");
  for (const ligne of attributs.split(/\r?\n/)) {
    if (/^\s*#/.test(ligne) || ligne.trim() === "") continue;
    if (ligne.includes("merge=union")) assert.ok(!ligne.includes("DECISIONS"), ligne);
  }
});

// ── Le contrat de code de sortie ────────────────────────────────────────────
//
// Les tests ci-dessus n'exécutent jamais le script : ils appellent ses
// fonctions. Or ce que le CI lit, lui, est un code de retour — et un garde qui
// sortirait `0` sur un fichier absent serait indiscernable d'un registre sain.

function lancer(cwd) {
  try {
    execFileSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8", stdio: "pipe" });
    return 0;
  } catch (e) {
    return e.status;
  }
}

function dossierTemporaire() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wn-decisions-"));
}

test("code 2 — registre absent : contrôle sans objet, refus d'être vert", () => {
  const tmp = dossierTemporaire();
  try {
    assert.equal(lancer(tmp), 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("code 2 — registre présent mais sans aucune décision", () => {
  const tmp = dossierTemporaire();
  try {
    fs.mkdirSync(path.join(tmp, path.dirname(FICHIER)), { recursive: true });
    fs.writeFileSync(path.join(tmp, FICHIER), registre(""));
    assert.equal(lancer(tmp), 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("code 1 — un doublon de numéro", () => {
  const tmp = dossierTemporaire();
  try {
    fs.mkdirSync(path.join(tmp, path.dirname(FICHIER)), { recursive: true });
    fs.writeFileSync(path.join(tmp, FICHIER), registre(decision(1) + decision(1)));
    assert.equal(lancer(tmp), 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("code 0 — le dépôt, depuis sa racine", () => {
  assert.equal(lancer(RACINE), 0);
});

test("code 2 — lancé depuis `web/`, le garde ne trouve rien et le DIT", () => {
  // Le cas courant : les sessions tournent depuis `web/`, où `docs/DECISIONS.md`
  // n'existe pas. Sortir 0 là-bas reviendrait à annoncer un registre sain sans
  // l'avoir ouvert.
  assert.equal(lancer(path.join(RACINE, "web")), 2);
});
