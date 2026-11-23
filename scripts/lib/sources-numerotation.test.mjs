// Banc du garde `scripts/lib/sources-numerotation.mjs` (piège « réservation
// WN-SRC », partie 13). Hermétique : registres fabriqués, lectures de base et
// de réservations injectées ; de bout en bout, le script sur un répertoire
// temporaire (hors PR) et sur un dépôt git temporaire avec commit de fusion
// (en PR, CI et `--pr`), un faux `gh` en tête du `PATH` — aucun réseau.
//
// Les morsures à prouver séparément : le doublon est refusé ; une forme hors
// canon est refusée ; un registre vide, absent ou illisible n'est jamais
// vert ; sur une PR, une source ajoutée sans réservation est signalée, et
// seulement en avertissement ; une source couverte par une réservation, ou
// présente sur la base, ne l'est pas (la réservation n'a pas de titulaire :
// le garde ne vérifie pas qu'elle est celle de la PR) ; hors PR, aucune
// lecture distante ; les réservations ne se lisent que s'il y a une source
// ajoutée ; la base se lit réellement par `git show` sur `HEAD^1` (CI) ou
// l'ancêtre commun avec `origin/main` (`--pr`).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  auditerRegistre,
  controler,
  lireReservationsSources,
  nomSource,
  numeroSource,
  referenceSource,
  sourcesAjoutees,
} from "./sources-numerotation.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "sources-numerotation.mjs");

const registre = (...n) => JSON.stringify(n.map((x) => ({ sourceId: typeof x === "number" ? nomSource(x) : x })));

function interdit(nom) {
  return () => {
    throw new Error(`${nom} ne doit pas être appelé`);
  };
}

// ── Forme ───────────────────────────────────────────────────────────────────

test("numeroSource : quatre chiffres au moins, sans zéro de tête en trop", () => {
  assert.equal(numeroSource("WN-SRC-0854"), 854);
  assert.equal(numeroSource("WN-SRC-10000"), 10000);
  for (const faux of ["WN-SRC-854", "WN-SRC-00854", "wn-src-0854", "WN-SRC-0854 ", "SRC-0854", null, 854]) {
    assert.equal(numeroSource(faux), null, String(faux));
  }
  assert.equal(nomSource(7), "WN-SRC-0007");
  assert.equal(referenceSource(854), "refs/tags/reserve/WN-SRC-0854");
});

// ── Refus, partout ──────────────────────────────────────────────────────────

test("doublon de sourceId ⇒ refus (code 1), sans aucune lecture distante", () => {
  const r = controler({ texte: registre(851, 852, 852), surPR: true, lireBase: interdit("lireBase"), lireReservations: interdit("lireReservations") });
  assert.equal(r.code, 1);
  assert.match(r.erreurs.join("\n"), /WN-SRC-0852 en double \(notices 1 et 2\)/);
});

test("sourceId hors forme ou manquant ⇒ refus", () => {
  for (const texte of [registre(851, "WN-SRC-852"), JSON.stringify([{ sourceId: "WN-SRC-0851" }, { title: "sans id" }])]) {
    const r = controler({ texte, surPR: false });
    assert.equal(r.code, 1, texte);
    assert.match(r.erreurs.join("\n"), /hors de la forme WN-SRC-NNNN/);
  }
});

test("registre illisible ou qui n'est pas une liste ⇒ refus", () => {
  assert.equal(controler({ texte: "{pas du json", surPR: false }).code, 1);
  assert.equal(controler({ texte: JSON.stringify({ sourceId: "WN-SRC-0001" }), surPR: false }).code, 1);
});

test("registre absent ou vide ⇒ code 2, jamais vert", () => {
  assert.equal(controler({ texte: null, surPR: false }).code, 2);
  assert.equal(controler({ texte: "[]", surPR: false }).code, 2);
});

test("registre sain hors PR ⇒ 0, et rien n'est lu à distance", () => {
  const r = controler({ texte: registre(851, 853), surPR: false, lireBase: interdit("lireBase"), lireReservations: interdit("lireReservations") });
  assert.equal(r.code, 0);
  assert.match(r.sorties.at(-1), /OK : 2 notices, jusqu'à WN-SRC-0853/);
});

// ── Sur une PR : avertissement seul ─────────────────────────────────────────

test("PR : source ajoutée sans réservation ⇒ avertissement, code 0", () => {
  const r = controler({
    texte: registre(851, 852, 853, 854),
    surPR: true,
    enCI: true,
    lireBase: () => registre(851, 852, 853),
    lireReservations: () => new Set(),
  });
  assert.equal(r.code, 0);
  const avertissements = r.sorties.filter((s) => s.startsWith("::warning"));
  assert.equal(avertissements.length, 1);
  assert.match(avertissements[0], /^::warning file=docs\/claude\/corpus\/source_registry\.json::WN-SRC-0854 ajouté sans réservation/);
  assert.match(avertissements[0], /wn-reserver-source\.mjs/);
});

test("PR : source ajoutée et réservée ⇒ aucun avertissement", () => {
  const r = controler({
    texte: registre(851, 854),
    surPR: true,
    lireBase: () => registre(851),
    lireReservations: () => new Set([854]),
  });
  assert.equal(r.code, 0);
  assert.ok(r.sorties.some((s) => s === "OK : une réservation existe pour WN-SRC-0854 (son titulaire n'est pas vérifié)."));
  assert.ok(!r.sorties.some((s) => s.startsWith("⚠")));
});

test("PR : une source qui comble un trou n'est pas renvoyée au script, qui ne rend jamais ce numéro", () => {
  const r = controler({
    texte: registre(851, 852, 860),
    surPR: true,
    lireBase: () => registre(851, 860),
    lireReservations: () => new Set(),
  });
  assert.equal(r.code, 0);
  const avert = r.sorties.filter((s) => s.startsWith("⚠"));
  assert.equal(avert.length, 1);
  assert.match(avert[0], /WN-SRC-0852 ajouté sans réservation, sous le maximum de la base \(WN-SRC-0860\)/);
  assert.doesNotMatch(avert[0], /wn-reserver-source/);
});

test("PR : chaque source ajoutée se juge seule (une réservée, une non)", () => {
  const r = controler({
    texte: registre(851, 854, 855),
    surPR: true,
    lireBase: () => registre(851),
    lireReservations: () => new Set([855]),
  });
  const avert = r.sorties.filter((s) => s.startsWith("⚠"));
  assert.equal(avert.length, 1);
  assert.match(avert[0], /WN-SRC-0854/);
});

test("PR : aucune source ajoutée ⇒ les réservations ne se lisent pas", () => {
  const r = controler({ texte: registre(851, 852), surPR: true, lireBase: () => registre(851, 852), lireReservations: interdit("lireReservations") });
  assert.equal(r.code, 0);
});

test("PR : une source présente sur la base n'est pas « ajoutée », même déplacée dans la liste", () => {
  const r = controler({ texte: registre(852, 851), surPR: true, lireBase: () => registre(851, 852), lireReservations: interdit("lireReservations") });
  assert.equal(r.code, 0);
});

test("PR : base ou réservations illisibles ⇒ avertissement, jamais rouge", () => {
  const sansBase = controler({ texte: registre(851, 854), surPR: true, lireBase: () => null, lireReservations: interdit("lireReservations") });
  assert.equal(sansBase.code, 0);
  assert.match(sansBase.sorties.join("\n"), /registre illisible sur la base/);

  const baseQuiCasse = controler({
    texte: registre(851, 854),
    surPR: true,
    lireBase: () => {
      throw new Error("fatal: invalid object name");
    },
    lireReservations: interdit("lireReservations"),
  });
  assert.equal(baseQuiCasse.code, 0);

  const sansReservations = controler({
    texte: registre(851, 854),
    surPR: true,
    lireBase: () => registre(851),
    lireReservations: () => {
      throw Object.assign(new Error("x"), { stderr: "gh: Service Unavailable (HTTP 503)" });
    },
  });
  assert.equal(sansReservations.code, 0);
  assert.match(sansReservations.sorties.join("\n"), /réservations illisibles \(gh: Service Unavailable \(HTTP 503\)\) : WN-SRC-0854 non vérifiées/);
});

test("PR : un doublon reste un refus, avant toute lecture de la base", () => {
  const r = controler({ texte: registre(851, 854, 854), surPR: true, lireBase: interdit("lireBase"), lireReservations: interdit("lireReservations") });
  assert.equal(r.code, 1);
});

// ── Lectures ────────────────────────────────────────────────────────────────

test("auditerRegistre et sourcesAjoutees", () => {
  assert.deepEqual(auditerRegistre(registre(3, 1, 2)).numeros, [3, 1, 2]);
  assert.deepEqual(sourcesAjoutees(new Set([1, 2]), [1, 2, 5, 3]), [5, 3]);
});

test("lireReservationsSources : toutes pages, forme canonique seule", () => {
  let args = null;
  const pages = [
    [{ ref: "refs/tags/reserve/WN-SRC-0854" }, { ref: "refs/tags/reserve/WN-SRC-855" }],
    [{ ref: "refs/tags/reserve/WN-SRC-0856" }, { ref: "refs/tags/reserve/D-0856" }],
  ];
  const n = lireReservationsSources((a) => {
    args = a;
    return JSON.stringify(pages);
  });
  assert.deepEqual([...n].sort(), [854, 856]);
  assert.ok(args.includes("--paginate") && args.includes("--slurp"));
  assert.ok(args.includes("repos/{owner}/{repo}/git/matching-refs/tags/reserve/WN-SRC-"));
});

// ── Bout en bout, dépôt temporaire ──────────────────────────────────────────

test("bout en bout : le script refuse un doublon (1) et passe un registre sain (0)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wn-sources-num-"));
  try {
    const fichier = path.join(dir, "docs/claude/corpus/source_registry.json");
    fs.mkdirSync(path.dirname(fichier), { recursive: true });
    const env = { ...process.env, GITHUB_EVENT_NAME: "", GITHUB_ACTIONS: "" };
    const jouer = () => {
      try {
        execFileSync("node", [SCRIPT], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
        return 0;
      } catch (e) {
        return e.status;
      }
    };
    fs.writeFileSync(fichier, registre(1, 2, 2));
    assert.equal(jouer(), 1);
    fs.writeFileSync(fichier, registre(1, 2, 3));
    assert.equal(jouer(), 0);
    fs.rmSync(fichier);
    assert.equal(jouer(), 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Un dépôt git temporaire : `main` porte 851 à 853, la branche ajoute 854
 * (sans réservation) et 855 (réservée) ; `HEAD` est le commit de fusion de la
 * PR, comme en CI (`HEAD^1` = tête de la base). `origin/main` pointe sur la
 * base, pour `--pr`. Un faux `gh` rend la seule réservation de 855.
 */
function depotDePR() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wn-sources-pr-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  const fichier = path.join(dir, "docs/claude/corpus/source_registry.json");
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  g("init", "-q", "-b", "main");
  g("config", "user.email", "banc@example.invalid");
  g("config", "user.name", "banc");
  g("config", "commit.gpgsign", "false");
  fs.writeFileSync(fichier, registre(851, 852, 853));
  g("add", ".");
  g("commit", "-q", "-m", "base");
  g("update-ref", "refs/remotes/origin/main", "HEAD");
  g("switch", "-q", "-c", "pr");
  fs.writeFileSync(fichier, registre(851, 852, 853, 854, 855));
  g("commit", "-q", "-am", "ajout");
  g("switch", "-q", "main");
  g("merge", "-q", "--no-ff", "-m", "fusion", "pr");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh\necho '[[{"ref":"refs/tags/reserve/WN-SRC-0855"}]]'\n`,
    { mode: 0o755 },
  );
  const jouer = (args, envPlus) => {
    const env = { ...process.env, GITHUB_EVENT_NAME: "", GITHUB_ACTIONS: "", PATH: `${bin}:${process.env.PATH}`, ...envPlus };
    try {
      return { code: 0, sortie: execFileSync("node", [SCRIPT, ...args], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }) };
    } catch (e) {
      return { code: e.status, sortie: `${e.stdout ?? ""}${e.stderr ?? ""}` };
    }
  };
  return { dir, jouer };
}

test("bout en bout, en CI de PR : la base se lit sur HEAD^1, 854 averti, 855 couvert, code 0", () => {
  const { dir, jouer } = depotDePR();
  try {
    const r = jouer([], { GITHUB_EVENT_NAME: "pull_request", GITHUB_ACTIONS: "true" });
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /::warning file=docs\/claude\/corpus\/source_registry\.json::WN-SRC-0854 ajouté sans réservation/);
    assert.match(r.sortie, /une réservation existe pour WN-SRC-0855/);
    assert.doesNotMatch(r.sortie, /registre illisible sur la base/);
    assert.doesNotMatch(r.sortie, /WN-SRC-085[1-3] ajouté/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("bout en bout, au poste avec --pr : la base est l'ancêtre commun avec origin/main", () => {
  const { dir, jouer } = depotDePR();
  try {
    const r = jouer(["--pr"], {});
    assert.equal(r.code, 0, r.sortie);
    assert.match(r.sortie, /⚠ WN-SRC-0854 ajouté sans réservation/);
    assert.doesNotMatch(r.sortie, /registre illisible sur la base/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("bout en bout, hors PR : aucune lecture de la base ni des réservations", () => {
  const { dir, jouer } = depotDePR();
  try {
    const r = jouer([], { PATH: `/nonexistent:${process.env.PATH}` });
    assert.equal(r.code, 0, r.sortie);
    assert.doesNotMatch(r.sortie, /réservation|ajouté/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("bout en bout : un argument inconnu ⇒ code 2", () => {
  const { dir, jouer } = depotDePR();
  try {
    assert.equal(jouer(["--accompagnement"], {}).code, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
