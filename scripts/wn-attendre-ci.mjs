#!/usr/bin/env node
// Attend le CI d'une PR et rend un verdict qui distingue « aucun check en
// attente » de « aucun check du tout ».
//
// Pourquoi ce script existe : l'idiome documenté attendait que plus rien ne
// soit `pending`, puis lisait `gh pr checks`. Il ne sait pas dire si le check
// obligatoire a seulement été CRÉÉ. Trois situations le font manquer, et dans
// les trois la boucle rend la main immédiatement sur deux checks Vercel verts :
//
//   1. le commit de tête est signé Copilot — le run passe en `action_required`
//      et n'exécute rien sans approbation humaine ;
//   2. la branche a été squashée puis rebranchée — GitHub ne crée aucun run ;
//   3. la PR est en conflit (`CONFLICTING`) — GitHub ne crée aucun run non plus.
//
// Seule la première est documentée. La troisième a trompé cette chaîne sur la
// PR #550 le 2026-08-03 ; le correctif a été refait à la main sur #553. Une
// règle qu'on oublie deux fois ne se réécrit pas une troisième : elle devient
// exécutable.
//
// Ce script NE MERGE PAS et ne dit pas s'il faut merger : le régime du merge
// est celui de `CLAUDE.md`, pas celui d'un script. Il répond à une seule
// question — « les checks obligatoires ont-ils réellement tourné, et sont-ils
// verts ? » — et refuse de la confondre avec « rien n'est en attente ».
//
// La logique est une fonction pure `diagnostiquer()` prenant des faits déjà
// collectés (testable sans dépôt ni réseau) ; le bas du fichier est le câblage
// CLI, qui collecte ces faits avec `gh`.

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_VERT = 0;
export const SORTIE_ECHEC = 1;
export const SORTIE_N_A_PAS_TOURNE = 2;
export const SORTIE_DELAI = 3;
export const SORTIE_PRECONDITION = 4;

// Repli si la protection de branche est illisible. Ce n'est PAS la source de
// vérité : la liste autoritaire vient de l'API, pour qu'un second check rendu
// obligatoire demain soit attendu sans toucher à ce fichier.
export const CONTEXTE_PAR_DEFAUT = 'verify';

const DELAI_PAR_DEFAUT_S = 900;
const INTERVALLE_S = 20;

// GitHub considère un check obligatoire `SKIPPED` ou `NEUTRAL` comme satisfait.
// On s'aligne plutôt que d'inventer une règle plus stricte que la protection
// elle-même, qui est ce qui décide réellement du merge.
const CONCLUSIONS_VERTES = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED']);
// `ACTION_REQUIRED` n'est pas un échec : c'est un run GELÉ, qui n'a rien
// exécuté. Le confondre avec un échec ferait chercher un bug inexistant ;
// le confondre avec un succès est le défaut que ce script existe pour tuer.
const CONCLUSION_GELEE = 'ACTION_REQUIRED';

/**
 * Normalise une entrée de `statusCheckRollup`, qui mélange deux formes :
 * `CheckRun` (`name` + `status` + `conclusion`) et `StatusContext`
 * (`context` + `state`). Lire une seule des deux laisse passer l'autre.
 *
 * @param {object} entree
 * @returns {{nom: string, termine: boolean, conclusion: string|null}}
 */
export function normaliserCheck(entree) {
  const nom = String(entree?.name ?? entree?.context ?? '').trim();
  if (typeof entree?.state === 'string' && entree?.status === undefined) {
    // StatusContext : un seul champ, `state`.
    const etat = entree.state.toUpperCase();
    return { nom, termine: etat !== 'PENDING', conclusion: etat === 'PENDING' ? null : etat };
  }
  const statut = String(entree?.status ?? '').toUpperCase();
  const conclusion = entree?.conclusion ? String(entree.conclusion).toUpperCase() : null;
  return { nom, termine: statut === 'COMPLETED', conclusion: statut === 'COMPLETED' ? conclusion : null };
}

/**
 * Explique, quand un check obligatoire n'a pas tourné, POURQUOI il n'a pas
 * tourné — au lieu de laisser le lecteur deviner entre trois causes dont une
 * seule est documentée. Rend `null` si aucune cause n'est diagnosticable : on
 * continue alors d'attendre, un run pouvant simplement n'être pas encore
 * enregistré.
 *
 * @param {object} faits
 * @returns {string|null}
 */
export function causeDuCheckAbsent(faits) {
  const etatFusion = String(faits?.pr?.mergeStateStatus ?? '').toUpperCase();
  const fusionnable = String(faits?.pr?.mergeable ?? '').toUpperCase();
  if (etatFusion === 'DIRTY' || fusionnable === 'CONFLICTING') {
    return 'la PR est en CONFLIT avec sa base — GitHub ne crée aucun run tant que le conflit dure. Fusionner la base dans la branche.';
  }
  if (faits?.auteurCommitTete && /copilot/i.test(faits.auteurCommitTete)) {
    return `le commit de tête est attribué à « ${faits.auteurCommitTete} » — le run passe en action_required et n'exécute rien sans approbation. Pousser un commit sous le compte du dépôt.`;
  }
  if (faits?.runsExistent === false) {
    return "aucun run n'existe pour le commit de tête — cas d'une branche squashée puis rebranchée. Repartir de `main`.";
  }
  return null;
}

/**
 * Verdict à partir de faits déjà collectés.
 *
 * L'ORDRE DES TESTS DÉCIDE DE CE QU'UN ÉCHEC RACONTE. Il est délibéré :
 * préconditions, puis échec franc (le plus actionnable), puis « n'a pas
 * tourné » (la raison d'être du script), puis l'attente, puis le délai, puis le
 * vert en dernier — un verdict vert ne peut donc jamais être atteint par
 * défaut, seulement en épuisant tout ce qui pourrait le contredire.
 *
 * @param {object} faits
 * @returns {{sortie: number|null, attendre: boolean, message: string}}
 */
export function diagnostiquer(faits) {
  if (!faits?.pr) {
    return {
      sortie: SORTIE_PRECONDITION,
      attendre: false,
      message: 'PR illisible (gh muet, non authentifié, ou numéro inexistant). Aucun verdict rendu.',
    };
  }
  const numero = faits.pr.numero;
  const etat = String(faits.pr.etat ?? '').toUpperCase();
  if (etat && etat !== 'OPEN') {
    return {
      sortie: SORTIE_PRECONDITION,
      attendre: false,
      message: `PR #${numero} : état ${etat}, pas OPEN. Rien à attendre.`,
    };
  }

  const requis = faits.contextesRequis?.length ? faits.contextesRequis : [CONTEXTE_PAR_DEFAUT];
  const repli = !faits.contextesRequis?.length
    ? `\n⚠ protection de branche illisible : repli sur « ${CONTEXTE_PAR_DEFAUT} ». La liste réellement obligatoire n'a pas été vérifiée.`
    : '';

  const checks = (faits.rollup ?? []).map(normaliserCheck).filter((c) => c.nom !== '');
  const parNom = new Map(checks.map((c) => [c.nom, c]));

  // 1. Un check obligatoire a CONCLU en échec.
  const echoues = requis
    .map((nom) => parNom.get(nom))
    .filter((c) => c && c.termine && c.conclusion !== CONCLUSION_GELEE && !CONCLUSIONS_VERTES.has(c.conclusion));
  if (echoues.length > 0) {
    const detail = echoues.map((c) => `${c.nom} → ${c.conclusion}`).join(', ');
    return {
      sortie: SORTIE_ECHEC,
      attendre: false,
      message: `PR #${numero} : check obligatoire en ÉCHEC (${detail}). Ne pas merger.${repli}`,
    };
  }

  // 2. Un check obligatoire n'a pas tourné — absent du rollup, ou gelé.
  const geles = requis.map((nom) => parNom.get(nom)).filter((c) => c && c.conclusion === CONCLUSION_GELEE);
  if (geles.length > 0) {
    const noms = geles.map((c) => c.nom).join(', ');
    return {
      sortie: SORTIE_N_A_PAS_TOURNE,
      attendre: false,
      message:
        `PR #${numero} : le check obligatoire « ${noms} » est en action_required — le run est GELÉ, ` +
        `il n'a rien exécuté. Ce n'est ni un succès ni un échec : la vérification n'a pas eu lieu.${repli}`,
    };
  }

  const absents = requis.filter((nom) => !parNom.has(nom));
  if (absents.length > 0) {
    const cause = causeDuCheckAbsent(faits);
    const vus = checks.length > 0 ? checks.map((c) => c.nom).join(', ') : 'aucun';
    const enTete =
      `PR #${numero} : le check obligatoire « ${absents.join(', ') } » n'a JAMAIS été créé. ` +
      `Checks présents : ${vus}. Un CI vert sur les autres checks ne prouve rien ici.`;
    // Sans cause diagnosticable, un run peut simplement n'être pas encore
    // enregistré : on attend. Mais à l'expiration, le verdict reste « n'a pas
    // tourné » et JAMAIS « délai dépassé » — l'absence est l'information utile.
    if (cause === null && !faits.delaiDepasse) {
      return { sortie: null, attendre: true, message: `${enTete} Aucune cause diagnosticable pour l'instant ; on attend.` };
    }
    return {
      sortie: SORTIE_N_A_PAS_TOURNE,
      attendre: false,
      message: `${enTete}\nCause : ${cause ?? 'non diagnosticable — vérifier à la main pourquoi aucun run n\'a été créé.'}${repli}`,
    };
  }

  // 3. Les checks obligatoires existent mais n'ont pas tous conclu.
  const enCours = requis.map((nom) => parNom.get(nom)).filter((c) => c && !c.termine);
  if (enCours.length > 0) {
    if (faits.delaiDepasse) {
      const noms = enCours.map((c) => c.nom).join(', ');
      return {
        sortie: SORTIE_DELAI,
        attendre: false,
        message:
          `PR #${numero} : délai dépassé, « ${noms} » n'a pas conclu. ` +
          `Expirer n'est pas réussir — aucun verdict vert n'est rendu.${repli}`,
      };
    }
    return {
      sortie: null,
      attendre: true,
      message: `PR #${numero} : ${enCours.map((c) => c.nom).join(', ')} en cours.`,
    };
  }

  // 4. Tout est vert. Les checks NON obligatoires en échec sont SIGNALÉS mais
  // ne changent pas le code de sortie : ce n'est pas eux qui gardent `main`.
  const autresEnEchec = checks.filter(
    (c) => !requis.includes(c.nom) && c.termine && c.conclusion !== null && !CONCLUSIONS_VERTES.has(c.conclusion),
  );
  const reserve =
    autresEnEchec.length > 0
      ? `\n⚠ check(s) NON obligatoire(s) en échec : ${autresEnEchec.map((c) => `${c.nom} → ${c.conclusion}`).join(', ')}.`
      : '';
  return {
    sortie: SORTIE_VERT,
    attendre: false,
    message: `PR #${numero} : ${requis.join(', ')} — a réellement tourné, et est vert.${reserve}${repli}`,
  };
}

// ---------------------------------------------------------------------------
// Câblage CLI — collecte des faits. Rien ici n'est testé par le banc : tout ce
// qui décide est au-dessus.
// ---------------------------------------------------------------------------

function gh(args) {
  try {
    return execFileSync('gh', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function jsonOuNull(texte) {
  if (texte === null || texte === '') return null;
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

function collecter(numero) {
  const vue = jsonOuNull(
    gh(['pr', 'view', String(numero), '--json', 'number,state,mergeable,mergeStateStatus,baseRefName,headRefOid,statusCheckRollup']),
  );
  if (!vue) return { pr: null };

  const protection = jsonOuNull(
    gh(['api', `repos/:owner/:repo/branches/${vue.baseRefName}/protection/required_status_checks`, '--jq', '.contexts']),
  );

  const commit = jsonOuNull(gh(['api', `repos/:owner/:repo/commits/${vue.headRefOid}`, '--jq', '{login: .author.login}']));

  const runs = jsonOuNull(gh(['api', `repos/:owner/:repo/actions/runs?head_sha=${vue.headRefOid}`, '--jq', '{n: .total_count}']));

  return {
    pr: {
      numero: vue.number,
      etat: vue.state,
      mergeable: vue.mergeable,
      mergeStateStatus: vue.mergeStateStatus,
    },
    contextesRequis: Array.isArray(protection) ? protection : null,
    rollup: Array.isArray(vue.statusCheckRollup) ? vue.statusCheckRollup : [],
    auteurCommitTete: commit?.login ?? null,
    runsExistent: runs === null ? null : runs.n > 0,
    delaiDepasse: false,
  };
}

const dors = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

async function principal(argv) {
  const numero = argv.find((a) => /^\d+$/.test(a));
  if (!numero) {
    console.error('Usage : node scripts/wn-attendre-ci.mjs <n° de PR> [--delai <secondes>]');
    return SORTIE_PRECONDITION;
  }
  const iDelai = argv.indexOf('--delai');
  const delai = iDelai >= 0 && /^\d+$/.test(argv[iDelai + 1] ?? '') ? Number(argv[iDelai + 1]) : DELAI_PAR_DEFAUT_S;

  if (gh(['--version']) === null) {
    console.error('gh est indisponible. Aucun verdict rendu.');
    return SORTIE_PRECONDITION;
  }

  const debut = Date.now();
  let dernierMessage = '';
  for (;;) {
    const faits = collecter(numero);
    faits.delaiDepasse = (Date.now() - debut) / 1000 >= delai;
    const verdict = diagnostiquer(faits);
    if (!verdict.attendre) {
      console.log(verdict.message);
      return verdict.sortie;
    }
    if (verdict.message !== dernierMessage) {
      console.log(verdict.message);
      dernierMessage = verdict.message;
    }
    await dors(INTERVALLE_S);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv.slice(2)).then((code) => process.exit(code));
}
