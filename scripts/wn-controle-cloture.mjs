#!/usr/bin/env node
// CONTRÔLE DE CLÔTURE D'UNE PR — E56 (plan, fiche H23, amendée par D-372),
// étape du job `controles`.
//
// La règle n'est pas neuve : la skill `wn-merge` (étape 7) et `wn-cycle.mjs`
// exigent qu'une PR de lot porte un fragment de handoff
// (`.claude/rules/docs-changelog.md`, « la clôture passe avant la PR »). Ce qui
// manquait, c'est un garde. Jusqu'au 2026-10-14, la revue Copilot réclamait la
// clôture sur chaque PR ; quand D-290 a confié la revue à CodeRabbit, rien ne
// l'a plus demandée, et elle a disparu de presque toutes les PR dès le
// lendemain. L'auto-merge, lui, la contournait déjà (#1315, 2026-10-05).
//
// HANDOFF SEUL (D-372, 2026-10-25) : le contrôle exigeait aussi une entrée
// ajoutée à `SESSION_LOG.md`. Elle ne l'est plus — le handoff porte déjà
// l'information, sans conflit, alors que les entrées du journal se rangeaient
// au milieu du fichier à chaque fusion de `main`. Le journal redevient un
// résumé écrit sur demande, append-only. Réversibilité : rétablir la condition
// ici et dans `wn-cycle.mjs` (D-372 §3).
//
// PÉRIMÈTRE : une PR qui touche du CODE, au sens de l'étape « Périmètre du
// diff » de `ci.yml` (`docs_only=false`). Le CI ne lance ce script que dans ce
// cas : une PR purement documentaire — une décision, un relevé du plan, un
// rattrapage de clôture — en est dispensée par construction.
//
// UN FRAGMENT CRÉÉ, PAS RETOUCHÉ : le handoff est un fragment daté, reconnu par
// `estFragmentDeHandoff` — la même fonction que `wn-cycle.mjs`, jamais une
// seconde définition qui divergerait.
//
// Usage (CI) : node scripts/wn-controle-cloture.mjs <sha de base>

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { creesDuNameStatus, estFragmentDeHandoff } from './wn-cycle.mjs';

/**
 * Le verdict, à partir des fichiers CRÉÉS par la PR (statut A, ou R sous leur
 * nouveau nom). Le handoff doit en être — un fragment est posé, jamais réécrit
 * (`.claude/rules/docs-changelog.md`) : retoucher le handoff d'un lot passé ne
 * clôt pas celui-ci (revue CodeRabbit #1538), et un handoff supprimé non plus.
 *
 * @param {{ crees: string[] }} diff
 * @returns {{ ok: boolean, manques: string[] }}
 */
export function verdictCloture({ crees }) {
  const manques = [];
  if (!crees.some(estFragmentDeHandoff)) {
    manques.push('un fragment de handoff daté créé par la PR (docs/claude/handoffs/AAAA-MM-JJ-HHMM-sujet.md)');
  }
  return { ok: manques.length === 0, manques };
}

/**
 * Les fichiers créés, lus dans un `--name-status` : statut A, ou R — sauf le
 * renommage d'un handoff passé, qui le retouche (D-372). La définition vit dans
 * `wn-cycle.mjs`, pour que le cycle et le CI jugent sous un seul régime.
 */
export const fichiersCrees = creesDuNameStatus;

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
  try {
    nameStatus = git('diff', '--name-status', base, 'HEAD');
  } catch {
    // Base absente de l'historique : on refuse, en disant pourquoi.
    console.error(`Base « ${base} » introuvable dans l'historique : la clôture ne peut pas être jugée.`);
    process.exit(1);
  }
  const { ok, manques } = verdictCloture({ crees: fichiersCrees(nameStatus) });
  if (ok) {
    console.log('Clôture présente : fragment de handoff créé par la PR.');
    process.exit(0);
  }
  console.error('Clôture manquante — cette PR touche du code et ne porte pas :');
  for (const manque of manques) console.error(`  - ${manque}`);
  console.error(
    'La clôture passe avant la PR (.claude/rules/docs-changelog.md) : '
      + "l'écrire sur la branche, puis pousser.",
  );
  process.exit(1);
}
