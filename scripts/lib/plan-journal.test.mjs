// Banc de `scripts/lib/plan-journal.mjs` et de `scripts/wn-plan-bascule.mjs`
// (D-371 §2, fiche H90).
//
// Ce qu'il protège : la bascule ne perd, ne réordonne ni ne réécrit aucune
// ligne du plan — reconstruire(basculer(P)) === P à l'octet près, sur une
// copie du plan réel et sur des cas fabriqués —, et RIEN ne s'écrit sans
// `--ecrire`. Tout se joue dans un dossier temporaire : le dépôt n'est
// jamais écrit.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyserFiches,
  basculer,
  JOURNAL,
  journalDepuisFragments,
  ligneDeRenvoi,
  lireFiche,
  lireJournal,
  PLAN,
  reconstruire,
  slug,
} from "./plan-journal.mjs";
import { principal } from "../wn-plan-bascule.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function temp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "plan-journal-"));
}

/** Instantané d'un dossier : chemin relatif → contenu. */
function instantane(dossier) {
  const out = {};
  const marcher = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) marcher(p);
      else out[path.relative(dossier, p)] = fs.readFileSync(p, "utf8");
    }
  };
  marcher(dossier);
  return out;
}

const muet = { log: () => {}, error: () => {} };

function allerRetour(texte) {
  const r = basculer(texte);
  assert.deepEqual(r.refus, []);
  return { r, reconstruit: reconstruire(r.plan, journalDepuisFragments(r.fragments)) };
}

/** Lignes « Mise à jour » hors des fiches, dans l'ordre. */
function majsHorsFiche(texte) {
  const lignes = texte.split("\n");
  const dansFiche = new Set();
  for (const f of analyserFiches(lignes)) for (let i = f.titre; i < f.fin; i++) dansFiche.add(i);
  return lignes.filter((l, i) => !dansFiche.has(i) && l.includes("Mise à jour"));
}

// ── Le plan réel ────────────────────────────────────────────────────────────

const PLAN_REEL = fs.readFileSync(path.join(RACINE, PLAN), "utf8");
// Après la bascule, le plan réel porte ses renvois : l'aller-retour se juge
// alors sur le plan reconstruit de son journal, ce qui reste la même
// propriété.
const DEJA_BASCULE = analyserFiches(PLAN_REEL.split("\n")).some((f) => f.renvois.length > 0);
const PLAN_COMPLET = DEJA_BASCULE ? reconstruire(PLAN_REEL, lireJournal(path.join(RACINE, JOURNAL))) : PLAN_REEL;

test("plan réel : reconstruire(basculer(P)) === P, à l'octet près", () => {
  const { r, reconstruit } = allerRetour(PLAN_COMPLET);
  assert.ok(r.fragments.length >= 100, `seulement ${r.fragments.length} fragments — le découpage ne lit plus le plan`);
  assert.ok(Buffer.from(reconstruit).equals(Buffer.from(PLAN_COMPLET)));
});

test("plan réel : les lignes « Mise à jour » hors fiche restent en place, et aucune n'est sortie", () => {
  const { r } = allerRetour(PLAN_COMPLET);
  const avant = majsHorsFiche(PLAN_COMPLET);
  assert.ok(avant.length >= 5, "le plan réel n'a plus de mise à jour hors fiche — banc sans objet");
  assert.deepEqual(majsHorsFiche(r.plan), avant);
  for (const f of r.fragments) assert.match(f.contenu, /^- \*\*Mise à jour \(/);
});

test("plan réel : chaque fiche porte une seule ligne de renvoi, sauf les écartées, intactes", () => {
  const { r } = allerRetour(PLAN_COMPLET);
  const apres = analyserFiches(r.plan.split("\n"));
  const ecartees = new Set(r.ecartees.map((e) => e.fiche));
  const avant = new Map(analyserFiches(PLAN_COMPLET.split("\n")).map((f) => [f.id, f]));
  const lignesAvant = PLAN_COMPLET.split("\n");
  const lignesApres = r.plan.split("\n");
  for (const f of apres) {
    if (ecartees.has(f.id)) {
      assert.equal(f.renvois.length, 0, `${f.id} écartée a reçu un renvoi`);
      const a = avant.get(f.id);
      assert.deepEqual(lignesApres.slice(f.titre, f.fin), lignesAvant.slice(a.titre, a.fin), `${f.id} écartée a changé`);
    } else {
      assert.equal(f.renvois.length, 1, `${f.id} : ${f.renvois.length} renvois`);
      assert.equal(f.majs.length, 0, `${f.id} garde une mise à jour en ligne`);
    }
  }
});

// Après la bascule (2026-10-28, H90 PR 2), une « Mise à jour » s'écrit en
// fragment, jamais dans la fiche (`.claude/rules/docs-changelog.md`). Seules
// les quatre fiches écartées gardent leurs mises à jour en ligne — leur
// nombre à la bascule, ni plus, toutes avant leur éventuel renvoi. Ce banc
// bloque : il ne retire rien, la tolérance du garde (D-371 §3) ne le vise pas.
const ECARTEES_A_LA_BASCULE = new Map([["F44", 4], ["H26", 9], ["H49", 6], ["F79", 3]]);

function majsEnLigneInterdites(texte) {
  const ecarts = [];
  for (const f of analyserFiches(texte.split("\n"))) {
    if (ECARTEES_A_LA_BASCULE.has(f.id)) {
      const gelees = ECARTEES_A_LA_BASCULE.get(f.id);
      if (f.majs.length > gelees) ecarts.push(`${f.id} : ${f.majs.length} mises à jour en ligne, ${gelees} à la bascule — l'écrire en fragment`);
      if (f.renvois.length > 0) for (const m of f.majs) if (m.debut > f.renvois[0]) ecarts.push(`${f.id} : mise à jour en ligne après le renvoi (ligne ${m.debut + 1})`);
      continue;
    }
    if (f.renvois.length === 0) ecarts.push(`${f.id} : fiche sans ligne de renvoi`);
    for (const m of f.majs) ecarts.push(`${f.id} : mise à jour en ligne (ligne ${m.debut + 1}) — l'écrire en fragment`);
  }
  return ecarts;
}

test("plan réel basculé : aucune « Mise à jour » écrite dans une fiche, et chaque fiche a son renvoi", { skip: !DEJA_BASCULE }, () => {
  assert.deepEqual(majsEnLigneInterdites(PLAN_REEL), []);
  // Le banc voit une mise à jour ajoutée à la main, avant ou après le renvoi.
  const lignes = PLAN_REEL.split("\n");
  const h90 = analyserFiches(lignes).find((f) => f.id === "H90");
  const maj = "- **Mise à jour (2026-10-29, en ligne)** : écrite dans la fiche.";
  for (const ou of [h90.renvois[0], h90.renvois[0] + 1]) {
    const copie = [...lignes.slice(0, ou), maj, ...lignes.slice(ou)].join("\n");
    assert.ok(majsEnLigneInterdites(copie).some((e) => e.startsWith("H90 : mise à jour en ligne")), `insertion ligne ${ou + 1} non vue`);
  }
  // Une fiche écartée n'en reçoit pas davantage en ligne, même avant un renvoi.
  const h49 = analyserFiches(lignes).find((f) => f.id === "H49");
  const ou = h49.majs.at(-1).fin + 1;
  const copie = [...lignes.slice(0, ou), maj, ...lignes.slice(ou)].join("\n");
  assert.ok(majsEnLigneInterdites(copie).some((e) => e.startsWith("H49 : 7 mises à jour en ligne")), "ajout en ligne dans H49 non vu");
});

test("journal réel : un couple date-rang n'apparaît qu'une fois par fiche, quel que soit le slug", () => {
  const doublons = [];
  for (const [id, liste] of lireJournal(path.join(RACINE, JOURNAL))) {
    const vus = new Set();
    for (const { nom } of liste) {
      const cle = nom.slice(0, 13);
      if (vus.has(cle)) doublons.push(`${id}/${nom}`);
      vus.add(cle);
    }
  }
  assert.deepEqual(doublons, [], "rang déjà pris ce jour-là : renuméroter le fragment non encore mergé");
});

test("plan réel : bascule écrite sur une copie, reconstituée depuis le disque à l'octet près", () => {
  const d = temp();
  const plan = path.join(d, "PLAN.md");
  const journal = path.join(d, "plan-journal");
  fs.writeFileSync(plan, PLAN_COMPLET);
  assert.equal(principal(["--plan", plan, "--journal", journal, "--ecrire"], muet), 0);
  const relu = reconstruire(fs.readFileSync(plan, "utf8"), lireJournal(journal));
  assert.ok(Buffer.from(relu).equals(Buffer.from(PLAN_COMPLET)));
  // Rejouée, elle refuse : la bascule se joue une fois.
  const apres = instantane(d);
  assert.equal(principal(["--plan", plan, "--journal", journal, "--ecrire"], muet), 1);
  assert.deepEqual(instantane(d), apres);
});

// ── Rien ne s'écrit sans le drapeau ─────────────────────────────────────────

test("à blanc (sans --ecrire) : aucun fichier créé ni modifié", () => {
  const d = temp();
  const plan = path.join(d, "PLAN.md");
  fs.writeFileSync(plan, PLAN_COMPLET);
  const avant = instantane(d);
  assert.equal(principal(["--plan", plan, "--journal", path.join(d, "plan-journal")], muet), 0);
  assert.deepEqual(instantane(d), avant);
  assert.equal(fs.existsSync(path.join(d, "plan-journal")), false);
});

test("argument inconnu, ou --plan sans --journal : usage, rien n'est écrit", () => {
  const d = temp();
  const plan = path.join(d, "PLAN.md");
  fs.writeFileSync(plan, FABRIQUE);
  const avant = instantane(d);
  assert.equal(principal(["--plan", plan, "--journal", path.join(d, "j"), "--ecrir"], muet), 2);
  assert.equal(principal(["--plan", plan, "--ecrire"], muet), 2);
  assert.equal(principal(["--journal", path.join(d, "j"), "--ecrire"], muet), 2);
  assert.equal(principal(["--plan"], muet), 2);
  assert.deepEqual(instantane(d), avant);
});

test("un journal déjà présent, pour toute fiche (avec mises à jour, sans, ou écartée) : refus avant toute écriture", () => {
  for (const fiche of ["H02", "H01", "F01"]) {
    const d = temp();
    const plan = path.join(d, "PLAN.md");
    const journal = path.join(d, "plan-journal");
    fs.writeFileSync(plan, FABRIQUE);
    fs.mkdirSync(path.join(journal, fiche), { recursive: true });
    fs.writeFileSync(path.join(journal, fiche, "2026-10-01-01-mise-a-jour.md"), "autre\n");
    const avant = instantane(d);
    assert.equal(principal(["--plan", plan, "--journal", journal, "--ecrire"], muet), 1, fiche);
    assert.deepEqual(instantane(d), avant, fiche);
  }
});

test("--plan dans le dépôt et --journal hors de lui (ou l'inverse) : usage, rien n'est écrit", () => {
  const d = temp();
  const avant = instantane(d);
  assert.equal(principal(["--plan", path.join(RACINE, PLAN), "--journal", path.join(d, "j"), "--ecrire"], muet), 2);
  assert.equal(principal(["--plan", path.join(d, "P.md"), "--journal", path.join(RACINE, JOURNAL), "--ecrire"], muet), 2);
  assert.deepEqual(instantane(d), avant);
});

test("mise à jour après un paragraphe de groupe dans la plage d'une fiche : fiche écartée, ligne en place", () => {
  const texte = "#### H01 · a\n- **Rang** : 1.\n\n**File D : gestes du responsable**\n\n- **Mise à jour (2026-10-01, file D)** : du groupe.\n";
  const { r, reconstruit } = allerRetour(texte);
  assert.equal(reconstruit, texte);
  assert.equal(r.plan, texte);
  assert.match(r.ecartees[0].motifs[0], /hors de la suite des puces de tête/);
});

test("date hors du calendrier : fiche écartée, jamais un nom de fragment", () => {
  const texte = "#### H01 · a\n- **Rang** : 1.\n- **Mise à jour (2026-02-30)** : impossible.\n";
  const { r, reconstruit } = allerRetour(texte);
  assert.equal(reconstruit, texte);
  assert.equal(r.fragments.length, 0);
  assert.match(r.ecartees[0].motifs[0], /hors du calendrier/);
});

test("plan absent : code 2 ; journal illisible sous --ecrire : code 1, rien n'est écrit", () => {
  const d = temp();
  assert.equal(principal(["--plan", path.join(d, "absent.md"), "--journal", path.join(d, "j")], muet), 2);
  const plan = path.join(d, "PLAN.md");
  fs.writeFileSync(plan, FABRIQUE);
  fs.mkdirSync(path.join(d, "j", "divers"), { recursive: true });
  const avant = instantane(d);
  assert.equal(principal(["--plan", plan, "--journal", path.join(d, "j"), "--ecrire"], muet), 1);
  assert.deepEqual(instantane(d), avant);
});

test("plus de 99 mises à jour le même jour : fiche écartée, aller-retour exact", () => {
  const majs = Array.from({ length: 100 }, (_, i) => `- **Mise à jour (2026-10-01)** : ${i}.`).join("\n");
  const texte = `#### H01 · a\n- **Rang** : 1.\n${majs}\n`;
  const { r, reconstruit } = allerRetour(texte);
  assert.equal(reconstruit, texte);
  assert.match(r.ecartees[0].motifs.join(" "), /100 mises à jour/);
});

test("plan en CRLF et sans fin de ligne finale : aller-retour exact", () => {
  const texte = FABRIQUE.replace(/\n/g, "\r\n").replace(/\r\n$/, "");
  assert.equal(allerRetour(texte).reconstruit, texte);
});

// ── Cas fabriqués ───────────────────────────────────────────────────────────

const FABRIQUE = `# Plan

**Mise à jour (2026-10-01)** : en-tête, hors fiche.

## §2 La séquence

- **Mise à jour (2026-10-02)** : puce hors fiche, sous un titre de section.

#### H01 · Fiche sans mise à jour
- **Identifiant, piste** : a.
- **Critère de fin** : b,
  sur deux lignes.

**File D : gestes du responsable**

#### H02 · Fiche aux mises à jour multiples
- **Rang** : 1.
- **Mise à jour (2026-10-03)** : une ligne.
- **Mise à jour (2026-10-05, lot de code)** : sur plusieurs lignes :
  - premier point ;
  - second point.

  | a | b |
  |---|---|
  | 1 | 2 |

  Reste le constat.
- **Mise à jour (2026-10-05, e-mail envoyé ; correction)** : même jour, libellé qui se trierait avant.
- **Mise à jour (2026-10-06), libellé après la parenthèse** : forme de H86.

#### F01 · Fiche écartée, date en recul
- **Mise à jour (2026-10-09)** : d'abord.
- **Mise à jour (2026-10-08)** : ensuite, plus ancien.

#### F02 · Fiche écartée, mises à jour non contiguës
- **Mise à jour (2026-10-01)** : au milieu des champs.
- **Critère de fin** : c.
- **Mise à jour (2026-10-02)** : à la fin.

### Rang 1

Mise à jour (2026-10-07) : paragraphe hors fiche.
`;

test("fabriqué : aller-retour exact", () => {
  const { reconstruit } = allerRetour(FABRIQUE);
  assert.equal(reconstruit, FABRIQUE);
});

test("fabriqué : fiche sans mise à jour — renvoi après sa dernière puce, aucun fragment", () => {
  const { r } = allerRetour(FABRIQUE);
  assert.ok(r.plan.includes(`  sur deux lignes.\n${ligneDeRenvoi("H01")}\n\n**File D`));
  assert.equal(r.fragments.filter((f) => f.fiche === "H01").length, 0);
});

test("fabriqué : mise à jour sur plusieurs lignes, liste et tableau compris, en un seul fragment", () => {
  const { r } = allerRetour(FABRIQUE);
  const h02 = r.fragments.filter((f) => f.fiche === "H02");
  assert.equal(h02.length, 4);
  assert.equal(
    h02[1].contenu,
    "- **Mise à jour (2026-10-05, lot de code)** : sur plusieurs lignes :\n  - premier point ;\n  - second point.\n\n  | a | b |\n  |---|---|\n  | 1 | 2 |\n\n  Reste le constat.\n",
  );
  assert.ok(r.plan.includes(`- **Rang** : 1.\n${ligneDeRenvoi("H02")}\n\n#### F01`));
});

test("fabriqué : deux mises à jour le même jour gardent leur ordre, quel que soit le libellé", () => {
  const { r } = allerRetour(FABRIQUE);
  const noms = r.fragments.filter((f) => f.fiche === "H02").map((f) => f.nom);
  assert.deepEqual(noms, [
    "2026-10-03-01-mise-a-jour.md",
    "2026-10-05-01-lot-de-code.md",
    "2026-10-05-02-e-mail-envoye-correction.md",
    "2026-10-06-01-libelle-apres-la-parenthese.md",
  ]);
  // Le tri du journal (ordre des noms) rend l'ordre du plan.
  assert.deepEqual(journalDepuisFragments(r.fragments).get("H02").map((f) => f.nom), noms);
});

test("fabriqué : lignes « Mise à jour » hors fiche, sous toutes leurs formes, en place", () => {
  const { r } = allerRetour(FABRIQUE);
  assert.deepEqual(majsHorsFiche(r.plan), majsHorsFiche(FABRIQUE));
  assert.equal(majsHorsFiche(FABRIQUE).length, 3);
});

test("fabriqué : fiches irrégulières écartées, intactes, nommées", () => {
  const { r } = allerRetour(FABRIQUE);
  assert.deepEqual(
    r.ecartees.map((e) => e.fiche),
    ["F01", "F02"],
  );
  assert.match(r.ecartees[0].motifs[0], /date en recul/);
  assert.match(r.ecartees[1].motifs[0], /non contiguës/);
  const bloc = (t, debut, fin) => t.slice(t.indexOf(debut), t.indexOf(fin));
  assert.equal(bloc(r.plan, "#### F01", "### Rang 1"), bloc(FABRIQUE, "#### F01", "### Rang 1"));
});

test("refus global : bascule déjà jouée, ou fiche en double — rien n'est découpé", () => {
  const { r } = allerRetour(FABRIQUE);
  const rejouee = basculer(r.plan);
  assert.equal(rejouee.plan, null);
  assert.match(rejouee.refus.join("\n"), /déjà posée/);
  const double = basculer("#### H01 · a\n- **Rang** : 1.\n\n#### H01 · b\n- **Rang** : 2.\n");
  assert.equal(double.plan, null);
  assert.match(double.refus.join("\n"), /en double/);
});

test("reconstruire refuse un journal sans ligne de renvoi : un fragment ne se perd pas en silence", () => {
  const journal = new Map([["H09", [{ nom: "2026-10-01-01-x.md", contenu: "- **Mise à jour (2026-10-01)** : x.\n" }]]]);
  assert.throws(() => reconstruire(FABRIQUE, journal), /H09 : aucune ligne de renvoi/);
});

test("reconstruire refuse deux renvois dans une fiche, ou un renvoi vers une autre fiche", () => {
  const deux = `#### H01 · a\n${ligneDeRenvoi("H01")}\n${ligneDeRenvoi("H01")}\n`;
  assert.throws(() => reconstruire(deux, new Map()), /2 lignes de renvoi/);
  const autre = `#### H01 · a\n${ligneDeRenvoi("H02")}\n`;
  assert.throws(() => reconstruire(autre, new Map()), /renvoi vers H02/);
});

test("un fragment ajouté après la bascule se lit à sa place, et un fragment sans fin de ligne aussi", () => {
  const { r } = allerRetour(FABRIQUE);
  const journal = journalDepuisFragments([
    ...r.fragments,
    { fiche: "H01", nom: "2026-10-28-01-premiere.md", contenu: "- **Mise à jour (2026-10-28)** : neuve." },
  ]);
  const fiche = lireFiche(r.plan, journal, "H01");
  assert.equal(
    fiche,
    "#### H01 · Fiche sans mise à jour\n- **Identifiant, piste** : a.\n- **Critère de fin** : b,\n  sur deux lignes.\n- **Mise à jour (2026-10-28)** : neuve.\n\n**File D : gestes du responsable**\n",
  );
});

test("lireJournal : nom non conforme ou entrée inattendue refusés ; README racine admis ; dossier absent = vide", () => {
  const d = temp();
  assert.equal(lireJournal(path.join(d, "absent")).size, 0);
  fs.writeFileSync(path.join(d, "README.md"), "lisez-moi\n");
  fs.mkdirSync(path.join(d, "H01"));
  fs.writeFileSync(path.join(d, "H01", "2026-10-02-01-b.md"), "b\n");
  fs.writeFileSync(path.join(d, "H01", "2026-10-01-02-a.md"), "a\n");
  fs.writeFileSync(path.join(d, "H01", "2026-10-01-01-z.md"), "z\n");
  assert.deepEqual(lireJournal(d).get("H01").map((f) => f.nom), ["2026-10-01-01-z.md", "2026-10-01-02-a.md", "2026-10-02-01-b.md"]);
  fs.writeFileSync(path.join(d, "H01", "2026-02-30-01-impossible.md"), "x\n");
  assert.throws(() => lireJournal(d), /hors du calendrier/);
  fs.rmSync(path.join(d, "H01", "2026-02-30-01-impossible.md"));
  for (const nom of ["note.md", "2026-10-01-sans-rang.md"]) {
    fs.writeFileSync(path.join(d, "H01", nom), "x\n");
    assert.throws(() => lireJournal(d), /non conforme/, nom);
    fs.rmSync(path.join(d, "H01", nom));
  }
  fs.writeFileSync(path.join(d, "H01", "2026-10-03-01-titre.md"), "- **Mise à jour (2026-10-03)** : a\n#### H99 · Fantôme\n");
  assert.throws(() => lireJournal(d), /ligne de titre/);
  fs.rmSync(path.join(d, "H01", "2026-10-03-01-titre.md"));
  fs.mkdirSync(path.join(d, "divers"));
  assert.throws(() => lireJournal(d), /entrée inattendue/);
});

test("slug : ASCII, sans accent, borné, jamais vide", () => {
  assert.equal(slug("étiquetage en lot, D-325"), "etiquetage-en-lot-d-325");
  assert.equal(slug("« Mes échanges »"), "mes-echanges");
  assert.equal(slug(null), "mise-a-jour");
  assert.equal(slug("« »"), "mise-a-jour");
  const long = slug("état des gestes et chaîne besoin → leviers, D-338, et encore bien plus long");
  assert.ok(long.length <= 48 && !long.endsWith("-"), long);
});
