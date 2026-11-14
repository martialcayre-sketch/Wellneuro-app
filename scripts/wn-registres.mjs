#!/usr/bin/env node
// Contrôle des registres de coordination sur un EXPORT fait par une session
// (`ArtifactData list … out_dir`) : liste commune de questions, registre des
// messages (`D-503`), carnet de lots (`D-510`). LECTURE SEULE — des fichiers
// locaux, aucun réseau, aucune écriture, ni au dépôt ni aux registres.
//
//   node scripts/wn-registres.mjs <dossier-export> [--boite <nom>] [--json]
//                                 [--maintenant <ISO>]
//
// Le dossier est celui que rend l'export : `<dossier>/messages/<id>.json`,
// `<dossier>/lots/<id>.json`, `<dossier>/questions/<id>.json`. Il reste hors
// du dépôt (bloc-notes de la session) : un export porte le contenu des
// registres et ne se committe jamais.
//
// Ce que la sortie vaut : les règles écrites de `docs/ROLES_MACHINES.md`
// appliquées à l'état exporté, à l'heure de l'export. Elle n'authentifie
// aucune ligne et n'autorise aucun geste (`D-503`, `D-510` : « une ligne
// n'autorise rien ») ; elle ne recopie aucun texte libre des registres.
// Les écritures restent celles de la session, par `ArtifactData` et
// `if_version`. Ce script ne lit pas les registres lui-même : un automatisme
// sans session n'est décidé ni par `D-503` ni par `D-510`.
//
// Le manifeste d'export (`<dossier>/manifeste.json`, lot L2) est écrit par
// la session qui exporte : par collection, le nombre de lignes que l'outil a
// rendu et l'assurance que le curseur de pagination est épuisé. Il ne prouve
// rien de plus que la parole de la session ; il rend visible une page
// oubliée, qu'un dossier seul ne montre pas. Absent : complétude non
// attestée, dite en tête. En écart avec les fichiers : anomalie.
//
// Codes de sortie :
//   0  registres conformes aux règles écrites, rien de dû
//   1  des actions sont dues (aucune anomalie de règle)
//   2  au moins une anomalie de règle, ou un manifeste en écart
//   3  usage invalide ou export illisible

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyser, boite, court, instant } from './lib/registres.mjs';

export const SORTIE_CONFORME = 0;
export const SORTIE_ACTIONS = 1;
export const SORTIE_ANOMALIES = 2;
export const SORTIE_USAGE = 3;

export const COLLECTIONS = ['messages', 'lots', 'questions'];
/** Au-delà, l'export décrit un état passé : la sortie le dit en tête. */
export const EXPORT_PERIME_MIN = 30;

const USAGE = 'usage : node scripts/wn-registres.mjs <dossier-export> [--boite <nom>] [--json] [--maintenant <ISO>]';

export function analyserArguments(argv) {
  const options = { dossier: null, boite: null, json: false, maintenant: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') options.json = true;
    else if (a === '--boite' || a === '--maintenant') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { erreur: `${a} attend une valeur` };
      i += 1;
      if (a === '--boite') options.boite = v;
      else {
        const t = Date.parse(v);
        if (Number.isNaN(t)) return { erreur: '--maintenant attend un horodatage ISO' };
        options.maintenant = t;
      }
    } else if (a.startsWith('--')) return { erreur: `option inconnue : ${a}` };
    else if (options.dossier === null) options.dossier = a;
    else return { erreur: 'un seul dossier d\'export' };
  }
  if (options.dossier === null) return { erreur: 'dossier d\'export manquant' };
  return { options };
}

/**
 * Lit l'export. Rend `{ messages, lots, questions, absentes, illisibles,
 * plusAncien }` — chaque ligne reçoit son `id`, le nom de son fichier.
 * `plusAncien` est la date du fichier le plus ancien : un export refait en
 * partie a l'âge de ce qui n'a pas été refait.
 */
export function lireExport(dossier) {
  const lu = { messages: [], lots: [], questions: [], absentes: [], illisibles: [], plusAncien: null };
  for (const collection of COLLECTIONS) {
    const chemin = join(dossier, collection);
    if (!existsSync(chemin) || !statSync(chemin).isDirectory()) {
      lu.absentes.push(collection);
      continue;
    }
    for (const fichier of readdirSync(chemin).filter((f) => f.endsWith('.json')).sort()) {
      const complet = join(chemin, fichier);
      try {
        const donnees = JSON.parse(readFileSync(complet, 'utf8'));
        if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) throw new Error('pas un objet');
        lu[collection].push({ ...donnees, id: fichier.slice(0, -'.json'.length) });
        const modifie = statSync(complet).mtimeMs;
        if (lu.plusAncien === null || modifie < lu.plusAncien) lu.plusAncien = modifie;
      } catch {
        lu.illisibles.push(`${collection}/${fichier}`);
      }
    }
  }
  return lu;
}

export const FICHIER_MANIFESTE = 'manifeste.json';
export const SCHEMA_MANIFESTE = 1;

/**
 * Le manifeste confronté à l'export lu. Rend `{ etat, ecarts, exporteLe }` :
 * `etat` vaut `absent`, `conforme` ou `ecart`. Une collection que le
 * manifeste déclare vide (0 ligne, curseur épuisé) et dont le dossier manque
 * n'est plus « absente » : l'outil n'écrit pas de dossier pour une collection
 * vide. `lu.absentes` est corrigé en place dans ce seul cas.
 */
export function lireManifeste(dossier, lu, maintenant = null) {
  const chemin = join(dossier, FICHIER_MANIFESTE);
  if (!existsSync(chemin)) return { etat: 'absent', ecarts: [], exporteLe: null };
  let m;
  try {
    m = JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    return { etat: 'ecart', ecarts: ['manifeste illisible (JSON)'], exporteLe: null };
  }
  if (!m || typeof m !== 'object' || m.schema !== SCHEMA_MANIFESTE || !m.collections || typeof m.collections !== 'object') {
    return { etat: 'ecart', ecarts: [`manifeste hors contrat (schéma attendu ${SCHEMA_MANIFESTE}, champ \`collections\`)`], exporteLe: null };
  }
  const ecarts = [];
  // Un fuseau explicite (`Z` ou `±hh:mm`) : sans lui, l'heure se lirait à
  // l'heure locale et vieillirait l'export en silence.
  const avecFuseau = typeof m.exporte_le === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/.test(m.exporte_le.trim());
  const exporteLe = avecFuseau ? instant(m.exporte_le) : null;
  if (exporteLe === null) ecarts.push('`exporte_le` absent, illisible ou sans fuseau (`Z`)');
  else if (maintenant !== null && exporteLe > maintenant + 5 * 60000) ecarts.push('`exporte_le` dans le futur — heure de Paris écrite pour UTC ?');
  for (const collection of COLLECTIONS) {
    const d = m.collections[collection];
    if (!d || typeof d !== 'object') {
      ecarts.push(`${collection} : non déclarée au manifeste`);
      continue;
    }
    if (d.curseur_epuise !== true) ecarts.push(`${collection} : pagination non attestée épuisée (\`curseur_epuise\`)`);
    if (!Number.isInteger(d.lignes) || d.lignes < 0) {
      ecarts.push(`${collection} : \`lignes\` n'est pas un entier`);
      continue;
    }
    const absente = lu.absentes.includes(collection);
    if (absente && d.lignes === 0 && d.curseur_epuise === true) {
      lu.absentes = lu.absentes.filter((c) => c !== collection);
      continue;
    }
    const surDisque = absente ? 0 : lu[collection].length + lu.illisibles.filter((f) => f.startsWith(`${collection}/`)).length;
    if (surDisque !== d.lignes) ecarts.push(`${collection} : ${surDisque} fichier(s) pour ${d.lignes} ligne(s) déclarée(s)`);
  }
  return { etat: ecarts.length === 0 ? 'conforme' : 'ecart', ecarts, exporteLe };
}

/**
 * L'âge de l'export, en minutes : le plus ancien de la date des fichiers et
 * de l'heure que déclare le manifeste — la plus prudente des deux.
 */
export function ageExport(lu, manifeste, maintenant) {
  const bornes = [lu.plusAncien, manifeste?.exporteLe ?? null].filter((t) => t !== null);
  return bornes.length === 0 ? null : Math.max(0, (maintenant - Math.min(...bornes)) / 60000);
}

const age = (h) => (h === null ? '' : ` · ${h} h`);

/** Le rendu texte : comptes, anomalies, avis, actions dues, lots suivants, boîte, ligne machine. */
export function rendre(analyse, { absentes = [], illisibles = [], ageExportMin = null, boiteNom = null, lignesBoite = [], manifeste = null } = {}) {
  const lignes = [];
  if (ageExportMin !== null && ageExportMin > EXPORT_PERIME_MIN) lignes.push(`⚠ export vieux de ${Math.round(ageExportMin)} min — il décrit un état passé ; refaire l'export avant tout geste.`);
  if (manifeste?.etat === 'absent') lignes.push(`· export sans ${FICHIER_MANIFESTE} : complétude de la pagination non attestée.`);
  for (const e of manifeste?.ecarts ?? []) lignes.push(`✗ manifeste en écart : ${court(e, 120)}`);
  if (absentes.length > 0) lignes.push(`· collection(s) absente(s) de l'export, non contrôlée(s) : ${absentes.join(', ')}`);
  for (const f of illisibles) lignes.push(`✗ fichier illisible : ${court(f, 80)}`);
  const { comptes, anomalies, avis, actions, suivants } = analyse;
  const detail = (c) => Object.entries(c.par).map(([k, n]) => `${k} ${n}`).join(', ');
  for (const collection of COLLECTIONS) {
    if (!absentes.includes(collection)) lignes.push(`· ${collection} : ${comptes[collection].total} ligne(s)${comptes[collection].total > 0 ? ` (${detail(comptes[collection])})` : ''}`);
  }
  if (anomalies.length === 0) lignes.push('✓ aucune anomalie de règle.');
  else {
    lignes.push(`✗ ${anomalies.length} anomalie(s) de règle :`);
    for (const a of anomalies) lignes.push(`  ${a.collection}/${a.id} [${a.regle}] ${a.detail}`);
  }
  if (avis.length > 0) {
    lignes.push(`· ${avis.length} avis (hors règle écrite, à relire) :`);
    for (const a of avis) lignes.push(`  ${a.collection}/${a.id} [${a.regle}] ${a.detail}`);
  }
  if (actions.length === 0) lignes.push('✓ aucune action due.');
  else {
    lignes.push(`→ ${actions.length} action(s) due(s) — rappels de la règle, aucune n'autorise un geste :`);
    for (const a of actions) lignes.push(`  ${a.type} ${a.collection}/${a.id} → ${a.cible}${age(a.age_h)} — ${a.detail}`);
  }
  const prets = Object.entries(suivants).filter(([, id]) => id !== null);
  if (prets.length > 0) lignes.push(`· lot suivant par file : ${prets.map(([file, id]) => `${file} → ${id}`).join(' ; ')}`);
  if (boiteNom !== null) {
    lignes.push(lignesBoite.length === 0 ? `✓ boîte « ${court(boiteNom)} » : aucune ligne en attente.` : `→ boîte « ${court(boiteNom)} » : ${lignesBoite.length} ligne(s) non traitée(s) :`);
    for (const m of lignesBoite) lignes.push(`  ${m.id} [${m.etat}] ${m.objet} de ${m.de}${m.ref ? ` · ref ${m.ref}` : ''}`);
  }
  const ecarts = manifeste?.ecarts?.length ?? 0;
  lignes.push(`REGISTRES anomalies=${anomalies.length + illisibles.length + ecarts} avis=${avis.length} actions=${actions.length}${boiteNom !== null ? ` boite=${lignesBoite.length}` : ''}${manifeste && manifeste.etat !== 'absent' ? ` manifeste=${manifeste.etat}` : ''}`);
  return lignes;
}

/** Le code de sortie : l'anomalie (manifeste en écart compris) prime sur l'action due. */
export function codeDeSortie(analyse, illisibles = [], manifeste = null) {
  if (analyse.anomalies.length > 0 || illisibles.length > 0 || manifeste?.etat === 'ecart') return SORTIE_ANOMALIES;
  return analyse.actions.length > 0 ? SORTIE_ACTIONS : SORTIE_CONFORME;
}

export function controler(argv, { maintenant = Date.now() } = {}) {
  const { options, erreur } = analyserArguments(argv);
  if (erreur) return { code: SORTIE_USAGE, lignes: [`✗ ${erreur}`, USAGE] };
  if (!existsSync(options.dossier) || !statSync(options.dossier).isDirectory()) return { code: SORTIE_USAGE, lignes: [`✗ dossier d'export introuvable : ${options.dossier}`, USAGE] };
  const instantT = options.maintenant ?? maintenant;
  const lu = lireExport(options.dossier);
  const manifeste = lireManifeste(options.dossier, lu, instantT);
  if (lu.absentes.length === COLLECTIONS.length && manifeste.etat !== 'conforme') return { code: SORTIE_USAGE, lignes: [`✗ aucune collection (${COLLECTIONS.join(', ')}) sous ${options.dossier}`, USAGE] };
  const analyse = analyser(lu, instantT);
  const ageExportMin = ageExport(lu, manifeste, instantT);
  const lignesBoite = options.boite === null ? [] : boite(lu.messages, options.boite);
  const code = codeDeSortie(analyse, lu.illisibles, manifeste);
  if (options.json) {
    const sortie = { ...analyse, absentes: lu.absentes, illisibles: lu.illisibles, manifeste: { etat: manifeste.etat, ecarts: manifeste.ecarts }, export_age_min: ageExportMin === null ? null : Math.round(ageExportMin), ...(options.boite === null ? {} : { boite: { nom: options.boite, lignes: lignesBoite } }), code };
    return { code, lignes: [JSON.stringify(sortie, null, 2)] };
  }
  return { code, lignes: rendre(analyse, { absentes: lu.absentes, illisibles: lu.illisibles, ageExportMin, boiteNom: options.boite, lignesBoite, manifeste }) };
}

const direct = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const { code, lignes } = controler(process.argv.slice(2));
  console.log(lignes.join('\n'));
  // `process.exitCode`, pas `process.exit()` : la sortie s'écrit en entier
  // avant la fin du processus, même dans un tube.
  process.exitCode = code;
}
