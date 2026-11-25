#!/usr/bin/env node
// SESSION_LOG : AJOUT EN FIN SEULEMENT — garde du piège « SESSION_LOG
// réordonné » (lot `autonomie-pieges-restes`, partie 15), étape du job
// `controles`.
//
// Le piège : `docs/claude/SESSION_LOG.md` porte `merge=union`
// (`.gitattributes`). Quand une branche qui a ajouté son entrée en fin de
// journal fusionne `origin/main`, `union` met « nos » lignes AVANT « les
// leurs » : l'entrée du lot se retrouve au milieu, devant des entrées plus
// récentes venues de `main`. Le diff de la PR n'est plus un ajout en fin de
// fichier, et rien ne le signalait plus depuis que CodeRabbit ne relit plus
// (constaté deux fois sur #1673, le 2026-10-24).
//
// La règle, et rien d'autre : le journal de la tête COMMENCE par le journal de
// la base, à l'octet près. Elle couvre l'entrée rangée au milieu, la ligne
// retouchée, l'entrée retirée — et donc aussi la compaction, gelée par
// `D-372` §2 (gel maintenu le 2026-11-12) : une décision qui lèverait le gel
// lève aussi ce garde.
//
// Remède, dit par le script : reconstruire le fichier = le journal de la base
// suivi du bloc du lot, puis vérifier que le diff ne compte que des `+`.
//
// Usage (CI) : node scripts/wn-session-log-ajout.mjs <ref de base> [<ref de tête>]
// Sortie : 0 conforme (ou journal intouché), 1 refus, 2 usage ou lecture git.

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CHEMIN_JOURNAL = 'docs/claude/SESSION_LOG.md';

/**
 * Le verdict, sur les deux textes du journal (`null` : fichier absent).
 *
 * @param {string | null} base
 * @param {string | null} tete
 * @returns {{ ok: boolean, motif: string | null, ligne: number | null }}
 */
export function verdictAjoutEnFin(base, tete) {
  if (base === null) return { ok: true, motif: null, ligne: null };
  if (tete === null) return { ok: false, motif: 'journal supprimé', ligne: null };
  if (tete.startsWith(base)) return { ok: true, motif: null, ligne: null };
  return { ok: false, motif: 'le journal de la base n’est plus en tête du fichier', ligne: premiereLigneDivergente(base, tete) };
}

/** Numéro (1-based) de la première ligne de la base qui diffère dans la tête. */
export function premiereLigneDivergente(base, tete) {
  const b = base.split('\n');
  const t = tete.split('\n');
  for (let i = 0; i < b.length; i += 1) {
    if (b[i] !== t[i]) return i + 1;
  }
  return b.length;
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Présence testée par le code de sortie de `git cat-file -e`, jamais par le
// texte d'erreur : un git localisé ne parle pas anglais (revue wn-reviewer).
function lireJournal(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}:${CHEMIN_JOURNAL}`], { stdio: 'ignore' });
  } catch {
    return null;
  }
  return git(['show', `${sha}:${CHEMIN_JOURNAL}`]);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [base, tete = 'HEAD'] = process.argv.slice(2);
  if (!base) {
    console.error('Usage : node scripts/wn-session-log-ajout.mjs <ref de base> [<ref de tête>]');
    process.exit(2);
  }
  let shaBase;
  let texteBase;
  let texteTete;
  try {
    // Le SHA résolu, pas la ref : en CI la base s'écrit `HEAD^1`, qui sur la
    // branche de la session désignerait la branche d'avant sa fusion — le
    // remède affiché doit nommer la base réelle (revue wn-reviewer).
    shaBase = git(['rev-parse', '--verify', `${base}^{commit}`]).trim();
    const shaTete = git(['rev-parse', '--verify', `${tete}^{commit}`]).trim();
    texteBase = lireJournal(shaBase);
    texteTete = lireJournal(shaTete);
  } catch (e) {
    const detail = String(e?.stderr || e?.message || e).trim().split('\n')[0];
    console.error(`Lecture git impossible pour ${base} ou ${tete} (historique trop court, ou référence absente) : ${detail}`);
    process.exit(2);
  }
  const v = verdictAjoutEnFin(texteBase, texteTete);
  if (v.ok) {
    console.log(texteBase === texteTete ? `${CHEMIN_JOURNAL} : intouché.` : `${CHEMIN_JOURNAL} : ajout en fin seulement.`);
    process.exit(0);
  }
  console.error(`${CHEMIN_JOURNAL} : ${v.motif}${v.ligne ? ` (première ligne divergente : ${v.ligne})` : ''}.`);
  console.error('Le journal ne reçoit qu’un ajout en fin. Cause ordinaire : merge=union range l’entrée du lot devant celles de main quand la branche fusionne main. Compaction gelée (D-372 §2).');
  console.error(`Remède : git show ${shaBase}:${CHEMIN_JOURNAL} > ${CHEMIN_JOURNAL} (journal de la base ${base}), puis y rajouter en fin le bloc du lot ; « git diff ${shaBase} -- ${CHEMIN_JOURNAL} » ne doit montrer que des « + ».`);
  process.exit(1);
}
