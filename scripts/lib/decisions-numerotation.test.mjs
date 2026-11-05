// Banc de `scripts/lib/decisions-numerotation.mjs`.
//
// Depuis D-418, le registre est un fichier par décision. Les morsures à
// prouver séparément : doublon (actif et archivé), trou sans réservation sur
// une PR, décision supprimée, et la forme — nom canonique, titre accordé au
// nom, une décision par fichier, page fixe sans décision. Puis la tolérance du
// trou réservé ou hors PR (D-370 §2), le refus d'être vert sur un répertoire
// absent ou vide, et le silence sur l'état réel du dépôt.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  auditerDecisions,
  auditerForme,
  decisionsAjoutees,
  decisionsDesEntrees,
  lireEntrees,
  lirePage,
  lireReservations,
  numerosDesChemins,
  numerosDuRegistreUnique,
  SEUIL_AFFICHAGE_TROUS,
} from "./decisions-numerotation.mjs";
import { ARCHIVES, PAGE, REPERTOIRE } from "./registre-decisions.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, "..", "..");
const SCRIPT = path.join(ICI, "decisions-numerotation.mjs");

const nom = (n) => `D-${String(n).padStart(3, "0")}`;

/** Le contenu d'un fichier de décision sain. */
function contenu(n, titre = "titre quelconque") {
  return `# ${nom(n)} — ${titre}\n\n- Date : 2026-11-05\n`;
}

const PAGE_FIXE = "# Registre des décisions Wellneuro\n\n> Page fixe (D-418).\n";

/**
 * Un registre sur disque. `actives` et `archivees` : des numéros, ou
 * `[chemin, contenu]` pour un fichier à la main. `page: null` retire la page.
 */
function ecrireRegistre(racine, { actives = [], archivees = [], page = PAGE_FIXE, sansRepertoire = false } = {}) {
  if (page !== null) {
    fs.mkdirSync(path.join(racine, path.dirname(PAGE)), { recursive: true });
    fs.writeFileSync(path.join(racine, PAGE), page);
  }
  if (sansRepertoire) return;
  fs.rmSync(path.join(racine, REPERTOIRE), { recursive: true, force: true });
  fs.mkdirSync(path.join(racine, REPERTOIRE), { recursive: true });
  const poser = (dossier, x) => {
    const [nomFichier, texte] = Array.isArray(x) ? x : [`${nom(x)}.md`, contenu(x)];
    const absolu = path.join(racine, dossier, nomFichier);
    fs.mkdirSync(path.dirname(absolu), { recursive: true });
    if (texte === "<dossier>") fs.mkdirSync(absolu, { recursive: true });
    else fs.writeFileSync(absolu, texte);
  };
  for (const x of actives) poser(REPERTOIRE, x);
  for (const x of archivees) poser(ARCHIVES, x);
}

function dossierTemporaire() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wn-decisions-"));
}

function avecRegistre(registre, corps) {
  const tmp = dossierTemporaire();
  try {
    ecrireRegistre(tmp, registre);
    return corps(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Audit complet (forme et numérotation) d'un registre sur disque. */
function auditer(registre, contexte = {}) {
  return avecRegistre(registre, (tmp) => {
    const { entrees } = lireEntrees(tmp);
    const forme = auditerForme(entrees, lirePage(tmp));
    const r = auditerDecisions(decisionsDesEntrees(entrees), contexte);
    return { ...r, violations: [...forme, ...r.violations] };
  });
}

const genres = (r) => r.violations.map((v) => v.genre);

// ── La numérotation ─────────────────────────────────────────────────────────

test("un registre sain ne rend aucune violation", () => {
  const r = auditer({ actives: [3, 2, 1] });
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.avertissements, []);
  assert.equal(r.comptees, 3);
  assert.equal(r.max, 3);
});

test("doublon : le même numéro actif ET archivé est refusé, les deux chemins nommés", () => {
  const r = auditer({ actives: [3, 2, 1], archivees: [2] });
  assert.deepEqual(genres(r), ["doublon"]);
  assert.match(r.violations[0].chemin, /docs\/decisions\/D-002\.md/);
  assert.match(r.violations[0].chemin, /archivees\/D-002\.md/);
});

test("trou sur une PR : un numéro manquant sans réservation est refusé", () => {
  const r = auditer({ actives: [4, 2, 1] }, { surPR: true, reservations: new Set() });
  assert.deepEqual(genres(r), ["trou"]);
  assert.match(r.violations[0].message, /D-003 manque/);
});

test("trou sur une PR : plusieurs manquants sans réservation sont tous nommés", () => {
  const r = auditer({ actives: [5, 2, 1] }, { surPR: true, reservations: new Set() });
  assert.match(r.violations[0].message, /D-003, D-004 manquent/);
});

test("trou sur une PR : un trou réservé est toléré, en avertissement « en vol »", () => {
  const r = auditer({ actives: [4, 2, 1] }, { surPR: true, reservations: new Set([3]) });
  assert.deepEqual(r.violations, []);
  assert.match(r.avertissements[0].message, /D-003 en vol/);
});

test("trou sur une PR : réservé et non réservé se jugent chacun pour soi", () => {
  const r = auditer({ actives: [5, 2, 1] }, { surPR: true, reservations: new Set([3]) });
  assert.match(r.avertissements[0].message, /D-003 en vol/);
  assert.match(r.violations[0].message, /D-004 manque/);
  assert.doesNotMatch(r.violations[0].message, /D-003/);
});

test("trou sur une PR : réservations illisibles ⇒ refus, jamais un vert présumé", () => {
  const r = auditer({ actives: [4, 2, 1] }, { surPR: true, reservations: null, erreurReservations: "HTTP 503" });
  assert.deepEqual(genres(r), ["trou"]);
  assert.match(r.violations[0].message, /illisibles \(HTTP 503\)/);
});

test("trou hors PR (main, poste local) : jamais rouge, en avertissement", () => {
  const r = auditer({ actives: [4, 2, 1] });
  assert.deepEqual(r.violations, []);
  assert.match(r.avertissements[0].message, /D-003 manque.*jamais rouge hors PR/);
});

test(`trou : à partir de ${SEUIL_AFFICHAGE_TROUS} trous, l'avertissement rappelle la pierre tombale`, () => {
  const sous = auditer({ actives: [4, 1] });
  assert.doesNotMatch(sous.avertissements[0].message, /pierre tombale/);
  const au = auditer({ actives: [5, 1] });
  assert.match(au.avertissements[0].message, /pierre tombale/);
});

test("trou : la suite pleine à travers actives et archivées ne troue pas", () => {
  const r = auditer({ actives: [3, 1], archivees: [2] }, { surPR: true, reservations: new Set() });
  assert.deepEqual(r.violations, []);
  assert.deepEqual(r.avertissements, []);
});

test("trou : une pierre tombale ferme le trou d'un numéro réservé puis abandonné", () => {
  const r = auditer(
    { actives: [3, ["D-002.md", "# D-002 — Numéro non utilisé\n\n- Date : 2026-11-05\n"], 1] },
    { surPR: true, reservations: new Set() },
  );
  assert.deepEqual(r.violations, []);
});

test("audit : une décision de la base supprimée est refusée même réservée", () => {
  const r = auditer({ actives: [3, 1] }, { surPR: true, reservations: new Set([2]), surBase: new Set([1, 2, 3]) });
  assert.match(r.violations.find((v) => v.genre === "supprimée").message, /D-002 existe sur la base/);
  assert.deepEqual(r.avertissements, []);
});

test("audit : hors PR, le rappel dit « trous », pas « en vol »", () => {
  const r = auditer({ actives: [5, 1] });
  assert.match(r.avertissements[0].message, /3 trous/);
  assert.doesNotMatch(r.avertissements[0].message, /numéros en vol/);
});

// ── La forme (D-418 §1, §5, §6) ─────────────────────────────────────────────

for (const [cas, intrus] of [
  ["un numéro sans zéros de tête", ["D-42.md", contenu(42)]],
  ["un intitulé dans le nom", ["D-004-intitule.md", contenu(4)]],
  ["un zéro de tête en trop", ["D-0004.md", contenu(4)]],
  ["un README", ["README.md", "# Registre\n"]],
  ["un fichier qui n'est pas du markdown", ["D-004.txt", contenu(4)]],
  ["un sous-répertoire", ["brouillons", "<dossier>"]],
]) {
  test(`nom : ${cas} est refusé — le répertoire ne porte que des décisions`, () => {
    const r = auditer({ actives: [3, 2, 1, intrus] });
    assert.deepEqual(genres(r), ["nom"]);
    assert.match(r.violations[0].message, /nommée par son seul numéro/);
  });
}

test("nom : la même règle vaut sous archivees/", () => {
  const r = auditer({ actives: [3, 2, 1], archivees: [["D-7.md", contenu(7)]] });
  assert.deepEqual(genres(r), ["nom"]);
  assert.match(r.violations[0].message, /nom canonique : D-007\.md/);
});

test("nom : un fichier mal nommé ne compte pas comme décision — son numéro reste un trou", () => {
  const r = auditer({ actives: [3, ["D-2.md", contenu(2)], 1] }, { surPR: true, reservations: new Set() });
  assert.deepEqual(genres(r).sort(), ["nom", "trou"]);
});

for (const [cas, texte] of [
  ["absent (fichier vide)", ""],
  ["au niveau de l'ancien registre (###)", "### D-002 — titre\n"],
  ["au numéro d'une autre décision", "# D-003 — titre\n"],
  ["sans zéros de tête", "# D-2 — titre\n"],
  ["sans tiret cadratin ni titre", "# D-002\n"],
  ["précédé d'une ligne", "\n# D-002 — titre\n"],
]) {
  test(`titre : ${cas} est refusé — accordé au nom de fichier`, () => {
    const r = auditer({ actives: [3, ["D-002.md", texte], 1] });
    assert.ok(genres(r).includes("titre"), JSON.stringify(r.violations));
    assert.match(r.violations.find((v) => v.genre === "titre").message, /« # D-002 — <titre> »/);
  });
}

test("une décision par fichier : un second titre de décision est refusé, à sa ligne", () => {
  const r = auditer({ actives: [3, ["D-002.md", `${contenu(2)}\n### D-004 — glissée ici\n`], 1] });
  assert.deepEqual(genres(r), ["une décision par fichier"]);
  assert.match(r.violations[0].chemin, /D-002\.md:5$/);
});

test("une décision par fichier : un renvoi D-NNN dans la prose n'est pas un titre", () => {
  const r = auditer({ actives: [3, ["D-002.md", `${contenu(2)}\nVoir [[D-001]] et D-003 §2.\n## Le terme désigné\n`], 1] });
  assert.deepEqual(r.violations, []);
});

test("page fixe : une décision écrite dans docs/DECISIONS.md est refusée (D-418 §6)", () => {
  const r = auditer({ actives: [2, 1], page: `${PAGE_FIXE}\n### D-003 — écrite au mauvais endroit\n` });
  assert.deepEqual(genres(r), ["page fixe"]);
  assert.match(r.violations[0].message, /page fixe/);
});

test("page fixe : la page supprimée est refusée — des documents datés la citent", () => {
  const r = auditer({ actives: [2, 1], page: null });
  assert.deepEqual(genres(r), ["page fixe"]);
});

// ── Le dépôt réel ───────────────────────────────────────────────────────────

test("le registre du dépôt : sans doublon, sans trou, noms et titres accordés, page fixe", () => {
  const { present, entrees } = lireEntrees(RACINE);
  assert.ok(present, `${REPERTOIRE}/ introuvable`);
  const decisions = decisionsDesEntrees(entrees);
  assert.ok(decisions.length >= 442, `${decisions.length} décisions seulement : registre tronqué ?`);
  assert.deepEqual(auditerForme(entrees, lirePage(RACINE)), []);
  assert.deepEqual(auditerDecisions(decisions).violations, []);
});

test("le registre n'est PAS déclaré merge=union", () => {
  // `union` concatène en silence les deux côtés d'un conflit : deux PR qui
  // créent le même `D-NNN.md` fusionneraient en un fichier à deux titres —
  // le doublon que ce garde existe pour refuser, fabriqué par la fusion.
  const attributs = fs.readFileSync(path.join(RACINE, ".gitattributes"), "utf8");
  for (const ligne of attributs.split(/\r?\n/)) {
    if (/^\s*#/.test(ligne) || ligne.trim() === "") continue;
    if (ligne.includes("merge=union")) assert.ok(!/DECISIONS|docs\/decisions|^\s*(?:\*\*\/)?\*\.md\s/.test(ligne), ligne);
  }
});

// ── Lectures pures ──────────────────────────────────────────────────────────

test("numerosDesChemins : actives et archivees/, rien d'autre", () => {
  assert.deepEqual(
    numerosDesChemins(["D-001.md", "archivees/D-002.md", "D-3.md", "README.md", "brouillons/D-004.md", "archivees/x/D-005.md", "D-006-titre.md"]),
    [1, 2],
  );
});

test("numerosDuRegistreUnique : les titres ### de l'ancien registre, et eux seuls", () => {
  const ancien = "# Registre\n\n## Décisions actives\n\n### D-003 — c\n\nvoir [[D-009]]\n### D-002 — b\n\n## Décisions archivées\n\n### D-001 — a\n";
  assert.deepEqual(numerosDuRegistreUnique(ancien), [3, 2, 1]);
});

test("decisionsAjoutees : les numéros de la tête absents de la base, du plus haut au plus bas", () => {
  const tete = [3, 4, 1, 2].map((n) => ({ numero: n, brut: nom(n), chemin: `${REPERTOIRE}/${nom(n)}.md`, section: "actives" }));
  assert.deepEqual(decisionsAjoutees(new Set([1, 2]), tete).map((d) => d.numero), [4, 3]);
});

test("lireReservations : aucune réservation ⇒ ensemble vide, sans erreur", () => {
  assert.equal(lireReservations(() => "[[]]").size, 0);
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

// ── Le contrat de code de sortie ────────────────────────────────────────────
//
// Les tests ci-dessus n'exécutent jamais le script : ils appellent ses
// fonctions. Or ce que le CI lit, lui, est un code de retour — et un garde qui
// sortirait `0` sur un répertoire absent serait indiscernable d'un registre
// sain.

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

test("code 2 — répertoire absent : contrôle sans objet, refus d'être vert", () => {
  avecRegistre({ sansRepertoire: true }, (tmp) => assert.equal(executer(tmp).code, 2));
});

test("code 2 — répertoire présent mais sans aucune décision", () => {
  avecRegistre({ actives: [["README.md", "# x\n"]] }, (tmp) => {
    const r = executer(tmp);
    assert.equal(r.code, 2, r.sortie);
    assert.match(r.sortie, /Aucune décision lue/);
  });
});

test("code 2 — le registre unique d'avant D-418 seul ne suffit pas : le garde le DIT", () => {
  // Une branche restée sur l'ancienne forme ne passe pas en vert par défaut.
  avecRegistre({ sansRepertoire: true, page: "# R\n\n## Décisions actives\n\n### D-001 — a\n" }, (tmp) => {
    const r = executer(tmp);
    assert.equal(r.code, 2, r.sortie);
    assert.match(r.sortie, /docs\/decisions\/ introuvable/);
  });
});

test("code 1 — un doublon de numéro", () => {
  avecRegistre({ actives: [2, 1], archivees: [1] }, (tmp) => assert.equal(executer(tmp).code, 1));
});

test("code 1 — une décision écrite dans la page fixe", () => {
  avecRegistre({ actives: [2, 1], page: `${PAGE_FIXE}\n### D-003 — ici\n` }, (tmp) => {
    const r = executer(tmp);
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /docs\/DECISIONS\.md:\d+ — .*page fixe/);
  });
});

test("code 0 — le dépôt, depuis sa racine", () => {
  const r = executer(RACINE);
  assert.equal(r.code, 0, r.sortie);
});

test("code 2 — lancé depuis `web/`, le garde ne trouve rien et le DIT", () => {
  // Le cas courant : les sessions tournent depuis `web/`, où `docs/decisions/`
  // n'existe pas. Sortir 0 là-bas reviendrait à annoncer un registre sain sans
  // l'avoir ouvert.
  assert.equal(executer(path.join(RACINE, "web")).code, 2);
});

// ── Le trou en exécution : sur une PR, hors PR, et l'accompagnement ─────────
//
// Un faux `gh` sur le PATH tient lieu d'API : il rend les réservations du
// scénario et JOURNALISE chaque appel. C'est ce journal qui prouve que le
// garde ne fait AUCUNE lecture distante hors PR (D-370 §2).

function fauxGh(tmp, reservations, { echec = false } = {}) {
  const dossier = path.join(tmp, "..", `${path.basename(tmp)}-bin`);
  fs.mkdirSync(dossier, { recursive: true });
  const journal = path.join(dossier, "appels-gh.log");
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

const gitBanc = (tmp, ...a) =>
  execFileSync("git", ["-c", "user.email=banc@example.invalid", "-c", "user.name=banc", ...a], { cwd: tmp, stdio: "pipe", encoding: "utf8" });

/** Un dépôt à deux commits — base, puis tête — et `corps(tmp)` sur la tête. */
function avecDepot(avant, apres, corps) {
  const tmp = dossierTemporaire();
  try {
    gitBanc(tmp, "init", "-q");
    if (typeof avant === "string") {
      fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
      fs.writeFileSync(path.join(tmp, PAGE), avant);
    } else ecrireRegistre(tmp, avant);
    gitBanc(tmp, "add", "-A");
    gitBanc(tmp, "commit", "-qm", "base");
    const base = gitBanc(tmp, "rev-parse", "HEAD").trim();
    ecrireRegistre(tmp, apres);
    gitBanc(tmp, "add", "-A");
    gitBanc(tmp, "commit", "--allow-empty", "-qm", "tête");
    return corps(tmp, base);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(`${tmp}-bin`, { recursive: true, force: true });
  }
}

const BASE = { actives: [2, 1] };
const TROUE = { actives: [4, 2, 1] };

test("code 0 sur main — un trou s'affiche en avertissement, sans AUCUNE lecture distante", () => {
  avecRegistre(TROUE, (tmp) => {
    const gh = fauxGh(tmp, []);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "push" }));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /D-003 manque/);
    assert.deepEqual(gh.appels(), []);
    fs.rmSync(`${tmp}-bin`, { recursive: true, force: true });
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
    const r = executer(tmp, [], fauxGh(tmp, [7]).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-003 manque.*sans réservation/);
  });
});

test("code 1 sur une PR — réservations illisibles et trou présent", () => {
  avecDepot(BASE, TROUE, (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, [3], { echec: true }).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /illisibles/);
  });
});

test("sur une PR sans trou, aucune lecture distante", () => {
  avecDepot(BASE, { actives: [3, 2, 1] }, (tmp) => {
    const gh = fauxGh(tmp, []);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 0, r.sortie);
    assert.deepEqual(gh.appels(), []);
  });
});

test("code 1 sur une PR — une décision de la base supprimée, même réservée", () => {
  // Une réservation ne se nettoie jamais : sans la base, retirer une décision
  // mergée passerait pour « en vol », à vie (revue wn-reviewer, P1-1).
  avecDepot({ actives: [3, 2, 1] }, { actives: [3, 1] }, (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, [2]).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-002 existe sur la base.*décision supprimée/);
  });
});

test("code 1 sur une PR — la décision au numéro le plus haut supprimée, sans trou", () => {
  // Aucun trou n'apparaît : la base se lit quand même (revue CodeRabbit).
  avecDepot({ actives: [3, 2, 1] }, BASE, (tmp) => {
    const gh = fauxGh(tmp, [3]);
    const r = executer(tmp, [], gh.env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-003 existe sur la base/);
    assert.deepEqual(gh.appels(), [], "sans trou, les réservations ne se lisent pas");
  });
});

test("sur une PR, une décision déplacée sous archivees/ n'est pas supprimée", () => {
  avecDepot({ actives: [3, 2, 1] }, { actives: [3, 1], archivees: [2] }, (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, []).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 0, r.sortie);
  });
});

test("sur une PR dont la base est le registre UNIQUE d'avant D-418 : ses numéros font la base", () => {
  // La PR de bascule elle-même, ou une branche partie avant.
  const ancien = "# R\n\n## Décisions actives\n\n### D-003 — c\n\n### D-002 — b\n\n### D-001 — a\n\n## Décisions archivées\n";
  avecDepot(ancien, { actives: [3, 2, 1] }, (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, []).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 0, r.sortie);
  });
  avecDepot(ancien, { actives: [3, 1] }, (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, [2]).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /D-002 existe sur la base/);
  });
});

test("code 1 sur une PR — base illisible (hors dépôt git)", () => {
  avecRegistre(TROUE, (tmp) => {
    const r = executer(tmp, [], fauxGh(tmp, [3]).env({ GITHUB_EVENT_NAME: "pull_request" }));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /illisible sur HEAD\^1/);
    fs.rmSync(`${tmp}-bin`, { recursive: true, force: true });
  });
});

test("`--pr` au poste local : la base est l'ancêtre commun avec origin/main", () => {
  // `origin/main` a reçu D-003 après la création de la branche, arrêtée à
  // D-002 : rien n'a été supprimé par la branche (revue CodeRabbit de #1743).
  avecDepot(BASE, BASE, (tmp) => {
    gitBanc(tmp, "checkout", "-q", "-b", "principale", "HEAD^1");
    ecrireRegistre(tmp, { actives: [3, 2, 1] });
    gitBanc(tmp, "add", "-A");
    gitBanc(tmp, "commit", "-qm", "D-003 sur main");
    gitBanc(tmp, "update-ref", "refs/remotes/origin/main", "HEAD");
    gitBanc(tmp, "checkout", "-q", "-");
    const r = executer(tmp, ["--pr"], fauxGh(tmp, []).env({}));
    assert.equal(r.code, 0, r.sortie);
  });
});

test("`--pr` au poste local : base illisible ⇒ refus, pas un vert", () => {
  avecRegistre(BASE, (tmp) => {
    const r = executer(tmp, ["--pr"], fauxGh(tmp, []).env({}));
    assert.equal(r.code, 1, r.sortie);
    assert.match(r.sortie, /non vérifiable/);
    fs.rmSync(`${tmp}-bin`, { recursive: true, force: true });
  });
});

test("`--pr` au poste local juge le trou comme sur une PR", () => {
  avecDepot(BASE, TROUE, (tmp) => {
    gitBanc(tmp, "update-ref", "refs/remotes/origin/main", "HEAD^1");
    assert.equal(executer(tmp, ["--pr"], fauxGh(tmp, []).env({})).code, 1);
  });
});

test("doublon, nom, titre et page fixe restent refusés sur main", () => {
  const surMain = environnement({ GITHUB_EVENT_NAME: "push" });
  for (const registre of [
    { actives: [2, 1], archivees: [2] },
    { actives: [2, 1, ["D-3.md", contenu(3)]] },
    { actives: [2, ["D-001.md", "# D-002 — mauvais numéro\n"]] },
    { actives: [2, 1], page: `${PAGE_FIXE}### D-003 — ici\n` },
  ]) {
    avecRegistre(registre, (tmp) => assert.equal(executer(tmp, [], surMain).code, 1, JSON.stringify(registre)));
  }
});

// L'accompagnement (D-370 §4) : une décision ajoutée sans réservation est
// signalée, jamais refusée.

test("accompagnement : décision ajoutée sans réservation ⇒ avertissement sur son fichier, code 0", () => {
  avecDepot(BASE, { actives: [4, 3, 2, 1] }, (tmp, base) => {
    const r = executer(tmp, ["--accompagnement", base], fauxGh(tmp, [3]).env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /::warning file=docs\/decisions\/D-004\.md,line=1::D-004 ajouté sans réservation/);
    assert.match(r.sortie, /OK : D-003 réservé/);
    assert.doesNotMatch(r.sortie, /D-003 ajouté sans réservation/);
  });
});

test("accompagnement : la base d'avant D-418 se lit aussi", () => {
  const ancien = "# R\n\n## Décisions actives\n\n### D-001 — a\n";
  avecDepot(ancien, { actives: [2, 1] }, (tmp, base) => {
    const r = executer(tmp, ["--accompagnement", base], fauxGh(tmp, []).env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /D-002 ajouté sans réservation/);
    assert.doesNotMatch(r.sortie, /D-001 ajouté/);
  });
});

test("accompagnement : jamais bloquant, même réservations illisibles ou base absente", () => {
  avecDepot({ actives: [1] }, { actives: [2, 1] }, (tmp, base) => {
    const gh = fauxGh(tmp, [], { echec: true });
    const r = executer(tmp, ["--accompagnement", base], gh.env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /::warning::Réservations illisibles/);
    assert.equal(executer(tmp, ["--accompagnement", "0".repeat(40)], gh.env({})).code, 0);
  });
});

test("accompagnement : aucune décision ajoutée ⇒ aucune lecture distante", () => {
  avecDepot({ actives: [1] }, { actives: [1] }, (tmp, base) => {
    const gh = fauxGh(tmp, []);
    const r = executer(tmp, ["--accompagnement", base], gh.env({}));
    assert.equal(r.code, 0, r.sortie);
    assert.deepEqual(gh.appels(), []);
  });
});
