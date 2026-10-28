#!/usr/bin/env node
// Signal de chevauchement (D-373 §4) : les PR ouvertes qui touchent les mêmes
// chemins que la PR <N>. LECTURE SEULE — l'API GitHub en GET.
//
//   node scripts/wn-chevauchement.mjs <N>
//
// UN SIGNAL, JAMAIS UN REFUS : il sort en 0 quoi qu'il trouve, et quand il ne
// peut pas lire, il le dit et sort en 0 aussi. Seul un usage invalide sort
// en 3. Le refus éventuel appartient au contrôle sur l'arbre fusionné
// (`wn-controle-fusion.mjs`), pas à ce signal.
//
// Les documents (`*.md`) partagés sont résumés à part : le plan, le registre,
// les règles sont touchés par la plupart des lots, et les lister PR par PR
// noierait le chevauchement de code, qui seul appelle un regard. Les conflits
// de texte entre PR ne sont pas tranchés ici (D-373, « ce qu'elle ne décide
// pas »).

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAFOND_FICHIERS_PR } from './wn-sonde-release-db.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_SIGNAL = 0;
export const SORTIE_USAGE = 3;

export const estDocument = (chemin) => chemin.endsWith('.md');

const liste = (xs, n = 5) => `${xs.slice(0, n).join(', ')}${xs.length > n ? `, … (${xs.length})` : ''}`;

/**
 * Le croisement. `fichiers` : chemins de la PR. `autres` : PR ouvertes,
 * `{ numero, titre, brouillon, fichiers, tronquee }`. Rend `{ code, documents }`,
 * chacun une liste de `{ numero, titre, brouillon, chemins }`, la PR <N>
 * exclue et les PR sans chemin commun omises.
 */
export function croiser(fichiers, autres) {
  const miens = new Set(fichiers);
  const code = [];
  const documents = [];
  for (const a of autres) {
    const communs = [...new Set(a.fichiers.filter((f) => miens.has(f)))].sort();
    const c = communs.filter((f) => !estDocument(f));
    const d = communs.filter(estDocument);
    if (c.length > 0) code.push({ numero: a.numero, titre: a.titre, brouillon: a.brouillon, chemins: c });
    if (d.length > 0) documents.push({ numero: a.numero, titre: a.titre, brouillon: a.brouillon, chemins: d });
  }
  const ordre = (x, y) => y.chemins.length - x.chemins.length || x.numero - y.numero;
  return { code: code.sort(ordre), documents: documents.sort(ordre) };
}

/** Le rendu : chevauchement de code PR par PR, puis le résumé des documents. */
export function rendre(pr, { code, documents }, tronquees = [], illisibles = []) {
  const lignes = [];
  const marque = (x) => `#${x.numero}${x.brouillon ? ' (brouillon)' : ''}`;
  if (code.length === 0) lignes.push(`✓ aucune PR ouverte ne touche les mêmes fichiers de code que #${pr}.`);
  else {
    lignes.push(`⚠ ${code.length} PR ouverte(s) touchent les mêmes fichiers de code que #${pr} — signal, pas un refus :`);
    for (const x of code) lignes.push(`  ${marque(x)} ${x.titre.slice(0, 80)} — ${x.chemins.length} chemin(s) : ${liste(x.chemins)}`);
  }
  if (documents.length > 0) {
    const parDoc = new Map();
    for (const x of documents) for (const c of x.chemins) parDoc.set(c, [...(parDoc.get(c) ?? []), `#${x.numero}`]);
    const resume = [...parDoc].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([c, prs]) => `${c} (${prs.join(', ')})`);
    lignes.push(`· documents communs, ${documents.length} PR : ${liste(resume, 8)}`);
  }
  for (const n of tronquees) lignes.push(`· #${n} : liste de fichiers tronquée par l'API (${PLAFOND_FICHIERS_PR} et plus), croisement partiel.`);
  if (illisibles.length > 0) lignes.push(`· fichiers illisibles, PR non croisée(s) : ${illisibles.map((n) => `#${n}`).join(', ')}.`);
  const total = code.reduce((s, x) => s + x.chemins.length, 0);
  lignes.push(`CHEVAUCHEMENT pr=${pr} prs_code=${code.length} chemins_code=${total} prs_documents=${documents.length}`);
  return lignes;
}

export function analyserArguments(argv) {
  if (argv.length === 1 && /^[1-9]\d*$/.test(argv[0])) return { pr: Number(argv[0]) };
  return { erreur: 'usage : node scripts/wn-chevauchement.mjs <numéro de PR>' };
}

/**
 * Collecte puis croise. `lireJson(chemin)` rend le tableau de pages de
 * `gh api --paginate --slurp`. Rend `{ code, lignes }` — `code` toujours 0.
 */
export function signaler({ pr, lireJson }) {
  const tronquees = [];
  const illisibles = [];
  const fichiersDe = (n) => {
    const objets = lireJson(`repos/{owner}/{repo}/pulls/${n}/files?per_page=100`).flat();
    if (objets.length >= PLAFOND_FICHIERS_PR) tronquees.push(n);
    return objets.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean));
  };
  let resultat;
  try {
    const miens = fichiersDe(pr);
    const ouvertes = lireJson('repos/{owner}/{repo}/pulls?state=open&per_page=100')
      .flat()
      .filter((p) => p.number !== pr);
    // Une PR voisine illisible n'éteint pas le signal : elle est dite à part.
    const autres = [];
    for (const p of ouvertes) {
      try {
        autres.push({ numero: p.number, titre: p.title ?? '', brouillon: Boolean(p.draft), fichiers: fichiersDe(p.number) });
      } catch {
        illisibles.push(p.number);
      }
    }
    resultat = croiser(miens, autres);
  } catch (err) {
    return {
      code: SORTIE_SIGNAL,
      lignes: [`⚠ signal de chevauchement indisponible (lecture impossible) : ${String(err?.message ?? err).split('\n')[0]}`, `CHEVAUCHEMENT pr=${pr} illisible`],
    };
  }
  return { code: SORTIE_SIGNAL, lignes: rendre(pr, resultat, tronquees, illisibles) };
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

function principal(argv) {
  const args = analyserArguments(argv);
  if (args.erreur) {
    console.error(args.erreur);
    return SORTIE_USAGE;
  }
  const { code, lignes } = signaler({
    pr: args.pr,
    lireJson: (chemin) =>
      JSON.parse(
        execFileSync('gh', ['api', '--paginate', '--slurp', chemin], {
          cwd: RACINE,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          maxBuffer: 256 * 1024 * 1024,
        }),
      ),
  });
  for (const l of lignes) console.log(l);
  return code;
}

// Chemin réel des deux côtés : lancé par un lien symbolique, le script doit
// signaler, pas sortir en 0 sans rien dire.
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
