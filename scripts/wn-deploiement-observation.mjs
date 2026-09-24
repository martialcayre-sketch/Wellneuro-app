#!/usr/bin/env node
// Observe la production : le code en service a-t-il RECULÉ ? (D-248, lot 1)
//
// Lecture seule. Ce script ne déploie rien, n'écrit rien, ne relance rien : il
// lit `scalingo deployments` et l'ascendance de `origin/main`, et rend un
// verdict. Il est la moitié « filet » de D-248 — la moitié « prévention »
// (déployer depuis GitHub Actions, auto-déploiement coupé) viendra aux lots 2-3.
//
// DEUX ÉTATS À NE PAS CONFONDRE, et c'est tout l'objet du script :
//
//   - RETARD : le déployé est un ANCÊTRE de la tête de `main` que personne n'a
//     jamais dépassé. C'est l'état normal pendant les minutes qui suivent un
//     merge. Au-delà d'un seuil, c'est un avertissement (build en échec ?),
//     jamais un rouge : un rouge ici ferait crier le filet à chaque merge.
//   - RECUL : le déployé est un ancêtre STRICT d'un commit qui a déjà été en
//     service. Du code livré a été retiré — les deux incidents du 2026-09-23
//     (run release-db approuvé sur un vieux commit ; deux merges rapprochés
//     dont l'ancien a fini de builder en dernier). Rouge.
//
// LE DÉPLOYÉ EST CELUI QUI A FINI EN DERNIER, PAS LA PREMIÈRE LIGNE. La liste
// de `scalingo deployments` est triée par date de DÉBUT ; la version en service
// est celle dont le build s'est TERMINÉ en dernier. Pendant l'incident 2, les
// deux builds se chevauchaient (17:56:56 + 9m0s et 17:58:39 + 8m58s) : un ordre
// par début et un ordre par fin ne désignent pas toujours la même ligne. La fin
// se calcule : DATE + DURATION.
//
// La logique est pure (`analyserTableau`, `diagnostiquer`) ; le bas du fichier
// collecte les faits avec `scalingo` et `git`.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const SORTIE_CONFORME = 0;
export const SORTIE_RECUL = 1;
export const SORTIE_ILLISIBLE = 2;

// Un build Scalingo dure 5 à 9 minutes (relevé du 2026-09-23/24), précédé de
// la CI (8 à 17 min, mesuré le 2026-09-04) et, sur un commit clinique ou de
// migration, de l'approbation release-db. Quarante-cinq minutes après le merge,
// une tête non déployée n'est plus un délai ordinaire.
export const SEUIL_RETARD_MIN_DEFAUT = 45;

const SHA = /^[0-9a-f]{40}$/;

/** `5m5s`, `1h2m3s`, `45s` → secondes ; `null` si illisible. */
export function dureeEnSecondes(texte) {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/.exec(texte.trim());
  if (!m || texte.trim() === '') return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Math.round(Number(m[3] ?? 0));
}

/**
 * Les déploiements RÉUSSIS du tableau, avec leur heure de fin.
 *
 * La date est lue comme UTC sans l'être forcément : seule compte la
 * comparaison entre lignes d'un même tableau, toutes dans le même fuseau.
 * Une ligne `success` dont la date ou la durée est illisible rend le tableau
 * entier illisible — on ne classe pas ce qu'on n'a pas su dater.
 */
export function analyserTableau(texte) {
  const deploiements = [];
  for (const ligne of texte.split('\n')) {
    const cellules = ligne.split('│').map((c) => c.trim());
    if (cellules.length < 8) continue;
    const [, id, date, duree, , ref, statut] = cellules;
    if (statut !== 'success' || !SHA.test(ref)) continue;
    const d = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(date);
    const s = dureeEnSecondes(duree);
    if (!d || s === null) {
      throw new Error(`ligne de déploiement réussi illisible : ${ligne.trim()}`);
    }
    const debut = Date.UTC(+d[1], +d[2] - 1, +d[3], +d[4], +d[5], +d[6]);
    deploiements.push({ id, sha: ref, debut, fin: debut + s * 1000 });
  }
  return deploiements;
}

/**
 * Le verdict, à partir de faits déjà collectés.
 *
 * `estAncetre(a, b)` : `a` est-il ancêtre de `b` ou égal (`merge-base
 * --is-ancestor`) ? Seuls comptent les déploiements de la ligne `main` : un
 * déploiement manuel d'une autre branche n'est ni un recul ni un retard.
 */
export function diagnostiquer({ deploiements, tete, ageTeteMin, seuilRetardMin, estAncetre }) {
  const ligneMain = deploiements.filter((d) => estAncetre(d.sha, tete));
  if (ligneMain.length === 0) {
    return { code: SORTIE_ILLISIBLE, etat: 'illisible', motif: 'aucun déploiement réussi de la ligne main dans la liste' };
  }
  // Tri stable par fin décroissante : à fin égale, l'ordre du tableau (début
  // décroissant) départage.
  const parFin = [...ligneMain].sort((a, b) => b.fin - a.fin);
  const enService = parFin[0];
  const depasse = parFin.slice(1).find((d) => d.sha !== enService.sha && estAncetre(enService.sha, d.sha));
  if (depasse) {
    return { code: SORTIE_RECUL, etat: 'recul', enService, depasse };
  }
  if (enService.sha === tete) {
    return { code: SORTIE_CONFORME, etat: 'a-jour', enService };
  }
  if (ageTeteMin > seuilRetardMin) {
    return { code: SORTIE_CONFORME, etat: 'retard', enService, ageTeteMin };
  }
  return { code: SORTIE_CONFORME, etat: 'en-cours', enService, ageTeteMin };
}

const court = (sha) => sha.slice(0, 8);
const heure = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

/** Le texte du verdict : lignes de log, annotation GitHub, résumé Markdown. */
export function rediger(verdict, tete) {
  switch (verdict.etat) {
    case 'recul':
      return {
        annotation: `::error title=Recul de production::${court(verdict.enService.sha)} est en service alors que ${court(verdict.depasse.sha)}, qui le contient, l'a déjà été.`,
        resume: [
          '## ❌ Recul de production',
          '',
          `- En service : \`${verdict.enService.sha}\` (fin du build ${heure(verdict.enService.fin)})`,
          `- Déjà en service auparavant, et plus récent dans \`main\` : \`${verdict.depasse.sha}\` (fin ${heure(verdict.depasse.fin)})`,
          `- Tête de \`main\` : \`${tete}\``,
          '',
          'Sortie : redéployer la tête — geste humain :',
          '`scalingo --region osc-fr1 --app wellneuro integration-link-manual-deploy main`,',
          'puis relire `scalingo deployments` (la ligne qui FINIT en dernier doit être la tête).',
        ],
      };
    case 'retard':
      return {
        annotation: `::warning title=Tête non déployée::${court(tete)} est sur main depuis ${verdict.ageTeteMin} min et n'est pas en service (en service : ${court(verdict.enService.sha)}).`,
        resume: [
          '## ⚠️ Tête de `main` non déployée',
          '',
          `- Tête : \`${tete}\`, mergée il y a ${verdict.ageTeteMin} min`,
          `- En service : \`${verdict.enService.sha}\` — un ancêtre, donc pas un recul`,
          '',
          'Lire le build : `scalingo --region osc-fr1 --app wellneuro deployment-logs`.',
        ],
      };
    case 'illisible':
      return {
        annotation: `::error title=Production illisible::${verdict.motif}`,
        resume: ['## ❌ Production illisible', '', verdict.motif, '', 'Aucun recul ne peut être exclu.'],
      };
    default:
      return {
        annotation: null,
        resume: [
          verdict.etat === 'a-jour' ? '## ✓ La tête de `main` est en service' : '## ✓ Déploiement de la tête en cours',
          '',
          `- En service : \`${verdict.enService.sha}\` (fin du build ${heure(verdict.enService.fin)})`,
          `- Tête de \`main\` : \`${tete}\``,
        ],
      };
  }
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

function lancer(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function principal(env = process.env) {
  const app = env.SCALINGO_APP ?? 'wellneuro';
  const region = env.SCALINGO_REGION ?? 'osc-fr1';
  const seuil = Number(env.WN_SEUIL_RETARD_MIN ?? SEUIL_RETARD_MIN_DEFAUT);
  const publier = (lignes) => {
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${lignes.join('\n')}\n`);
  };

  let tete;
  let ageTeteMin;
  let deploiements;
  try {
    lancer('git', ['fetch', '--quiet', 'origin', 'main']);
    tete = lancer('git', ['rev-parse', 'origin/main']).trim();
    const horodatage = Number(lancer('git', ['log', '-1', '--format=%ct', 'origin/main']).trim());
    ageTeteMin = Math.floor((Date.now() / 1000 - horodatage) / 60);
    deploiements = analyserTableau(lancer('scalingo', ['--app', app, '--region', region, 'deployments']));
  } catch (err) {
    const verdict = { code: SORTIE_ILLISIBLE, etat: 'illisible', motif: `collecte impossible — ${err.message.split('\n')[0]}` };
    const { annotation, resume } = rediger(verdict, tete ?? '?');
    console.error(annotation);
    publier(resume);
    return verdict.code;
  }

  const estAncetre = (a, b) => {
    try {
      lancer('git', ['merge-base', '--is-ancestor', a, b]);
      return true;
    } catch {
      return false;
    }
  };
  const verdict = diagnostiquer({ deploiements, tete, ageTeteMin, seuilRetardMin: seuil, estAncetre });
  const { annotation, resume } = rediger(verdict, tete);
  if (annotation) console.log(annotation);
  console.log(resume.join('\n'));
  publier(resume);
  return verdict.code;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let code;
  try {
    code = principal();
  } catch (err) {
    // Un plantage n'est pas un recul : il ne doit pas en prendre le code.
    console.error(`::error title=Observation en panne::${err?.message ?? err}`);
    code = SORTIE_ILLISIBLE;
  }
  process.exit(code);
}
