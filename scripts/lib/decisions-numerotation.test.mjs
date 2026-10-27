// Banc de `scripts/lib/decisions-numerotation.mjs`.
//
// Trois morsures à prouver séparément — doublon, trou sans réservation sur une
// PR, désordre au rang numérique —, la tolérance du trou réservé ou hors PR
// (D-370 §2), et le silence sur l'état réel du dépôt. Un garde qui n'attrape
// que l'une des trois ressemblerait aux deux autres fois où la collision est
// passée.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  auditerDecisions,
  decisionsAjoutees,
  extraireDecisions,
  lireFichier,
  lireReservations,
  FICHIER,
  SEUIL_AFFICHAGE_TROUS,
} from "./decisions-numerotation.mjs";

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
// Sur une PR, un numéro absent est soit en vol — réservé par une autre branche,
// toléré en avertissement —, soit une décision perdue ou un renvoi vers le
// vide. Hors PR, `main` compris, jamais rouge (D-370 §2).

const surPR = (reservations) => ({ surPR: true, reservations: new Set(reservations) });

test("trou sur une PR : un numéro manquant sans réservation est refusé", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(5) + decision(4) + decision(2) + decision(1))), surPR([]));
  assert.ok(genres(r).includes("trou"));
  assert.match(r.violations.find((v) => v.genre === "trou").message, /D-003/);
});

test("trou sur une PR : plusieurs manquants sans réservation sont tous nommés", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(6) + decision(3) + decision(1))), surPR([]));
  const v = r.violations.find((x) => x.genre === "trou");
  assert.match(v.message, /D-002/);
  assert.match(v.message, /D-004/);
  assert.match(v.message, /D-005/);
});

test("trou sur une PR : un trou réservé est toléré, en avertissement « en vol »", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(5) + decision(4) + decision(2) + decision(1))), surPR([3]));
  assert.deepEqual(r.violations, []);
  assert.equal(r.avertissements.length, 1);
  assert.match(r.avertissements[0].message, /D-003 en vol/);
});

test("trou sur une PR : réservé et non réservé se jugent chacun pour soi", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(5) + decision(2) + decision(1))), surPR([3]));
  const v = r.violations.find((x) => x.genre === "trou");
  assert.match(v.message, /D-004/);
  assert.doesNotMatch(v.message, /D-003/);
  assert.match(r.avertissements[0].message, /D-003 en vol/);
});

test("trou sur une PR : réservations illisibles ⇒ refus, jamais un vert présumé", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(3) + decision(1))), {
    surPR: true,
    reservations: null,
    erreurReservations: "HTTP 503",
  });
  const v = r.violations.find((x) => x.genre === "trou");
  assert.match(v.message, /illisibles \(HTTP 503\)/);
});

test("trou hors PR (main, poste local) : jamais rouge, en avertissement", () => {
  const r = auditer(registre(decision(5) + decision(4) + decision(2) + decision(1)));
  assert.deepEqual(r.violations, []);
  assert.equal(r.avertissements.length, 1);
  assert.match(r.avertissements[0].message, /D-003 manque/);
});

test(`trou : à partir de ${SEUIL_AFFICHAGE_TROUS} trous, l'avertissement rappelle la pierre tombale`, () => {
  const deux = auditer(registre(decision(4) + decision(1)));
  assert.doesNotMatch(deux.avertissements[0].message, /pierre tombale/);
  const trois = auditer(registre(decision(5) + decision(1)));
  assert.match(trois.avertissements[0].message, /3 trous.*pierre tombale/);
  // Seuil d'affichage, pas une capacité : rien n'est refusé au-delà.
  assert.deepEqual(auditerDecisions(extraireDecisions(registre(decision(9) + decision(1))), surPR([2, 3, 4, 5, 6, 7, 8])).violations, []);
});

test("trou : la suite pleine à travers les deux sections ne troue pas", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(4) + decision(3), decision(2) + decision(1))), surPR([]));
  assert.deepEqual(genres(r), []);
  assert.deepEqual(r.avertissements, []);
});

test("trou : une pierre tombale ferme le trou d'un numéro réservé puis abandonné", () => {
  const r = auditerDecisions(
    extraireDecisions(registre(decision(3) + decision(2, "Numéro non utilisé") + decision(1))),
    surPR([]),
  );
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.avertissements, []);
});

// ── Morsure 3 : le désordre ─────────────────────────────────────────────────
// La section active est rangée au rang numérique, du plus haut au plus bas
// (D-370 §3). Une entrée insérée au mauvais rang après une résolution de
// conflit ne se voit qu'ici.

test("désordre : une décision insérée sous une plus ancienne est refusée", () => {
  const r = auditer(registre(decision(3) + decision(1) + decision(2)));
  assert.ok(genres(r).includes("désordre"));
  assert.match(r.violations.find((v) => v.genre === "désordre").message, /D-002 suit D-001/);
});

test("désordre : jugé au rang numérique, pas à l'ordre d'arrivée", () => {
  // D-005 mergée avant D-004 (réservée plus tôt, mergée plus tard) : D-004
  // s'insère à son rang, sous D-005 — pas en tête.
  assert.deepEqual(genres(auditer(registre(decision(5) + decision(4) + decision(3)))), []);
  const r = auditer(registre(decision(4) + decision(5) + decision(3)));
  assert.match(r.violations.find((v) => v.genre === "désordre").message, /D-005 suit D-004.*rang numérique/);
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

// Hors PR par défaut : le banc tourne lui-même dans un run `pull_request`, et
// `GITHUB_EVENT_NAME` hérité ferait lire les réservations au garde lancé ici.
function environnement(supplement = {}) {
  const env = { ...process.env, ...supplement };
  if (!("GITHUB_EVENT_NAME" in supplement)) delete env.GITHUB_EVENT_NAME;
  return env;
}

function executer(cwd, args = [], env = environnement()) {
  try {
    const sortie = execFileSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8", stdio: "pipe", env });
    return { code: 0, sortie };
  } catch (e) {
    return { code: e.status, sortie: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function lancer(cwd) {
  return executer(cwd).code;
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

// ── Le trou en exécution : sur une PR, hors PR, et l'accompagnement ─────────
//
// Un faux `gh` sur le PATH tient lieu d'API : il rend les réservations du
// scénario et JOURNALISE chaque appel. C'est ce journal qui prouve que le
// garde ne fait AUCUNE lecture distante hors PR (D-370 §2).

function fauxGh(tmp, reservations, { echec = false } = {}) {
  const dossier = path.join(tmp, "bin");
  fs.mkdirSync(dossier, { recursive: true });
  const journal = path.join(tmp, "appels-gh.log");
  const pages = JSON.stringify([reservations.map((n) => ({ ref: `refs/tags/reserve/D-${String(n).padStart(3, "0")}` }))]);
  fs.writeFileSync(
    path.join(dossier, "gh"),
    [
      "#!/usr/bin/env node",
      `require("node:fs").appendFileSync(${JSON.stringify(journal)}, JSON.stringify(process.argv.slice(2)) + "\\n");`,
      echec ? `process.stderr.write("gh: Service Unavailable (HTTP 503)\\n"); process.exit(1);` : `process.stdout.write(${JSON.stringify(pages)});`,
    ].join("\n"),
    { mode: 0o755 },
  );
  return {
    env: (supplement) => environnement({ PATH: `${dossier}${path.delimiter}${process.env.PATH}`, ...supplement }),
    appels: () => (fs.existsSync(journal) ? fs.readFileSync(journal, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []),
  };
}

function avecRegistre(texte, corps) {
  const tmp = dossierTemporaire();
  try {
    fs.mkdirSync(path.join(tmp, path.dirname(FICHIER)), { recursive: true });
    fs.writeFileSync(path.join(tmp, FICHIER), texte);
    return corps(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const TROUE = registre(decision(4) + decision(2) + decision(1));

// Sur une PR, le garde lit aussi le registre de la base (`HEAD^1`) : un dépôt
// git à deux commits, base puis tête, en tient lieu.
function avecDepot(avant, apres, corps) {
  const tmp = dossierTemporaire();
  try {
    depotGit(tmp, avant, apres);
    execFileSync("git", ["-c", "user.email=banc@example.invalid", "-c", "user.name=banc", "commit", "--allow-empty", "-qam", "tête"], { cwd: tmp, stdio: "pipe" });
    return corps(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const BASE = registre(decision(2) + decision(1));

test("code 0 sur main — un trou s'affiche en avertissement, sans AUCUNE lecture distante", () => {
  avecRegistre(TROUE, (tmp) => {
    const gh = fauxGh(tmp, []);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "push" }));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /D-003 manque/);
    assert.deepEqual(gh.appels(), []);
  });
});

test("code 0 sur une PR — le trou est réservé : avertissement « en vol »", () => {
  avecDepot(BASE, TROUE, (tmp) => {
    const gh = fauxGh(tmp, [3]);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /D-003 en vol/);
    assert.equal(gh.appels().length, 1);
    assert.ok(gh.appels()[0].some((a) => a.includes("matching-refs/tags/reserve/D-")));
  });
});

test("code 1 sur une PR — le trou n'est pas réservé", () => {
  avecDepot(BASE, TROUE, (tmp) => {
    const gh = fauxGh(tmp, [7]);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-003 manque.*sans réservation/);
  });
});

test("code 1 sur une PR — réservations illisibles et trou présent", () => {
  avecDepot(BASE, TROUE, (tmp) => {
    const gh = fauxGh(tmp, [3], { echec: true });
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /illisibles/);
  });
});

test("sur une PR sans trou, aucune lecture distante", () => {
  avecDepot(BASE, registre(decision(2) + decision(1)), (tmp) => {
    const gh = fauxGh(tmp, []);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 0, r.sortie);
    assert.deepEqual(gh.appels(), []);
  });
});

test("code 1 sur une PR — une décision de la base supprimée, même réservée", () => {
  // Une réservation ne se nettoie jamais : sans la base, retirer une décision
  // mergée passerait pour « en vol », à vie (revue wn-reviewer, P1-1).
  avecDepot(registre(decision(3) + decision(2) + decision(1)), registre(decision(3) + decision(1)), (tmp) => {
    const gh = fauxGh(tmp, [2]);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-002 existe sur la base.*décision supprimée/);
  });
});

test("code 1 sur une PR — la décision au numéro le plus haut supprimée, sans trou", () => {
  // Aucun trou n'apparaît : la base se lit quand même (revue CodeRabbit).
  avecDepot(registre(decision(3) + decision(2) + decision(1)), registre(decision(2) + decision(1)), (tmp) => {
    const gh = fauxGh(tmp, [3]);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-003 existe sur la base/);
    assert.deepEqual(gh.appels(), [], "sans trou, les réservations ne se lisent pas");
  });
});

test("sur une PR, une décision déplacée sous « archivées » n'est pas supprimée", () => {
  avecDepot(registre(decision(3) + decision(2) + decision(1)), registre(decision(3) + decision(1), decision(2)), (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, []).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 0, r.sortie);
  });
});

test("code 1 sur une PR — base illisible et trou présent", () => {
  avecRegistre(TROUE, (tmp) => {
    const gh = fauxGh(tmp, [3]);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /illisible sur HEAD\^1/);
  });
});

test("`--pr` au poste local juge le trou comme sur une PR", () => {
  avecRegistre(TROUE, (tmp) => {
    const gh = fauxGh(tmp, []);
    assert.equal(executer(tmp, ["--pr"], gh.env({})).code, 1);
  });
});

test("doublon et désordre restent refusés sur main", () => {
  avecRegistre(registre(decision(2) + decision(2) + decision(1)), (tmp) => {
    assert.equal(executer(tmp, [], environnement({ GITHUB_EVENT_NAME: "push" })).code, 1);
  });
  avecRegistre(registre(decision(1) + decision(2)), (tmp) => {
    assert.equal(executer(tmp, [], environnement({ GITHUB_EVENT_NAME: "push" })).code, 1);
  });
});

// L'accompagnement (D-370 §4) : une décision ajoutée sans réservation est
// signalée, jamais refusée.

test("decisionsAjoutees : les numéros de la tête absents de la base", () => {
  const base = registre(decision(2) + decision(1));
  const tete = registre(decision(4) + decision(3) + decision(2) + decision(1));
  assert.deepEqual(decisionsAjoutees(base, tete).map((d) => d.numero), [4, 3]);
});

function depotGit(tmp, avant, apres) {
  const git = (...a) => execFileSync("git", a, { cwd: tmp, stdio: "pipe", encoding: "utf8" });
  git("init", "-q");
  fs.mkdirSync(path.join(tmp, path.dirname(FICHIER)), { recursive: true });
  fs.writeFileSync(path.join(tmp, FICHIER), avant);
  git("add", ".");
  git("-c", "user.email=banc@example.invalid", "-c", "user.name=banc", "commit", "-qm", "base");
  const base = git("rev-parse", "HEAD").trim();
  fs.writeFileSync(path.join(tmp, FICHIER), apres);
  return base;
}

test("accompagnement : décision ajoutée sans réservation ⇒ avertissement, code 0", () => {
  const tmp = dossierTemporaire();
  try {
    const base = depotGit(tmp, registre(decision(2) + decision(1)), registre(decision(4) + decision(3) + decision(2) + decision(1)));
    const gh = fauxGh(tmp, [3]);
    const r = executer(tmp, ["--accompagnement", base], gh.env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /::warning file=docs\/DECISIONS\.md,line=\d+::D-004 ajouté sans réservation/);
    assert.match(r.sortie, /OK : D-003 réservé/);
    assert.doesNotMatch(r.sortie, /D-003 ajouté sans réservation/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("accompagnement : jamais bloquant, même réservations illisibles ou base absente", () => {
  const tmp = dossierTemporaire();
  try {
    const base = depotGit(tmp, registre(decision(1)), registre(decision(2) + decision(1)));
    const gh = fauxGh(tmp, [], { echec: true });
    const r = executer(tmp, ["--accompagnement", base], gh.env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /::warning::Réservations illisibles/);
    assert.equal(executer(tmp, ["--accompagnement", "0".repeat(40)], gh.env({})).code, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("accompagnement : aucune décision ajoutée ⇒ aucune lecture distante", () => {
  const tmp = dossierTemporaire();
  try {
    const base = depotGit(tmp, registre(decision(1)), registre(decision(1)));
    const gh = fauxGh(tmp, []);
    const r = executer(tmp, ["--accompagnement", base], gh.env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.deepEqual(gh.appels(), []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("lireReservations : aucune réservation ⇒ ensemble vide, sans erreur", () => {
  assert.equal(lireReservations(() => "[[]]").size, 0);
});

test("audit : une décision de la base supprimée est refusée même réservée", () => {
  const r = auditerDecisions(extraireDecisions(registre(decision(3) + decision(1))), {
    surPR: true,
    reservations: new Set([2]),
    surBase: new Set([1, 2, 3]),
  });
  assert.match(r.violations.find((v) => v.genre === "supprimée").message, /D-002 existe sur la base/);
  assert.deepEqual(r.avertissements, []);
});

test("audit : hors PR, le rappel dit « trous », pas « en vol »", () => {
  const r = auditer(registre(decision(5) + decision(1)));
  assert.match(r.avertissements[0].message, /3 trous/);
  assert.doesNotMatch(r.avertissements[0].message, /numéros en vol/);
});

test("lireReservations : toutes les pages, seules les références reserve/D-NNN", () => {
  const pages = [[{ ref: "refs/tags/reserve/D-391" }, { ref: "refs/tags/reserve/D-x" }], [{ ref: "refs/tags/reserve/D-393" }]];
  const appels = [];
  const r = lireReservations((args) => {
    appels.push(args);
    return JSON.stringify(pages);
  });
  assert.deepEqual([...r].sort(), [391, 393]);
  assert.ok(appels[0].includes("--paginate") && appels[0].includes("--slurp"));
});
