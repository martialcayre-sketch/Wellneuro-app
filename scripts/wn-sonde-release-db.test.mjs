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
  analyserArguments,
  conseilDeuxRuns,
  estGele,
  juger,
  phaseDuRun,
  sonder,
} from './wn-sonde-release-db.mjs';
import { CHEMINS_RELEASE_DB } from './wn-deploiement-deployer.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const SHA = 'a'.repeat(40);
const TETE = 'b'.repeat(40);
const DECLENCHEUR = 'c'.repeat(40);
const run = (statuts, id = 1) => ({ id, head_sha: SHA, statuts, phase: phaseDuRun(statuts) });

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
  assert.match(conseilDeuxRuns(ancien, TETE, [], true), /s'approuve tel quel/);
  assert.match(conseilDeuxRuns(ancien, TETE, [], true), /appliquée/);
  assert.match(conseilDeuxRuns(ancien, TETE, ['web/src/lib/clinical/a.ts'], true), /REJETER/);
  assert.match(conseilDeuxRuns(ancien, TETE, ['web/prisma/migrations/x/migration.sql'], true), /REJETER/);
  assert.match(conseilDeuxRuns(ancien, TETE, null, true), /illisible/);
  assert.doesNotMatch(conseilDeuxRuns(ancien, TETE, null, true), /REJETER|tel quel/);
  // Historique réécrit : le workflow refusera, jamais « tel quel ».
  assert.match(conseilDeuxRuns(ancien, TETE, [], false), /historique réécrit/);
  assert.doesNotMatch(conseilDeuxRuns(ancien, TETE, [], false), /tel quel/);
});

// ── Collecte (`sonder`) sur lectures simulées ───────────────────────────────

/**
 * `etats` : liste d'états successifs de l'API ; chaque appel filtré par statut
 * consomme l'état courant, puis avance d'un cran (le run bouge entre deux
 * appels). `recents` : page non filtrée. `fichiers` : pages de la PR.
 */
function simuler({ etats = [[]], recents = [], fichiers = [[]], panne = null, git = {} } = {}) {
  const appels = [];
  let i = 0;
  const lireJson = (chemin, paginer) => {
    appels.push({ chemin, paginer });
    if (panne && chemin.includes(panne)) throw new Error(`HTTP 502 sur ${panne}`);
    const statut = chemin.match(/[?&]status=([a-z_]+)/)?.[1];
    if (statut) {
      const etat = etats[Math.min(i++, etats.length - 1)];
      return [{ workflow_runs: etat.filter((r) => r.status === statut) }];
    }
    if (chemin.includes('/pulls/')) return fichiers;
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
    throw new Error(`git ${cle} non simulé`);
  };
  return { lireJson, git: gitSimule, appels };
}

const r = (id, status, head_sha = SHA, head_branch = 'main') => ({ id, status, head_sha, head_branch });

test('collecte : deux passes dans l’ordre de vie d’un run, chaque statut paginé, plus une page non filtrée', () => {
  const s = simuler();
  sonder({ pr: null, ...s });
  const filtres = s.appels.filter((a) => a.chemin.includes('status='));
  assert.deepEqual(
    filtres.map((a) => a.chemin.match(/status=([a-z_]+)/)[1]),
    [...STATUTS_NON_CONCLUS, ...STATUTS_NON_CONCLUS],
  );
  assert.ok(filtres.every((a) => a.paginer && /per_page=100/.test(a.chemin)), 'chaque statut se lit toutes pages');
  assert.deepEqual(STATUTS_NON_CONCLUS, ['requested', 'pending', 'queued', 'in_progress', 'waiting']);
  assert.ok(s.appels.some((a) => !a.paginer && /runs\?per_page=30$/.test(a.chemin)), 'la page non filtrée est lue en plus');
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
  assert.ok(v.lignes.some((l) => /^· run 1 : .*REJETER/.test(l)));
  assert.match(v.lignes.at(-1), /^SONDE release-db code=0 phase=attente runs=1 pr=1$/);
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
  for (const c of CHEMINS_RELEASE_DB) assert.ok(CHEMINS_GELES.includes(`${c}/`), c);
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
