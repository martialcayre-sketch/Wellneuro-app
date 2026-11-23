// Banc de `scripts/wn-reserver-source.mjs` (piège « réservation WN-SRC »,
// partie 13), sur un faux `gh`. Aucune référence réelle n'est créée : ni
// réseau, ni jeton.
//
// La boucle de réservation est celle des décisions, et son banc
// (`wn-reserver-decision.test.mjs`) en prouve les issues. Ce banc prouve ce
// qui est propre aux sources, de bout en bout : le maximum se lit dans le
// registre des sources de la tête de `main` (en brut), les réservations sous
// `refs/tags/reserve/WN-SRC-`, la référence porte le numéro à quatre chiffres,
// et un registre en défaut sur `main` n'est pas un maximum.

import { test } from "node:test";
import assert from "node:assert/strict";

import { apiSources, principal } from "./wn-reserver-source.mjs";

const SHA = "b".repeat(40);

const registre = (ids) => JSON.stringify(ids.map((sourceId) => ({ sourceId, title: "fixture" })));
const ids = (...n) => n.map((x) => `WN-SRC-${String(x).padStart(4, "0")}`);
const refPage = (noms) => noms.map((nom) => ({ ref: `refs/tags/reserve/${nom}`, object: { sha: SHA } }));

/**
 * Un faux `gh` : rend la tête de `main`, le registre brut, les pages de
 * réservations ; enregistre chaque POST. `refus` donne, par référence, le
 * message d'échec de sa création.
 */
function fauxGh({ texte = registre(ids(851, 852, 853)), pages = [[]], refus = {}, pannes = {} } = {}) {
  const appels = [];
  const posts = [];
  const gh = (args) => {
    appels.push(args);
    const cible = args.find((a) => a.startsWith("repos/")) ?? "";
    if (args.includes("POST")) {
      const ref = args.find((a) => a.startsWith("ref="))?.slice(4);
      const sha = args.find((a) => a.startsWith("sha="))?.slice(4);
      posts.push({ ref, sha });
      if (refus[ref]) throw Object.assign(new Error("gh a échoué"), { stderr: refus[ref] });
      return JSON.stringify({ ref });
    }
    if (cible === "repos/{owner}/{repo}/commits/main") {
      if (pannes.main) throw Object.assign(new Error("x"), { stderr: pannes.main });
      return JSON.stringify({ sha: SHA });
    }
    if (cible.startsWith("repos/{owner}/{repo}/contents/docs/claude/corpus/source_registry.json")) {
      if (pannes.registre) throw Object.assign(new Error("x"), { stderr: pannes.registre });
      return texte;
    }
    if (cible === "repos/{owner}/{repo}/git/matching-refs/tags/reserve/WN-SRC-") {
      if (pannes.reservations) throw Object.assign(new Error("x"), { stderr: pannes.reservations });
      return JSON.stringify(pages);
    }
    throw new Error(`appel inattendu : ${args.join(" ")}`);
  };
  return { gh, appels, posts };
}

function lancer(argv, faux) {
  const sorties = [];
  const log = console.log;
  const err = console.error;
  console.log = (...a) => sorties.push(a.join(" "));
  console.error = (...a) => sorties.push(a.join(" "));
  try {
    const code = principal(argv, apiSources(faux.gh));
    return { code, sortie: sorties.join("\n") };
  } finally {
    console.log = log;
    console.error = err;
  }
}

test("crée la référence du premier numéro au-dessus du registre de main, à quatre chiffres", () => {
  const faux = fauxGh();
  const r = lancer([], faux);
  assert.equal(r.code, 0);
  assert.deepEqual(faux.posts, [{ ref: "refs/tags/reserve/WN-SRC-0854", sha: SHA }]);
  assert.match(r.sortie, /✓ WN-SRC-0854 réservé/);
});

test("le registre se lit en brut, sur la tête de main lue", () => {
  const faux = fauxGh();
  lancer([], faux);
  const lecture = faux.appels.find((a) => a.some((x) => x.includes("source_registry.json")));
  assert.ok(lecture.includes("Accept: application/vnd.github.raw+json"), "lecture brute : le fichier frôle 1 Mo");
  assert.ok(lecture.some((x) => x.endsWith(`?ref=${SHA}`)), "lu à la tête de main, pas à la branche par défaut implicite");
});

test("le maximum est celui du registre, pas la dernière notice ni le nombre de notices", () => {
  const faux = fauxGh({ texte: registre(ids(12, 900, 40)) });
  lancer([], faux);
  assert.equal(faux.posts[0].ref, "refs/tags/reserve/WN-SRC-0901");
});

test("saute les numéros réservés, toutes pages de réservations comprises", () => {
  const faux = fauxGh({ pages: [refPage(ids(854)), refPage(ids(856))] });
  const r = lancer(["--nombre", "2"], faux);
  assert.equal(r.code, 0);
  assert.deepEqual(
    faux.posts.map((p) => p.ref),
    ["refs/tags/reserve/WN-SRC-0855", "refs/tags/reserve/WN-SRC-0857"],
  );
});

test("une réservation hors forme ou d'un autre préfixe ne compte pas", () => {
  const faux = fauxGh({ pages: [[{ ref: "refs/tags/reserve/WN-SRC-854" }, { ref: "refs/tags/reserve/WN-SRC-00854" }]] });
  lancer([], faux);
  assert.equal(faux.posts[0].ref, "refs/tags/reserve/WN-SRC-0854");
});

test("« déjà existante » (course) ⇒ numéro suivant ; tout autre refus ⇒ code 3, un seul POST", () => {
  const course = fauxGh({ refus: { "refs/tags/reserve/WN-SRC-0854": "gh: Reference already exists (HTTP 422)" } });
  const r1 = lancer([], course);
  assert.equal(r1.code, 0);
  assert.deepEqual(course.posts.map((p) => p.ref), ["refs/tags/reserve/WN-SRC-0854", "refs/tags/reserve/WN-SRC-0855"]);
  assert.match(r1.sortie, /WN-SRC-0854 déjà réservé par ailleurs/);

  const panne = fauxGh({ refus: { "refs/tags/reserve/WN-SRC-0854": "gh: Object does not exist (HTTP 422)" } });
  const r2 = lancer([], panne);
  assert.equal(r2.code, 3);
  assert.equal(panne.posts.length, 1);
  assert.match(r2.sortie, /WN-SRC-0854 : issue inconnue/);
});

test("registre en défaut sur main (doublon) ⇒ code 2, aucun POST", () => {
  const faux = fauxGh({ texte: registre(ids(851, 853, 853)) });
  const r = lancer([], faux);
  assert.equal(r.code, 2);
  assert.equal(faux.posts.length, 0);
  assert.match(r.sortie, /en double/);
});

test("registre illisible, vide ou absent sur main ⇒ code 2, aucun POST", () => {
  for (const options of [{ texte: "{pas du json" }, { texte: "[]" }, { pannes: { registre: "gh: Not Found (HTTP 404)" } }]) {
    const faux = fauxGh(options);
    const r = lancer([], faux);
    assert.equal(r.code, 2, JSON.stringify(options));
    assert.equal(faux.posts.length, 0);
  }
});

test("réservations illisibles ⇒ code 2, aucun POST", () => {
  const faux = fauxGh({ pannes: { reservations: "gh: Service Unavailable (HTTP 503)" } });
  const r = lancer([], faux);
  assert.equal(r.code, 2);
  assert.equal(faux.posts.length, 0);
});

test("usage : argument inconnu ⇒ code 2, rien tenté", () => {
  const faux = fauxGh();
  const r = lancer(["--essai"], faux);
  assert.equal(r.code, 2);
  assert.equal(faux.appels.length, 0);
});
