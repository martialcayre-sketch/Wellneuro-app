// SESSIONS CONCURRENTES SUR LA COPIE PRINCIPALE — piège du lot
// `autonomie-pieges-restes`, partie 16. Appelé par `git-freshness.mjs` au
// démarrage de session (SessionStart) ; jamais un crochet à lui seul.
//
// Le piège : la copie principale n'est réservée à personne. Une autre session
// y fait un `checkout`, et votre commit atterrit sur SA branche ; un
// `git add -A` y ramasse ses fichiers non suivis (2026-08-23 : un dossier de
// campagne entier embarqué dans une PR). Depuis `D-373` §2 et `D-454`, seule
// l'intégrateur y travaille ; une session concurrente va dans son propre
// worktree. La règle était écrite ; rien ne disait à la seconde session
// qu'une première était déjà là.
//
// Ce que fait ce module, et rien d'autre : quand la session démarre dans la
// copie principale (pas dans un worktree lié), il liste les autres processus
// `claude` dont le répertoire courant est cette copie, hors la chaîne
// d'ancêtres du crochet (la session elle-même), et rend un AVERTISSEMENT.
//
// Jamais un refus : le répertoire d'un processus est un indice, pas une
// preuve — une session lancée à la racine puis passée en worktree peut y
// figurer encore, et une session inactive aussi. Sans `lsof` ou `ps` (hors
// macOS ou Linux), ou sur toute erreur : silence. Délais courts : le
// démarrage de session ne doit pas attendre.

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const DELAI_MS = 2_000;

/**
 * Sortie `lsof -Fpn` (champs `p<pid>`, `f…`, `n<chemin>`) → [{ pid, cwd }].
 * @param {string} texte
 * @returns {{ pid: number, cwd: string }[]}
 */
export function lireLsofCwd(texte) {
  const sortie = [];
  let pid = null;
  for (const ligne of String(texte).split('\n')) {
    if (ligne.startsWith('p')) {
      const n = Number(ligne.slice(1));
      pid = Number.isInteger(n) && n > 0 ? n : null;
    } else if (ligne.startsWith('n') && pid !== null) {
      sortie.push({ pid, cwd: ligne.slice(1) });
      pid = null;
    }
  }
  return sortie;
}

/**
 * Les autres sessions de la copie : même répertoire (chemins réels), hors
 * ancêtres. Un sous-dossier de la copie ne compte pas : les worktrees vivent
 * sous `.claude/worktrees/`, et c'est le cas voulu.
 * @param {{ copie: string, processus: { pid: number, cwd: string }[], ancetres: Set<number>, reel?: (p: string) => string }} p
 * @returns {number[]}
 */
export function autresSessions({ copie, processus, ancetres, reel = (p) => p }) {
  const cible = reel(copie);
  return processus
    .filter((p) => !ancetres.has(p.pid) && reel(p.cwd) === cible)
    .map((p) => p.pid)
    .sort((a, b) => a - b);
}

/** Le texte d'avertissement, ou `null` sans autre session. */
export function avertissement(pids) {
  if (!pids.length) return null;
  const qui = pids.length === 1
    ? `une autre session Claude (pid ${pids[0]}) a`
    : `${pids.length} autres sessions Claude (pid ${pids.join(', ')}) ont`;
  return `Sessions concurrentes : ${qui} pour répertoire la copie principale. Seul l'intégrateur y travaille (D-373 §2, D-454) : une session concurrente passe dans son propre worktree (EnterWorktree). Sinon, avant tout commit, relire \`git branch --show-current\` et indexer par chemin, jamais \`git add -A\`. Indice, pas preuve : une session passée en worktree, ou inactive, peut y figurer encore.\n`;
}

function lancer(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: DELAI_MS, stdio: ['ignore', 'pipe', 'ignore'] });
  // Tué au délai ou en erreur : sortie possiblement tronquée, donc rien
  // (revue wn-reviewer). `lsof` sort 1 quand un filtre ne trouve rien.
  if (r.error || r.signal) return null;
  return r.status === 0 || (cmd === 'lsof' && r.stdout) ? r.stdout : null;
}

function reel(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

/** Les processus `claude` et leur répertoire courant ; [] sans `lsof`. */
function listerClaude() {
  // `-a` : ET des filtres ; `-c claude` : nom de commande ; `-d cwd` : le
  // répertoire courant seul. `lsof` sort 1 quand un filtre ne trouve rien.
  const sortie = lancer('lsof', ['-a', '-c', 'claude', '-d', 'cwd', '-Fpn']);
  return sortie ? lireLsofCwd(sortie) : [];
}

/** Chaîne d'ancêtres du processus courant, lui compris (borne : 32). */
function ancetresCourants() {
  const vus = new Set([process.pid]);
  let pid = process.ppid;
  for (let i = 0; i < 32 && pid > 1 && !vus.has(pid); i += 1) {
    vus.add(pid);
    const sortie = lancer('ps', ['-o', 'ppid=', '-p', String(pid)]);
    const parent = Number(String(sortie ?? '').trim());
    if (!Number.isInteger(parent) || parent <= 0) break;
    pid = parent;
  }
  return vus;
}

/**
 * L'avertissement pour une session qui démarre dans `toplevel`, ou `null`.
 * `copiePrincipale` : vrai si `toplevel` n'est pas un worktree lié.
 */
export function alerteSessionsConcurrentes({ toplevel, copiePrincipale, lister = listerClaude, ancetres = ancetresCourants }) {
  try {
    if (!copiePrincipale || !toplevel) return null;
    const processus = lister();
    if (!processus.length) return null;
    const pids = autresSessions({ copie: toplevel, processus, ancetres: ancetres(), reel });
    return avertissement(pids);
  } catch {
    return null;
  }
}
