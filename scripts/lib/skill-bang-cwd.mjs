// Contrôle d'une classe de défaut que rien d'autre ne voit : un bloc `!` de
// skill qui désigne un chemin relatif à la RACINE du dépôt, alors que rien ne
// garantit que la session tourne depuis la racine.
//
// Le répertoire de travail d'une session Claude Code est celui d'où elle a été
// lancée — ici, souvent `web/`. Un bloc `!`node scripts/wn-cycle.mjs`` s'y
// résout en `web/scripts/wn-cycle.mjs`, qui n'existe pas.
//
// Deux régimes, et c'est le second qui a motivé ce contrôle :
//   - échec bruyant — `node scripts/wn-context-pack.mjs` sort en
//     MODULE_NOT_FOUND et le skill refuse de se charger : on le voit ;
//   - **dégradation silencieuse** — `test -f docs/… && cat docs/… || true`
//     rend une sortie VIDE avec un code de retour 0. Le skill croit avoir lu
//     l'état du dépôt, n'a rien lu, et planifie sur du vide. Aucun message,
//     aucun code d'erreur, rien à voir dans le transcript. C'était le cas de
//     27 blocs sur 32 le 2026-08-03 — un `sed … CLAUDE.md | sed '$d'` en fait
//     partie : le code de retour d'un pipeline est celui du DERNIER élément.
//
// La règle : tout chemin de racine d'un bloc `!` s'écrit
// `${CLAUDE_PROJECT_DIR}/chemin`. Le chargeur de skill remplace ce jeton par
// la racine du projet AVANT la vérification des permissions : la commande
// vérifiée porte un chemin absolu, sans `..`.
//
// Et aucun bloc ne contient de substitution `$(…)`. L'ancre d'avant,
// `cd "$(git rev-parse --show-toplevel)" &&`, échouait à CHAQUE chargement en
// mode auto et depuis VS Code (« Shell command permission check failed ») :
// constaté par sondes le 2026-09-30, une commande à substitution n'est jamais
// admise, même couverte par une règle `allow` exacte. Refusés aussi, par les
// mêmes sondes : un chemin contenant `..`, et une variable shell
// (`"$CLAUDE_PROJECT_DIR/…"`, que le chargeur ne remplace pas).
//
// **La détection ne repose pas sur une liste de préfixes, mais sur le dépôt
// lui-même** : un jeton est un chemin de racine si son premier segment existe
// à la racine. Une première version listait six marqueurs (`scripts/`, `docs/`,
// `.github/`…) et laissait donc passer `./scripts/`, `web/`, `changelog.d/`,
// `tools/`, `CHANGELOG.md` — c'est-à-dire des blocs muets sous un CI vert. Une
// liste fermée n'a pas de raison d'être ici : la question « ce chemin
// existe-t-il à la racine ? » a une réponse exacte, et gratuite.
//
// Ce que ce contrôle NE fait pas, délibérément : toucher aux blocs sans chemin.
// `git status --short` et `git diff --stat` couvrent le dépôt entier depuis
// n'importe quel sous-répertoire — seule la PRÉSENTATION des chemins change
// (` M ../.claude/…` depuis `web/`), pas l'ensemble des modifications
// rapportées. Les ancrer stabiliserait cet affichage ; c'est un autre sujet,
// et le faire ici toucherait 30 blocs sans corriger de défaut.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Un bloc `!` : une ligne qui commence par « ! » suivi d'un backtick. Les
// espaces de tête sont tolérés — le rendu markdown les ignore, et un bloc
// indenté serait tout aussi exécuté.
const BLOC_BANG = /^\s*!`(.*)`\s*$/;

// Une substitution de commande : le bloc qui la porte ne se charge jamais.
const SUBSTITUTION = /\$\(/;

// Jetons candidats à être des chemins. Commencent par une lettre, un chiffre,
// un point ou un tiret bas — ce qui écarte d'emblée les options (`--stat`),
// les variables (`$ARGUMENTS`), les chemins absolus (`/dev/null`) et les
// chemins ancrés (`${CLAUDE_PROJECT_DIR}/docs/…`).
const JETON = /(?:^|[\s"'`(=|])([A-Za-z0-9._][^\s"'`)|]*)/g;

// Un chemin à racine variable autre que le jeton du chargeur : `$VAR/…` ou
// `${VAR}/…`. `JETON` écarte tout ce qui commence par `$` — sans ce contrôle,
// `"$CLAUDE_PROJECT_DIR/docs/…"`, refusé au chargement, passerait vert.
const RACINE_VARIABLE = /\$(?:\{(?!CLAUDE_PROJECT_DIR\})[^}]*\}|[A-Za-z_][A-Za-z0-9_]*)\//g;

export function contientSubstitution(commande) {
  return SUBSTITUTION.test(commande);
}

/** Les racines variables de `commande` que le chargeur ne remplace pas. */
export function racinesVariables(commande) {
  return [...commande.matchAll(RACINE_VARIABLE)].map((m) => m[0]);
}

/**
 * Les jetons de `commande` dont le premier segment existe à la racine — donc
 * les chemins que la commande résout par rapport au répertoire courant.
 * @param {string} commande
 * @param {(segment: string) => boolean} existeALaRacine
 */
export function cheminsDeRacine(commande, existeALaRacine) {
  const trouves = [];
  JETON.lastIndex = 0;
  let m;
  while ((m = JETON.exec(commande)) !== null) {
    // `./docs/x` et `docs/x` désignent la même chose.
    const jeton = m[1].replace(/^\.\//, "");
    const segment = jeton.split("/")[0];
    if (segment === "" || segment === "." || segment === "..") continue;
    if (!existeALaRacine(segment)) continue;
    trouves.push(jeton);
  }
  return trouves;
}

/**
 * @param {Array<{nom: string, texte: string}>} skills
 * @param {(segment: string) => boolean} existeALaRacine
 * @returns {{violations: Array<{skill: string, ligne: number, commande: string, chemins: string[], substitution: boolean, variables: string[]}>, scannes: number, blocs: number}}
 */
export function auditerSkills(skills, existeALaRacine) {
  const violations = [];
  let blocs = 0;
  for (const { nom, texte } of skills) {
    texte.split(/\r?\n/).forEach((ligne, index) => {
      const m = BLOC_BANG.exec(ligne);
      if (!m) return;
      blocs += 1;
      const commande = m[1];
      const chemins = cheminsDeRacine(commande, existeALaRacine);
      const substitution = contientSubstitution(commande);
      const variables = racinesVariables(commande);
      if (chemins.length === 0 && !substitution && variables.length === 0) return;
      violations.push({ skill: nom, ligne: index + 1, commande, chemins, substitution, variables });
    });
  }
  return { violations, scannes: skills.length, blocs };
}

export function existeALaRacineDepuis(racine) {
  return (segment) => {
    try {
      return fs.existsSync(path.join(racine, segment));
    } catch {
      return false;
    }
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

// Exécuté directement : le contrôle bloquant du CI. Comme son voisin, il refuse
// d'être vert sur zéro skill lu — un scan qui ne trouve rien rendrait « aucune
// violation », c'est-à-dire la même sortie qu'un dépôt sain.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const racine = process.cwd();
  const skills = lireSkills(racine);
  if (skills.length === 0) {
    console.error("✗ Aucun skill lu sous .claude/skills — contrôle sans objet, refus d'être vert.");
    process.exit(2);
  }
  const { violations, scannes, blocs } = auditerSkills(skills, existeALaRacineDepuis(racine));
  for (const v of violations) {
    if (v.substitution) {
      console.error(
        `✗ .claude/skills/${v.skill}/SKILL.md:${v.ligne} — bloc \`!\` à substitution \`$(…)\` : ` +
          `la vérification des permissions le refuse, le skill ne se charge pas.`
      );
    }
    if (v.variables.length > 0) {
      console.error(
        `✗ .claude/skills/${v.skill}/SKILL.md:${v.ligne} — bloc \`!\` à racine variable ` +
          `${v.variables.join(", ")} : le chargeur ne remplace que \${CLAUDE_PROJECT_DIR}.`
      );
    }
    if (v.chemins.length > 0) {
      console.error(
        `✗ .claude/skills/${v.skill}/SKILL.md:${v.ligne} — bloc \`!\` non ancré à la racine : ` +
          `${v.chemins.join(", ")} ne se résout pas depuis un autre répertoire.`
      );
    }
    console.error(`  !\`${v.commande}\``);
  }
  if (violations.length > 0) {
    console.error(
      `\n→ Écrire chaque chemin de racine \${CLAUDE_PROJECT_DIR}/chemin, sans cd ni $(…) — ` +
        `ou, si la commande est réellement agnostique, retirer le chemin relatif à la racine.`
    );
    process.exit(1);
  }
  console.log(`OK : ${scannes} skills, ${blocs} blocs \`!\`, aucun chemin de racine non ancré.`);
}
