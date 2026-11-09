#!/usr/bin/env node
// Lecteur de la revue Copilot, second recours entre CodeRabbit et PR-Agent
// (D-466). LECTURE SEULE — l'API GitHub en GET ; il ne demande aucune revue,
// ne commente pas, ne merge pas.
//
//   node scripts/wn-revue-copilot.mjs --quota   le quota est-il présumé disponible ?
//   node scripts/wn-revue-copilot.mjs <N>       la revue de Copilot porte-t-elle sur la tête de <N> ?
//
// Appelé par `wn-merge` (étape 6) et par les sessions sans `/wn-*`, quand
// CodeRabbit a sauté la PR ou bute sur son quota (D-393 §1) ; il ne vérifie
// pas cette précondition. Il ne juge pas les remarques de Copilot : leur
// verdict reste un geste de la session (règle 1.2).
//
// LE QUOTA (D-466 §2). Aucune API n'expose à une session le quota restant de
// Copilot : seul son refus se lit. Le quota est PRÉSUMÉ DISPONIBLE tant
// qu'aucune revue de Copilot ne dit « insufficient remaining quota » depuis le
// 1er du mois en cours (UTC), date de remise à zéro des requêtes premium. Un
// tel refus vaut « épuisé » jusqu'au mois suivant. Le lecteur parcourt les PR
// mises à jour depuis le 1er du mois (tri par mise à jour, arrêt au premier
// plus ancien) et leurs revues.
//
// LA PREUVE SUR LA TÊTE (D-466 §3). Une revue de `copilot-pull-request-
// reviewer[bot]` dont le `commit_id` est la tête et dont le corps n'est pas
// un refus (« Copilot was unable to review… »). Copilot ne relit qu'une fois :
// une revue sur une tête précédente ne vaut pas pour la tête.
//
// CODES DE SORTIE — `0` seul vaut quota présumé (--quota) ou revue de la tête :
//   0 oui · 1 non (quota épuisé ; revue absente ou refus) · 2 lecture
//   impossible (jamais lue comme un 0) · 3 usage.

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_OUI = 0;
export const SORTIE_NON = 1;
export const SORTIE_ILLISIBLE = 2;
export const SORTIE_USAGE = 3;

/** L'auteur des revues de Copilot (constaté sur #1795 à #1941). */
export const AUTEUR_COPILOT = 'copilot-pull-request-reviewer[bot]';
/** Le début de tout refus de Copilot ; « insufficient remaining quota » en dit la cause. */
export const PREFIXE_REFUS = 'Copilot was unable to review';
export const MOTIF_QUOTA = 'insufficient remaining quota';

const estDeCopilot = (r) => r?.user?.login === AUTEUR_COPILOT;
export const estRefus = (r) => typeof r?.body === 'string' && r.body.trimStart().startsWith(PREFIXE_REFUS);
export const estRefusQuota = (r) => estRefus(r) && r.body.includes(MOTIF_QUOTA);

/** Le 1er du mois de `maintenant`, à minuit UTC. */
export function debutDuMois(maintenant) {
  const d = new Date(maintenant);
  if (Number.isNaN(d.getTime())) throw new Error(`date illisible : ${maintenant}`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const date = (iso) => {
  const t = Date.parse(iso ?? '');
  if (Number.isNaN(t)) throw new Error(`date illisible : ${iso}`);
  return t;
};

/**
 * Noyau du quota : `revuesParPr` = [{ pr, revues }]. Rend le refus pour quota
 * le plus récent depuis `depuis`, ou null.
 */
export function jugerQuota(revuesParPr, depuis) {
  const borne = depuis.getTime();
  let dernier = null;
  for (const { pr, revues } of revuesParPr) {
    for (const r of revues) {
      if (!estDeCopilot(r) || !estRefusQuota(r)) continue;
      const t = date(r.submitted_at);
      if (t < borne) continue;
      if (!dernier || t > dernier.t) dernier = { pr, t, quand: r.submitted_at };
    }
  }
  return dernier;
}

/** Noyau de la preuve : la revue de Copilot qui porte sur la tête, ou le motif de son absence. */
export function jugerTete(revues, tete) {
  const deCopilot = revues.filter(estDeCopilot);
  const surTete = deCopilot.filter((r) => r.commit_id === tete);
  const vraie = surTete.find((r) => !estRefus(r));
  if (vraie) return { code: SORTIE_OUI, motif: `revue de Copilot sur la tête (${vraie.submitted_at})` };
  if (surTete.some(estRefusQuota)) return { code: SORTIE_NON, motif: 'refus de Copilot sur la tête : quota épuisé' };
  if (surTete.some(estRefus)) return { code: SORTIE_NON, motif: 'refus de Copilot sur la tête, sans revue' };
  if (deCopilot.some((r) => !estRefus(r))) return { code: SORTIE_NON, motif: 'revue de Copilot sur une tête précédente seulement' };
  return { code: SORTIE_NON, motif: 'aucune revue de Copilot' };
}

export function analyserArguments(argv) {
  if (argv.length === 1 && argv[0] === '--quota') return { mode: 'quota' };
  if (argv.length === 1 && /^[1-9]\d*$/.test(argv[0])) return { mode: 'tete', pr: Number(argv[0]) };
  return { erreur: 'usage : node scripts/wn-revue-copilot.mjs --quota | <numéro de PR>' };
}

const aPlat = (pages) => (Array.isArray(pages) && pages.every(Array.isArray) ? pages.flat() : pages);

/** Collecte et jugement ; `lireJson(chemin, paginer)` est injecté (banc sans réseau). */
export function lire({ mode, pr, lireJson, maintenant = new Date().toISOString() }) {
  const lignes = [];
  try {
    const depot = lireJson('repos/{owner}/{repo}', false).full_name;
    if (typeof depot !== 'string' || !depot.includes('/')) throw new Error('dépôt illisible');
    if (mode === 'quota') {
      const depuis = debutDuMois(maintenant);
      const revuesParPr = [];
      for (let page = 1; ; page += 1) {
        const prs = lireJson(`repos/${depot}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`, false);
        if (!Array.isArray(prs)) throw new Error('liste des PR illisible');
        if (prs.length === 0) break;
        let ancien = false;
        for (const p of prs) {
          if (date(p.updated_at) < depuis.getTime()) { ancien = true; break; }
          revuesParPr.push({ pr: p.number, revues: aPlat(lireJson(`repos/${depot}/pulls/${p.number}/reviews?per_page=100`, true)) });
        }
        if (ancien || prs.length < 100) break;
      }
      const refus = jugerQuota(revuesParPr, depuis);
      const depuisIso = depuis.toISOString().slice(0, 10);
      if (refus) {
        lignes.push(`❌ quota présumé épuisé : refus pour quota sur #${refus.pr} le ${refus.quand}, depuis le ${depuisIso}`);
        lignes.push(`COPILOT quota code=${SORTIE_NON} depuis=${depuisIso} refus=#${refus.pr}`);
        return { code: SORTIE_NON, lignes };
      }
      lignes.push(`✓ quota présumé disponible : aucun refus pour quota depuis le ${depuisIso} (${revuesParPr.length} PR lues)`);
      lignes.push(`COPILOT quota code=${SORTIE_OUI} depuis=${depuisIso}`);
      return { code: SORTIE_OUI, lignes };
    }
    const tete = lireJson(`repos/${depot}/pulls/${pr}`, false)?.head?.sha;
    if (!/^[0-9a-f]{40}$/.test(tete ?? '')) throw new Error(`tête illisible pour #${pr}`);
    const revues = aPlat(lireJson(`repos/${depot}/pulls/${pr}/reviews?per_page=100`, true));
    if (!Array.isArray(revues)) throw new Error(`revues illisibles pour #${pr}`);
    const v = jugerTete(revues, tete);
    lignes.push(`${v.code === SORTIE_OUI ? '✓' : '❌'} ${v.motif}`);
    lignes.push(`REVUE copilot code=${v.code} pr=${pr} tete=${tete}`);
    return { code: v.code, lignes };
  } catch (err) {
    lignes.push(`❌ Lecture impossible — rien n'est établi : ${String(err?.message ?? err).split('\n')[0]}`);
    lignes.push(`COPILOT code=${SORTIE_ILLISIBLE}${pr ? ` pr=${pr}` : ''}`);
    return { code: SORTIE_ILLISIBLE, lignes };
  }
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

function lancer(args) {
  return execFileSync('gh', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

function principal(argv) {
  const args = analyserArguments(argv);
  if (args.erreur) {
    console.error(args.erreur);
    return SORTIE_USAGE;
  }
  const { code, lignes } = lire({
    ...args,
    lireJson: (chemin, paginer) => JSON.parse(lancer(['api', ...(paginer ? ['--paginate', '--slurp'] : []), chemin])),
  });
  for (const l of lignes) (code === SORTIE_ILLISIBLE ? console.error : console.log)(l);
  return code;
}

// Chemin réel des deux côtés : lancé par un lien symbolique, le script doit
// juger, pas sortir en 0 sans rien dire.
const lanceDirectement = () => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (lanceDirectement()) {
  process.exit(principal(process.argv.slice(2)));
}
