#!/usr/bin/env node
// Déploie la tête de `main` sur Scalingo, et ne conclut au vert que si rien
// n'a reculé (D-248, lot 2).
//
// POURQUOI UNE BRANCHE ET PAS UN SHA. `integration-link-manual-deploy` ne
// prend qu'une branche (constaté, CLI 1.48 et API) : il livre la tête de
// `main` AU MOMENT où Scalingo la lit. Si ce run porte encore la tête quand il
// déclenche, SON build ne peut livrer que cette tête ou une plus récente.
//
// CE QUE LA BRANCHE NE SUFFIT PAS À GARANTIR : un AUTRE build en vol en même
// temps — auto-déploiement (actif jusqu'au lot 3), `release-db` (qui déclenche
// aussi, [[D-102]]), ou un run précédent sorti sur délai. Les builds se
// chevauchent et le dernier à FINIR l'emporte (incident 2). D'où deux règles :
//   - ne rien déclencher tant qu'un build est en vol (attente bornée) ;
//   - ne rien conclure tant qu'un build est en vol, puis rejouer le verdict
//     d'observation sur le tableau définitif — un recul est rouge.
// La fenêtre restante — un déclenchement concurrent dans les secondes entre
// notre lecture « calme » et notre écriture — est DÉTECTÉE (rouge), pas
// empêchée : `release-db` n'attend pas le calme. Routé au lot 3 (D-248).
//
// CE QUI EST VERT SANS ÉCRITURE :
//   - le run n'est plus la tête de `main` → abstention ; son run déploiera.
//   - la version en service, sur un tableau calme, contient déjà ce commit →
//     abstention, sauf `WN_FORCER=true` (répétition à vide).
// TANT QUE L'AUTO-DÉPLOIEMENT EST ACTIF, la garde finale rend rouge tout run
// qui n'est plus la tête à sa fin — son vert réveillerait l'auto-déploiement
// d'un vieux commit (incident 1).
//
// CE QUI EST ROUGE : déclenchement refusé, build en échec, commit absent de
// la version en service, recul, production illisible, build en vol trop
// longtemps, ou vingt minutes sans conclusion (état INCONNU — lire
// `deployment-logs` avant de relancer).
//
// Le noyau `deployer()` reçoit ses dépendances (lecture, déclenchement,
// ascendance, attente) : le banc le joue sans réseau, et le chemin de
// production ne porte aucune variable d'essai.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { analyserTableau, analyserToutesLignes, diagnostiquer, SORTIE_RECUL } from './wn-deploiement-observation.mjs';

export const SORTIE_OK = 0;
export const SORTIE_ECHEC = 1;

// Un build dure 5 à 9 minutes (relevé du 2026-09-23/24). Vingt minutes, comme
// la garde de release-db : au-delà, ce n'est plus une attente.
export const ESSAIS_DEFAUT = 40;
export const INTERVALLE_MS_DEFAUT = 30_000;

// Statuts terminaux d'échec de Scalingo. Tout autre statut non `success` est
// traité comme EN VOL — y compris un statut inconnu : l'attente bornée le
// tranchera, plutôt qu'un échec prononcé sur un mot qu'on ne connaît pas.
const ECHEC = /(-error|^aborted)$/;

// TANT QUE L'AUTO-DÉPLOIEMENT SCALINGO EST ACTIF (lot 2), un run qui conclut
// VERT sur un commit qui n'est plus la tête lève le dernier check de ce commit
// — et Scalingo peut le déployer par-dessus la tête : le mécanisme de
// l'incident 1. La garde finale fait alors échouer le run VOLONTAIREMENT,
// comme celle de release-db. Passé à `false` au lot 3, avec `--no-auto-deploy`
// (geste du responsable) : un invariant du banc lie ce drapeau au déclencheur
// `workflow_run` du workflow — l'un ne bascule pas sans l'autre.
export const AUTO_DEPLOIEMENT_ACTIF = false;

/** La version en service : le déploiement réussi qui a FINI en dernier. */
function enService(texte) {
  const reussis = analyserTableau(texte);
  return [...reussis].sort((a, b) => b.fin - a.fin)[0] ?? null;
}

/**
 * Les builds EN VOL, connus ou non. Tant qu'il en reste un, rien n'est
 * jugeable : un build plus ancien qui finit après le nôtre le remplace (les
 * builds se chevauchent — incident 2), et il peut venir de l'auto-déploiement,
 * de release-db ou d'un run précédent sorti sur délai.
 */
export function enVol(texte) {
  return analyserToutesLignes(texte).filter((l) => l.statut !== 'success' && !ECHEC.test(l.statut));
}

const decrire = (lignes) => lignes.map((l) => `${l.id} ${l.statut}`).join(', ');
const premiereLigne = (err) => String(err?.message ?? err).split('\n')[0];

export async function deployer({
  sha,
  lireTete,
  lireDeploiements,
  declencher,
  estAncetre,
  dormir,
  forcer = false,
  essais = ESSAIS_DEFAUT,
  intervalleMs = INTERVALLE_MS_DEFAUT,
  journal = () => {},
  lireRunsReleaseDb = () => [],
}) {
  if (lireTete() !== sha) {
    return { code: SORTIE_OK, etat: 'depasse', motif: `la tête de main a dépassé ce run (${sha}) — son propre run déploiera` };
  }

  // UN COMMIT QUI PORTE UN RUN release-db ATTEND SON APPROBATION (D-087, lot 3
  // de D-248). Sous l'auto-déploiement, ce run était un CHECK du commit, et
  // Scalingo attendait qu'il conclue : un commit de migration n'était déployé
  // qu'à l'approbation, par release-db lui-même ([[D-102]]). Le déployer dès la
  // fin du CI servirait un code qui lit des colonnes absentes de la base, pour
  // toute la durée de l'attente humaine. Retenu, donc — vert, sans écriture :
  // release-db déploiera à l'approbation. Une lecture en échec propage : aucune
  // écriture n'a eu lieu.
  const nonConclus = lireRunsReleaseDb(sha).filter((r) => !(r.status === 'completed' && r.conclusion === 'success'));
  if (nonConclus.length > 0) {
    const etats = nonConclus.map((r) => r.conclusion || r.status).join(', ');
    return {
      code: SORTIE_OK,
      etat: 'retenu-release-db',
      motif: `${sha} porte un run release-db non conclu au vert (${etats}) — release-db le déploiera à l'approbation`,
    };
  }

  // CALME AVANT L'ÉCRITURE : aucun build en vol. Déclencher pendant un autre
  // build, c'est en lancer un second en parallèle — et laisser l'ordre de fin
  // décider. Une lecture en échec ici propage : aucune écriture n'a eu lieu.
  let avant;
  for (let i = 0; ; i += 1) {
    avant = lireDeploiements();
    const vol = enVol(avant);
    if (vol.length === 0) break;
    if (i >= essais) {
      return { code: SORTIE_ECHEC, etat: 'en-vol', motif: `un build est toujours en vol (${decrire(vol)}) — aucune écriture` };
    }
    journal(`… build en vol avant déclenchement (${decrire(vol)}), attente (${i + 1}/${essais}).`);
    await dormir(intervalleMs);
  }

  // Tableau CALME : la version en service ne peut plus être remplacée par un
  // build plus ancien — l'abstention est sûre. Mais « contient ce commit » ne
  // suffit pas : un déploiement d'une branche DIVERGENTE bâtie sur la tête le
  // contient aussi (revue #1220). La version en service doit être SUR la
  // ligne de `main` jusqu'à ce run — c'est-à-dire ce commit même.
  const courant = enService(avant);
  if (!forcer && courant && estAncetre(sha, courant.sha) && estAncetre(courant.sha, sha)) {
    return { code: SORTIE_OK, etat: 'deja-en-service', motif: `${courant.sha} est en service et contient ${sha}` };
  }
  const connus = new Set(analyserToutesLignes(avant).map((l) => l.id));

  // DERNIER contrôle avant l'écriture : l'attente a pu durer, et une tête qui
  // a bougé entre-temps a son propre run.
  if (lireTete() !== sha) {
    return { code: SORTIE_OK, etat: 'depasse', motif: `la tête de main a dépassé ce run (${sha}) juste avant le déclenchement` };
  }
  try {
    declencher();
  } catch (err) {
    return { code: SORTIE_ECHEC, etat: 'refuse', motif: `déclenchement refusé — ${premiereLigne(err)}` };
  }
  journal(`→ Déploiement de main déclenché (run ${sha}).`);

  for (let i = 1; i <= essais; i += 1) {
    await dormir(intervalleMs);
    // Une lecture en échec APRÈS le déclenchement ne conclut rien : le build
    // tourne, avec ou sans nous. La tête est relue (fetch) à CHAQUE tour : un
    // commit mergé pendant le build, et livré avec lui, doit être connu
    // localement avant qu'on juge une ascendance.
    let tete;
    let texte;
    let lignes;
    let service;
    try {
      tete = lireTete();
      texte = lireDeploiements();
      lignes = analyserToutesLignes(texte);
      service = enService(texte);
    } catch (err) {
      journal(`… lecture en échec (${i}/${essais}) — ${premiereLigne(err)}`);
      continue;
    }
    const nouveaux = lignes.filter((l) => !connus.has(l.id));
    const vol = enVol(texte);
    if (vol.length > 0 || nouveaux.length === 0) {
      journal(`… en attente (${i}/${essais})${vol.length ? ` — en vol : ${decrire(vol)}` : ' — déploiement pas encore listé'}.`);
      continue;
    }
    // Plus rien en vol, et notre déclenchement a produit au moins une ligne :
    // le tableau est définitif, on juge.
    if (nouveaux.every((l) => ECHEC.test(l.statut))) {
      return { code: SORTIE_ECHEC, etat: 'build-en-echec', motif: `aucun déploiement nouveau n'a abouti : ${decrire(nouveaux)}` };
    }
    if (!service || !estAncetre(sha, service.sha)) {
      return {
        code: SORTIE_ECHEC,
        etat: 'non-livre',
        motif: `tous les builds sont terminés, et la version en service (${service?.sha ?? 'aucune'}) ne contient pas ${sha}`,
      };
    }
    // Le constat qui compte : pas seulement « mon build a réussi », mais « ce
    // qui est en service ne recule par rapport à rien ».
    const verdict = diagnostiquer({
      deploiements: analyserTableau(texte),
      tete,
      ageTeteMin: 0,
      seuilRetardMin: Infinity,
      estAncetre,
    });
    if (verdict.code === SORTIE_RECUL) {
      return { code: SORTIE_ECHEC, etat: 'recul', motif: `recul constaté : ${verdict.enService.sha} en service, ${verdict.depasse.sha} l'a déjà été` };
    }
    if (verdict.code !== SORTIE_OK) {
      return { code: SORTIE_ECHEC, etat: 'illisible', motif: verdict.motif };
    }
    return { code: SORTIE_OK, etat: 'deploye', motif: `${service.sha} en service (déploiement ${service.id})` };
  }
  return { code: SORTIE_ECHEC, etat: 'delai', motif: `aucune conclusion après ${Math.round((essais * intervalleMs) / 60000)} min — état INCONNU` };
}

/**
 * La garde finale, tant que l'auto-déploiement est actif : un run qui n'est
 * plus la tête ne conclut JAMAIS au vert. Tête illisible ⇒ rouge : dans le
 * doute, on ne lève pas un check.
 */
export function gardeFinale(verdict, { sha, lireTete, autoDeploiementActif = AUTO_DEPLOIEMENT_ACTIF }) {
  if (!autoDeploiementActif || verdict.code !== SORTIE_OK) return verdict;
  let tete;
  try {
    tete = lireTete();
  } catch {
    tete = null;
  }
  if (tete === sha) return verdict;
  return {
    code: SORTIE_ECHEC,
    etat: 'garde-finale',
    motif: `${verdict.motif}. ÉCHEC VOLONTAIRE — ce run porte ${sha}, ${tete ? `dépassé par la tête (${tete})` : 'tête de main illisible'} : conclu au vert, il lèverait le dernier check de ce commit, que l'auto-déploiement Scalingo pourrait livrer par-dessus la tête. NE PAS RELANCER ce run.`,
  };
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

function lancer(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const TITRES = {
  depasse: '## ✓ Abstention — ce run n’est plus la tête de `main`',
  'deja-en-service': '## ✓ Abstention — déjà en service',
  deploye: '## ✓ Tête de `main` déployée',
  refuse: '## ❌ Déclenchement refusé par Scalingo',
  'build-en-echec': '## ❌ Build en échec',
  recul: '## ❌ Recul constaté après déploiement',
  'non-livre': '## ❌ Tous les builds terminés, mais ce commit n’est pas en service',
  illisible: '## ❌ Production illisible après déploiement',
  'en-vol': '## ❌ Un build reste en vol — aucune écriture',
  'garde-finale': '## ❌ Échec volontaire — ce run n’est plus la tête de `main`',
  'retenu-release-db': '## ✓ Retenu — ce commit attend l’approbation de release-db',
  delai: '## ❌ Aucune conclusion — état inconnu',
};

async function principal(env = process.env) {
  const app = env.SCALINGO_APP ?? 'wellneuro';
  const region = env.SCALINGO_REGION ?? 'osc-fr1';
  // Sur `workflow_run`, GITHUB_SHA est la tête de la branche par défaut au
  // moment du run ; le commit que le CI a VÉRIFIÉ est `workflow_run.head_sha`,
  // passé par WN_SHA. C'est lui qu'on déploie — ou dont on constate le dépassement.
  const sha = env.WN_SHA || env.GITHUB_SHA;
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) {
    console.error('::error title=Déploiement refusé::WN_SHA / GITHUB_SHA absent ou invalide.');
    return SORTIE_ECHEC;
  }
  const scalingo = (...args) => lancer('scalingo', ['--app', app, '--region', region, ...args]);
  const lireTete = () => {
    lancer('git', ['fetch', '--quiet', 'origin', 'main']);
    return lancer('git', ['rev-parse', 'origin/main']).trim();
  };
  const brut = await deployer({
    sha,
    forcer: env.WN_FORCER === 'true',
    // LECTURE SEULE de l'API Actions (`actions: read`) : les runs release-db du
    // commit. Jamais d'autre verbe que GET.
    lireRunsReleaseDb: (commit) =>
      JSON.parse(
        lancer('gh', ['api', `repos/${env.GITHUB_REPOSITORY}/actions/workflows/release-db.yml/runs?head_sha=${commit}&per_page=100`]),
      ).workflow_runs.map((r) => ({ status: r.status, conclusion: r.conclusion })),
    lireTete,
    lireDeploiements: () => scalingo('deployments'),
    // LA SEULE ÉCRITURE de ce script, et un invariant le tient : une BRANCHE,
    // jamais un SHA, jamais un autre verbe.
    declencher: () => scalingo('integration-link-manual-deploy', 'main'),
    estAncetre: (a, b) => {
      try {
        lancer('git', ['merge-base', '--is-ancestor', a, b]);
        return true;
      } catch {
        return false;
      }
    },
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
    journal: (l) => console.log(l),
  });
  const verdict = gardeFinale(brut, { sha, lireTete });
  const lignes = [TITRES[verdict.etat] ?? `## ${verdict.etat}`, '', verdict.motif];
  if (verdict.code !== SORTIE_OK) {
    lignes.push('', 'Lire le build : `scalingo --region osc-fr1 --app wellneuro deployment-logs`.');
    console.error(`::error title=Déploiement::${verdict.motif}`);
  }
  console.log(lignes.join('\n'));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${lignes.join('\n')}\n`);
  return verdict.code;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal()
    .catch((err) => {
      console.error(`::error title=Déployeur en panne::${err?.message ?? err}`);
      return SORTIE_ECHEC;
    })
    .then((code) => process.exit(code));
}
