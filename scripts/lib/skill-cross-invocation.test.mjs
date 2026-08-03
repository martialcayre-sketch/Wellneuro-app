// Banc du contrôle des invocations croisées entre skills. Il prouve que le
// garde échoue quand il doit échouer — et surtout qu'il se tait sur les trois
// formes qui l'auraient fait débrancher : la mention en table d'un routeur,
// l'interdiction qui cite le même verbe, et la mention du drapeau en
// commentaire de frontmatter.
import assert from "node:assert/strict";
import test from "node:test";

import {
  auditerSkills,
  estInvocableParLeModele,
  referencesImperatives,
  separerFrontmatter,
} from "./skill-cross-invocation.mjs";

const AVEC_DRAPEAU = `---
description: Cible non exposée à l'outil Skill.
disable-model-invocation: true
---

# Cible
`;

const SANS_DRAPEAU = `---
description: Cible exposée à l'outil Skill.
---

# Cible
`;

const DRAPEAU_EN_COMMENTAIRE = `---
description: Exemption assumée.
# EXCEPTION DÉLIBÉRÉE — ne pas rétablir \`disable-model-invocation: true\` ici.
effort: low
---

# Cible
`;

function skill(nom, corps, entete = "description: test.") {
  return { nom, texte: `---\n${entete}\n---\n\n${corps}\n` };
}

test("le drapeau actif retire la cible des skills invocables", () => {
  assert.equal(estInvocableParLeModele(AVEC_DRAPEAU), false);
  assert.equal(estInvocableParLeModele(SANS_DRAPEAU), true);
});

test("le drapeau cité en commentaire de frontmatter n'est pas le drapeau", () => {
  // C'est exactement la forme que portent `wn-route` et `wn-reprompt` : le
  // bloc qui interdit de rétablir la clé cite la clé. Le lire comme la clé
  // elle-même inverserait le verdict sur les deux seuls skills exemptés.
  assert.equal(estInvocableParLeModele(DRAPEAU_EN_COMMENTAIRE), true);
});

test("une consigne impérative vers une cible non exposée est une violation", () => {
  const r = auditerSkills([
    skill("source", "Un texte libre passe d'abord par `/cible`."),
    { nom: "cible", texte: AVEC_DRAPEAU },
  ]);
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].source, "source");
  assert.equal(r.violations[0].cible, "cible");
});

test("la même consigne vers une cible exposée ne dit rien", () => {
  const r = auditerSkills([
    skill("source", "Un texte libre passe d'abord par `/cible`."),
    { nom: "cible", texte: SANS_DRAPEAU },
  ]);
  assert.deepEqual(r.violations, []);
});

test("une mention en table de routeur n'est pas une consigne d'invocation", () => {
  // Le cas qui décide de la survie du contrôle : les deux routeurs nomment
  // des skills à longueur de table, et leur sortie s'adresse à l'utilisateur.
  // Les épingler rendrait un mur de faux positifs.
  const r = auditerSkills([
    skill("routeur", "| cadre une tâche avant de coder | `/cible` |"),
    { nom: "cible", texte: AVEC_DRAPEAU },
  ]);
  assert.deepEqual(r.violations, []);
});

test("une interdiction citant le verbe d'invocation ne compte pas", () => {
  // Forme réelle de `wn-lot` : « **Interdit à toutes les étapes qui suivent :
  // … ou réinvoquer `/wn-context`.** » — l'inverse d'un ordre.
  const r = auditerSkills([
    skill(
      "source",
      "**Interdit à toutes les étapes qui suivent : refaire un `git status` complet,\nou réinvoquer `/cible`.**",
    ),
    { nom: "cible", texte: AVEC_DRAPEAU },
  ]);
  assert.deepEqual(r.violations, []);
});

test("l'interdiction ne couvre que son propre paragraphe", () => {
  // Sans cette borne, une interdiction en tête de fichier éteindrait le
  // contrôle sur tout ce qui suit.
  const r = auditerSkills([
    skill("source", "**Interdit de relancer `/cible`.**\n\nSinon, passer par `/cible`."),
    { nom: "cible", texte: AVEC_DRAPEAU },
  ]);
  assert.equal(r.violations.length, 1);
});

test("s'auto-citer ne demande aucune invocation", () => {
  const r = auditerSkills([
    { nom: "cible", texte: AVEC_DRAPEAU.replace("# Cible", "# Cible\n\nInvoquer `/cible` ici.") },
  ]);
  assert.deepEqual(r.violations, []);
});

test("une cible inconnue du dépôt est hors sujet", () => {
  const r = auditerSkills([skill("source", "Passer par `/wn-inexistant`.")]);
  assert.deepEqual(r.violations, []);
});

test("le frontmatter n'est pas scanné comme du corps", () => {
  // Le bloc « EXCEPTION DÉLIBÉRÉE » de `wn-reprompt` explique la panne en
  // citant les six branchements : ce récit ne doit pas être compté comme un
  // branchement de plus.
  const source = {
    nom: "source",
    texte: `---\ndescription: test.\n# Six skills demandent de passer par \`/cible\`.\n---\n\n# Corps\n`,
  };
  const r = auditerSkills([source, { nom: "cible", texte: AVEC_DRAPEAU }]);
  assert.deepEqual(r.violations, []);
});

test("plusieurs cibles sur une même ligne sont toutes relevées", () => {
  const r = auditerSkills([
    skill("source", "Dès qu'un doute subsiste, invoquer `/a` ou `/b`."),
    { nom: "a", texte: AVEC_DRAPEAU },
    { nom: "b", texte: AVEC_DRAPEAU },
  ]);
  assert.equal(r.violations.length, 2);
});

test("separerFrontmatter rend le corps sans l'entête", () => {
  const { frontmatter, corps } = separerFrontmatter(AVEC_DRAPEAU);
  assert.match(frontmatter, /disable-model-invocation/);
  assert.equal(corps.includes("disable-model-invocation"), false);
  assert.match(corps, /# Cible/);
});

test("referencesImperatives rend la ligne pour situer le défaut", () => {
  const refs = referencesImperatives("Ligne une.\n\nPuis déléguer à `/cible`.");
  assert.equal(refs.length, 1);
  assert.equal(refs[0].ligne, 3);
  assert.equal(refs[0].cible, "cible");
});
