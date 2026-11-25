// CROCHETS DE LA COPIE PRINCIPALE EN RETARD — piège du lot
// `autonomie-pieges-restes`, partie 17. Appelé par `git-freshness.mjs` au
// démarrage de session (SessionStart), après le fetch d'`origin/main` ;
// jamais un crochet à lui seul.
//
// Le piège : chaque lanceur de `settings.json` cherche son script sous
// `$CLAUDE_PROJECT_DIR`, la racine de LANCEMENT de la session, qui ne change
// ni après `/cd` ni après `EnterWorktree`. Une session lancée dans la copie
// principale puis passée dans son worktree exécute donc les gardes de la
// copie principale, pas ceux de sa branche ; `settings.json` et les agents
// sont lus au même endroit. Le garde de fraîcheur juge la branche du
// répertoire courant : un worktree à jour passe, et des gardes antérieurs à
// `main` gardent la session sans que rien ne le dise.
//
// Ce que fait ce module, et rien d'autre : il prend la copie qui contient ce
// fichier (celle dont les crochets s'exécutent). Si c'est la copie du
// répertoire courant, il se tait — le constat de fraîcheur la juge déjà. Sinon
// il liste les fichiers de crochets qu'`origin/main` a changés depuis sa base
// commune avec la tête de cette copie ET que son arbre de travail n'a pas tels
// quels : ce que `main` a et que cette copie n'a pas. Une copie en avance sur
// `main` (branche qui touche elle-même ses crochets) n'est pas « en retard ».
// Liste non vide : un AVERTISSEMENT.
//
// Quand il parle : au premier démarrage d'une session, le répertoire courant
// est la racine de lancement, donc la copie des crochets — silence ici, et le
// constat de fraîcheur de cette copie dit déjà son retard. Le module parle aux
// démarrages suivants (`/clear`, `/compact`, reprise) dont le répertoire est
// le worktree où la session est entrée, jamais dans le lot même qui y entre.
//
// Jamais un refus : la session n'y est pour rien, et le remède appartient à
// l'intégrateur (avance de la copie principale, `D-373` §2). Sur toute erreur
// ou au délai : silence.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DELAI_MS = 2_000;
const MAX_NOMMES = 5;

/** Ce que les lanceurs lisent sous la racine de lancement. */
export const CHEMINS_CROCHETS = ['.claude/hooks', '.claude/settings.json', '.claude/agents'];

const DOSSIER_ICI = path.dirname(fileURLToPath(import.meta.url));

function gitParDefaut(args, dans) {
  const r = spawnSync('git', args, {
    cwd: dans,
    encoding: 'utf8',
    timeout: DELAI_MS,
    killSignal: 'SIGKILL',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (r.error || r.signal || r.status !== 0) return null;
  return r.stdout.trim();
}

function reel(chemin) {
  try {
    return fs.realpathSync.native(chemin);
  } catch {
    return null;
  }
}

/**
 * @param {{ racine: string, head: string, fichiers: string[] }} constat
 * @returns {string | null}
 */
export function avertissementRetard({ racine, head, fichiers }) {
  if (!fichiers.length) return null;
  const n = fichiers.length;
  const quantite = n === 1 ? '1 fichier de crochets' : `${n} fichiers de crochets`;
  const nommes = fichiers.slice(0, MAX_NOMMES).map((f) => `\`${f}\``).join(', ');
  const reste = n > MAX_NOMMES ? ` et ${n - MAX_NOMMES} autre${n - MAX_NOMMES > 1 ? 's' : ''}` : '';
  return `Crochets en retard : les gardes de cette session s'exécutent depuis \`${racine}\` (HEAD ${head.slice(0, 12)}), sa racine de lancement — \`EnterWorktree\` ne la change pas. \`origin/main\` y a changé ${quantite} que cette copie n'a pas : ${nommes}${reste}. Les gardes, réglages et agents en vigueur ici sont donc antérieurs à ceux de \`main\`. Remède : l'avance de cette copie par l'intégrateur (\`git merge --ff-only origin/main\`, puis T1 : D-373 §2), jamais depuis une session concurrente ; ou relancer la session à la racine de son propre worktree, dont la branche contient \`origin/main\`.\n`;
}

/**
 * Avertissement si les crochets exécutés viennent d'une autre copie que celle
 * du répertoire courant, et que cette copie n'a pas des changements de
 * crochets d'`origin/main`. `null` sinon, et sur toute erreur.
 * @param {{ toplevel: string, dossierCrochets?: string, git?: (args: string[], dans: string) => string | null }} o
 * @returns {string | null}
 */
export function alerteCrochetsEnRetard({ toplevel, dossierCrochets = DOSSIER_ICI, git = gitParDefaut }) {
  try {
    const brute = git(['rev-parse', '--show-toplevel'], dossierCrochets);
    const racine = brute && reel(brute);
    const ici = toplevel && reel(toplevel);
    if (!racine || !ici || racine === ici) return null;
    const head = git(['rev-parse', 'HEAD'], racine);
    const base = git(['merge-base', 'HEAD', 'origin/main'], racine);
    if (!head || !base) return null;
    const changes = git(['diff', '--name-only', base, 'origin/main', '--', ...CHEMINS_CROCHETS], racine);
    // Ce qui s'exécute, c'est le disque : arbre de travail contre `origin/main`.
    // Un fichier que `main` a changé mais que la copie porte déjà à l'identique
    // (branche mergée par squash, modification locale égale) n'est pas en retard.
    const differents = git(['diff', '--name-only', 'origin/main', '--', ...CHEMINS_CROCHETS], racine);
    if (changes === null || differents === null) return null;
    const surDisque = new Set(differents.split('\n').filter(Boolean));
    const fichiers = changes.split('\n').filter((f) => f && surDisque.has(f));
    return avertissementRetard({ racine, head, fichiers });
  } catch {
    return null;
  }
}
