#!/usr/bin/env node
// CONTRÔLE DE CLÔTURE D'UNE PR — E56 (plan, fiche H23), étape du job `controles`.
//
// La règle n'est pas neuve : la skill `wn-merge` (étape 7) et `wn-cycle.mjs`
// exigent qu'une PR de lot porte une entrée de `SESSION_LOG.md` ET un fragment
// de handoff (`.claude/rules/docs-changelog.md`, « la clôture passe avant la
// PR »). Ce qui manquait, c'est un garde. Jusqu'au 2026-10-14, la revue Copilot
// réclamait l'entrée SESSION_LOG sur chaque PR ; quand D-290 a confié la revue à
// CodeRabbit, rien ne l'a plus demandée, et elle a disparu de presque toutes
// les PR dès le lendemain (de 128 PR sur 190 du 1er au 14 octobre à 4 sur 75
// du 15 au 18). L'auto-merge, lui, la contournait déjà (#1315, 2026-10-05).
//
// PÉRIMÈTRE : une PR qui touche du CODE, au sens de l'étape « Périmètre du
// diff » de `ci.yml` (`docs_only=false`). Le CI ne lance ce script que dans ce
// cas : une PR purement documentaire — une décision, un relevé du plan, un
// rattrapage de clôture — en est dispensée par construction.
//
// UNE ENTRÉE, PAS UNE RETOUCHE : `SESSION_LOG.md` est append-only, le contrôle
// exige au moins une ligne AJOUTÉE. Le handoff est un fragment daté, reconnu
// par `estFragmentDeHandoff` — la même fonction que `wn-cycle.mjs`, jamais une
// seconde définition qui divergerait.
//
// Usage (CI) : node scripts/wn-controle-cloture.mjs <sha de base>

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { estFragmentDeHandoff } from './wn-cycle.mjs';

export const SESSION_LOG = 'docs/claude/SESSION_LOG.md';

/**
 * Le verdict, à partir du diff de la PR.
 *
 * `crees` : les fichiers CRÉÉS par la PR (statut A, ou R sous leur nouveau
 * nom). Le handoff doit en être — un fragment est posé, jamais réécrit
 * (`.claude/rules/docs-changelog.md`) : retoucher le handoff d'un lot passé ne
 * clôt pas celui-ci (revue CodeRabbit #1538).
 *
 * @param {{ fichiers: string[], crees?: string[], lignesAjouteesSessionLog: number }} diff
 * @returns {{ ok: boolean, manques: string[] }}
 */
export function verdictCloture({ fichiers, crees = fichiers, lignesAjouteesSessionLog }) {
  const manques = [];
  if (!fichiers.includes(SESSION_LOG) || lignesAjouteesSessionLog < 1) {
    manques.push(`une entrée ajoutée à ${SESSION_LOG}`);
  }
  if (!crees.some(estFragmentDeHandoff)) {
    manques.push('un fragment de handoff daté créé par la PR (docs/claude/handoffs/AAAA-MM-JJ-HHMM-sujet.md)');
  }
  return { ok: manques.length === 0, manques };
}

/**
 * Les fichiers présents APRÈS la PR, lus dans un `git diff --name-status` : une
 * suppression n'en est pas (un handoff effacé ne clôt rien), un renommage
 * compte sous son nouveau nom.
 */
export function fichiersPresents(nameStatus) {
  const fichiers = [];
  for (const ligne of nameStatus.split('\n')) {
    const champs = ligne.split('\t');
    const statut = champs[0];
    if (!statut || statut.startsWith('D')) continue;
    fichiers.push(champs[champs.length - 1]);
  }
  return fichiers;
}

/** Les fichiers créés, lus dans le même `--name-status` : statut A, ou R. */
export function fichiersCrees(nameStatus) {
  const crees = [];
  for (const ligne of nameStatus.split('\n')) {
    const champs = ligne.split('\t');
    const statut = champs[0];
    if (statut === 'A' || statut?.startsWith('R')) crees.push(champs[champs.length - 1]);
  }
  return crees;
}

/** Les lignes ajoutées d'un fichier dans un `git diff --numstat` (binaire : 0). */
export function lignesAjoutees(numstat, chemin) {
  for (const ligne of numstat.split('\n')) {
    const [ajouts, , fichier] = ligne.split('\t');
    if (fichier === chemin) return Number.parseInt(ajouts, 10) || 0;
  }
  return 0;
}

// `core.quotePath=false` : sans lui, git rend un chemin accentué entre
// guillemets et en octets échappés (« "docs/claude/handoffs/...\303\251.md" »),
// et un handoff au nom accentué ne serait pas reconnu (revue CodeRabbit #1538).
function git(...args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const base = process.argv[2];
  if (!base) {
    console.error('Usage : node scripts/wn-controle-cloture.mjs <sha de base>');
    process.exit(2);
  }
  let nameStatus;
  let numstat;
  try {
    nameStatus = git('diff', '--name-status', base, 'HEAD');
    numstat = git('diff', '--numstat', base, 'HEAD', '--', SESSION_LOG);
  } catch {
    // Base absente de l'historique : on refuse, en disant pourquoi.
    console.error(`Base « ${base} » introuvable dans l'historique : la clôture ne peut pas être jugée.`);
    process.exit(1);
  }
  const { ok, manques } = verdictCloture({
    fichiers: fichiersPresents(nameStatus),
    crees: fichiersCrees(nameStatus),
    lignesAjouteesSessionLog: lignesAjoutees(numstat, SESSION_LOG),
  });
  if (ok) {
    console.log('Clôture présente : entrée SESSION_LOG et fragment de handoff.');
    process.exit(0);
  }
  console.error('Clôture manquante — cette PR touche du code et ne porte pas :');
  for (const manque of manques) console.error(`  - ${manque}`);
  console.error(
    'La clôture passe avant la PR (.claude/rules/docs-changelog.md) : '
      + 'les écrire sur la branche, puis pousser.',
  );
  process.exit(1);
}
