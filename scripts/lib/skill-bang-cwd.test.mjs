// Banc du contrôle des blocs `!` non ancrés. Il prouve que le garde échoue
// quand il doit échouer — et surtout qu'il se tait sur les formes qui le
// feraient débrancher : les commandes git agnostiques, les options qui
// ressemblent à des chemins, et les jetons qui n'existent pas à la racine.
//
// Le cas qui compte le plus est le silencieux : `test -f docs/… && cat … ||
// true` sort en 0 avec une sortie vide depuis `web/`. Aucun symptôme, et le
// skill planifie sur un état qu'il croit avoir lu. Mesuré le 2026-08-03 :
// 27 des 32 blocs fautifs étaient dans ce cas, 5 seulement échouaient.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  auditerSkills,
  cheminsDeRacine,
  estAncre,
  existeALaRacineDepuis,
  lireSkills,
} from "./skill-bang-cwd.mjs";

const ANCRE = 'cd "$(git rev-parse --show-toplevel)" && ';

// Prédicat d'existence injecté : le banc ne dépend pas du contenu réel de la
// racine, qui bouge à chaque lot.
const RACINE = new Set([
  "scripts",
  "docs",
  ".github",
  ".claude",
  "web",
  "tools",
  "changelog.d",
  "CLAUDE.md",
  "AGENTS.md",
  "CHANGELOG.md",
]);
const existe = (segment) => RACINE.has(segment);

function skill(nom, ...lignes) {
  return { nom, texte: `---\ndescription: test.\n---\n\n${lignes.join("\n")}\n` };
}

test("un bloc qui cite scripts/ sans ancre est une violation", () => {
  const { violations } = auditerSkills([skill("wn-x", "!`node scripts/wn-cycle.mjs`")], existe);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].skill, "wn-x");
  assert.equal(violations[0].ligne, 5);
  assert.deepEqual(violations[0].chemins, ["scripts/wn-cycle.mjs"]);
});

test("le cas SILENCIEUX est attrapé : `|| true` masque l'échec, pas le chemin", () => {
  const { violations } = auditerSkills(
    [
      skill(
        "wn-y",
        "!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`"
      ),
    ],
    existe
  );
  assert.equal(violations.length, 1);
});

test("un bloc déjà ancré passe", () => {
  const { violations } = auditerSkills(
    [skill("wn-z", `!\`${ANCRE}node scripts/wn-cycle.mjs\``)],
    existe
  );
  assert.deepEqual(violations, []);
});

test("les commandes git agnostiques ne sont PAS signalées", () => {
  const { violations, blocs } = auditerSkills(
    [
      skill(
        "wn-pr",
        "!`git status --short`",
        "!`git diff --stat`",
        "!`git diff --name-only`",
        "!`git log -n 5 --oneline`",
        "!`git worktree list 2>/dev/null || true`",
        "!`gh pr view $ARGUMENTS --json number,title,url 2>/dev/null || echo \"…\"`"
      ),
    ],
    existe
  );
  assert.deepEqual(violations, []);
  assert.equal(blocs, 6);
});

// C'est le faux négatif de la première version du garde, qui reposait sur une
// liste fermée de préfixes : `./scripts/` ne commençait pas par `scripts/`.
test("`./scripts/` et `./docs/` sont attrapés comme `scripts/` et `docs/`", () => {
  assert.deepEqual(cheminsDeRacine("node ./scripts/x.mjs", existe), ["scripts/x.mjs"]);
  assert.deepEqual(cheminsDeRacine("cat ./docs/claude/README.md", existe), [
    "docs/claude/README.md",
  ]);
});

// Les cinq autres trous de la liste fermée. `web/` en est un : depuis `web/`,
// `cat web/package.json` cherche `web/web/package.json`.
test("les chemins de racine hors des six marqueurs d'origine sont attrapés", () => {
  for (const cmd of [
    "cat web/package.json",
    "cat changelog.d/README.md",
    "node tools/corpus/x.mjs",
    "sed -n '1p' CHANGELOG.md",
  ]) {
    assert.equal(cheminsDeRacine(cmd, existe).length, 1, cmd);
  }
});

test("un pathspec LITTÉRAL est attrapé — il ne se résout pas depuis un sous-répertoire", () => {
  const { violations } = auditerSkills(
    [skill("wn-conventions", "!`git log -1 --format='%ad %s' -- CLAUDE.md AGENTS.md`")],
    existe
  );
  assert.equal(violations.length, 1);
  assert.deepEqual(violations[0].chemins, ["CLAUDE.md", "AGENTS.md"]);
});

// Vérifié sur le dépôt réel : `git log -- '*.md'` rend la même sortie depuis
// `web/` et depuis la racine — le joker matche le chemin complet. L'ancrer
// serait du bruit ; le garde doit donc se taire dessus.
test("un pathspec à JOKER n'est pas signalé", () => {
  const { violations } = auditerSkills(
    [skill("wn-docs", "!`git log -n 10 --pretty='%h %s' -- '*.md' '*.mdx' 2>/dev/null || true`")],
    existe
  );
  assert.deepEqual(violations, []);
});

test("options, variables et chemins absolus ne sont pas pris pour des chemins", () => {
  assert.deepEqual(cheminsDeRacine("git diff --stat 2>/dev/null | tail -n 1", existe), []);
  assert.deepEqual(cheminsDeRacine("gh pr view $ARGUMENTS --json url", existe), []);
  assert.deepEqual(cheminsDeRacine("cat /etc/hosts", existe), []);
  assert.deepEqual(cheminsDeRacine("git rev-parse --show-toplevel", existe), []);
});

test("un premier segment absent de la racine n'est pas signalé", () => {
  assert.deepEqual(cheminsDeRacine("cat inexistant/x.md", existe), []);
  assert.deepEqual(cheminsDeRacine("grep -nE 'R[0-6]|Priorité' x", existe), []);
});

test("l'ancre doit être EN TÊTE : plus loin, elle arrive trop tard", () => {
  const tardive = 'node scripts/x.mjs; cd "$(git rev-parse --show-toplevel)" && true';
  assert.equal(estAncre(tardive), false);
  const { violations } = auditerSkills([skill("wn-t", `!\`${tardive}\``)], existe);
  assert.equal(violations.length, 1);
});

test("estAncre tolère les variantes d'espacement autour du &&", () => {
  assert.equal(estAncre('cd "$(git rev-parse --show-toplevel)" && node x.mjs'), true);
  assert.equal(estAncre('cd  "$(git rev-parse --show-toplevel)"&& node x.mjs'), true);
  assert.equal(estAncre("cd /ailleurs && node x.mjs"), false);
});

test("un bloc `!` indenté est tout aussi exécuté, donc tout aussi contrôlé", () => {
  const { violations, blocs } = auditerSkills([skill("wn-i", "  !`cat docs/x.md`")], existe);
  assert.equal(blocs, 1);
  assert.equal(violations.length, 1);
});

test("une ligne qui n'est pas un bloc `!` est ignorée", () => {
  const { violations, blocs } = auditerSkills(
    [skill("wn-prose", "Lancer `node scripts/wn-cycle.mjs` à la main.", "Voir docs/claude/README.md.")],
    existe
  );
  assert.deepEqual(violations, []);
  assert.equal(blocs, 0);
});

test("le décompte porte sur tous les skills lus", () => {
  const { scannes, violations, blocs } = auditerSkills(
    [
      skill("a", "!`cat docs/x.md`"),
      skill("b", "!`git status --short`"),
      skill("c", `!\`${ANCRE}cat docs/x.md\``),
    ],
    existe
  );
  assert.equal(scannes, 3);
  assert.equal(blocs, 3);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].skill, "a");
});

test("existeALaRacineDepuis répond sur le disque, sans jeter sur un jeton absurde", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wn-bang-"));
  fs.mkdirSync(path.join(tmp, "scripts"));
  fs.writeFileSync(path.join(tmp, "CLAUDE.md"), "x");
  const dansLaRacine = existeALaRacineDepuis(tmp);
  assert.equal(dansLaRacine("scripts"), true);
  assert.equal(dansLaRacine("CLAUDE.md"), true);
  assert.equal(dansLaRacine("absent"), false);
  assert.equal(dansLaRacine("R[0-6]|Priorité\0"), false);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("lireSkills ignore un dossier sans SKILL.md et lit les autres", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wn-bang-lire-"));
  fs.mkdirSync(path.join(tmp, ".claude/skills/wn-a"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".claude/skills/wn-vide"), { recursive: true });
  fs.writeFileSync(path.join(tmp, ".claude/skills/wn-a/SKILL.md"), "!`cat docs/x.md`\n");
  const skills = lireSkills(tmp);
  assert.deepEqual(
    skills.map((s) => s.nom),
    ["wn-a"]
  );
  assert.equal(lireSkills(path.join(tmp, "nulle-part")).length, 0);
  fs.rmSync(tmp, { recursive: true, force: true });
});
