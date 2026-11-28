#!/usr/bin/env node
// Merge d'une PR déclarée « prête @<sha> » par l'intégrateur (`D-373`,
// `D-454`), versé au dépôt et durci par `D-546` (lot `orchestrateur-l3-
// integrateur`, question 20261113-1941-d, réponse « Verser et durcir, avec
// délai de repentir »).
//
// Il remplace `integrer.sh`, qui vivait hors dépôt sans banc ni historique.
// Il en garde les étapes et les codes (7 bis, 7 ter, main inchangé, tête
// inchangée, PR empilées, merge lié au sha), et ajoute quatre gardes :
//
// 1. ORIGINE (§2) : la déclaration servie vient du propriétaire du dépôt, et
//    la tête de la PR du dépôt lui-même (`scripts/lib/origine-declaration.mjs`).
// 2. DÉLAI DE REPENTIR (§3) : aucun merge avant DIX MINUTES après la
//    déclaration servie. Toute parole sur la PR après elle — commentaire,
//    revue, commentaire en ligne, d'un humain ou d'un robot — suspend le
//    merge : la file redéclare, et le délai repart. Une déclaration modifiée
//    n'est jamais servie. Seuls les commentaires de l'intégrateur (le
//    propriétaire du dépôt, la marque `<!-- wn-integrateur -->` en première
//    ligne) ne suspendent pas. La parole se relit juste avant le merge.
// 3. BAIL UNIQUE (§4) : seule la session qui tient le bail merge. Le bail se
//    prend et se rend explicitement ; une autre session est refusée tant qu'il
//    est tenu, sauf reprise déclarée (`--reprendre`), écrite au journal.
// 4. JOURNAL DES MERGES (§5) : chaque passage, refus compris, ajoute une
//    ligne JSON au journal. Il vit dans le répertoire Git commun du clone
//    (`<git-common-dir>/wn-integrateur/`), jamais suivi ni poussé.
//
// Le filet de `D-454` (amendement du 2026-11-08) passe par le même script
// (`--filet`) : déclaration vieille de vingt minutes au moins, aucune prise
// en charge de l'intégrateur (commentaire marqué) depuis, sans bail. Il se
// joue depuis un worktree détaché sur `origin/main` : dans tous les modes, le
// script refuse si `scripts/` diffère de `main`.
//
//   WN_S=<scratchpad> node scripts/wn-integrer.mjs <N> <sha complet> [--sans-merge | --filet]
//   WN_S=<scratchpad> node scripts/wn-integrer.mjs bail prendre [--reprendre] | rendre | voir
//   node scripts/wn-integrer.mjs journal [--n K]
//
// `--sans-merge` joue tous les contrôles sans merger ; le délai et le bail y
// sont dits, pas exigés. La session est identifiée par `WN_S`, le
// scratchpad de la session courante, déjà exigé par `integrer.sh`.
//
// CODES DE SORTIE (ceux d'`integrer.sh`, puis les neufs)
//   0 merge fait (ou contrôles verts en `--sans-merge`) · 9 usage, ou copie
//   qui n'est pas la copie principale · 10 lecture GitHub impossible ·
//   11 déploiement · 12 contrôle de fusion · 13 chevauchement · 14 sonde
//   release-db · 15 main a bougé · 16 tête déplacée · 17 merge refusé, ou PR
//   non ouverte · 18 PR empilées · 19 origine non vérifiée · 20 délai de
//   repentir non échu · 21 parole après la déclaration (suspendu) · 22 bail
//   · 23 aucune déclaration « prête » sur ce sha · 25 mergée, mais l'avance
//   de la copie principale a échoué (à arbitrer) · 26 focus area de PR-Agent
//   dont le titre n'est cité par aucun commentaire du propriétaire jusqu'à la
//   déclaration, ou focus areas illisibles (`autonomie-pieges-restes`,
//   partie 14) · 27 preuve de revue absente : `wn-attendre-ci <N> --sha
//   <sha>` ne rend pas 0, ou `wn-revue-pr-agent <N>` ne rend pas 0 et la
//   déclaration servie ne porte pas le repli de `D-448` (partie 22).
//
// PREUVE DE REVUE (partie 22, arbitrage du 2026-11-27) : avant le
// déploiement, le script relance lui-même les deux preuves que la file a
// citées en déclarant. PR-Agent ne rend pas 0 : le merge n'est admis que si
// la déclaration SERVIE — elle seule, déjà d'origine vérifiée — cite
// « D-448 » et « wn-reviewer GO @<sha> » sur un préfixe du sha à merger.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { aplatirPages, brancheSure, versPrGraphql } from './lib/gh-rest.mjs';
import { titresFocus, titresNonCites } from './lib/focus-areas-pr-agent.mjs';
import { libelleOrigine, motifsOrigine } from './lib/origine-declaration.mjs';
import { declaration } from './wn-guetteur.mjs';
import { AUTEUR_PR_AGENT, MARQUEUR_REVUE } from './wn-revue-pr-agent.mjs';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Délai de repentir : dix minutes (20261113-1941-d). */
export const DELAI_REPENTIR_S = 600;
/** Filet de `D-454` (amendement du 2026-11-08) : vingt minutes. */
export const DELAI_FILET_S = 1200;
/** Marque des commentaires de l'intégrateur (prise en charge, attente). */
export const MARQUE_INTEGRATEUR = '<!-- wn-integrateur -->';

export const CODES = Object.freeze({
  ok: 0,
  usage: 9,
  lecture: 10,
  deploiement: 11,
  controle: 12,
  chevauchement: 13,
  releaseDb: 14,
  mainBouge: 15,
  teteDeplacee: 16,
  merge: 17,
  empilees: 18,
  origine: 19,
  delai: 20,
  parole: 21,
  bail: 22,
  declaration: 23,
  // 24 est évité : « porte 24 » désigne autre chose dans le plan.
  avance: 25,
  focus: 26,
  revue: 27,
});

const SHA_COMPLET = /^[0-9a-f]{40}$/;

// ── Fonctions pures ─────────────────────────────────────────────────────────

/**
 * Heure qui compte pour un commentaire : la plus tardive de sa création et de
 * sa dernière modification. Un commentaire modifié parle à l'heure de la
 * modification (contre-revue Codex : un ancien commentaire réécrit en
 * « prête @<sha> » ne doit pas sauter le délai).
 */
export function heureParole(c) {
  const cree = typeof c?.created_at === 'string' ? c.created_at : '';
  const modifie = typeof c?.updated_at === 'string' ? c.updated_at : '';
  return modifie > cree ? modifie : cree;
}

/** Un commentaire modifié après sa création. */
export const estModifie = (c) => typeof c?.updated_at === 'string' && c.updated_at > String(c?.created_at ?? '');

/**
 * La déclaration servie : le commentaire non robot « prête @<x> » le plus
 * récent dont `<x>` (7 caractères au moins) est un préfixe du sha à merger.
 * Une déclaration MODIFIÉE n'est jamais servie (revue `wn-reviewer`, P1) :
 * une déclaration barrée resterait lisible par le motif, et un ancien
 * commentaire réécrit sauterait le délai. La file redéclare par un
 * commentaire neuf ; la modification, elle, compte comme une parole.
 */
export function declarationServie(commentaires, sha) {
  let servie = null;
  for (const c of commentaires) {
    if (c?.user?.type === 'Bot' || estModifie(c)) continue;
    const d = declaration(c?.body);
    if (!d || d.length < 7 || !sha.startsWith(d.toLowerCase())) continue;
    if (!servie || heureParole(c) > heureParole(servie)) servie = c;
  }
  return servie;
}

/**
 * Un commentaire de l'intégrateur : un commentaire de conversation (jamais
 * une revue ni un commentaire en ligne), du propriétaire du dépôt (login et
 * `OWNER`, comme l'origine des déclarations), dont la PREMIÈRE ligne est la
 * marque. Une citation de la marque plus bas, ou un tiers qui la recopie,
 * ne valent pas.
 */
export function estCommentaireIntegrateur(type, x, proprietaire) {
  if (type !== 'commentaire' || x?.user?.type === 'Bot') return false;
  if (typeof proprietaire !== 'string' || proprietaire === '') return false;
  if (x?.user?.login !== proprietaire || x?.author_association !== 'OWNER') return false;
  return String(x?.body ?? '').split('\n', 1)[0].trim() === MARQUE_INTEGRATEUR;
}

/**
 * Paroles postérieures à la déclaration : commentaires et commentaires en
 * ligne (créés ou modifiés après elle), revues soumises. Une revue sans
 * `submitted_at` (brouillon) n'est pas une parole. Chaque parole porte
 * `integrateur` si c'est un commentaire de l'intégrateur.
 */
export function parolesApres(decl, { commentaires = [], revues = [], enLigne = [], proprietaire = '' }) {
  const depuis = heureParole(decl);
  const paroles = [];
  const ajouter = (type, x, quand) => {
    if (x?.id === decl.id && type === 'commentaire') return;
    // Non strict : une parole de la même seconde que la déclaration compte
    // (l'ordre dans la seconde est inconnu ; dans le doute, on suspend).
    if (typeof quand !== 'string' || quand === '' || !(quand >= depuis)) return;
    paroles.push({
      type,
      id: x?.id ?? null,
      auteur: x?.user?.login ?? '?',
      robot: x?.user?.type === 'Bot',
      at: quand,
      integrateur: estCommentaireIntegrateur(type, x, proprietaire),
    });
  };
  for (const c of commentaires) ajouter('commentaire', c, heureParole(c));
  for (const r of revues) ajouter('revue', r, r?.submitted_at);
  for (const c of enLigne) ajouter('en-ligne', c, heureParole(c));
  return paroles.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Focus areas de PR-Agent sans verdict (partie 14 d'`autonomie-pieges-
 * restes`). Chaque titre du commentaire persistant (`pr-agent:review:full`,
 * le dernier écrit) doit être cité, tel que PR-Agent l'écrit, par un
 * commentaire de conversation du propriétaire (`OWNER`, comme l'origine des
 * déclarations) dont l'heure de parole ne dépasse pas celle de la
 * déclaration — la déclaration elle-même comprise. Rend `{ titres,
 * manquants }` ; `titres` vaut `null` quand la section existe mais qu'aucun
 * titre ne s'y lit. Sans commentaire persistant : rien à exiger ici, la
 * preuve de revue reste celle de `wn-revue-pr-agent.mjs`.
 */
export function focusSansVerdict(decl, { commentaires = [], proprietaire = '' }) {
  const revues = commentaires.filter((c) => c?.user?.login === AUTEUR_PR_AGENT && String(c?.body ?? '').includes(MARQUEUR_REVUE));
  if (revues.length === 0) return { titres: [], manquants: [] };
  const revue = revues.reduce((a, b) => (heureParole(b) > heureParole(a) ? b : a));
  const titres = titresFocus(revue.body);
  if (titres === null) return { titres: null, manquants: [] };
  const limite = heureParole(decl);
  const textes = commentaires
    .filter((c) => c?.user?.type !== 'Bot' && typeof proprietaire === 'string' && proprietaire !== '' && c?.user?.login === proprietaire && c?.author_association === 'OWNER')
    .filter((c) => heureParole(c) <= limite)
    // L'intégrateur parle du même compte : son commentaire marqué qui
    // reprend un refus 26 citerait le titre à la place de la file (revue
    // `wn-reviewer`, partie 14).
    .filter((c) => !estCommentaireIntegrateur('commentaire', c, proprietaire))
    .map((c) => String(c?.body ?? ''));
  return { titres, manquants: titresNonCites(titres, textes) };
}

/**
 * Repli de `D-448` porté par la déclaration servie : elle cite « D-448 » et
 * « wn-reviewer GO @<x> », `<x>` (7 caractères au moins) préfixe du sha à
 * merger. Un GO sur une autre tête, ou cité ailleurs que dans la
 * déclaration servie, ne vaut pas : un commit poussé après le GO demande une
 * revue de l'écart, donc une déclaration neuve.
 */
export function repliD448(decl, sha) {
  const corps = String(decl?.body ?? '');
  if (!/(^|[^0-9A-Za-z])D-448(?![0-9])/.test(corps)) return false;
  for (const m of corps.matchAll(/wn-reviewer\s+GO\s+@([0-9a-fA-F]{7,40})(?![0-9a-fA-F])/g)) {
    if (sha.startsWith(m[1].toLowerCase())) return true;
  }
  return false;
}

/** Secondes restantes avant la fin d'un délai parti de `depuis` (ISO). */
export function secondesRestantes(depuis, maintenantMs, delaiS) {
  const t = Date.parse(depuis);
  if (!Number.isFinite(t)) return delaiS;
  return Math.max(0, Math.ceil((t + delaiS * 1000 - maintenantMs) / 1000));
}

/** État du bail pour une session : `tenu`, `libre` ou `autre`. */
export function etatBail(bail, session) {
  if (!bail || typeof bail.session !== 'string' || bail.session === '') return 'libre';
  return bail.session === session ? 'tenu' : 'autre';
}

/**
 * Verdict des gardes de `D-546` avant les étapes 7 bis et 7 ter (et de nouveau
 * juste avant le merge). Rend `{ code, motif, notes }` ; `code` 0 laisse
 * passer. En `sans-merge`, le délai et le bail sont dits dans `notes`.
 *
 * @param {{decl: object|null, motifs: string[], paroles: object[], maintenantMs: number,
 *          mode: 'merge'|'sans-merge'|'filet', bail: object|null, session: string,
 *          focus?: {titres: string[]|null, manquants: string[]}}} e
 */
export function verdictGardes({ decl, motifs, paroles, maintenantMs, mode, bail, session, focus = { titres: [], manquants: [] } }) {
  const notes = [];
  if (!decl) return { code: CODES.declaration, motif: 'aucune déclaration « prête » sur ce sha', notes };
  if (motifs.length) return { code: CODES.origine, motif: libelleOrigine(motifs), notes };
  // Dans tous les modes, filet compris : un constat sans verdict ne se merge pas.
  if (focus.titres === null) {
    return { code: CODES.focus, motif: 'focus areas de PR-Agent illisibles (gabarit inconnu) : lire le commentaire persistant en entier, puis arbitrer', notes };
  }
  if (focus.manquants.length) {
    const liste = focus.manquants.map((t) => `« ${t} »`).join(' · ');
    return {
      code: CODES.focus,
      motif: `${focus.manquants.length} focus area(s) de PR-Agent sans verdict cité jusqu'à la déclaration : ${liste} — un commentaire cite chaque titre tel quel avec son verdict, puis la file redéclare`,
      notes,
    };
  }
  if (mode === 'filet') {
    const prise = paroles.filter((p) => p.integrateur);
    if (prise.length) return { code: CODES.parole, motif: `prise en charge par l'intégrateur à ${prise[0].at} : pas de filet`, notes };
  }
  const autres = paroles.filter((p) => !p.integrateur);
  if (autres.length) {
    const p = autres[0];
    return {
      code: CODES.parole,
      motif: `suspendue : ${autres.length} parole(s) après la déclaration, la première ${p.type} de ${p.auteur}${p.robot ? ' (robot)' : ''} à ${p.at} — la file redéclare`,
      notes,
    };
  }
  const delai = mode === 'filet' ? DELAI_FILET_S : DELAI_REPENTIR_S;
  const depuis = heureParole(decl);
  const reste = secondesRestantes(depuis, maintenantMs, delai);
  if (reste > 0) {
    const t = Date.parse(depuis);
    const fin = Number.isFinite(t) ? new Date(t + delai * 1000).toISOString() : 'heure illisible';
    const texte = `${mode === 'filet' ? 'filet' : 'délai de repentir'} non échu : encore ${reste} s (jusqu'à ${fin})`;
    if (mode === 'sans-merge') notes.push(texte);
    else return { code: CODES.delai, motif: texte, notes };
  }
  if (mode !== 'filet') {
    const b = etatBail(bail, session);
    if (b !== 'tenu') {
      const texte = b === 'libre' ? 'bail libre : le prendre avant de merger' : `bail tenu par une autre session (${bail.session})`;
      if (mode === 'sans-merge') notes.push(texte);
      else return { code: CODES.bail, motif: texte, notes };
    }
  }
  return { code: CODES.ok, motif: 'gardes vertes', notes };
}

/**
 * Prise ou reprise du bail. Rend `{ ok, bail, motif }` ; `bail` est la valeur
 * à écrire quand `ok`.
 */
export function prendreBail(actuel, session, quand, { reprendre = false } = {}) {
  const e = etatBail(actuel, session);
  if (e === 'tenu') return { ok: true, bail: actuel, motif: 'déjà tenu par cette session' };
  if (e === 'libre') return { ok: true, bail: { session, pris_le: quand }, motif: 'pris' };
  if (!reprendre) return { ok: false, bail: actuel, motif: `tenu par ${actuel.session} depuis ${actuel.pris_le ?? '?'} ; reprise : --reprendre` };
  return { ok: true, bail: { session, pris_le: quand, repris_de: actuel.session }, motif: `repris de ${actuel.session}` };
}

// ── Fichiers du clone ───────────────────────────────────────────────────────

function git(args, cwd = RACINE) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Répertoire de l'intégrateur dans le répertoire Git commun (jamais suivi). */
export function repertoireIntegrateur(racine = RACINE) {
  const commun = path.resolve(racine, git(['rev-parse', '--git-common-dir'], racine));
  const rep = path.join(commun, 'wn-integrateur');
  mkdirSync(rep, { recursive: true });
  return rep;
}

function lireBail(rep) {
  const f = path.join(rep, 'bail.json');
  if (!existsSync(f)) return null;
  // Un bail illisible n'est jamais « libre » : il se lit tenu par un inconnu,
  // et seule une reprise déclarée le remplace.
  try {
    const b = JSON.parse(readFileSync(f, 'utf8'));
    return b && typeof b === 'object' ? b : { session: '(bail illisible)' };
  } catch {
    return { session: '(bail illisible)' };
  }
}

function ecrireBail(rep, bail) {
  const f = path.join(rep, 'bail.json');
  const t = `${f}.${process.pid}.tmp`;
  writeFileSync(t, `${JSON.stringify(bail)}\n`);
  renameSync(t, f);
}

function journaliser(rep, ligne) {
  appendFileSync(path.join(rep, 'journal.jsonl'), `${JSON.stringify(ligne)}\n`);
}

/**
 * Prendre, rendre ou voir le bail. Lecture, contrôle et écriture se font sous
 * un verrou exclusif (`bail.verrou`, créé par `mkdir`, atomique) : un rendu
 * ne peut plus effacer le bail qu'une reprise vient d'écrire (contre-revue
 * Codex). Un verrou déjà pris est un refus, sans nouvel essai ; un verrou
 * orphelin (processus tué) se retire à la main, au chemin dit.
 *
 * @returns {{code: number, texte: string}}
 */
export function operationBail(rep, action, session, { reprendre = false, quand = new Date().toISOString() } = {}) {
  if (action === 'voir') {
    const actuel = lireBail(rep);
    return { code: CODES.ok, texte: actuel ? `bail ${etatBail(actuel, session)} : ${JSON.stringify(actuel)}` : 'bail libre' };
  }
  const verrou = path.join(rep, 'bail.verrou');
  try {
    mkdirSync(verrou);
  } catch {
    return { code: CODES.bail, texte: `REFUS code=22 : bail en cours de modification (verrou ${verrou}) ; s'il est orphelin, le retirer à la main` };
  }
  try {
    const actuel = lireBail(rep);
    if (action === 'rendre') {
      if (etatBail(actuel, session) !== 'tenu') return { code: CODES.bail, texte: 'REFUS code=22 : cette session ne tient pas le bail' };
      unlinkSync(path.join(rep, 'bail.json'));
      journaliser(rep, { quand, bail: 'rendu', session });
      return { code: CODES.ok, texte: 'bail rendu' };
    }
    const r = prendreBail(actuel, session, quand, { reprendre });
    if (!r.ok) return { code: CODES.bail, texte: `REFUS code=22 : bail ${r.motif}` };
    if (r.bail !== actuel) {
      ecrireBail(rep, r.bail);
      journaliser(rep, { quand, bail: 'pris', session, motif: r.motif });
    }
    return { code: CODES.ok, texte: `bail ${r.motif}` };
  } finally {
    rmdirSync(verrou);
  }
}

// ── Lectures GitHub (REST, comme le reste de l'outillage) ──────────────────

function ghJson(args, cwd = RACINE) {
  return JSON.parse(execFileSync('gh', args, { cwd, encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'pipe'] }));
}

function pages(chemin) {
  const l = aplatirPages(ghJson(['api', '--paginate', '--slurp', chemin]));
  if (l === null) throw new Error(`lecture illisible : ${chemin}`);
  return l;
}

/** Tout ce que les gardes lisent d'une PR, en une fois. */
export function lirePr(n, lecteur = { ghJson, pages }) {
  const brut = lecteur.ghJson(['api', `repos/{owner}/{repo}/pulls/${n}`]);
  const pr = versPrGraphql(brut);
  if (!pr) throw new Error(`PR ${n} illisible`);
  const depot = lecteur.ghJson(['api', 'repos/{owner}/{repo}']);
  if (typeof depot?.owner?.login !== 'string' || typeof depot?.full_name !== 'string') throw new Error('dépôt illisible');
  return {
    pr,
    proprietaire: depot.owner.login,
    nomDepot: depot.full_name,
    commentaires: lecteur.pages(`repos/{owner}/{repo}/issues/${n}/comments?per_page=100`),
    revues: lecteur.pages(`repos/{owner}/{repo}/pulls/${n}/reviews?per_page=100`),
    enLigne: lecteur.pages(`repos/{owner}/{repo}/pulls/${n}/comments?per_page=100`),
  };
}

// ── Le passage ──────────────────────────────────────────────────────────────

function lancer(cmd, args, { cwd = RACINE, sortie } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64e6 });
  const texte = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (sortie) writeFileSync(sortie, texte);
  return { code: r.status ?? 1, texte };
}

const lignes = (t) => t.split('\n').filter((l) => l !== '');

/**
 * Un passage complet. Les dépendances sont injectables pour le banc.
 * @returns {Promise<number>} code de sortie
 */
export async function integrer(n, sha, mode, deps) {
  const { dire, lancerCmd, lire, maintenant, session, scratch, rep, copiePrincipale } = deps;
  const trace = { pr: n, sha, mode, session };
  const finir = (code, motif, extra = {}) => {
    journaliser(rep, { quand: new Date(maintenant()).toISOString(), ...trace, code, motif, ...extra });
    if (code !== CODES.ok) dire(`REFUS code=${code} : ${motif}`);
    return code;
  };

  if (mode !== 'filet' && !copiePrincipale) return finir(CODES.usage, 'hors de la copie principale (D-373 §2)');
  lancerCmd('git', ['fetch', '-q', 'origin']);
  // `main` vu au début du passage, gardé tel quel : la garde « main
  // inchangé » compare le distant à CETTE valeur, jamais à `origin/main`
  // relu, qu'un autre fetch du clone aurait pu avancer (contre-revue Codex).
  const main0 = lancerCmd('git', ['rev-parse', 'origin/main']).texte.trim();
  dire(`main=${main0.slice(0, 9)}`);
  const mainInchange = () => lancerCmd('git', ['ls-remote', 'origin', 'refs/heads/main']).texte.split('\t')[0].trim() === main0 && main0 !== '';
  // Les gardes jouées sont celles de `main`, jamais celles d'une branche :
  // le filet se joue depuis un worktree, qui pourrait porter une version
  // modifiée de ce script ou des sondes (revue `wn-reviewer`, P3).
  if (lancerCmd('git', ['diff', '--quiet', main0, '--', 'scripts/']).code !== 0) {
    return finir(CODES.usage, "scripts/ diffère d'origin/main : avancer la copie (--ff-only), ou jouer le filet depuis un worktree détaché sur origin/main");
  }

  let l;
  try {
    l = lire(n);
  } catch (e) {
    return finir(CODES.lecture, `lecture GitHub impossible : ${String(e?.message || e).slice(0, 200)}`);
  }
  if (l.pr.state !== 'OPEN') return finir(CODES.merge, `PR non ouverte (${l.pr.state})`);
  const gardes = (lu) => {
    const decl = declarationServie(lu.commentaires, sha);
    return verdictGardes({
      decl,
      motifs: decl ? motifsOrigine(decl, lu.pr, lu.proprietaire) : [],
      paroles: decl ? parolesApres(decl, lu) : [],
      focus: decl ? focusSansVerdict(decl, lu) : undefined,
      maintenantMs: maintenant(),
      mode,
      bail: deps.lireBail(),
      session,
    });
  };
  const v = gardes(l);
  for (const note of v.notes) dire(`note : ${note}`);
  if (v.code !== CODES.ok) return finir(v.code, v.motif);
  dire(`gardes=0 (${v.motif})`);

  const etape = (nom, script, args, code, resume) => {
    const r = lancerCmd('node', [script, ...args], { sortie: path.join(scratch, `${nom}-${n}.txt`) });
    dire(`${nom}=${r.code}`);
    for (const x of resume(lignes(r.texte))) dire(x);
    return r.code === 0 ? null : finir(code, `${nom} rend ${r.code}`);
  };

  // Preuve de revue (partie 22), avant le déploiement, dans tous les modes :
  // le CI sur ce sha, puis PR-Agent ou, à défaut, le repli de `D-448` cité
  // par la déclaration servie.
  let refus = etape('ci', 'scripts/wn-attendre-ci.mjs', [String(n), '--sha', sha], CODES.revue, (x) => x.slice(-1));
  if (refus !== null) return refus;
  const pa = lancerCmd('node', ['scripts/wn-revue-pr-agent.mjs', String(n)], { sortie: path.join(scratch, `pr-agent-${n}.txt`) });
  dire(`pr-agent=${pa.code}`);
  for (const x of lignes(pa.texte).slice(-1)) dire(x);
  if (pa.code !== 0) {
    if (!repliD448(declarationServie(l.commentaires, sha), sha)) {
      return finir(CODES.revue, `wn-revue-pr-agent rend ${pa.code} et la déclaration servie ne cite pas « D-448 » avec « wn-reviewer GO @<sha> » sur ce sha`);
    }
    dire('revue=repli D-448 (wn-reviewer GO sur ce sha, cité par la déclaration servie)');
  }

  // Étapes 7 bis et 7 ter d'`integrer.sh`, à l'identique.
  refus =
    etape('deploiement', 'scripts/wn-deploiement-observation.mjs', [], CODES.deploiement, (x) => x.slice(0, 4)) ??
    etape('controle', 'scripts/wn-controle-fusion.mjs', [String(n)], CODES.controle, (x) => x.slice(-1));
  if (refus !== null) return refus;
  const mb = lancerCmd('git', ['merge-base', 'origin/main', sha]).texte.trim();
  dire(`mb=${mb.slice(0, 8)}`);
  for (const x of lignes(lancerCmd('git', ['diff', '--stat', mb, 'origin/main', '--', 'docs/DECISIONS.md']).texte)) dire(x);
  refus =
    etape('chevauchement', 'scripts/wn-chevauchement.mjs', [String(n)], CODES.chevauchement, (x) => x.slice(-1)) ??
    etape('release-db', 'scripts/wn-sonde-release-db.mjs', [String(n)], CODES.releaseDb, (x) => x.slice(-1));
  if (refus !== null) return refus;

  if (!mainInchange()) return finir(CODES.mainBouge, 'MAIN-BOUGE');
  if (l.pr.headRefOid !== sha) return finir(CODES.teteDeplacee, `TETE-DEPLACEE head=${l.pr.headRefOid}`);
  const branche = l.pr.headRefName;
  if (!brancheSure(branche)) return finir(CODES.lecture, 'nom de branche de tête non interrogeable');
  let empilees;
  try {
    empilees = deps.prsSurBase(branche);
  } catch (e) {
    return finir(CODES.lecture, `PR empilées illisibles : ${String(e?.message || e).slice(0, 200)}`);
  }
  if (empilees.length) return finir(CODES.empilees, `EMPILEES=${empilees.join(' ')} (base ${branche}) : recaler sur main avant le merge`);

  // La parole et la tête se relisent après les contrôles, en `--sans-merge`
  // aussi : une parole ou une tête neuve venue pendant le contrôle de fusion
  // (20 à 60 s) compte encore.
  let l2;
  try {
    l2 = lire(n);
  } catch (e) {
    return finir(CODES.lecture, `relecture avant merge impossible : ${String(e?.message || e).slice(0, 200)}`);
  }
  if (l2.pr.headRefOid !== sha) return finir(CODES.teteDeplacee, `TETE-DEPLACEE head=${l2.pr.headRefOid}`);
  const v2 = gardes(l2);
  if (v2.code !== CODES.ok) return finir(v2.code, `avant merge : ${v2.motif}`);
  if (!mainInchange()) return finir(CODES.mainBouge, 'MAIN-BOUGE (avant merge)');
  if (mode === 'sans-merge') return finir(CODES.ok, 'contrôles verts, sans merge');

  const titre = l2.pr.title ?? '';
  const m = lancerCmd(
    'gh',
    ['pr', 'merge', String(n), '--repo', l2.nomDepot, '--squash', '--delete-branch', '--match-head-commit', sha, '--subject', `${titre} (#${n})`],
    { cwd: scratch },
  );
  dire(`merge=${m.code} ${new Date(maintenant()).toISOString()}`);
  if (m.code !== 0) return finir(CODES.merge, `gh pr merge rend ${m.code}`);
  let commit = null;
  try {
    commit = lire(n).pr.mergeCommit?.oid ?? null;
  } catch {
    commit = null;
  }
  const code = finir(CODES.ok, 'mergée', { commit, filet: mode === 'filet' });
  if (mode === 'filet') return code;
  // Avance de la copie principale : le merge est fait, mais un échec ici
  // se dit par son propre code (un refus de `--ff-only` s'arbitre, D-373 §2).
  const f = lancerCmd('git', ['fetch', '-q', 'origin']);
  const ff = f.code === 0 ? lancerCmd('git', ['merge', '--ff-only', 'origin/main']) : f;
  dire(ff.texte.trim().split('\n').pop() ?? '');
  if (ff.code !== 0) return finir(CODES.avance, `mergée, mais avance de la copie principale en échec (${f.code !== 0 ? 'fetch' : 'ff-only'} rend ${ff.code}) : à arbitrer`, { commit });
  dire(lancerCmd('git', ['log', '-1', '--oneline']).texte.trim().slice(0, 60));
  return code;
}

// ── Interface ──────────────────────────────────────────────────────────────

const USAGE =
  'Usage : WN_S=<scratchpad> node scripts/wn-integrer.mjs <N> <sha complet> [--sans-merge | --filet]\n' +
  '        WN_S=<scratchpad> node scripts/wn-integrer.mjs bail prendre [--reprendre] | rendre | voir\n' +
  '        node scripts/wn-integrer.mjs journal [--n K]';

function estCopiePrincipale() {
  return path.resolve(RACINE, git(['rev-parse', '--git-dir'])) === path.resolve(RACINE, git(['rev-parse', '--git-common-dir']));
}

async function principal(argv) {
  const dire = (x) => console.log(x);
  const [a0, ...reste] = argv;

  if (a0 === 'journal') {
    const k = reste[0] === '--n' ? Number(reste[1]) : 20;
    if (!Number.isInteger(k) || k < 1 || reste.length > 2 || (reste.length && reste[0] !== '--n')) { console.error(USAGE); return CODES.usage; }
    const rep = repertoireIntegrateur();
    const f = path.join(rep, 'journal.jsonl');
    const tout = existsSync(f) ? lignes(readFileSync(f, 'utf8')) : [];
    for (const x of tout.slice(-k)) dire(x);
    dire(`TOTAL ${tout.length} ligne(s), ${Math.min(k, tout.length)} affichée(s)`);
    return CODES.ok;
  }

  const session = process.env.WN_S;
  if (!session) { console.error(`WN_S = scratchpad de la session courante\n${USAGE}`); return CODES.usage; }

  if (a0 === 'bail') {
    const [action, option, ...trop] = reste;
    if (trop.length) { console.error(USAGE); return CODES.usage; }
    const valide =
      (action === 'voir' && !option) ||
      (action === 'rendre' && !option) ||
      (action === 'prendre' && (!option || option === '--reprendre'));
    if (!valide) { console.error(USAGE); return CODES.usage; }
    const r = operationBail(repertoireIntegrateur(), action, session, {
      reprendre: option === '--reprendre',
      quand: new Date().toISOString(),
    });
    dire(r.texte);
    return r.code;
  }

  const [sha, opt, ...trop] = reste;
  if (!/^\d+$/.test(a0 ?? '') || !SHA_COMPLET.test(sha ?? '') || trop.length || (opt && opt !== '--sans-merge' && opt !== '--filet')) {
    console.error(USAGE);
    return CODES.usage;
  }
  mkdirSync(session, { recursive: true });
  const rep = repertoireIntegrateur();
  const mode = opt === '--sans-merge' ? 'sans-merge' : opt === '--filet' ? 'filet' : 'merge';
  return integrer(Number(a0), sha, mode, {
    dire,
    lancerCmd: lancer,
    lire: (n) => lirePr(n),
    maintenant: () => Date.now(),
    session,
    scratch: session,
    rep,
    copiePrincipale: estCopiePrincipale(),
    lireBail: () => lireBail(rep),
    prsSurBase: (b) => pages(`repos/{owner}/{repo}/pulls?state=open&base=${b}&per_page=100`).map((p) => p.number),
  });
}

function lanceDirectement() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (lanceDirectement()) {
  process.exitCode = await principal(process.argv.slice(2));
}
