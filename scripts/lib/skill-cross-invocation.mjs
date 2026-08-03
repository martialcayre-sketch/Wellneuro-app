// Contrôle d'une classe de défaut que rien d'autre ne voit : une consigne
// impérative d'un skill vers un AUTRE skill qui n'est pas exposé à l'outil
// `Skill`.
//
// `disable-model-invocation: true` ne restreint pas « l'invocation
// automatique » : il retire le skill de la liste exposée à l'outil `Skill`.
// Une consigne écrite dans le skill A — « passer d'abord par `/wn-B` » — ne
// peut alors pas s'exécuter. La prose reste valide, la capacité est absente,
// et aucune suite de tests ne regarde là. C'est arrivé deux fois :
// `wn-route` (consigne de `CLAUDE.md` inapplicable depuis qu'elle était
// écrite), puis `/wn-reprompt` le 2026-08-03 — six branchements morts, CI vert
// sur la PR qui les portait.
//
// Ce que ce contrôle NE fait pas, délibérément : signaler une simple mention.
// Les deux routeurs (`/wn`, `/wn-route`) nomment des skills à longueur de
// table — c'est leur métier, et leur sortie s'adresse à l'utilisateur, qui
// tape la commande. Un contrôle qui les épinglerait rendrait un mur de faux
// positifs et serait débranché dans la semaine. Seule la formulation
// impérative compte : un verbe d'invocation devant la cible.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Verbes qui transforment une mention en ordre d'invocation. Liste fermée et
// volontairement courte : ce qu'elle rate se voit à l'usage et s'ajoute ;
// ce qu'elle sur-détecte discrédite le contrôle entier.
const VERBE_INVOCATION =
  /\b(?:pass(?:er|e|es|ent|ez|é|ée|és)|repass(?:er|e|ez)|invoqu(?:er|e|es|ent|ez|ant|ée?s?)|délégu(?:er|e|ez|é)|délègue|appel(?:er|le|les|lent|lez)|lanc(?:er|e|es|ent|ez)|enchaîn(?:er|e|es|ez)|rend(?:re|ez)|renvoy(?:er|ez)|renvoie)\b/i;

// Une référence `/wn-plan`, `/supabase`… encadrée ou non de backticks. Non
// restreinte à la famille `wn` : le dépôt lie des skills tiers, et une cible
// inconnue est écartée plus bas de toute façon. C'est aussi ce qui évite de
// devoir toucher ce motif le jour où une famille s'ajoute.
const REFERENCE = /\/([a-z][a-z0-9-]*)\b/gi;

// Fenêtre amont fouillée pour trouver le verbe. Assez large pour couvrir
// « le passer à `/wn-reprompt` », assez courte pour ne pas capter le verbe
// d'une proposition voisine.
const FENETRE_AMONT = 90;

// Une interdiction cite les mêmes verbes qu'un ordre. `wn-lot` écrit
// « **Interdit à toutes les étapes qui suivent : … ou réinvoquer
// `/wn-context`.** » — l'inverse d'une consigne d'invocation, et le seul faux
// positif qu'ait produit ce contrôle sur les 30 skills du dépôt.
//
// La règle est volontairement étroite : la marque de prohibition doit ouvrir
// le paragraphe. Chercher la négation n'importe où en amont suffirait à tout
// éteindre — le français en met partout, et « une demande qu'on ne peut pas
// router sans deviner passe d'abord par `/wn-X` » est un ordre, pas une
// interdiction.
const PROHIBITION_EN_TETE = /\b(?:interdit|interdite|interdits|ne jamais|ne pas|jamais de)\b/i;
const TETE_DE_PARAGRAPHE = 60;

export function separerFrontmatter(texte) {
  const m = FRONTMATTER.exec(texte);
  if (!m) return { frontmatter: "", corps: texte };
  return { frontmatter: m[1], corps: texte.slice(m[0].length) };
}

// Un `#` en tête de ligne est un commentaire YAML : la mention du drapeau
// dans le bloc « EXCEPTION DÉLIBÉRÉE » de `wn-route` et `wn-reprompt` ne doit
// pas se lire comme le drapeau lui-même.
export function estInvocableParLeModele(texte) {
  const { frontmatter } = separerFrontmatter(texte);
  for (const ligne of frontmatter.split(/\r?\n/)) {
    if (/^\s*#/.test(ligne)) continue;
    if (/^\s*disable-model-invocation\s*:\s*true\s*$/i.test(ligne)) return false;
  }
  return true;
}

// Pour chaque ligne, la tête du paragraphe qui la contient — c'est là que se
// lit une interdiction, pas au ras de la référence.
function tetesDeParagraphe(lignes) {
  const tetes = new Array(lignes.length).fill("");
  let courante = "";
  let debutParagraphe = true;
  lignes.forEach((ligne, index) => {
    if (ligne.trim() === "") {
      courante = "";
      debutParagraphe = true;
    } else if (debutParagraphe) {
      courante = ligne.slice(0, TETE_DE_PARAGRAPHE);
      debutParagraphe = false;
    }
    tetes[index] = courante;
  });
  return tetes;
}

export function referencesImperatives(corps) {
  const trouvees = [];
  const lignes = corps.split(/\r?\n/);
  const tetes = tetesDeParagraphe(lignes);
  lignes.forEach((ligne, index) => {
    if (PROHIBITION_EN_TETE.test(tetes[index])) return;
    REFERENCE.lastIndex = 0;
    let m;
    while ((m = REFERENCE.exec(ligne)) !== null) {
      const amont = ligne.slice(Math.max(0, m.index - FENETRE_AMONT), m.index);
      if (!VERBE_INVOCATION.test(amont)) continue;
      trouvees.push({ cible: m[1].toLowerCase(), ligne: index + 1, texte: ligne.trim() });
    }
  });
  return trouvees;
}

/**
 * @param {Array<{nom: string, texte: string}>} skills
 * @returns {{violations: Array, scannes: number, cibles: number}}
 */
export function auditerSkills(skills) {
  const invocable = new Map();
  for (const { nom, texte } of skills) invocable.set(nom, estInvocableParLeModele(texte));

  const violations = [];
  for (const { nom, texte } of skills) {
    const { corps } = separerFrontmatter(texte);
    for (const ref of referencesImperatives(corps)) {
      // Une cible inconnue du dépôt n'est pas notre affaire : un skill peut
      // citer une commande qui n'est pas un skill de cette famille.
      if (!invocable.has(ref.cible)) continue;
      // S'auto-citer ne demande aucune invocation.
      if (ref.cible === nom) continue;
      if (invocable.get(ref.cible)) continue;
      violations.push({ source: nom, cible: ref.cible, ligne: ref.ligne, texte: ref.texte });
    }
  }

  return {
    violations,
    scannes: skills.length,
    cibles: [...invocable.values()].filter(Boolean).length,
  };
}

export function lireSkills(racine) {
  const dir = path.join(racine, ".claude/skills");
  if (!fs.existsSync(dir)) return [];
  const skills = [];
  for (const nom of fs.readdirSync(dir)) {
    const fichier = path.join(dir, nom, "SKILL.md");
    if (!fs.existsSync(fichier)) continue;
    skills.push({ nom, texte: fs.readFileSync(fichier, "utf8") });
  }
  return skills;
}

// Exécuté directement : le contrôle bloquant du CI. Il refuse d'être vert sur
// zéro skill lu — un scan qui ne trouve rien rendrait « aucune violation »,
// c'est-à-dire la même sortie qu'un dépôt sain.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const skills = lireSkills(process.cwd());
  if (skills.length === 0) {
    console.error("✗ Aucun skill lu sous .claude/skills — contrôle sans objet, refus d'être vert.");
    process.exit(2);
  }
  const { violations, scannes } = auditerSkills(skills);
  for (const v of violations) {
    console.error(
      `✗ .claude/skills/${v.source}/SKILL.md:${v.ligne} — ordonne d'invoquer /${v.cible}, ` +
        `qui porte disable-model-invocation : la consigne ne peut pas s'exécuter.`
    );
    console.error(`  ${v.texte}`);
  }
  if (violations.length > 0) {
    console.error(
      `\n→ Lever le drapeau sur la cible (avec un commentaire délibéré en frontmatter), ` +
        `ou reformuler la consigne en lecture de fichier plutôt qu'en invocation.`
    );
    process.exit(1);
  }
  console.log(`OK : ${scannes} skills, aucune consigne d'invocation vers une cible non exposée.`);
}
