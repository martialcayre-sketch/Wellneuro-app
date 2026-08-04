// Banc de `scripts/lib/skill-cross-invocation.mjs`.
//
// Ce banc porte d'abord **les six branchements morts** que les deux versions
// précédentes du garde ont laissés passer sous un CI vert : les étapes 5/6/7 de
// `wn-lot` et l'étape 6 de `wn-finish`. Ils sont recopiés ici à l'identique,
// avec leur numérotation d'étape et leur absence totale de verbe — une
// numérotation d'étape EST un impératif, et c'est précisément ce qu'une
// détection par liste de verbes ne pouvait pas voir. Un garde réécrit qui ne
// les attrape pas n'a rien réglé.
//
// Il prouve ensuite que le marqueur `<!-- mention-seule: wn-x -->` — le seul
// moyen d'éteindre un constat — fonctionne, qu'il ne vaut que pour la CIBLE
// qu'il nomme, et qu'il se refuse dès qu'il ne déclare rien : forme ancienne
// sans cible, ou cible nommée absente de la ligne.

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  auditerSkills,
  estInvocableParLeModele,
  lireSkills,
  marqueursDeLigne,
  porteLeMarqueur,
  referencesDeSkill,
  separerFrontmatter,
} from "./skill-cross-invocation.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, "..", "..");
const SCRIPT = path.join(ICI, "skill-cross-invocation.mjs");

const NON_INVOCABLE = "---\ndescription: cible\ndisable-model-invocation: true\n---\n\n# cible\n";
const INVOCABLE = "---\ndescription: cible exposée\n---\n\n# cible\n";

/** Les cibles non invocables nommées, plus la source à auditer. */
function dossier(corpsSource, ciblesMortes = ["wn-review"], nomSource = "wn-lot") {
  const skills = ciblesMortes.map((nom) => ({ nom, texte: NON_INVOCABLE }));
  // Frontmatter de TROIS lignes, sans ligne vide après : la première ligne du
  // corps est donc la ligne 4 du fichier. Les constats désignent le numéro du
  // FICHIER — c'est ce qu'on ouvre pour corriger.
  skills.push({ nom: nomSource, texte: `---\ndescription: source\n---\n${corpsSource}` });
  return skills;
}

/** Lignes du frontmatter que `dossier()` pose devant chaque corps. */
const DECALAGE = 3;

const reperes = (r) => r.violations.map((v) => `${v.cible}@${v.ligne}`);

// ── Les six branchements morts, recopiés à l'identique ──────────────────────

const SIX_BRANCHEMENTS = [
  {
    ou: "wn-lot étape 5 — Revue",
    source: "wn-lot",
    ligne: "5. **Revue** — `/wn-review` (fork `Explore`) pour Docs/UI/API ; `Agent(wn-reviewer)`",
    attendues: ["wn-review"],
  },
  {
    ou: "wn-lot étape 6 — clôture",
    source: "wn-lot",
    ligne: "6. **Clôture** — `/wn-finish` : statut du lot, entrée `SESSION_LOG`, et les deux",
    attendues: ["wn-finish"],
  },
  {
    ou: "wn-lot étape 6 — handoff",
    source: "wn-lot",
    ligne: "   puis `/wn-handoff write`. Les deux **avant** l'étape 7, sur la branche",
    attendues: ["wn-handoff"],
  },
  {
    ou: "wn-lot étape 7 — PR et merge",
    source: "wn-lot",
    ligne: "7. **PR** — `/wn-pr` puis `/wn-merge`, selon le régime de `CLAUDE.md`.",
    attendues: ["wn-pr", "wn-merge"],
  },
  {
    ou: "wn-finish étape 6 — handoff",
    source: "wn-finish",
    ligne: "6. Étape suivante : `/wn-handoff write`, dans la foulée et sur la même branche.",
    attendues: ["wn-handoff"],
  },
];

for (const cas of SIX_BRANCHEMENTS) {
  test(`branchement mort attrapé — ${cas.ou}`, () => {
    const r = auditerSkills(dossier(cas.ligne, cas.attendues, cas.source));
    assert.deepEqual(
      r.violations.map((v) => v.cible).sort(),
      [...cas.attendues].sort(),
      `non attrapé : ${cas.ligne}`,
    );
  });
}

test("les six comptés ensemble : six constats, pas cinq", () => {
  // L'étape 7 en porte deux sur une seule ligne — un constat par CIBLE, sinon
  // corriger `/wn-pr` masquerait `/wn-merge`.
  const attendu = SIX_BRANCHEMENTS.reduce((n, c) => n + c.attendues.length, 0);
  assert.equal(attendu, 6);
  const obtenu = SIX_BRANCHEMENTS.reduce(
    (n, c) => n + auditerSkills(dossier(c.ligne, c.attendues, c.source)).violations.length,
    0,
  );
  assert.equal(obtenu, 6);
});

// ── Le fail-closed lui-même ─────────────────────────────────────────────────

test("aucun verbe d'invocation ne sauve plus une référence nue", () => {
  // La règle des deux versions précédentes : pas de verbe dans les 90
  // caractères amont ⟹ pas de constat. C'est ce trou-là qu'on ferme.
  assert.deepEqual(reperes(auditerSkills(dossier("| Revue | `/wn-review` |"))), [`wn-review@${DECALAGE + 1}`]);
});

test("une référence isolée sur sa ligne, sans phrase autour, est un constat", () => {
  assert.equal(auditerSkills(dossier("`/wn-review`")).violations.length, 1);
});

test("une interdiction n'éteint plus rien toute seule : elle se déclare comme le reste", () => {
  // Ancien comportement : une marque de prohibition en tête de paragraphe
  // taisait le constat. Le garde ne devine plus l'intention — la déclarer coûte
  // un marqueur, qui se relit en diff.
  const nue = auditerSkills(dossier("**Interdit aux étapes qui suivent : réinvoquer `/wn-review`.**"));
  assert.equal(nue.violations.length, 1);
  const marquee = auditerSkills(
    dossier("**Interdit : réinvoquer `/wn-review`.** <!-- mention-seule: wn-review -->"),
  );
  assert.deepEqual(marquee.violations, []);
  assert.equal(marquee.marquees, 1);
});

// ── Le marqueur, qui nomme sa cible ─────────────────────────────────────────

test("une mention en prose portant le marqueur ne remonte pas", () => {
  const r = auditerSkills(
    dossier("Le skill `/wn-review` s'invoque à la main. <!-- mention-seule: wn-review -->"),
  );
  assert.deepEqual(r.violations, []);
  assert.equal(r.marquees, 1);
});

test("le marqueur dans une cellule de tableau compte", () => {
  const r = auditerSkills(
    dossier("| demande une revue de diff | `/wn-review` <!-- mention-seule: wn-review -->|"),
  );
  assert.deepEqual(r.violations, []);
});

test("un marqueur nomme plusieurs cibles, séparées par des virgules", () => {
  const r = auditerSkills(
    dossier("`/wn-pr` puis `/wn-merge`, à la main. <!-- mention-seule: wn-pr, wn-merge -->", [
      "wn-pr",
      "wn-merge",
    ]),
  );
  assert.deepEqual(r.violations, []);
  assert.equal(r.marquees, 2);
});

// ── MORSURE 3 — le marqueur d'une cellule n'éteint plus l'autre ─────────────

test("marqueur d'une cellule : la SECONDE cible de la ligne reste un constat", () => {
  // Le cas mesuré en revue, recopié du tableau de classes de `wn-lot` : un
  // marqueur posé au bout de la ligne pour la cellule « Garde particulier »
  // éteignait la cellule « Revue », qui prescrivait `/wn-review`. Ce test
  // échouerait sur la version « un marqueur vaut pour la ligne ».
  const ligne =
    "| **Docs** | `sonnet` | T1 | `/wn-review` | fragment `changelog.d/` et `/wn-pr` " +
    "<!-- mention-seule: wn-pr -->|";
  const r = auditerSkills(dossier(ligne, ["wn-review", "wn-pr"]));
  assert.deepEqual(reperes(r), [`wn-review@${DECALAGE + 1}`]);
  assert.equal(r.marquees, 1);
});

// ── MORSURE 1 — la forme ancienne, sans cible, est refusée ──────────────────

test("un marqueur sans cible est un constat : le blanc-seing de ligne ne revient pas", () => {
  const r = auditerSkills(dossier("Le skill `/wn-review` s'invoque à la main. <!-- mention-seule -->"));
  const genres = r.violations.map((v) => v.genre).sort();
  assert.deepEqual(genres, ["marqueur-sans-cible", "reference"]);
  assert.equal(r.marquees, 0);
});

// ── MORSURE 2 — une cible nommée absente de la ligne est refusée ────────────

test("nommer une cible absente de la ligne est un constat", () => {
  const r = auditerSkills(
    dossier("Le skill `/wn-review` s'invoque à la main. <!-- mention-seule: wn-review, wn-merge -->", [
      "wn-review",
      "wn-merge",
    ]),
  );
  assert.deepEqual(
    r.violations.map((v) => v.genre),
    ["cible-absente"],
  );
});

test("le marqueur ne déborde pas sur la ligne suivante", () => {
  const r = auditerSkills(
    dossier("`/wn-review` marqué. <!-- mention-seule: wn-review -->\n`/wn-review` non marqué."),
  );
  assert.deepEqual(reperes(r), [`wn-review@${DECALAGE + 2}`]);
});

test("le marqueur tolère les espaces et la barre oblique de la cible, et rien d'autre", () => {
  assert.equal(porteLeMarqueur("x <!--mention-seule:wn-review-->", "wn-review"), true);
  assert.equal(porteLeMarqueur("x <!--   mention-seule :  wn-review  -->", "wn-review"), true);
  assert.equal(porteLeMarqueur("x <!-- mention-seule: /wn-review -->", "wn-review"), true);
  assert.equal(porteLeMarqueur("x <!-- mention-seule: wn-review -->", "wn-pr"), false);
  assert.equal(porteLeMarqueur("x <!-- mention seule: wn-review -->", "wn-review"), false);
  assert.equal(porteLeMarqueur("x mention-seule: wn-review", "wn-review"), false);
  assert.deepEqual(marqueursDeLigne("x <!-- mention-seule -->")[0].cibles, []);
});

test("la cible nommée dans le marqueur n'est pas elle-même lue comme une référence", () => {
  // Sinon `<!-- mention-seule: /wn-review -->` s'auto-justifierait : le
  // marqueur créerait la référence qu'il prétend exempter.
  const refs = referencesDeSkill("Rien ici. <!-- mention-seule: /wn-review -->");
  assert.deepEqual(refs, []);
});

// ── Ce que le garde ne regarde pas ──────────────────────────────────────────

test("une cible exposée à l'outil Skill ne remonte pas", () => {
  const skills = [
    { nom: "wn-reprompt", texte: INVOCABLE },
    { nom: "wn-lot", texte: "---\ndescription: source\n---\n\n1. **Cadrage** — `/wn-reprompt`." },
  ];
  assert.deepEqual(auditerSkills(skills).violations, []);
});

test("s'auto-citer ne demande aucune invocation", () => {
  const skills = [
    { nom: "wn-review", texte: `${NON_INVOCABLE}\nCe skill, \`/wn-review\`, relit un diff.` },
  ];
  assert.deepEqual(auditerSkills(skills).violations, []);
});

test("une cible inconnue du dépôt n'est pas notre affaire", () => {
  assert.deepEqual(auditerSkills(dossier("Voir `/model opusplan` et `/clear`.")).violations, []);
});

test("le frontmatter n'est pas scanné : une description peut nommer une cible", () => {
  const skills = [
    { nom: "wn-review", texte: NON_INVOCABLE },
    { nom: "wn-lot", texte: "---\ndescription: enchaîne sur /wn-review\n---\n\nCorps sans référence.\n" },
  ];
  assert.deepEqual(auditerSkills(skills).violations, []);
});

test("le drapeau cité en commentaire YAML ne rend pas une cible morte", () => {
  const texte =
    "---\ndescription: exposé\n# EXCEPTION DÉLIBÉRÉE : pas de disable-model-invocation: true ici\n---\n\n# x\n";
  assert.equal(estInvocableParLeModele(texte), true);
  assert.equal(estInvocableParLeModele(NON_INVOCABLE), false);
});

// ── MORSURE 4 — les quatre formes qui rendaient « invocable » ───────────────
//
// Mesurées en revue le 2026-08-04 : chacune rendait la cible hors périmètre,
// donc tout branchement vers elle devenait vert. Les deux premières sont les
// plus dangereuses — le dépôt pratique DÉJÀ la convention du commentaire
// délibéré autour de ce drapeau, et un BOM ne se voit dans aucun diff.

for (const [nom, frontmatter] of [
  ["commentaire de fin de ligne", "disable-model-invocation: true # volontaire"],
  ["valeur entre guillemets", 'disable-model-invocation: "true"'],
  ["valeur entre apostrophes", "disable-model-invocation: 'true'"],
  ["espaces surnuméraires", "disable-model-invocation:   true   "],
]) {
  test(`le drapeau reste lu malgré ${nom}`, () => {
    assert.equal(estInvocableParLeModele(`---\ndescription: x\n${frontmatter}\n---\n\n# x\n`), false);
  });
}

// Les autres booléens vrais de YAML 1.1, relevés en revue le 2026-08-04 : la
// version qui ne lisait que `true` rendait « invocable » sur chacun d'eux,
// c'est-à-dire HORS périmètre — tous les branchements vers cette cible passaient
// au vert. C'est ce test qui aurait rendu le défaut visible.
for (const valeur of ["yes", "on", "y", "1"]) {
  test(`le booléen YAML 1.1 \`${valeur}\` vaut le drapeau`, () => {
    const texte = `---\ndescription: x\ndisable-model-invocation: ${valeur}\n---\n\n# x\n`;
    assert.equal(estInvocableParLeModele(texte), false);
  });
}

test("les booléens YAML 1.1 gardent les tolérances des autres formes", () => {
  // Guillemets, commentaire de fin de ligne et casse : les mêmes que pour
  // `true`, sinon la correction ne ferait que déplacer le trou d'un cran.
  for (const valeur of ['"yes"', "YES", "On # volontaire", "  y  "]) {
    const texte = `---\ndescription: x\ndisable-model-invocation: ${valeur}\n---\n\n# x\n`;
    assert.equal(estInvocableParLeModele(texte), false, valeur);
  }
});

test("les booléens YAML 1.1 faux laissent la cible invocable", () => {
  for (const valeur of ["no", "off", "n", "0", "false"]) {
    const texte = `---\ndescription: x\ndisable-model-invocation: ${valeur}\n---\n\n# x\n`;
    assert.equal(estInvocableParLeModele(texte), true, valeur);
  }
});

test("le drapeau reste lu malgré un BOM ou une ligne vide avant le ---", () => {
  assert.equal(estInvocableParLeModele(`﻿${NON_INVOCABLE}`), false);
  assert.equal(estInvocableParLeModele(`\n\n${NON_INVOCABLE}`), false);
});

test("une valeur `false` laisse la cible invocable — le garde ne sur-lit pas", () => {
  const texte = "---\ndescription: x\ndisable-model-invocation: false # pas ici\n---\n\n# x\n";
  assert.equal(estInvocableParLeModele(texte), true);
});

// ── MORSURE 5 — un frontmatter illisible est un constat, pas un silence ─────

test("un SKILL.md sans frontmatter est un constat, et sa cible n'est pas tenue pour invocable", () => {
  const skills = [
    { nom: "wn-review", texte: "# pas de frontmatter\n" },
    { nom: "wn-lot", texte: "---\ndescription: source\n---\n\n5. **Revue** — `/wn-review`." },
  ];
  const r = auditerSkills(skills);
  const genres = r.violations.map((v) => v.genre).sort();
  // Le constat de frontmatter ET la référence : ne pas savoir lire la cible ne
  // doit pas rendre le branchement vert par défaut.
  assert.deepEqual(genres, ["frontmatter", "reference"]);
  assert.equal(r.violations.find((v) => v.genre === "frontmatter").source, "wn-review");
});

test("un frontmatter ouvert mais jamais refermé est un constat", () => {
  const skills = [{ nom: "wn-review", texte: "---\ndescription: x\ndisable-model-invocation: true\n" }];
  assert.deepEqual(
    auditerSkills(skills).violations.map((v) => v.genre),
    ["frontmatter"],
  );
});

test("separerFrontmatter : sans frontmatter, tout est corps, et il le DIT", () => {
  const { frontmatter, corps, present } = separerFrontmatter("# titre\n");
  assert.equal(frontmatter, "");
  assert.equal(corps, "# titre\n");
  assert.equal(present, false);
  assert.equal(separerFrontmatter(NON_INVOCABLE).present, true);
});

// ── Le `/` doit ouvrir un jeton : pas d'appariement sur un fragment de chemin ─

test("un fragment de chemin n'est pas une référence de skill", () => {
  // `.claude/skills/wn*/SKILL.md` en extrayait `/wn` : six marqueurs du dépôt
  // n'exemptaient ainsi aucune vraie référence.
  assert.deepEqual(referencesDeSkill("Auditer `.claude/skills/wn*/SKILL.md` et `wn-model/SKILL.md`."), []);
  assert.deepEqual(referencesDeSkill("Le fragment vit dans `docs/claude/handoffs/`."), []);
  assert.deepEqual(referencesDeSkill("Voir `.github/agents/*.agent.md`."), []);
  // …mais une vraie référence, elle, reste vue dans les formes usuelles.
  for (const ligne of ["`/wn-review`", "— /wn-review", "(/wn-review)", "/wn-review en tête"]) {
    assert.deepEqual(
      referencesDeSkill(ligne).map((r) => r.cible),
      ["wn-review"],
      ligne,
    );
  }
});

test("une même cible citée deux fois sur une ligne ne compte qu'une fois", () => {
  const refs = referencesDeSkill("`/wn-review` et encore `/wn-review`.");
  assert.equal(refs.filter((r) => r.cible === "wn-review").length, 1);
});

// ── L'état réel du dépôt ────────────────────────────────────────────────────

test("les SKILL.md du dépôt : aucune référence non marquée vers une cible morte", () => {
  const skills = lireSkills(RACINE);
  assert.ok(skills.length > 0, "aucun skill lu — le contrôle serait vert sans objet");
  assert.deepEqual(
    auditerSkills(skills).violations.map((v) => `.claude/skills/${v.source}/SKILL.md:${v.ligne} → /${v.cible}`),
    [],
  );
});

test("le dépôt déclare au moins une mention marquée — sinon le marqueur n'est pas exercé", () => {
  // Un dépôt fail-closed sans aucune mention déclarée voudrait dire que le
  // marqueur n'a jamais servi : on ne saurait pas s'il fonctionne en vrai.
  assert.ok(auditerSkills(lireSkills(RACINE)).marquees > 0);
});

test("le dépôt n'a plus un seul marqueur de la forme ancienne, sans cible", () => {
  // La migration du 2026-08-04 ne se prouve pas par le vert du garde : elle se
  // prouve ici, sur le texte réel des 32 skills.
  const restants = [];
  for (const { nom, texte } of lireSkills(RACINE)) {
    texte.split(/\r?\n/).forEach((ligne, i) => {
      for (const mq of marqueursDeLigne(ligne)) {
        if (mq.cibles.length === 0) restants.push(`.claude/skills/${nom}/SKILL.md:${i + 1}`);
      }
    });
  }
  assert.deepEqual(restants, []);
});

// ── Le contrat de code de sortie ────────────────────────────────────────────
//
// Les tests ci-dessus n'exécutent jamais le script : ils appellent ses
// fonctions. Or ce que le CI lit, lui, est un code de retour — et un garde qui
// sortirait `0` sur un périmètre vide serait indiscernable d'un dépôt sain.

function lancer(cwd) {
  try {
    execFileSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8", stdio: "pipe" });
    return 0;
  } catch (e) {
    return e.status;
  }
}

function dossierTemporaire() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wn-cross-invocation-"));
}

test("code 2 — aucun skill lu : contrôle sans objet, refus d'être vert", () => {
  const tmp = dossierTemporaire();
  try {
    assert.equal(lancer(tmp), 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("code 1 — une violation", () => {
  const tmp = dossierTemporaire();
  try {
    const skills = path.join(tmp, ".claude/skills");
    fs.mkdirSync(path.join(skills, "wn-review"), { recursive: true });
    fs.mkdirSync(path.join(skills, "wn-lot"), { recursive: true });
    fs.writeFileSync(path.join(skills, "wn-review/SKILL.md"), NON_INVOCABLE);
    fs.writeFileSync(
      path.join(skills, "wn-lot/SKILL.md"),
      "---\ndescription: source\n---\n\n5. **Revue** — `/wn-review`.\n",
    );
    assert.equal(lancer(tmp), 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("code 0 — le dépôt, depuis sa racine", () => {
  assert.equal(lancer(RACINE), 0);
});

test("code 2 — lancé depuis `web/`, le garde ne trouve rien et le DIT", () => {
  // Le cas courant : les sessions tournent depuis `web/`. Sortir 0 là-bas
  // reviendrait à annoncer un dépôt sain sans avoir rien lu.
  assert.equal(lancer(path.join(RACINE, "web")), 2);
});
