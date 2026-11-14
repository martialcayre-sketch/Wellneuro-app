#!/usr/bin/env node
// Superviseur rejoué (lot L2) : croise un export des registres et un
// instantané GitHub, à une heure injectée, et rend anomalies, actions dues et
// prochaine échéance. LECTURE SEULE — deux entrées locales, aucun réseau,
// aucune écriture, aucun agent lancé.
//
//   node scripts/wn-superviseur.mjs <dossier-export> --instantane <fichier>
//                                   [--json] [--maintenant <ISO>]
//
// L'export est celui de `wn-registres.mjs` (avec son `manifeste.json`) ;
// l'instantané, celui de `wn-instantane-github.mjs`. Les deux restent dans le
// bloc-notes de la session, jamais au dépôt.
//
// Ce que la sortie vaut : un état passé, confronté aux règles écrites de
// `docs/ROLES_MACHINES.md`. Une action due n'autorise aucun geste : chacune
// nomme ce qu'elle a vu (`observe`) et ce qu'il faut relire sur l'état réel
// avant d'agir (`a_confronter`). Le mode dégradé — instantané absent,
// périmé ou partiel, export sans manifeste ou périmé — ne rend jamais `0`.
//
// Codes de sortie :
//   0  rien de dû, rien de dégradé
//   1  des actions sont dues, ou le croisement est dégradé
//   2  au moins une anomalie (règle, origine, manifeste en écart, fichier illisible)
//   3  usage invalide ou export introuvable

import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { court } from './lib/registres.mjs';
import { superviser } from './lib/superviseur.mjs';
import { COLLECTIONS, EXPORT_PERIME_MIN, ageExport, lireExport, lireManifeste } from './wn-registres.mjs';

export const SORTIE_RIEN = 0;
export const SORTIE_ACTIONS = 1;
export const SORTIE_ANOMALIES = 2;
export const SORTIE_USAGE = 3;

const USAGE = 'usage : node scripts/wn-superviseur.mjs <dossier-export> --instantane <fichier> [--json] [--maintenant <ISO>]';

export function analyserArguments(argv) {
  const options = { dossier: null, instantane: null, json: false, maintenant: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') options.json = true;
    else if (a === '--instantane' || a === '--maintenant') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { erreur: `${a} attend une valeur` };
      i += 1;
      if (a === '--instantane') options.instantane = v;
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
  if (options.instantane === null) return { erreur: '--instantane manquant (un instantané absent se dit en le nommant : le fichier manquant met le croisement en mode dégradé)' };
  return { options };
}

/** L'instantané lu sur disque, ou `null` (absent ou illisible : mode dégradé). */
function lireFichierInstantane(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    return null;
  }
}

const age = (h) => (h === null || h === undefined ? '' : ` · ${h} h`);

export function rendre(r, { manifeste, illisibles, absentes, ageExportMin }) {
  const lignes = [];
  lignes.push('Superviseur rejoué — état passé, aucune action n\'autorise un geste : chacune se confronte à l\'état réel avant usage.');
  for (const d of r.degrade) lignes.push(`⚠ dégradé : ${d}`);
  for (const f of illisibles) lignes.push(`✗ fichier illisible : ${court(f, 80)}`);
  for (const e of manifeste.ecarts) lignes.push(`✗ manifeste en écart : ${court(e, 120)}`);
  if (absentes.length > 0) lignes.push(`· collection(s) absente(s) de l'export, non croisée(s) : ${absentes.join(', ')}`);
  if (r.anomalies.length === 0) lignes.push('✓ aucune anomalie.');
  else {
    lignes.push(`✗ ${r.anomalies.length} anomalie(s) :`);
    for (const a of r.anomalies) lignes.push(`  ${a.collection}/${a.id} [${a.regle}] ${a.detail}`);
  }
  if (r.actions.length === 0) lignes.push('✓ aucune action due.');
  else {
    lignes.push(`→ ${r.actions.length} action(s) due(s) :`);
    for (const a of r.actions) {
      lignes.push(`  ${a.type} ${a.collection}/${a.id} → ${a.cible}${age(a.age_h)} — ${a.detail}`);
      if (a.observe) lignes.push(`    vu : #${a.observe.pr} ${a.observe.etat}${a.observe.tete ? ` @${a.observe.tete.slice(0, 12)}` : ''} (instantané ${a.observe.instantane_le})`);
      for (const c of a.a_confronter) lignes.push(`    à confronter : ${c}`);
    }
  }
  lignes.push(r.echeance ? `· prochaine échéance : ${r.echeance.quand} — ${r.echeance.objet} (${r.echeance.ref})` : '· aucune échéance à venir.');
  const anomalies = r.anomalies.length + illisibles.length + manifeste.ecarts.length;
  lignes.push(`SUPERVISEUR anomalies=${anomalies} actions=${r.actions.length} degrade=${r.degrade.length} manifeste=${manifeste.etat}${ageExportMin === null ? '' : ` export_min=${Math.round(ageExportMin)}`}`);
  return lignes;
}

export function codeDeSortie(r, { manifeste, illisibles }) {
  if (r.anomalies.length > 0 || illisibles.length > 0 || manifeste.etat === 'ecart') return SORTIE_ANOMALIES;
  return r.actions.length > 0 || r.degrade.length > 0 ? SORTIE_ACTIONS : SORTIE_RIEN;
}

export function controler(argv, { maintenant = Date.now() } = {}) {
  const { options, erreur } = analyserArguments(argv);
  if (erreur) return { code: SORTIE_USAGE, lignes: [`✗ ${erreur}`, USAGE] };
  if (!existsSync(options.dossier) || !statSync(options.dossier).isDirectory()) return { code: SORTIE_USAGE, lignes: [`✗ dossier d'export introuvable : ${options.dossier}`, USAGE] };
  const t = options.maintenant ?? maintenant;
  const lu = lireExport(options.dossier);
  const manifeste = lireManifeste(options.dossier, lu, t);
  if (lu.absentes.length === COLLECTIONS.length && manifeste.etat !== 'conforme') return { code: SORTIE_USAGE, lignes: [`✗ aucune collection (${COLLECTIONS.join(', ')}) sous ${options.dossier}`, USAGE] };
  const r = superviser(lu, lireFichierInstantane(options.instantane), t);
  const ageExportMin = ageExport(lu, manifeste, t);
  if (manifeste.etat === 'absent') r.degrade.unshift('export sans manifeste : complétude de la pagination non attestée');
  if (ageExportMin !== null && ageExportMin > EXPORT_PERIME_MIN) r.degrade.unshift(`export vieux de ${Math.round(ageExportMin)} min — il décrit un état passé ; le refaire avant tout geste`);
  const contexte = { manifeste, illisibles: lu.illisibles, absentes: lu.absentes, ageExportMin };
  const code = codeDeSortie(r, contexte);
  if (options.json) {
    const sortie = { anomalies: r.anomalies, actions: r.actions, degrade: r.degrade, echeance: r.echeance, comptes: r.analyse.comptes, suivants: r.analyse.suivants, manifeste: { etat: manifeste.etat, ecarts: manifeste.ecarts }, absentes: lu.absentes, illisibles: lu.illisibles, export_age_min: ageExportMin === null ? null : Math.round(ageExportMin), code };
    return { code, lignes: [JSON.stringify(sortie, null, 2)] };
  }
  return { code, lignes: rendre(r, contexte) };
}

const direct = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const { code, lignes } = controler(process.argv.slice(2));
  console.log(lignes.join('\n'));
  process.exitCode = code;
}
