#!/usr/bin/env node
// Décision d'une passe de l'orchestrateur cloud (`D-540`, amendée le
// 2026-11-20 : la passe EST la session du lot). LECTURE SEULE — un export
// local des registres, aucun réseau, aucune écriture aux registres.
//
//   node scripts/wn-orchestrateur-passe.mjs <dossier-export> [--files D]
//        [--maintenant <ISO>] [--journal-sortie <fichier.json>] [--json]
//
// Le dossier est celui que rendent les lectures `ArtifactData … out_dir` de la
// session de passe, dans son bloc-notes, jamais au dépôt :
//   <dossier>/lots/<id>.json
//   <dossier>/orchestrateur_lancements/<id>.json   (lignes d'intention)
//   <dossier>/orchestrateur_journal/<id>.json
//   <dossier>/orchestrateur/arret.json             (interrupteur, `get`)
//   <dossier>/manifeste.json                       (schéma 1, comme wn-registres)
//
// Le script applique les règles écrites de `D-540` et rend : le lot à prendre,
// ou la raison de n'en prendre aucun ; les lots de la voie Mac à signaler ;
// l'hygiène due. Il ne tranche rien que la décision ne tranche, et ne recopie
// aucun texte libre des registres (identifiants et codes seulement).
// `--journal-sortie` écrit la ligne de journal de la passe (données seules),
// que la session crée par `ArtifactData set … file_path` sans `if_version`.
//
// Codes de sortie :
//   0  un lot à prendre (champ `lot`)
//   1  rien à prendre : passe normale sans lot (file occupée, hors plage,
//      carnet sans lot lançable). Aucun plafond quotidien (`D-540`,
//      amendement du 2026-11-24).
//   2  arrêt : interrupteur non ouvert, lecture douteuse, ou arrêt de soi
//      (trois lancements sans prise dans la journée, deux sessions sur un lot)
//   3  usage invalide ou export illisible

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { BOITES_FILES, SANS_NOUVELLES_MS } from './lib/registres.mjs';

export const SORTIE_PRENDRE = 0;
export const SORTIE_RIEN = 1;
export const SORTIE_ARRET = 2;
export const SORTIE_USAGE = 3;

/** Plage du pilote, réponse `20261118-2312-d` (« Prudent »). Le plafond quotidien
 * de 4 lots est retiré sur la parole du responsable (`D-540`, amendement du
 * 2026-11-24) : les prises du jour restent comptées, jamais bornées. */
export const HEURE_DEBUT = 7;
export const HEURE_FIN = 23;
/** Arrêt de soi : lancements sans prise dans la journée de Paris (`D-540` §8). */
export const SANS_PRISE_MAX = 3;
/** Une intention non suivie de prise expire (`D-540` §5). */
export const ECHEANCE_INTENTION_MS = 30 * 60 * 1000;
/** `pris_par` d'un lot pris par une passe. */
export const PRIS_PAR_PASSE = 'orchestrateur (passe cloud)';
/** États d'une ligne d'intention (consigne de la passe, §4). */
export const ETATS_INTENTION = ['intention', 'prise', 'refusee'];
/** Un lot n'est lançable en cloud qu'à ces valeurs exactes (`D-540` §3, réponse `20261120-1232-d`). */
export const LIEU_CLOUD = 'cloud';
export const NATURE_LANCABLE = 'ordinaire';
export const RISQUES_LANCABLES = ['P1', 'P2'];

export const COLLECTIONS = ['lots', 'orchestrateur_lancements', 'orchestrateur_journal'];
export const SCHEMA_MANIFESTE = 1;

const RE_ID_LOT = /^[a-z0-9-]+$/;
const RE_BRANCHE = /^[a-z0-9][a-z0-9._/-]*$/;
const RE_HANDOFF = /^docs\/claude\/handoffs\/\d{4}-\d{2}-\d{2}-\d{4}-[a-z0-9-]+\.md$/;

const vide = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const instant = (v) => {
  if (typeof v !== 'string' || !/(?:Z|[+-]\d{2}:?\d{2})$/.test(v.trim())) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

/** Date (`AAAA-MM-JJ`), heure et minute à Paris : le conteneur tourne en UTC. */
export function aParis(ms) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: Number(p.hour), minute: Number(p.minute), id: `${p.year}${p.month}${p.day}-${p.hour}${p.minute}` };
}

/**
 * Pourquoi un lot `pret` n'est pas lançable en cloud — `null` s'il l'est.
 * Dans le doute, le Mac : toute valeur absente, inconnue ou malformée renvoie
 * à la voie Mac. Un lot déjà tenté en cloud (une ligne d'intention existe, à
 * quelque version que ce soit) n'y repart jamais.
 */
export function motifVoieMac(lot, { intentions = [], files = ['D'], refBrancheValide = () => true, handoffPresent = () => true } = {}) {
  if (!RE_ID_LOT.test(lot.id ?? '')) return 'controle_identifiant';
  if (!files.includes(lot.file)) return 'controle_file';
  if (lot.lieu !== LIEU_CLOUD) return 'lieu';
  if (lot.nature !== NATURE_LANCABLE) return 'nature';
  if (!RISQUES_LANCABLES.includes(lot.risque)) return 'risque';
  if (!vide(lot.branche) && !(typeof lot.branche === 'string' && RE_BRANCHE.test(lot.branche) && refBrancheValide(lot.branche))) return 'controle_branche';
  if (!vide(lot.handoff) && !(typeof lot.handoff === 'string' && RE_HANDOFF.test(lot.handoff) && handoffPresent(lot.handoff, vide(lot.branche) ? null : lot.branche))) return 'controle_handoff';
  // Le champ `lot`, ou à défaut l'identifiant `<lot>--v<version>` de la ligne.
  if (intentions.some((i) => i.lot === lot.id || String(i.id ?? '').startsWith(`${lot.id}--v`))) return 'deja_tente';
  return null;
}

/** Les lots `pret` d'une file, dans l'ordre du carnet, dont le lot `apres` est `fait` (`D-510` §2). */
export function pretsDansLOrdre(lots, file) {
  const parId = new Map(lots.map((l) => [l.id, l]));
  return lots
    .filter((l) => l.file === file && l.etat === 'pret' && Number.isInteger(l.ordre) && (vide(l.apres) || parId.get(l.apres)?.etat === 'fait'))
    .sort((x, y) => x.ordre - y.ordre || String(x.id).localeCompare(String(y.id)));
}

/**
 * La décision d'une passe. Fonction pure : `etat` est l'export lu,
 * `maintenant` l'heure de la passe (ms), `controles` les deux prédicats que le
 * câblage remplit avec Git (branche, handoff).
 *
 * @returns {{sortie:number, code:string, lot:string|null, signalements:Array, orphelins:Array, hygieneDue:boolean, compteurs:object, motifs:Array}}
 */
export function decider(etat, maintenant, { files = ['D'], controles = {} } = {}) {
  const { lots = [], intentions = [], journal = [], arret = undefined, lectureSure = false } = etat;
  const paris = aParis(maintenant);
  const res = { sortie: SORTIE_RIEN, code: '', lot: null, signalements: [], orphelins: [], hygieneDue: false, arretASignaler: false, compteurs: {}, motifs: [] };
  const fin = (sortie, code) => Object.assign(res, { sortie, code });
  const duJour = (v) => {
    const t = instant(v);
    return t !== null && aParis(t).jour === paris.jour;
  };
  // Un arrêt de soi donne une seule ligne `autre` à la boîte D par cause et
  // par jour (`D-540` §8) ; l'interrupteur fermé n'en donne aucune.
  const arretDeSoi = (code) => Object.assign(fin(SORTIE_ARRET, code), { arretASignaler: !journal.some((j) => j.code === code && duJour(j.debut)) });

  // 1. L'interrupteur : seul le booléen `false` ouvre (`D-540` §8).
  if (!arret || arret.arret !== false) return fin(SORTIE_ARRET, 'interrupteur_ferme');
  // 2. Une lecture partielle ne décide rien (`D-540` §8, « un doute rend l'action indéterminée »).
  if (!lectureSure) return arretDeSoi('lecture_douteuse');
  // Une intention d'état inconnu ou sans heure lisible fausserait les comptes :
  // c'est une lecture douteuse, pas une ligne à ignorer.
  if (intentions.some((i) => !ETATS_INTENTION.includes(i.etat) || instant(i.cree_le) === null)) return arretDeSoi('lecture_douteuse');

  const intentionsDuJour = intentions.filter((i) => duJour(i.cree_le));
  const sansPrise = intentionsDuJour.filter((i) => i.etat === 'refusee' || (i.etat === 'intention' && maintenant - (instant(i.cree_le) ?? maintenant) > ECHEANCE_INTENTION_MS));
  const prises = intentionsDuJour.filter((i) => i.etat === 'prise');
  const dejaSignales = new Set(journal.flatMap((j) => (Array.isArray(j.signalements) ? j.signalements.map((s) => s?.lot) : [])));
  res.hygieneDue = !journal.some((j) => j.hygiene === 'jouee' && duJour(j.debut));
  res.compteurs = { lots: lots.length, intentions: intentions.length, prises_du_jour: prises.length, sans_prise_du_jour: sansPrise.length };

  // 3. Arrêts de soi.
  const prisesParLot = new Map();
  for (const i of intentions.filter((x) => x.etat === 'prise')) prisesParLot.set(i.lot, (prisesParLot.get(i.lot) ?? 0) + 1);
  if ([...prisesParLot.values()].some((n) => n > 1)) return arretDeSoi('deux_sessions_un_lot');
  if (sansPrise.length >= SANS_PRISE_MAX) return arretDeSoi('sans_prise_repetes');

  // 4. Signalements de la voie Mac et lots orphelins, une fois par lot.
  for (const file of files) {
    for (const lot of pretsDansLOrdre(lots, file)) {
      const motif = motifVoieMac(lot, { intentions, files, ...controles });
      if (motif === null) continue;
      res.motifs.push({ lot: lot.id, motif });
      if (!dejaSignales.has(lot.id)) res.signalements.push({ lot: lot.id, file: lot.file, motif: 'voie_mac', detail: motif });
    }
  }
  const cloudPris = lots.filter((l) => files.includes(l.file) && l.lieu === LIEU_CLOUD && l.etat === 'pris' && vide(l.pr));
  for (const l of cloudPris) {
    const tenu = instant(l.tenu_le) ?? instant(l.pris_le);
    if (tenu === null || maintenant - tenu > SANS_NOUVELLES_MS) {
      res.orphelins.push(l.id);
      if (!dejaSignales.has(l.id)) res.signalements.push({ lot: l.id, file: l.file, motif: 'orphelin' });
    }
  }

  // 5. Garde de tête (réponse `20261120-1231-d`) : aucun lot cloud pris sans PR,
  // ni intention en vol (posée, pas encore suivie de prise, non expirée) — une
  // passe concurrente est entre son intention et sa prise.
  if (cloudPris.length > 0) return fin(SORTIE_RIEN, cloudPris.some((l) => res.orphelins.includes(l.id)) ? 'orphelin' : 'file_occupee');
  const enVol = intentions.some((i) => i.etat === 'intention' && maintenant - instant(i.cree_le) <= ECHEANCE_INTENTION_MS);
  if (enVol) return fin(SORTIE_RIEN, 'file_occupee');
  // 6. Plage horaire (réponse `20261118-2312-d`). Aucun plafond quotidien.
  if (paris.heure < HEURE_DEBUT || paris.heure > HEURE_FIN) return fin(SORTIE_RIEN, 'hors_plage');

  // 7. Le lot : le premier `pret` lançable, dans l'ordre du carnet.
  for (const file of files) {
    const lot = pretsDansLOrdre(lots, file).find((l) => motifVoieMac(l, { intentions, files, ...controles }) === null);
    if (lot) {
      res.lot = lot.id;
      return fin(SORTIE_PRENDRE, 'prendre');
    }
  }
  return fin(SORTIE_RIEN, 'aucun_lot_lancable');
}

/** La ligne de journal de la passe (`D-540` §9) : identifiants et codes, aucun texte libre. */
export function ligneJournal(decision, { debut, interrupteur }) {
  return {
    debut: new Date(debut).toISOString(),
    interrupteur,
    code: decision.code,
    lot: decision.lot,
    compteurs: decision.compteurs,
    motifs: decision.motifs,
    signalements: decision.signalements,
    orphelins: decision.orphelins,
    hygiene: decision.hygieneDue ? 'due' : 'non_due',
  };
}

// ---------------------------------------------------------------------------
// Lecture de l'export et câblage CLI.
// ---------------------------------------------------------------------------

function lireCollection(dossier, collection, lu) {
  const chemin = join(dossier, collection);
  if (!existsSync(chemin) || !statSync(chemin).isDirectory()) return [];
  const lignes = [];
  for (const f of readdirSync(chemin).filter((x) => x.endsWith('.json')).sort()) {
    try {
      const d = JSON.parse(readFileSync(join(chemin, f), 'utf8'));
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('pas un objet');
      lignes.push({ ...d, id: f.slice(0, -'.json'.length) });
    } catch {
      lu.illisibles.push(`${collection}/${f}`);
    }
  }
  return lignes;
}

/**
 * Lit l'export et juge sa complétude par le manifeste : chaque collection
 * déclarée, son curseur épuisé, autant de fichiers que de lignes déclarées.
 * Sans manifeste, ou en écart, la lecture n'est pas sûre.
 */
export function lireExport(dossier) {
  const lu = { illisibles: [], ecarts: [] };
  const etat = {
    lots: lireCollection(dossier, 'lots', lu),
    intentions: lireCollection(dossier, 'orchestrateur_lancements', lu),
    journal: lireCollection(dossier, 'orchestrateur_journal', lu),
    arret: undefined,
    lectureSure: false,
  };
  const cheminArret = join(dossier, 'orchestrateur', 'arret.json');
  if (existsSync(cheminArret)) {
    try {
      etat.arret = JSON.parse(readFileSync(cheminArret, 'utf8'));
    } catch {
      lu.ecarts.push('interrupteur illisible');
    }
  }
  let m = null;
  try {
    m = JSON.parse(readFileSync(join(dossier, 'manifeste.json'), 'utf8'));
  } catch {
    lu.ecarts.push('manifeste absent ou illisible');
  }
  if (m) {
    if (m.schema !== SCHEMA_MANIFESTE || !m.collections || typeof m.collections !== 'object') lu.ecarts.push('manifeste hors contrat');
    else {
      const tailles = { lots: etat.lots.length, orchestrateur_lancements: etat.intentions.length, orchestrateur_journal: etat.journal.length };
      for (const c of COLLECTIONS) {
        const d = m.collections[c];
        if (!d || d.curseur_epuise !== true || !Number.isInteger(d.lignes)) lu.ecarts.push(`${c} : non attestée complète`);
        else if (d.lignes !== tailles[c] + lu.illisibles.filter((f) => f.startsWith(`${c}/`)).length) lu.ecarts.push(`${c} : ${tailles[c]} fichier(s) pour ${d.lignes} ligne(s)`);
      }
    }
  }
  if (lu.illisibles.length > 0) lu.ecarts.push(`${lu.illisibles.length} fichier(s) illisible(s)`);
  etat.lectureSure = lu.ecarts.length === 0;
  return { etat, ecarts: lu.ecarts };
}

export function analyserArguments(argv) {
  const o = { dossier: null, files: ['D'], maintenant: null, journalSortie: null, json: false, erreur: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--files' || a === '--maintenant' || a === '--journal-sortie') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) o.erreur = `${a} attend une valeur`;
      else if (a === '--files') o.files = v.split(',').map((x) => x.trim());
      else if (a === '--maintenant') o.maintenant = instant(v);
      else o.journalSortie = v;
      i += 1;
    } else if (a.startsWith('--')) o.erreur = `option inconnue : ${a}`;
    else if (o.dossier === null) o.dossier = a;
    else o.erreur = `argument en trop : ${a}`;
  }
  if (!o.erreur && o.dossier === null) o.erreur = 'dossier d’export manquant';
  if (!o.erreur && argv.includes('--maintenant') && o.maintenant === null) o.erreur = '--maintenant : ISO avec fuseau attendu';
  if (!o.erreur && !o.files.every((f) => BOITES_FILES.includes(f))) o.erreur = `--files : une de ${BOITES_FILES.join(', ')}`;
  return o;
}

const RACINE = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const gitOk = (args) => {
  try {
    execFileSync('git', args, { cwd: RACINE, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export function principal(argv, { maintenant = Date.now() } = {}) {
  const o = analyserArguments(argv);
  if (o.erreur) {
    console.error(`${o.erreur}\nUsage : node scripts/wn-orchestrateur-passe.mjs <dossier-export> [--files D] [--maintenant <ISO>] [--journal-sortie <fichier>] [--json]`);
    return SORTIE_USAGE;
  }
  if (!existsSync(o.dossier) || !statSync(o.dossier).isDirectory()) {
    console.error(`export introuvable : ${o.dossier}`);
    return SORTIE_USAGE;
  }
  const t = o.maintenant ?? maintenant;
  const { etat, ecarts } = lireExport(o.dossier);
  const controles = {
    refBrancheValide: (b) => gitOk(['check-ref-format', '--branch', b]),
    handoffPresent: (h, b) => gitOk(['cat-file', '-e', `origin/main:${h}`]) || (b !== null && gitOk(['cat-file', '-e', `origin/${b}:${h}`])),
  };
  const d = decider(etat, t, { files: o.files, controles });
  if (o.journalSortie) {
    const interrupteur = etat.arret === undefined ? 'absent' : etat.arret?.arret === false ? 'ouvert' : 'ferme';
    writeFileSync(o.journalSortie, `${JSON.stringify({ ...ligneJournal(d, { debut: t, interrupteur }), ecarts_lecture: ecarts.length }, null, 2)}\n`);
  }
  if (o.json) console.log(JSON.stringify({ ...d, ecarts_lecture: ecarts, id_journal: `${aParis(t).id}-orch` }, null, 2));
  else {
    console.log(`passe ${aParis(t).id}-orch : ${d.code}${d.lot ? ` → ${d.lot}` : ''}`);
    for (const e of ecarts) console.log(`  lecture : ${e}`);
    for (const s of d.signalements) console.log(`  signaler à la boîte ${s.file} : ${s.lot} (${s.motif}${s.detail ? `, ${s.detail}` : ''})`);
    if (d.arretASignaler) console.log(`  signaler à la boîte D : arrêt de soi (${d.code}), première fois du jour`);
    if (d.hygieneDue) console.log('  hygiène du jour : due');
  }
  return d.sortie;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(principal(process.argv.slice(2)));
}
