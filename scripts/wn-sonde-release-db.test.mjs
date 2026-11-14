// Banc de la sonde release-db (D-374 §2 à §4) — sans réseau : le noyau et la
// collecte reçoivent des lectures simulées. La parité avec le dépôt (chemins
// gelés dérivés de ce que le run exécute, bloc de `wn-merge`, piège 2 des
// règles) se lit sur les fichiers réels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHEMINS_GELES,
  PLAFOND_FICHIERS_PR,
  STATUTS_NON_CONCLUS,
  SORTIE_GELE,
  SORTIE_ILLISIBLE,
  SORTIE_PERMIS,
  SORTIE_USAGE,
  MARQUEUR_CONSTAT,
  analyserArguments,
  conseilDeuxRuns,
  estFichierDeclencheur,
  estGele,
  juger,
  phaseDuRun,
  sonder,
} from './wn-sonde-release-db.mjs';
import { CHEMINS_RELEASE_DB, ETAPES_ATTESTATION } from './wn-deploiement-deployer.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const SHA = 'a'.repeat(40);
const TETE = 'b'.repeat(40);
const DECLENCHEUR = 'c'.repeat(40);
const run = (statuts, id = 1) => ({ id, head_sha: SHA, statuts, phase: phaseDuRun(statuts) });
const MIG = 'web/prisma/migrations/';
const M1 = '20261101000000_un';
const M2 = '20261102000000_deux';
const M3 = '20261103000000_trois';

// ── Phases (D-374 §2, à la lettre) ──────────────────────────────────────────

test('phase : seul `waiting` est l’attente ; tout autre statut non conclu est hors attente', () => {
  assert.equal(phaseDuRun(['waiting']), 'attente');
  for (const s of ['requested', 'pending', 'queued', 'in_progress']) assert.equal(phaseDuRun([s]), 'hors-attente', s);
  // Vu `waiting` puis `in_progress` (approuvé entre deux lectures) : le plus restrictif.
  assert.equal(phaseDuRun(['in_progress', 'waiting']), 'hors-attente');
  // Un statut inconnu de la sonde n'ouvre rien.
  assert.equal(phaseDuRun(['statut-futur']), 'hors-attente');
});

// ── Verdict ─────────────────────────────────────────────────────────────────

test('aucun run non conclu : merge permis, avec ou sans PR', () => {
  assert.equal(juger({ runs: [], fichiers: null }).code, SORTIE_PERMIS);
  assert.equal(juger({ runs: [], fichiers: ['web/prisma/migrations/x/migration.sql'] }).code, SORTIE_PERMIS);
});

test('phase 1 : une PR de code seul merge, et le rappel de D-087 est dit', () => {
  const v = juger({ runs: [run(['waiting'])], fichiers: ['web/src/app/page.tsx', 'docs/claude/PLAN_WELLNEURO.md'] });
  assert.equal(v.code, SORTIE_PERMIS);
  assert.match(v.motif, /phase 1/);
  assert.match(v.motif, /D-087/);
});

test('phase 1 : chaque chemin gelé gèle la PR', () => {
  const exemples = CHEMINS_GELES.map((c) => (c.endsWith('/') ? `${c}x/y.sql` : c));
  for (const chemin of exemples) {
    const v = juger({ runs: [run(['waiting'])], fichiers: ['README.md', chemin] });
    assert.equal(v.code, SORTIE_GELE, chemin);
    assert.ok(v.motif.includes(chemin), chemin);
  }
});

test('phase 1 sans numéro de PR : gelé — le verdict dépend des fichiers', () => {
  const v = juger({ runs: [run(['waiting'])], fichiers: null });
  assert.equal(v.code, SORTIE_GELE);
  assert.match(v.motif, /numéro de PR/);
});

test('hors attente : aucun merge, même une PR de doc — et ce run l’emporte sur un run en attente', () => {
  for (const statuts of [['in_progress'], ['queued'], ['pending'], ['requested']]) {
    const v = juger({ runs: [run(['waiting'], 1), run(statuts, 2)], fichiers: ['docs/x.md'] });
    assert.equal(v.code, SORTIE_GELE, statuts[0]);
    assert.match(v.motif, /aucun merge/);
  }
});

test('commit déclencheur sans run : gèle une PR qui touche un chemin gelé, pas une PR de doc', () => {
  const v = juger({ runs: [], fichiers: ['web/src/lib/clinical/a.ts'], sansRun: DECLENCHEUR });
  assert.equal(v.code, SORTIE_GELE);
  assert.match(v.motif, /aucun run release-db/);
  assert.equal(juger({ runs: [], fichiers: ['docs/x.md'], sansRun: DECLENCHEUR }).code, SORTIE_PERMIS);
});

test('chemins gelés : un préfixe de dossier ne mord pas sur un voisin de même début', () => {
  assert.equal(estGele('web/src/lib/clinicalx/a.ts'), false);
  assert.equal(estGele('web/prisma/migrations_lock.toml'), false);
  assert.equal(estGele('.github/workflows/release-db.yml.bak'), false);
  assert.equal(estGele('scripts/wn-deploiement-deployer.test.mjs'), false);
  assert.equal(estGele('web/prisma/checks/agenda_alimentaire_v1.sql'), false, 'un contrat CI que le run n’exécute pas');
});

// ── Deux runs (D-374 §3) ────────────────────────────────────────────────────

test('deux runs : l’ancien n’est rejeté que si la tête apporte une migration ou un changement clinique', () => {
  const ancien = { id: 7, head_sha: SHA };
  assert.equal(conseilDeuxRuns({ id: 8, head_sha: TETE }, TETE, [], true), null, 'un run qui porte la tête n’a pas de conseil');
  // D-520 : sans relecteur, rien ne « s'approuve » ; l'arrêt est l'annulation.
  assert.match(conseilDeuxRuns(ancien, TETE, [], true), /part tel quel/);
  assert.doesNotMatch(conseilDeuxRuns(ancien, TETE, [], true), /s'approuve/);
  assert.match(conseilDeuxRuns(ancien, TETE, [], true), /appliquée/);
  assert.match(conseilDeuxRuns(ancien, TETE, ['web/src/lib/clinical/a.ts'], true), /ANNULER/);
  assert.match(conseilDeuxRuns(ancien, TETE, ['web/src/lib/clinical/a.ts'], true), /gh run cancel 7/);
  assert.match(conseilDeuxRuns(ancien, TETE, ['web/prisma/migrations/x/migration.sql'], true), /ANNULER/);
  assert.match(conseilDeuxRuns(ancien, TETE, null, true), /illisible/);
  assert.doesNotMatch(conseilDeuxRuns(ancien, TETE, null, true), /ANNULER|tel quel|approuver/);
  for (const n of [[], ['web/src/lib/clinical/a.ts'], null]) {
    assert.doesNotMatch(conseilDeuxRuns(ancien, TETE, n, true), /REJETER|se rejette/, 'D-520 : « rejeter » se lit « annuler »');
  }
  // Historique réécrit : le workflow refusera, jamais « tel quel ».
  assert.match(conseilDeuxRuns(ancien, TETE, [], false), /historique réécrit/);
  assert.match(conseilDeuxRuns(ancien, TETE, [], false), /ANNULER/);
  assert.doesNotMatch(conseilDeuxRuns(ancien, TETE, [], false), /tel quel/);
});

// ── Collecte (`sonder`) sur lectures simulées ───────────────────────────────

/**
 * `etats` : liste d'états successifs de l'API ; chaque appel filtré par statut
 * consomme l'état courant, puis avance d'un cran (le run bouge entre deux
 * appels). `recents` : page non filtrée. `fichiers` : pages de la PR.
 */
function simuler({
  etats = [[]],
  recents = [],
  deMain = null,
  fichiers = [[]],
  panne = null,
  git = {},
  succes = [{ id: 4, status: 'completed', conclusion: 'success', head_sha: SHA, head_branch: 'main' }],
  etapes = {},
  prs = {},
  commentaires = {},
  runsParId = {},
} = {}) {
  const appels = [];
  let i = 0;
  const lireJson = (chemin, paginer) => {
    appels.push({ chemin, paginer });
    if (panne && chemin.includes(panne)) throw new Error(`HTTP 502 sur ${panne}`);
    const statut = chemin.match(/[?&]status=([a-z_]+)/)?.[1];
    // Le dernier run réussi de `main` : borne du reliquat (D-520 §3 bis).
    if (statut === 'success') return { workflow_runs: succes };
    const jobs = chemin.match(/\/actions\/runs\/(\d+)\/jobs/)?.[1];
    if (jobs) return { jobs: [{ name: 'release', steps: etapes[jobs] ?? [] }] };
    const parId = chemin.match(/\/actions\/runs\/(\d+)$/)?.[1];
    if (parId) {
      if (!runsParId[parId]) throw new Error(`HTTP 404 sur le run ${parId}`);
      return runsParId[parId];
    }
    const commit = chemin.match(/\/commits\/([0-9a-f]+)\/pulls$/)?.[1];
    if (commit) return prs[commit] ?? [];
    const issue = chemin.match(/\/issues\/(\d+)\/comments/)?.[1];
    if (issue) return [commentaires[issue] ?? []];
    if (statut) {
      const etat = etats[Math.min(i++, etats.length - 1)];
      return [{ workflow_runs: etat.filter((r) => r.status === statut) }];
    }
    if (chemin.includes('/pulls/')) return fichiers;
    // Sans `deMain` explicite, l'API filtre la page récente sur `main`.
    if (chemin.includes('branch=main')) return { workflow_runs: deMain ?? recents.filter((x) => x.head_branch === 'main') };
    return { workflow_runs: recents };
  };
  const gitSimule = (args) => {
    const cle = args[0];
    if (git[cle] instanceof Error) throw git[cle];
    if (typeof git[cle] === 'function') return git[cle](args);
    if (cle === 'fetch') return '';
    if (cle === 'rev-parse') return `${TETE}\n`;
    if (cle === 'log') return `${DECLENCHEUR}\n`;
    if (cle === 'diff') return '';
    if (cle === 'merge-base') return '';
    // Par défaut, toute révision porte les mêmes migrations : aucun reliquat.
    if (cle === 'ls-tree') return `${MIG}${M1}\n${MIG}migration_lock.toml\n`;
    throw new Error(`git ${cle} non simulé`);
  };
  return { lireJson, git: gitSimule, appels };
}

const r = (id, status, head_sha = SHA, head_branch = 'main') => ({ id, status, head_sha, head_branch });

test('collecte : deux passes dans l’ordre de vie d’un run, chaque statut paginé, plus une page non filtrée', () => {
  const s = simuler();
  sonder({ pr: null, ...s });
  // `status=success` est la borne du reliquat (D-520 §3 bis), pas un run non conclu.
  const filtres = s.appels.filter((a) => a.chemin.includes('status=') && !a.chemin.includes('status=success'));
  assert.ok(s.appels.some((a) => /status=success&branch=main&per_page=1$/.test(a.chemin)), 'sans PR, le reliquat se lit');
  assert.deepEqual(
    filtres.map((a) => a.chemin.match(/status=([a-z_]+)/)[1]),
    [...STATUTS_NON_CONCLUS, ...STATUTS_NON_CONCLUS],
  );
  assert.ok(filtres.every((a) => a.paginer && /per_page=100/.test(a.chemin)), 'chaque statut se lit toutes pages');
  assert.deepEqual(STATUTS_NON_CONCLUS, ['requested', 'pending', 'queued', 'in_progress', 'waiting']);
  assert.ok(s.appels.some((a) => !a.paginer && /runs\?per_page=30$/.test(a.chemin)), 'la page non filtrée est lue en plus');
  assert.ok(s.appels.some((a) => !a.paginer && /runs\?branch=main&per_page=30$/.test(a.chemin)), 'les runs de main sont lus à part');
});

test('collecte : un run qui passe de in_progress à waiting entre deux appels est vu — et gèle', () => {
  // Passe 1 : vu nulle part avant `in_progress`, il bascule en `waiting` juste
  // avant l'appel `waiting`… puis repart en `in_progress` (approuvé).
  const etats = [[], [], [], [r(1, 'waiting')], [r(1, 'in_progress')], [r(1, 'in_progress')]];
  const v = sonder({ pr: 1, ...simuler({ etats, fichiers: [[{ filename: 'docs/x.md' }]] }) });
  assert.equal(v.code, SORTIE_GELE);
});

test('collecte : un statut que le filtre ne connaît pas, vu sur la page non filtrée, gèle', () => {
  const v = sonder({ pr: 1, ...simuler({ recents: [r(9, 'statut-futur')], fichiers: [[{ filename: 'docs/x.md' }]] }) });
  assert.equal(v.code, SORTIE_GELE);
});

test('collecte : pages de la PR aplaties, ancien nom d’un renommage compté', () => {
  const recents = [r(5, 'completed', DECLENCHEUR)];
  const fichiers = [[{ filename: 'docs/a.md' }], [{ filename: 'archive/m.sql', previous_filename: 'web/prisma/migrations/x/migration.sql' }]];
  const v = sonder({ pr: 1, ...simuler({ etats: [[r(1, 'waiting')]], recents, fichiers }) });
  assert.equal(v.code, SORTIE_GELE, 'sortir une migration de son dossier gèle comme la modifier');
  assert.ok(v.lignes.some((l) => l.includes('web/prisma/migrations/x/migration.sql')));
  const doc = sonder({ pr: 1, ...simuler({ etats: [[r(1, 'waiting')]], recents, fichiers: [[{ filename: 'docs/a.md' }], [{ filename: 'docs/b.md' }]] }) });
  assert.equal(doc.code, SORTIE_PERMIS);
});

test('collecte : une lecture en panne gèle (code 2) — runs, page non filtrée ou fichiers de la PR', () => {
  for (const panne of ['status=waiting', 'runs?per_page=30', '/pulls/']) {
    const v = sonder({ pr: 1, ...simuler({ panne }) });
    assert.equal(v.code, SORTIE_ILLISIBLE, panne);
    assert.match(v.lignes.join('\n'), /gel par prudence/);
  }
});

test('collecte : un fichier de PR sans chemin, ou aucun commit déclencheur lisible, gèle (code 2)', () => {
  const sansChemin = sonder({ pr: 1, ...simuler({ fichiers: [[{ filename: 'docs/a.md' }, { status: 'modified' }]] }) });
  assert.equal(sansChemin.code, SORTIE_ILLISIBLE);
  // Clone superficiel : `git log` ne rend rien — une PR gelable ne passe pas.
  const migration = [[{ filename: 'web/prisma/migrations/y/migration.sql' }]];
  const vide = sonder({ pr: 1, ...simuler({ recents: [r(5, 'completed', DECLENCHEUR)], fichiers: migration, git: { log: () => '' } }) });
  assert.equal(vide.code, SORTIE_ILLISIBLE);
});

test('collecte : une PR au plafond de l’API gèle — sa liste est tronquée', () => {
  const fichiers = [Array.from({ length: PLAFOND_FICHIERS_PR }, (_, k) => ({ filename: `docs/f${k}.md` }))];
  assert.equal(sonder({ pr: 1, ...simuler({ fichiers }) }).code, SORTIE_ILLISIBLE);
});

test('collecte : commit déclencheur de main sans run — gèle une PR de migration, et se lève quand un run le porte', () => {
  const migration = [[{ filename: 'web/prisma/migrations/y/migration.sql' }]];
  const sansRun = sonder({ pr: 1, ...simuler({ recents: [r(5, 'completed', SHA)], fichiers: migration, git: { 'merge-base': new Error('non') } }) });
  assert.equal(sansRun.code, SORTIE_GELE);
  assert.match(sansRun.lignes.join('\n'), /aucun run release-db/);
  const porte = sonder({ pr: 1, ...simuler({ recents: [r(5, 'completed', DECLENCHEUR)], fichiers: migration }) });
  assert.equal(porte.code, SORTIE_PERMIS);
  // Un run d'une autre branche ne porte rien vers la production (contre-revue de H88).
  const ailleurs = sonder({ pr: 1, ...simuler({ recents: [r(5, 'completed', DECLENCHEUR, 'essai')], fichiers: migration }) });
  assert.equal(ailleurs.code, SORTIE_GELE);
  // Trente dispatchs hors `main` remplissent la page non filtrée : le run de
  // `main` qui porte le commit se lit quand même, par sa requête dédiée.
  const noye = sonder({
    pr: 1,
    ...simuler({
      recents: Array.from({ length: 30 }, (_, k) => r(100 + k, 'completed', SHA, 'essai')),
      deMain: [r(5, 'completed', DECLENCHEUR)],
      fichiers: migration,
    }),
  });
  assert.equal(noye.code, SORTIE_PERMIS);
  // Tête illisible : la vérification ne se fait pas, la PR gelable gèle.
  const aveugle = sonder({ pr: 1, ...simuler({ recents: [r(5, 'completed', DECLENCHEUR)], fichiers: migration, git: { fetch: new Error('réseau') } }) });
  assert.equal(aveugle.code, SORTIE_ILLISIBLE);
});

test('collecte : le conseil de D-374 §3 sort pour un ancien run en attente', () => {
  const v = sonder({
    pr: 1,
    ...simuler({
      etats: [[r(1, 'waiting')]],
      fichiers: [[{ filename: 'docs/x.md' }]],
      git: { diff: () => 'web/src/lib/clinical/a.ts\n' },
    }),
  });
  assert.equal(v.code, SORTIE_PERMIS);
  assert.ok(v.lignes.some((l) => /^· run 1 : .*ANNULER/.test(l)));
  assert.match(v.lignes.at(-1), /^SONDE release-db code=0 phase=attente runs=1 pr=1$/);
});

// ── D-520 §3 bis : une migration non appliquée gèle les chemins déclencheurs ──

const AVANT = 'd'.repeat(40);
const C1 = '1'.repeat(40);
const C2 = '2'.repeat(40);
/**
 * `git ls-tree` simulé : les migrations portées par chaque révision ; avec
 * `-r`, les fichiers d'une migration (`migration.sql`, plus `annexes[m]`).
 */
const arbres = (parSha, annexes = {}) => (args) => {
  const sha = args.find((a) => /^[0-9a-f]{40}$/.test(a));
  const liste = parSha[sha];
  if (!liste) throw new Error(`révision inconnue ${sha}`);
  if (args.includes('-r')) {
    const m = args.at(-1).slice(MIG.length).replace(/\/$/, '');
    if (!liste.includes(m)) return '';
    return ['migration.sql', ...(annexes[m] ?? [])].map((f) => `${MIG}${m}/${f}`).join('\n') + '\n';
  }
  return [...liste, 'migration_lock.toml'].map((n) => `${MIG}${n}`).join('\n') + '\n';
};
const succesSur = (id, head_sha) => ({ id, status: 'completed', conclusion: 'success', head_sha, head_branch: 'main' });
const conclu = (id, conclusion, head_sha = TETE) => ({ id, status: 'completed', conclusion, head_sha, head_branch: 'main' });
const attestation = (oneOff, verification) => [
  { name: ETAPES_ATTESTATION[0], conclusion: oneOff },
  { name: ETAPES_ATTESTATION[1], conclusion: verification },
];
/**
 * Main porte M1 et M2 ; le dernier run vert ne portait que M1 ; le run de la
 * tête est conclu sans succès (`conclusion`, avec `etapes`).
 */
function reliquat({ conclusion = 'cancelled', etapes = [], fichiers, pr = 1, tete = [M1, M2], annexes = {} } = {}) {
  const deMain = [conclu(11, conclusion), succesSur(10, AVANT)];
  return sonder({
    pr,
    ...simuler({
      deMain,
      recents: deMain,
      succes: [succesSur(10, AVANT)],
      etapes: { 11: etapes },
      fichiers,
      git: { 'ls-tree': arbres({ [AVANT]: [M1], [TETE]: tete }, annexes) },
    }),
  });
}

test('§3 bis — après un run annulé, la migration non appliquée gèle une PR clinique, pas une PR de code', () => {
  const v = reliquat({ fichiers: [[{ filename: 'web/src/lib/clinical/a.ts', status: 'modified' }]] });
  assert.equal(v.code, SORTIE_GELE);
  assert.match(v.lignes.join('\n'), new RegExp(`non appliquée.*${M2}`));
  assert.match(v.lignes.join('\n'), /D-520 §3 bis/);
  assert.match(v.lignes.join('\n'), /revert/);
  const code = reliquat({ fichiers: [[{ filename: 'web/src/app/page.tsx', status: 'modified' }]] });
  assert.equal(code.code, SORTIE_PERMIS, code.lignes.join('\n'));
});

test('§3 bis — chaque chemin déclencheur est gelé par le reliquat', () => {
  for (const c of CHEMINS_RELEASE_DB) {
    const chemin = estFichierDeclencheur(c) ? c : `${c}/x/y.sql`;
    const v = reliquat({ fichiers: [[{ filename: chemin, status: 'modified' }]] });
    assert.equal(v.code, SORTIE_GELE, chemin);
  }
});

test('§3 bis — rouge AVANT écriture gèle ; rouge APRÈS attestation complète ne gèle pas', () => {
  const clinique = [[{ filename: 'web/src/lib/clinical/a.ts', status: 'modified' }]];
  // Build ou garde en échec : le one-off n'a pas tourné.
  assert.equal(reliquat({ conclusion: 'failure', etapes: [], fichiers: clinique }).code, SORTIE_GELE);
  // One-off rouge ou sans sentinelle : état inconnu, jamais lu « appliqué ».
  assert.equal(reliquat({ conclusion: 'failure', etapes: attestation('failure', null), fichiers: clinique }).code, SORTIE_GELE);
  // Annulé pendant le one-off (piège 3) : inconnu, gèle.
  assert.equal(reliquat({ conclusion: 'cancelled', etapes: attestation('cancelled', null), fichiers: clinique }).code, SORTIE_GELE);
  // Les deux attestations vertes : la migration est appliquée, le reliquat est vide.
  const applique = reliquat({ conclusion: 'failure', etapes: attestation('success', 'success'), fichiers: clinique });
  assert.equal(applique.code, SORTIE_PERMIS, applique.lignes.join('\n'));
});

test('§3 bis — le revert pur de la migration en attente sort du gel ; un revert qui touche autre chose y reste', () => {
  const revert = [[{ filename: `${MIG}${M2}/migration.sql`, status: 'removed' }, { filename: 'web/prisma/schema.prisma', status: 'modified' }]];
  const v = reliquat({ fichiers: revert });
  assert.equal(v.code, SORTIE_PERMIS, v.lignes.join('\n'));
  const melange = [[{ filename: `${MIG}${M2}/migration.sql`, status: 'removed' }, { filename: 'web/src/lib/clinical/a.ts', status: 'modified' }]];
  assert.equal(reliquat({ fichiers: melange }).code, SORTIE_GELE);
  // Retirer une migration DÉJÀ appliquée n'est pas le revert du reliquat.
  const autre = [[{ filename: `${MIG}${M1}/migration.sql`, status: 'removed' }]];
  assert.equal(reliquat({ fichiers: autre }).code, SORTIE_GELE);
  // Modifier la migration en attente n'est pas la retirer.
  const reecrite = [[{ filename: `${MIG}${M2}/migration.sql`, status: 'modified' }]];
  assert.equal(reliquat({ fichiers: reecrite }).code, SORTIE_GELE);
});

test('§3 bis — un revert PARTIEL du reliquat gèle : le run qu’il déclenche écrirait le reste (revue wn-reviewer)', () => {
  const retire = (m, f = 'migration.sql') => ({ filename: `${MIG}${m}/${f}`, status: 'removed' });
  // Reliquat {M2, M3} : retirer M2 seul laisse M3 partir.
  const deux = { tete: [M1, M2, M3] };
  assert.equal(reliquat({ ...deux, fichiers: [[retire(M2)]] }).code, SORTIE_GELE);
  assert.equal(reliquat({ ...deux, fichiers: [[retire(M2), retire(M3)]] }).code, SORTIE_PERMIS);
  // Un fichier annexe retiré seul laisse la migration en place.
  const annexe = { annexes: { [M2]: ['notes.md'] } };
  assert.equal(reliquat({ ...annexe, fichiers: [[retire(M2, 'notes.md')]] }).code, SORTIE_GELE);
  assert.equal(reliquat({ ...annexe, fichiers: [[retire(M2), retire(M2, 'notes.md')]] }).code, SORTIE_PERMIS);
});

test('§3 bis — sans numéro de PR, un reliquat gèle', () => {
  const v = reliquat({ pr: null });
  assert.equal(v.code, SORTIE_GELE);
  assert.match(v.lignes.join('\n'), /numéro de PR/);
});

test('§3 bis — borne illisible : aucun run attesté, ou révision introuvable, gèle par prudence (code 2)', () => {
  const clinique = [[{ filename: 'web/src/lib/clinical/a.ts', status: 'modified' }]];
  const sansSucces = sonder({ pr: 1, ...simuler({ succes: [], fichiers: clinique }) });
  assert.equal(sansSucces.code, SORTIE_ILLISIBLE);
  const introuvable = sonder({ pr: 1, ...simuler({ fichiers: clinique, git: { 'ls-tree': arbres({}) } }) });
  assert.equal(introuvable.code, SORTIE_ILLISIBLE);
  const panne = sonder({ pr: 1, ...simuler({ fichiers: clinique, panne: 'status=success' }) });
  assert.equal(panne.code, SORTIE_ILLISIBLE);
});

test('§3 bis — une PR de doc ne lit pas le reliquat : aucune lecture de plus, aucun gel', () => {
  const s = simuler({ fichiers: [[{ filename: 'docs/x.md', status: 'modified' }]], git: { 'ls-tree': new Error('ne doit pas être lu') } });
  assert.equal(sonder({ pr: 1, ...s }).code, SORTIE_PERMIS);
  assert.ok(!s.appels.some((a) => a.chemin.includes('status=success')));
});

// ── D-520 §3 : une seconde migration attend le constat de la première ──────

const AJOUT_M3 = [[{ filename: `${MIG}${M3}/migration.sql`, status: 'added' }]];
const journalAjouts = `@${C2}\n\n${MIG}${M2}/migration.sql\n@${C1}\n\n${MIG}${M1}/migration.sql\n${MIG}migration_lock.toml\n`;
const runVert = { id: 10, path: '.github/workflows/release-db.yml', head_branch: 'main', status: 'completed', conclusion: 'success', head_sha: TETE, updated_at: '2026-11-14T11:00:00Z' };
const constat = (corps, { association = 'OWNER', le = '2026-11-14T12:00:00Z' } = {}) => ({ author_association: association, body: corps, created_at: le });

function seconde({ commentaires = [], runsParId = { 10: runVert }, git = {}, prs = { [C2]: [{ number: 500, merge_commit_sha: C2 }] } } = {}) {
  return sonder({
    pr: 1,
    ...simuler({
      deMain: [succesSur(10, TETE)],
      succes: [succesSur(10, TETE)],
      fichiers: AJOUT_M3,
      prs,
      commentaires: { 500: commentaires },
      runsParId,
      git: {
        'ls-tree': arbres({ [TETE]: [M1, M2] }),
        log: (args) => (args.includes('--diff-filter=A') ? journalAjouts : `${DECLENCHEUR}\n`),
        ...git,
      },
    }),
  });
}

test('§3 — une seconde migration gèle tant que la PR de la première ne porte pas de constat', () => {
  const v = seconde();
  assert.equal(v.code, SORTIE_GELE);
  const texte = v.lignes.join('\n');
  assert.match(texte, /D-520 §3/);
  assert.match(texte, /#500/);
  assert.ok(texte.includes(M2), texte);
  assert.ok(texte.includes(`${MARQUEUR_CONSTAT} run=`), texte);
});

test('§3 — le constat lié au run qui a appliqué la migration lève le gel', () => {
  const v = seconde({ commentaires: [constat(`Constat par conteneur : à jour.\n${MARQUEUR_CONSTAT} run=10\n`)] });
  assert.equal(v.code, SORTIE_PERMIS, v.lignes.join('\n'));
});

test('§3 — un constat qui ne prouve rien ne lève pas le gel', () => {
  const ligne = `${MARQUEUR_CONSTAT} run=10`;
  const cas = {
    'auteur extérieur au dépôt': seconde({ commentaires: [constat(ligne, { association: 'NONE' })] }),
    'écrit avant la fin du run': seconde({ commentaires: [constat(ligne, { le: '2026-11-14T10:00:00Z' })] }),
    'cité dans une phrase': seconde({ commentaires: [constat(`le marqueur \`${ligne}\` reste à écrire`)] }),
    'run rouge avant écriture': seconde({ commentaires: [constat(ligne)], runsParId: { 10: { ...runVert, conclusion: 'failure' } } }),
    'run d’un autre workflow': seconde({ commentaires: [constat(ligne)], runsParId: { 10: { ...runVert, path: '.github/workflows/ci.yml' } } }),
    'run hors de main': seconde({ commentaires: [constat(ligne)], runsParId: { 10: { ...runVert, head_branch: 'essai' } } }),
    'run qui ne contient pas la migration': seconde({
      commentaires: [constat(ligne)],
      git: { 'merge-base': (args) => (args[2] === C2 ? (() => { throw new Error('non'); })() : '') },
    }),
    'aucune PR pour le commit': seconde({ commentaires: [constat(ligne)], prs: {} }),
    // Le dépôt merge en squash : une autre PR mergée qui contient le commit n'est pas la sienne.
    'PR dont le merge n’est pas le commit': seconde({
      commentaires: [constat(ligne)],
      prs: { [C2]: [{ number: 500, merge_commit_sha: 'e'.repeat(40), merged_at: '2026-11-13T00:00:00Z' }] },
    }),
    // Contre-revue Codex : l'ascendance ne suffit pas, le run doit PORTER la migration.
    'run descendant qui a retiré la migration': seconde({
      commentaires: [constat(ligne)],
      runsParId: { 10: { ...runVert, head_sha: 'e'.repeat(40) } },
      git: { 'ls-tree': arbres({ [TETE]: [M1, M2], ['e'.repeat(40)]: [M1] }) },
    }),
  };
  for (const [nom, v] of Object.entries(cas)) assert.equal(v.code, SORTIE_GELE, `${nom} :\n${v.lignes.join('\n')}`);
});

test('§3 — une lecture impossible du constat gèle en code 2, jamais « constat invalide » (contre-revue Codex)', () => {
  // Run cité introuvable, puis un constat plus ancien et valide : la panne ne doit pas laisser passer l'ancien.
  const ancien = constat(`${MARQUEUR_CONSTAT} run=10`, { le: '2026-11-14T12:00:00Z' });
  const recent = constat(`${MARQUEUR_CONSTAT} run=99`, { le: '2026-11-14T13:00:00Z' });
  assert.equal(seconde({ commentaires: [ancien, recent] }).code, SORTIE_ILLISIBLE);
  // Des migrations présentes sans commit d'ajout lisible (clone superficiel) : rien n'est vérifié (revue wn-reviewer).
  assert.equal(seconde({ git: { log: (args) => (args.includes('--diff-filter=A') ? '' : `${DECLENCHEUR}\n`) } }).code, SORTIE_ILLISIBLE);
});

test('§3 — la dernière migration est la dernière AJOUTÉE encore présente, pas une migration retirée', () => {
  // M2 ajoutée puis retirée (revert) : c'est M1 dont le constat compte.
  const journal = `@${C2}\n\n${MIG}${M2}/migration.sql\n@${C1}\n\n${MIG}${M1}/migration.sql\n`;
  const v = sonder({
    pr: 1,
    ...simuler({
      deMain: [succesSur(10, TETE)],
      succes: [succesSur(10, TETE)],
      fichiers: AJOUT_M3,
      prs: { [C1]: [{ number: 400, merge_commit_sha: C1 }] },
      commentaires: { 400: [constat(`${MARQUEUR_CONSTAT} run=10`)] },
      runsParId: { 10: runVert },
      git: { 'ls-tree': arbres({ [TETE]: [M1] }), log: (args) => (args.includes('--diff-filter=A') ? journal : `${DECLENCHEUR}\n`) },
    }),
  });
  assert.equal(v.code, SORTIE_PERMIS, v.lignes.join('\n'));
});

test('§3 — une PR sans migration ajoutée ne lit aucun constat', () => {
  const s = simuler({ recents: [r(5, 'completed', DECLENCHEUR)], fichiers: [[{ filename: 'web/src/lib/clinical/a.ts', status: 'modified' }]] });
  const v = sonder({ pr: 1, ...s });
  assert.equal(v.code, SORTIE_PERMIS, v.lignes.join('\n'));
  assert.ok(!s.appels.some((a) => a.chemin.includes('/issues/')));
});

// ── D-520 §7 : le CLI Prisma de l'image est gelé ────────────────────────────

test('§7 — web/package.json et web/package-lock.json sont des chemins gelés', () => {
  assert.ok(estGele('web/package.json'));
  assert.ok(estGele('web/package-lock.json'));
  assert.ok(!estGele('package.json'), 'la racine ne construit pas l’image');
});

// ── Câblage CLI et parité avec le dépôt ─────────────────────────────────────

test('arguments : rien, ou un numéro de PR ; le reste est refusé', () => {
  assert.deepEqual(analyserArguments([]), { pr: null });
  assert.deepEqual(analyserArguments(['1741']), { pr: 1741 });
  for (const argv of [['0'], ['abc'], ['12', '13'], ['--pr']]) assert.ok(analyserArguments(argv).erreur, argv.join(' '));
});

test('lancée par un lien symbolique, la sonde juge encore — pas de sortie 0 muette', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-sonde-'));
  try {
    const lien = join(dossier, 'sonde.mjs');
    symlinkSync(join(RACINE, 'scripts/wn-sonde-release-db.mjs'), lien);
    let code = 0;
    try {
      execFileSync(process.execPath, [lien, '--argument-invalide'], { stdio: 'pipe' });
    } catch (err) {
      code = err.status;
    }
    assert.equal(code, SORTIE_USAGE);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('CLI de bout en bout : une PR dont la liste dépasse 1 Mio se juge, sans ENOBUFS lu « illisible »', () => {
  // `gh` et `git` jetables en tête du PATH : aucun réseau. La liste des
  // fichiers de la PR pèse ~2 Mio (champ `patch`), au-delà du tampon par
  // défaut d'`execFileSync` (revue CodeRabbit de #1742).
  const dossier = mkdtempSync(join(tmpdir(), 'wn-sonde-cli-'));
  try {
    const bin = join(dossier, 'bin');
    mkdirSync(bin);
    const gros = join(dossier, 'fichiers.json');
    writeFileSync(gros, JSON.stringify([[{ filename: 'docs/x.md', patch: 'x'.repeat(2 * 1024 * 1024) }]]));
    writeFileSync(
      join(bin, 'gh'),
      `#!/bin/sh\ncase "$*" in\n  *pulls/*) cat '${gros}' ;;\n  *status=*) echo '[{"workflow_runs":[]}]' ;;\n  *) echo '{"workflow_runs":[]}' ;;\nesac\n`,
    );
    writeFileSync(join(bin, 'git'), `#!/bin/sh\n[ "$1" = rev-parse ] && echo ${TETE}\nexit 0\n`);
    chmodSync(join(bin, 'gh'), 0o755);
    chmodSync(join(bin, 'git'), 0o755);
    const sortie = execFileSync(process.execPath, [join(RACINE, 'scripts/wn-sonde-release-db.mjs'), '1'], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.match(sortie, /^SONDE release-db code=0 phase=aucune runs=0 pr=1$/m);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('parité : les chemins gelés couvrent les déclencheurs et tout ce que le run exécute', () => {
  // Chaque déclencheur est GELÉ en fait, pas seulement listé : la table signée
  // (D-389 §5) est un fichier, et `fichier.ts/` ne gèlerait rien.
  for (const c of CHEMINS_RELEASE_DB) {
    assert.ok(estGele(estFichierDeclencheur(c) ? c : `${c}/x.ts`), `déclencheur non gelé : ${c}`);
  }
  assert.ok(estGele('web/src/lib/biology-library/indicationsBiologieV1.ts'), 'la table signée doit être gelée (D-389 §5)');
  assert.ok(!estGele('web/src/lib/biology-library/autre.ts'), 'le dossier de la table ne doit pas être gelé');
  assert.ok(estGele('web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts'), 'la structure signée doit être gelée (D-416)');
  assert.ok(!estGele('web/src/lib/fiches-usage/autre.ts'), 'le dossier de la structure ne doit pas être gelé (D-416)');
  assert.ok(estGele('web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql'), 'le contrat positif doit être gelé (D-416)');
  assert.ok(
    !estGele('web/prisma/checks/rag_claim_fraicheur_tables_signees_v1_negatif.sql'),
    'le négatif, joué en CI seulement, ne doit pas être gelé (D-416)',
  );
  // D-480 §5 (BP-17 PR 4) : même patron, fichiers exacts.
  assert.ok(estGele('web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts'), 'la structure de la bibliothèque doit être gelée (D-480 §5)');
  assert.ok(!estGele('web/src/lib/bibliotheque-options/vocabulaire.ts'), 'le dossier de la bibliothèque ne doit pas être gelé (D-480 §5)');
  assert.ok(estGele('web/prisma/checks/positions_citees_tables_signees_v1.sql'), 'le contrat des positions citées doit être gelé (D-480 §5.3)');
  assert.ok(
    !estGele('web/prisma/checks/positions_citees_tables_signees_v1_negatif.sql'),
    'le négatif des positions citées ne doit pas être gelé (D-480 §5.3)',
  );
  for (const c of CHEMINS_GELES) assert.ok(existsSync(join(RACINE, c)), `chemin gelé absent du dépôt : ${c}`);
  // Dérivés du workflow et des scripts de release qu'il lance : les scripts
  // `release-db-*.sh`, la configuration Prisma, les préflights SQL. Un fichier
  // ajouté à l'exécution du run sans être gelé fait rougir ce banc.
  const workflow = lire('.github/workflows/release-db.yml');
  const scripts = [...new Set([...workflow.matchAll(/\bscripts\/(release-db-[\w-]+\.sh)\b/g)].map((m) => `web/scripts/${m[1]}`))];
  assert.ok(scripts.length >= 2, 'les scripts du one-off et de la contre-épreuve ont disparu du workflow');
  const executes = new Set(scripts);
  for (const source of [workflow, ...scripts.map(lire)]) {
    for (const m of source.matchAll(/\bprisma\/checks\/([\w.-]+\.sql)\b/g)) executes.add(`web/prisma/checks/${m[1]}`);
    if (/\bprisma\.config\.ts\b/.test(source)) executes.add('web/prisma.config.ts');
  }
  assert.ok([...executes].some((c) => c.startsWith('web/prisma/checks/')), 'aucun préflight trouvé : la dérivation a perdu sa cible');
  // Ce que la configuration Prisma importe en relatif tourne avec elle dans le
  // one-off (URL de connexion, mode SSL).
  const config = lire('web/prisma.config.ts');
  const imports = [...config.matchAll(/from ["']\.\/([^"']+)["']/g)].map((m) => `web/${m[1]}.ts`);
  assert.ok(imports.length > 0, 'la configuration Prisma n’importe plus rien en relatif : revoir la dérivation');
  for (const c of imports) executes.add(c);
  for (const c of executes) assert.ok(estGele(c), `exécuté par release-db sans être gelé : ${c}`);
});

test('lecture seule : aucun verbe d’écriture vers l’API, aucune écriture git', () => {
  const source = lire('scripts/wn-sonde-release-db.mjs');
  assert.doesNotMatch(source, /--method|['"]-X['"]|\b(POST|PATCH|PUT|DELETE)\b/);
  assert.doesNotMatch(source, /\['(push|merge|rebase|checkout|reset|commit|switch|stash)'/);
  assert.doesNotMatch(source, /'gh', \['(pr|run|workflow)'/);
});

test('wn-merge appelle la sonde, et le piège 2 des règles la nomme', () => {
  assert.match(lire('.claude/skills/wn-merge/SKILL.md'), /node scripts\/wn-sonde-release-db\.mjs <N>/);
  const regles = lire('.claude/rules/pr-revue-et-release-db.md');
  assert.match(regles, /wn-sonde-release-db\.mjs/);
  assert.doesNotMatch(regles, /Toute écriture sur `main` pendant l'attente d'approbation tue le run/);
  assert.match(lire('docs/claude/REGLES_PR_MERGE.md'), /wn-sonde-release-db\.mjs/);
});
