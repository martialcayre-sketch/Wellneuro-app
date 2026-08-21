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
// Ce script NE MERGE PAS : le régime du merge est celui de `CLAUDE.md`. Mais le
// code `0` autorise à annoncer une PR prête, donc il doit se taire dès qu'il ne
// peut PAS l'affirmer — un CI vert sur une PR en conflit, une liste de checks
// obligatoires qu'on n'a pas pu lire, un nom de check porté par deux runs dont
// un seul est vert. Chacun de ces cas a son code ; aucun ne rend 0.
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
export const SORTIE_INDETERMINE = 4;
export const SORTIE_NON_FUSIONNABLE = 5;

// Repli si la protection de branche est illisible. Il sert à DIAGNOSTIQUER,
// jamais à conclure au vert : sans la liste autoritaire, on ne sait pas ce
// qu'on aurait dû attendre (voir `SORTIE_INDETERMINE`).
export const CONTEXTE_PAR_DEFAUT = 'verify';

const DELAI_PAR_DEFAUT_S = 900;
// Cadence adaptative : 20 s au départ (les échecs francs tombent tôt), puis
// +15 s par tour jusqu'au plafond une fois l'attente installée — un CI
// simplement en cours ne mérite pas d'être sondé toutes les 20 s. CI de
// ~5 min : ~8 lectures au lieu de 15 à cadence fixe.
const INTERVALLE_S = 20;
const INTERVALLE_MAX_S = 60;
// Plafond adaptatif : un délai demandé au-delà du défaut (900 s) signale un CI
// long — le sonder toutes les 60 s pendant une heure n'apprend rien de plus
// que toutes les 120 s. En deçà, comportement strictement identique.
// Expression pure, exportée pour le banc.
export const intervalleMaxPourDelai = (delaiS) => (delaiS > DELAI_PAR_DEFAUT_S ? 120 : INTERVALLE_MAX_S);

// GitHub considère un check obligatoire `SKIPPED` ou `NEUTRAL` comme satisfait.
// On s'aligne plutôt que d'inventer une règle plus stricte que la protection
// elle-même, qui est ce qui décide réellement du merge.
const CONCLUSIONS_VERTES = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED']);
// La seule conclusion qui prouve qu'un job a EXÉCUTÉ quelque chose. Distincte
// de `CONCLUSIONS_VERTES`, qui dit ce que la protection de branche accepte :
// un `SKIPPED` satisfait le merge sans avoir rien vérifié.
const CONCLUSION_REUSSIE = 'SUCCESS';
// `ACTION_REQUIRED` n'est pas un échec : c'est un run GELÉ, qui n'a rien
// exécuté. Le confondre avec un échec ferait chercher un bug inexistant ;
// le confondre avec un succès est le défaut que ce script existe pour tuer.
const CONCLUSION_GELEE = 'ACTION_REQUIRED';
// `CANCELLED` n'est pas un échec d'exécution : depuis le bloc `concurrency` de
// `ci.yml` (2026-08-07), c'est la trace NORMALE d'un run supplanté par une
// poussée plus récente. Le classer en échec enverrait lire le log d'un run qui
// n'a rien prouvé ; le classer vert annoncerait prête une PR jamais vérifiée.
// On attend le run du nouveau commit de tête ; à l'expiration, le verdict est
// « n'a pas tourné » — jamais un succès.
const CONCLUSION_ANNULEE = 'CANCELLED';

// Un conflit rend la PR non fusionnable QUEL QUE SOIT l'état des checks : le
// vert porte alors sur un commit qui n'est pas le résultat de la fusion.
// `BLOCKED` est délibérément absent — il couvre le cas ordinaire d'une PR en
// attente de revue, et bloquerait presque toutes les PR ; `UNKNOWN` l'est aussi,
// GitHub le rendant le temps de calculer la fusion.
const FUSION_IMPOSSIBLE = new Set(['DIRTY']);

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
  // `__typename` est le discriminant contractuel de l'API ; l'absence de
  // `status` n'en est qu'un symptôme, qui cesserait d'être vrai si `gh`
  // émettait un jour `status: null` — tous les StatusContext deviendraient
  // alors « en cours », et l'attente n'aboutirait jamais.
  const estContexte =
    entree?.__typename === 'StatusContext' ||
    (entree?.__typename === undefined && typeof entree?.state === 'string' && entree?.status === undefined);
  if (estContexte) {
    const etat = String(entree?.state ?? '').toUpperCase();
    return { nom, termine: etat !== '' && etat !== 'PENDING', conclusion: etat === '' || etat === 'PENDING' ? null : etat };
  }
  const statut = String(entree?.status ?? '').toUpperCase();
  const conclusion = entree?.conclusion ? String(entree.conclusion).toUpperCase() : null;
  return { nom, termine: statut === 'COMPLETED', conclusion: statut === 'COMPLETED' ? conclusion : null };
}

/**
 * Agrège TOUTES les entrées portant le même nom.
 *
 * Un `Map` construit par `checks.map(...)` garderait la DERNIÈRE entrée d'un
 * nom, c'est-à-dire l'ordre du tableau — que l'API ne garantit pas. Ce n'est
 * pas théorique : jusqu'au 2026-08-07, `ci.yml` se déclenchait sur `push` ET
 * sur `pull_request`, donc une PR issue d'une branche `campaign/**` portait
 * DEUX runs nommés `verify` (observé sur la PR #528) ; un rouge suivi d'un vert
 * se lisait « vert ». Le déclencheur `push` a été retiré pour ces branches, le
 * garde reste : rien ne garantit l'unicité d'un nom dans le rollup (relance,
 * workflow homonyme, run annulé par `concurrency` doublé de son remplaçant).
 *
 * @param {Array} checks
 * @returns {Map<string, {nom: string, entrees: Array, aEchec: boolean, aGele: boolean, aAnnule: boolean, enCours: boolean}>}
 */
export function agregerParNom(checks) {
  const parNom = new Map();
  for (const c of checks) {
    const agg = parNom.get(c.nom) ?? { nom: c.nom, entrees: [], aEchec: false, aGele: false, aAnnule: false, enCours: false };
    agg.entrees.push(c);
    if (!c.termine) agg.enCours = true;
    else if (c.conclusion === CONCLUSION_GELEE) agg.aGele = true;
    else if (c.conclusion === CONCLUSION_ANNULEE) agg.aAnnule = true;
    else if (!CONCLUSIONS_VERTES.has(c.conclusion)) agg.aEchec = true;
    parNom.set(c.nom, agg);
  }
  return parNom;
}

/**
 * Explique, quand un check obligatoire n'a pas tourné, POURQUOI. Les causes
 * sont CUMULÉES : une PR peut être à la fois en conflit et gelée, et n'en
 * nommer qu'une enverrait corriger la moitié du problème.
 *
 * Rend `[]` si aucune cause n'est diagnosticable : on continue alors d'attendre,
 * un run pouvant simplement n'être pas encore enregistré.
 *
 * @param {object} faits
 * @returns {string[]}
 */
export function causesDuCheckAbsent(faits) {
  const causes = [];
  const etatFusion = String(faits?.pr?.mergeStateStatus ?? '').toUpperCase();
  const fusionnable = String(faits?.pr?.mergeable ?? '').toUpperCase();
  if (FUSION_IMPOSSIBLE.has(etatFusion) || fusionnable === 'CONFLICTING') {
    causes.push('la PR est en CONFLIT avec sa base — GitHub ne crée aucun run tant que le conflit dure. Fusionner la base dans la branche.');
  }
  if (faits?.auteurCommitTete && /copilot/i.test(faits.auteurCommitTete)) {
    causes.push(
      `le commit de tête est attribué à « ${faits.auteurCommitTete} » — le run passe en action_required et n'exécute rien sans approbation. Pousser un commit sous le compte du dépôt.`,
    );
  }
  if (faits?.runsExistent === false) {
    causes.push("aucun run n'existe pour le commit de tête — cas d'une branche squashée puis rebranchée. Repartir de `main`.");
  }
  return causes;
}

/**
 * Verdict à partir de faits déjà collectés.
 *
 * L'ORDRE DES TESTS DÉCIDE DE CE QU'UN ÉCHEC RACONTE. Il est délibéré :
 * préconditions, puis échec franc (le plus actionnable), puis « n'a pas
 * tourné » (la raison d'être du script), puis l'attente, puis le délai, puis
 * les deux réserves qui interdisent de conclure au vert, et le vert en dernier
 * — il ne peut donc jamais être atteint par défaut, seulement en épuisant tout
 * ce qui pourrait le contredire.
 *
 * @param {object} faits
 * @returns {{sortie: number|null, attendre: boolean, message: string}}
 */
export function diagnostiquer(faits) {
  if (!faits?.pr) {
    return {
      sortie: SORTIE_INDETERMINE,
      attendre: false,
      message: 'PR illisible (gh muet, non authentifié, ou numéro inexistant). Aucun verdict rendu.',
    };
  }
  const numero = faits.pr.numero;
  const etat = String(faits.pr.etat ?? '').toUpperCase();
  if (etat && etat !== 'OPEN') {
    return {
      sortie: SORTIE_INDETERMINE,
      attendre: false,
      message: `PR #${numero} : état ${etat}, pas OPEN. Rien à attendre.`,
    };
  }

  // `null` (API illisible) et `[]` (protection sans check obligatoire) sont
  // TRAITÉS PAREIL et ne mènent jamais au vert : dans les deux cas, on ignore
  // ce qu'il fallait attendre. Confondre `[]` avec « rien à attendre » rendrait
  // un vert inconditionnel sur un rollup vide.
  const listeConnue = Array.isArray(faits.contextesRequis) && faits.contextesRequis.length > 0;
  const requis = listeConnue ? faits.contextesRequis : [CONTEXTE_PAR_DEFAUT];

  const checks = (faits.rollup ?? []).map(normaliserCheck).filter((c) => c.nom !== '');
  const parNom = agregerParNom(checks);

  // 1. Un check obligatoire a CONCLU en échec — sur au moins une de ses entrées.
  const echoues = requis.map((nom) => parNom.get(nom)).filter((a) => a && a.aEchec);
  if (echoues.length > 0) {
    const detail = echoues
      // Un `COMPLETED` sans conclusion n'est pas « en cours » — c'est l'état
      // exactement opposé, et le nommer ainsi enverrait attendre un run fini.
      .map((a) => `${a.nom} → ${a.entrees.map((e) => e.conclusion ?? (e.termine ? 'sans conclusion' : 'non terminé')).join('/')}`)
      .join(', ');
    return {
      sortie: SORTIE_ECHEC,
      attendre: false,
      message: `PR #${numero} : check obligatoire en ÉCHEC (${detail}). Ne pas merger.`,
    };
  }

  // 2. Un check obligatoire n'a pas tourné — gelé, ou absent du rollup.
  const geles = requis.map((nom) => parNom.get(nom)).filter((a) => a && a.aGele);
  if (geles.length > 0) {
    return {
      sortie: SORTIE_N_A_PAS_TOURNE,
      attendre: false,
      message:
        `PR #${numero} : le check obligatoire « ${geles.map((a) => a.nom).join(', ')} » est en action_required — ` +
        `le run est GELÉ, il n'a rien exécuté. Ce n'est ni un succès ni un échec : la vérification n'a pas eu lieu.`,
    };
  }

  // 2bis. Un check obligatoire a été ANNULÉ (`concurrency` : run supplanté par
  // une poussée plus récente, ou annulation manuelle). S'il a une relance en
  // cours, le bloc 3 la traite ; sinon on attend le run du nouveau commit de
  // tête — et à l'expiration, le verdict est « n'a pas tourné », jamais un
  // échec (le log n'apprendrait rien) ni un vert (rien n'a été vérifié).
  //
  // Deux réserves, chacune apprise d'un cas concret :
  //
  // · un run `SUCCESS` du même nom couvre l'annulé. Le rollup porte les checks
  //   du commit de tête : si `verify` y a réussi, la vérification a bien eu
  //   lieu, quel qu'ait été le sort d'une tentative précédente. C'est
  //   l'asymétrie entre annulé et échoué — un échec est une information
  //   (quelque chose a cassé, et un vert ne l'efface pas), une annulation n'en
  //   est pas une. Sans cette réserve, une PR relancée après annulation
  //   manuelle restait bloquée INDÉFINIMENT : aucune relance ne la débloquait,
  //   le script conseillait de pousser un commit pour repayer un cycle entier.
  //   `SUCCESS` SEUL, et non `CONCLUSIONS_VERTES` : `SKIPPED` y figure parce que
  //   la protection de branche s'en satisfait, mais un job sauté n'a rien
  //   exécuté — le laisser couvrir un annulé ferait dire « a réellement tourné »
  //   d'une PR où justement rien n'a tourné ;
  //
  // · si une cause EMPÊCHE le run remplaçant d'exister (PR en conflit, branche
  //   squashée), attendre ne sert à rien. Le bloc `absents` juste en dessous
  //   raisonne déjà ainsi ; ne pas le faire ici créerait deux réponses
  //   opposées à la même question dans le même fichier.
  const annules = requis
    .map((nom) => parNom.get(nom))
    .filter(
      (a) => a && a.aAnnule && !a.enCours && !a.entrees.some((e) => e.termine && e.conclusion === CONCLUSION_REUSSIE),
    );
  if (annules.length > 0) {
    const noms = annules.map((a) => a.nom).join(', ');
    const causes = causesDuCheckAbsent(faits);
    if (causes.length === 0 && !faits.delaiDepasse) {
      return {
        sortie: null,
        attendre: true,
        message:
          `PR #${numero} : le run de « ${noms} » a été ANNULÉ (probablement supplanté par une poussée ` +
          `plus récente) ; on attend le run du commit de tête.`,
      };
    }
    const detail = causes.length > 0 ? `\nCause(s) :${causes.map((c) => `\n  · ${c}`).join('')}` : '';
    return {
      sortie: SORTIE_N_A_PAS_TOURNE,
      attendre: false,
      message:
        `PR #${numero} : le run du check obligatoire « ${noms} » a été ANNULÉ et aucun run ne l'a remplacé. ` +
        `Ce n'est ni un succès ni un échec : la vérification n'a pas eu lieu. ` +
        `Relancer le run, ou pousser un commit.${detail}`,
    };
  }

  const absents = requis.filter((nom) => !parNom.has(nom));
  if (absents.length > 0) {
    const causes = causesDuCheckAbsent(faits);
    const vus = checks.length > 0 ? [...new Set(checks.map((c) => c.nom))].join(', ') : 'aucun';
    const enTete =
      `PR #${numero} : le check obligatoire « ${absents.join(', ')} » n'a JAMAIS été créé. ` +
      `Checks présents : ${vus}. Un CI vert sur les autres checks ne prouve rien ici.`;
    // Sans cause diagnosticable, un run peut simplement n'être pas encore
    // enregistré : on attend. Mais à l'expiration, le verdict reste « n'a pas
    // tourné » et JAMAIS « délai dépassé » — l'absence est l'information utile.
    if (causes.length === 0 && !faits.delaiDepasse) {
      return { sortie: null, attendre: true, message: `${enTete} Aucune cause diagnosticable pour l'instant ; on attend.` };
    }
    const detail = causes.length > 0 ? causes.map((c) => `\n  · ${c}`).join('') : "\n  · non diagnosticable — vérifier à la main pourquoi aucun run n'a été créé.";
    return { sortie: SORTIE_N_A_PAS_TOURNE, attendre: false, message: `${enTete}\nCause(s) :${detail}` };
  }

  // 3. Les checks obligatoires existent mais n'ont pas tous conclu.
  const enCours = requis.map((nom) => parNom.get(nom)).filter((a) => a && a.enCours);
  if (enCours.length > 0) {
    const noms = enCours.map((a) => a.nom).join(', ');
    if (faits.delaiDepasse) {
      return {
        sortie: SORTIE_DELAI,
        attendre: false,
        message: `PR #${numero} : délai dépassé, « ${noms} » n'a pas conclu. Expirer n'est pas réussir — aucun verdict vert n'est rendu.`,
      };
    }
    return { sortie: null, attendre: true, message: `PR #${numero} : ${noms} en cours.` };
  }

  // 4. Tous les checks obligatoires sont verts — mais deux réserves interdisent
  // encore de le dire, parce que le code 0 autorise à annoncer une PR prête.

  // 4a. La liste attendue n'a pas pu être lue : on ignore ce qu'on aurait dû
  // attendre, et on ne peut donc pas qualifier les AUTRES checks de « non
  // obligatoires » — ce serait affirmer ce qu'on vient d'échouer à lire.
  if (!listeConnue) {
    return {
      sortie: SORTIE_INDETERMINE,
      attendre: false,
      message:
        `PR #${numero} : « ${CONTEXTE_PAR_DEFAUT} » est vert, mais la liste des checks OBLIGATOIRES n'a pas pu être lue ` +
        `(protection de branche illisible ou vide). On ignore ce qu'il fallait attendre : aucun verdict vert n'est rendu.`,
    };
  }

  // 4b. Une PR en conflit n'est pas fusionnable, quel que soit l'état des
  // checks : leur vert porte sur un commit qui n'est pas le résultat fusionné.
  const etatFusion = String(faits.pr.mergeStateStatus ?? '').toUpperCase();
  const fusionnable = String(faits.pr.mergeable ?? '').toUpperCase();
  if (FUSION_IMPOSSIBLE.has(etatFusion) || fusionnable === 'CONFLICTING') {
    return {
      sortie: SORTIE_NON_FUSIONNABLE,
      attendre: false,
      message:
        `PR #${numero} : ${requis.join(', ')} est vert, mais la PR est en CONFLIT avec sa base ` +
        `(mergeable=${faits.pr.mergeable}, mergeStateStatus=${faits.pr.mergeStateStatus}). ` +
        `Ce vert porte sur un commit qui n'est pas le résultat de la fusion. Fusionner la base, puis relancer.`,
    };
  }

  // Les checks NON obligatoires en échec sont SIGNALÉS mais ne changent pas le
  // code de sortie : ce n'est pas eux qui gardent `main`.
  const autresEnEchec = [...parNom.values()].filter((a) => !requis.includes(a.nom) && a.aEchec);
  const reserve =
    autresEnEchec.length > 0
      ? `\n⚠ check(s) NON obligatoire(s) en échec : ${autresEnEchec.map((a) => a.nom).join(', ')}.`
      : '';
  return {
    sortie: SORTIE_VERT,
    attendre: false,
    message: `PR #${numero} : ${requis.join(', ')} — a réellement tourné, et est vert.${reserve}`,
  };
}

/**
 * Analyse les arguments. Les drapeaux et LEUR VALEUR sont consommés d'abord :
 * sinon `--delai 60 553` retient « 60 » comme numéro de PR et rend un verdict
 * sur une autre PR — visible dans le message, invisible dans le code de sortie,
 * qui est ce que consomme l'appelant.
 *
 * @param {string[]} argv
 * @returns {{numero: string|null, delai: number}}
 */
export function analyserArguments(argv) {
  let delai = DELAI_PAR_DEFAUT_S;
  const restants = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--delai') {
      if (/^\d+$/.test(argv[i + 1] ?? '')) delai = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    restants.push(argv[i]);
  }
  const numero = restants.find((a) => /^\d+$/.test(a)) ?? null;
  return { numero, delai };
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

// Deux caches séparés, chargés à des moments différents. Sans cache, une
// attente de 15 minutes coûtait 4 appels toutes les 20 s, soit 180 appels —
// plus que les 81 appels de sondage qui ont motivé la règle d'économie.
//
// La PROTECTION sert à chaque verdict : lue immédiatement, mémoïsée par
// branche cible (elle ne dépend que d'elle ; on ne mémoïse jamais un échec —
// une erreur transitoire sur le point le plus sensible aux droits rendrait
// `4` jusqu'au bout, là où un tour de boucle suffisait à s'en remettre).
const cacheProtection = new Map();

function contextesRequisDe(baseRefName) {
  if (cacheProtection.has(baseRefName)) return cacheProtection.get(baseRefName);
  const protection = jsonOuNull(
    gh([
      'api',
      `repos/:owner/:repo/branches/${baseRefName}/protection/required_status_checks`,
      // `.checks` porte le contexte ET l'app qui doit le publier ; `.contexts`
      // est le champ déprécié, conservé en repli.
      '--jq',
      '{c: ([.checks[]?.context] + (.contexts // []) | unique)}',
    ]),
  );
  const contextes = Array.isArray(protection?.c) ? protection.c : null;
  if (contextes !== null) cacheProtection.set(baseRefName, contextes);
  return contextes;
}

// L'AUTEUR du commit de tête et l'EXISTENCE des runs ne servent qu'aux
// diagnostics d'un check absent ou annulé (SORTIE_N_A_PAS_TOURNE) : ils se
// chargent PARESSEUSEMENT, quand ce verdict tombe — 1 appel api par SHA sur
// une CI normale au lieu de 3. Mémoïsation par valeur : l'auteur ne change
// pas ; `runsExistent=false` peut devenir vrai au tour suivant (runs en cours
// d'enregistrement) — le figer accusait à tort une « branche squashée ».
const cacheDiagnosticParSha = new Map();

function faitsDeDiagnostic(sha) {
  const connu = cacheDiagnosticParSha.get(sha);
  if (connu) return connu;
  const commit = jsonOuNull(gh(['api', `repos/:owner/:repo/commits/${sha}`, '--jq', '{login: .author.login}']));
  const runs = jsonOuNull(gh(['api', `repos/:owner/:repo/actions/runs?head_sha=${sha}`, '--jq', '{n: .total_count}']));
  const faits = {
    auteurCommitTete: commit?.login ?? null,
    // `null` (appel en échec) n'est PAS `false` (aucun run) : seul `false`
    // permet d'accuser une branche squashée.
    runsExistent: runs === null ? null : runs.n > 0,
  };
  if (faits.auteurCommitTete !== null && faits.runsExistent === true) {
    cacheDiagnosticParSha.set(sha, faits);
  }
  return faits;
}

function collecter(numero) {
  const vue = jsonOuNull(
    gh([
      'pr',
      'view',
      String(numero),
      '--json',
      'number,state,mergeable,mergeStateStatus,baseRefName,headRefOid,statusCheckRollup',
    ]),
  );
  if (!vue) return { pr: null };
  return {
    contextesRequis: contextesRequisDe(vue.baseRefName),
    // Chargés paresseusement par la boucle (faitsDeDiagnostic) quand le
    // verdict tombe en SORTIE_N_A_PAS_TOURNE — seuls chemins qui les lisent.
    auteurCommitTete: null,
    runsExistent: null,
    pr: {
      numero: vue.number,
      etat: vue.state,
      mergeable: vue.mergeable,
      mergeStateStatus: vue.mergeStateStatus,
      base: vue.baseRefName,
      headRefOid: vue.headRefOid,
    },
    rollup: Array.isArray(vue.statusCheckRollup) ? vue.statusCheckRollup : [],
    delaiDepasse: false,
  };
}

const dors = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

async function principal(argv) {
  const { numero, delai } = analyserArguments(argv);
  if (!numero) {
    console.error('Usage : node scripts/wn-attendre-ci.mjs <n° de PR> [--delai <secondes>]');
    return SORTIE_INDETERMINE;
  }
  // Plus de sonde `gh --version` : si `gh` est absent ou muet, le premier
  // `pr view` rend `pr: null` et le verdict sort en SORTIE_INDETERMINE avec un
  // message qui couvre ce cas.

  const debut = Date.now();
  let dernierMessage = '';
  let intervalle = INTERVALLE_S;
  const intervalleMax = intervalleMaxPourDelai(delai);
  let tours = 0;
  for (;;) {
    let faits = collecter(numero);
    faits.delaiDepasse = (Date.now() - debut) / 1000 >= delai;
    let verdict = diagnostiquer(faits);
    if (!verdict.attendre && verdict.sortie === SORTIE_N_A_PAS_TOURNE && faits.pr) {
      // Le seul verdict qui consomme l'auteur du commit et l'existence des
      // runs : les charger maintenant et re-rendre le verdict, dont le
      // message nommera toutes les causes applicables (Copilot, squash…).
      faits = { ...faits, ...faitsDeDiagnostic(faits.pr.headRefOid) };
      verdict = diagnostiquer(faits);
    }
    if (!verdict.attendre) {
      console.log(verdict.message);
      // Snapshot final : les outils enchaînés (ex. /wn-merge) le lisent au
      // lieu de refaire un `gh pr view`.
      if (faits.pr) {
        console.log(
          `SNAPSHOT PR#${faits.pr.numero} etat=${faits.pr.etat} mergeable=${faits.pr.mergeable} ` +
            `mergeState=${faits.pr.mergeStateStatus} base=${faits.pr.base ?? '?'} head=${faits.pr.headRefOid ?? '?'}`,
        );
      }
      return verdict.sortie;
    }
    if (verdict.message !== dernierMessage) {
      console.log(verdict.message);
      dernierMessage = verdict.message;
    }
    tours += 1;
    if (tours >= 2) intervalle = Math.min(intervalleMax, intervalle + 15);
    await dors(intervalle);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv.slice(2))
    // Sans ce filet, une exception devient un rejet non géré : Node sort en 1,
    // que la table de `CLAUDE.md` lit comme « un check obligatoire a échoué ».
    // Un plantage déguisé en échec de CI enverrait lire un log inexistant.
    .catch((err) => {
      console.error(`Erreur inattendue : ${err?.message ?? err}`);
      return SORTIE_INDETERMINE;
    })
    .then((code) => process.exit(code));
}
