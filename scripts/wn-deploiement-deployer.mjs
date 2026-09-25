#!/usr/bin/env node
// Déploie la tête de `main` sur Scalingo, et ne peut livrer que plus neuf
// (D-248, lot 2).
//
// POURQUOI UNE BRANCHE ET PAS UN SHA. `integration-link-manual-deploy` ne
// prend qu'une branche (constaté, CLI 1.48 et API) : il livre la tête de
// `main` AU MOMENT où Scalingo la lit. Si ce run porte encore la tête quand il
// déclenche, la seule fenêtre résiduelle ne peut livrer que la même tête ou
// une plus récente — jamais une plus ancienne. C'est ce qui rend le recul
// impossible, à condition que PLUS PERSONNE d'autre ne déploie selon l'ordre
// de fin des checks : c'est la bascule `--no-auto-deploy` du lot 3.
//
// CE QUE CE SCRIPT REFUSE DE FAIRE, et pourquoi c'est vert :
//   - le run n'est plus la tête de `main` → il s'abstient. Un run plus récent
//     existe (chaque merge a le sien) ; déployer ici ne livrerait rien de plus.
//   - la version en service contient déjà ce commit → il s'abstient, sauf
//     `WN_FORCER=true` (répétition à vide du lot 2, relance volontaire).
//
// CE QUI EST ROUGE : un déclenchement refusé, un build en échec, un recul
// constaté après coup, ou vingt minutes sans conclusion (état INCONNU —
// lire `deployment-logs` avant de relancer).
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
// traité comme EN COURS — y compris un statut inconnu : l'attente bornée le
// tranchera, plutôt qu'un échec prononcé sur un mot qu'on ne connaît pas.
const ECHEC = /(-error|^aborted)$/;

/** La version en service : le déploiement réussi qui a FINI en dernier. */
function enService(texte) {
  const reussis = analyserTableau(texte);
  return [...reussis].sort((a, b) => b.fin - a.fin)[0] ?? null;
}

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
}) {
  const tete = lireTete();
  if (tete !== sha) {
    return { code: SORTIE_OK, etat: 'depasse', motif: `la tête de main (${tete}) a dépassé ce run (${sha}) — son propre run déploiera` };
  }

  const avant = lireDeploiements();
  const courant = enService(avant);
  if (!forcer && courant && estAncetre(sha, courant.sha)) {
    return { code: SORTIE_OK, etat: 'deja-en-service', motif: `${courant.sha} est en service et contient ${sha}` };
  }
  const connus = new Set(analyserToutesLignes(avant).map((l) => l.id));

  // DERNIER contrôle avant l'écriture : la lecture des déploiements a pris du
  // temps, et une tête qui a bougé entre-temps a son propre run.
  const teteAvant = lireTete();
  if (teteAvant !== sha) {
    return { code: SORTIE_OK, etat: 'depasse', motif: `la tête de main (${teteAvant}) a dépassé ce run juste avant le déclenchement` };
  }
  try {
    declencher();
  } catch (err) {
    return { code: SORTIE_ECHEC, etat: 'refuse', motif: `déclenchement refusé — ${String(err?.message ?? err).split('\n')[0]}` };
  }
  journal(`→ Déploiement de main déclenché (run ${sha}).`);

  for (let i = 1; i <= essais; i += 1) {
    await dormir(intervalleMs);
    // Une lecture en échec APRÈS le déclenchement ne conclut rien : le build
    // tourne, avec ou sans nous. La borne d'attente tranchera.
    let texte;
    let service;
    try {
      texte = lireDeploiements();
      service = enService(texte);
    } catch (err) {
      journal(`… lecture des déploiements en échec (${i}/${essais}) — ${String(err?.message ?? err).split('\n')[0]}`);
      continue;
    }
    const nouveaux = analyserToutesLignes(texte).filter((l) => !connus.has(l.id));
    const nouveauEnService = service && nouveaux.some((l) => l.id === service.id);
    if (nouveauEnService && estAncetre(sha, service.sha)) {
      // Le constat qui compte : pas seulement « mon build a réussi », mais
      // « ce qui est en service ne recule par rapport à rien ».
      // Tête relue : un merge arrivé pendant le build a pu être livré avec lui.
      // Illisible, on juge par rapport au déployé lui-même — le recul se lit
      // entre déploiements, pas par rapport à la tête.
      let teteApres;
      try {
        teteApres = lireTete();
      } catch {
        teteApres = service.sha;
      }
      const verdict = diagnostiquer({
        deploiements: analyserTableau(texte),
        tete: teteApres,
        ageTeteMin: 0,
        seuilRetardMin: Infinity,
        estAncetre,
      });
      if (verdict.code === SORTIE_RECUL) {
        return { code: SORTIE_ECHEC, etat: 'recul', motif: `déploiement réussi, mais recul constaté : ${verdict.enService.sha} en service, ${verdict.depasse.sha} l'a déjà été` };
      }
      return { code: SORTIE_OK, etat: 'deploye', motif: `${service.sha} en service (déploiement ${service.id})` };
    }
    if (nouveaux.length > 0 && nouveaux.every((l) => ECHEC.test(l.statut))) {
      const statuts = nouveaux.map((l) => `${l.id} ${l.statut}`).join(', ');
      return { code: SORTIE_ECHEC, etat: 'build-en-echec', motif: `aucun déploiement nouveau n'a abouti : ${statuts}` };
    }
    journal(`… pas encore en service (${i}/${essais})${nouveaux.length ? ` — ${nouveaux.map((l) => l.statut).join(', ')}` : ''}.`);
  }
  return { code: SORTIE_ECHEC, etat: 'delai', motif: `aucune conclusion après ${Math.round((essais * intervalleMs) / 60000)} min — état INCONNU` };
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
  delai: '## ❌ Aucune conclusion — état inconnu',
};

async function principal(env = process.env) {
  const app = env.SCALINGO_APP ?? 'wellneuro';
  const region = env.SCALINGO_REGION ?? 'osc-fr1';
  const sha = env.GITHUB_SHA;
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) {
    console.error('::error title=Déploiement refusé::GITHUB_SHA absent ou invalide.');
    return SORTIE_ECHEC;
  }
  const scalingo = (...args) => lancer('scalingo', ['--app', app, '--region', region, ...args]);
  const verdict = await deployer({
    sha,
    forcer: env.WN_FORCER === 'true',
    lireTete: () => {
      lancer('git', ['fetch', '--quiet', 'origin', 'main']);
      return lancer('git', ['rev-parse', 'origin/main']).trim();
    },
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
