// Banc du contrôle sur l'arbre fusionné (D-373 §4) — sans réseau : un vrai
// dépôt Git temporaire (origine nue, `refs/pull/N/head`, `main` qui avance),
// des gardes simulés qui jugent l'arbre réellement extrait, et l'API simulée.
// La parité avec le dépôt (liste des bancs de balayage, gardes présents,
// `include` de Vitest, banc enregistré) se lit sur les fichiers réels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANCS_BALAYAGE,
  GARDES_NODE,
  MOTIF_GUARD,
  SORTIE_DEFAUT,
  SORTIE_INDETERMINE,
  SORTIE_SAIN,
  SORTIE_USAGE,
  analyserArguments,
  bancsVitest,
  comparerVerrous,
  controler,
  ecartsEnvironnement,
  juger,
  lireRapportVitest,
} from './wn-controle-fusion.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');

// ── Empreinte d'environnement ───────────────────────────────────────────────

const VERROU = {
  packages: {
    '': { name: 'web' },
    'node_modules/a': { version: '1.0.0', integrity: 'sha512-a' },
    'node_modules/swc-linux': { version: '2.0.0', integrity: 'sha512-s', optional: true },
  },
};
const INSTALLE = { packages: { 'node_modules/a': { version: '1.0.0', integrity: 'sha512-a' } } };

test('verrous : concordants malgré une optionnelle absente (autre plateforme)', () => {
  assert.deepEqual(comparerVerrous(VERROU, INSTALLE), []);
});

test('verrous : version, intégrité, paquet en trop et paquet manquant sont des écarts', () => {
  const autreVersion = { packages: { 'node_modules/a': { version: '1.0.1', integrity: 'sha512-a' } } };
  assert.match(comparerVerrous(VERROU, autreVersion)[0], /installé en 1\.0\.1, verrou en 1\.0\.0/);
  const autreIntegrite = { packages: { 'node_modules/a': { version: '1.0.0', integrity: 'sha512-b' } } };
  assert.equal(comparerVerrous(VERROU, autreIntegrite).length, 1);
  const enTrop = { packages: { ...INSTALLE.packages, 'node_modules/z': { version: '1.0.0' } } };
  assert.match(comparerVerrous(VERROU, enTrop)[0], /absent du verrou/);
  assert.match(comparerVerrous(VERROU, { packages: {} })[0], /node_modules\/a absent de node_modules/);
});

test('empreinte : node_modules absent, schéma différent, client absent ou périmé', () => {
  const sain = { verrouArbre: VERROU, verrouInstalle: INSTALLE, schemaArbre: 'x', schemaSource: 'x', client: { present: true, aJour: true } };
  assert.deepEqual(ecartsEnvironnement(sain), []);
  assert.deepEqual(ecartsEnvironnement({ ...sain, verrouInstalle: null }), ['node_modules absent de la copie source']);
  assert.match(ecartsEnvironnement({ ...sain, schemaSource: 'y' })[0], /schéma Prisma/);
  assert.match(ecartsEnvironnement({ ...sain, schemaSource: null })[0], /schéma Prisma/);
  assert.match(ecartsEnvironnement({ ...sain, client: { present: false, aJour: false } })[0], /client Prisma absent/);
  assert.match(ecartsEnvironnement({ ...sain, client: { present: true, aJour: false } })[0], /prisma generate/);
});

// ── Gardes ──────────────────────────────────────────────────────────────────

test('bancs Vitest : les `guard` collectés par Vitest, et les bancs de balayage présents', () => {
  const fichiers = [
    'web/src/lib/a.guard.test.ts',
    'web/src/components/b.guard.test.tsx',
    'web/prisma/c.guard.test.ts',
    'web/src/lib/d.test.ts',
    'scripts/e.guard.test.mjs',
    'web/e2e/f.guard.test.ts',
    BANCS_BALAYAGE[0],
  ];
  assert.deepEqual(bancsVitest(fichiers), [BANCS_BALAYAGE[0], 'web/prisma/c.guard.test.ts', 'web/src/components/b.guard.test.tsx', 'web/src/lib/a.guard.test.ts'].sort());
  // Un banc de balayage absent de l'arbre n'est pas demandé à Vitest.
  assert.deepEqual(bancsVitest(['web/src/lib/d.test.ts']), []);
});

test('rapport Vitest : un banc absent du rapport, ou un rapport illisible, est indéterminé', () => {
  const dossier = '/tmp/arbre';
  const rapport = { testResults: [{ name: '/tmp/arbre/web/src/a.guard.test.ts', status: 'passed' }, { name: '/tmp/arbre/web/src/b.guard.test.ts', status: 'failed' }] };
  const etats = lireRapportVitest(rapport, ['web/src/a.guard.test.ts', 'web/src/b.guard.test.ts', 'web/src/c.guard.test.ts'], dossier);
  assert.equal(etats.get('vitest:web/src/a.guard.test.ts'), 'ok');
  assert.equal(etats.get('vitest:web/src/b.guard.test.ts'), 'echec');
  assert.equal(etats.get('vitest:web/src/c.guard.test.ts'), 'indetermine');
  assert.equal(lireRapportVitest(null, ['web/src/a.guard.test.ts'], dossier).get('vitest:web/src/a.guard.test.ts'), 'indetermine');
});

// ── Verdict ─────────────────────────────────────────────────────────────────

test('verdict : un conflit est un défaut', () => {
  const v = juger({ conflits: ['docs/DECISIONS.md'] });
  assert.equal(v.code, SORTIE_DEFAUT);
  assert.match(v.motif, /conflit sur 1 chemin\(s\) : docs\/DECISIONS\.md/);
});

test('verdict : rouge sur l’arbre fusionné et vert sur main seul — défaut imputable', () => {
  const v = juger({ fusionne: new Map([['matrice', 'echec'], ['numerotation', 'ok']]), principal: new Map([['matrice', 'ok']]) });
  assert.equal(v.code, SORTIE_DEFAUT);
  assert.match(v.motif, /vert\(s\) sur main seul : matrice/);
});

test('verdict : rouge des deux côtés — préexistant, la PR passe sans main vert', () => {
  const v = juger({ fusionne: new Map([['matrice', 'echec'], ['numerotation', 'ok']]), principal: new Map([['matrice', 'echec']]) });
  assert.equal(v.code, SORTIE_SAIN);
  assert.match(v.notes[0], /non imputable\(s\) à la PR : matrice/);
});

test('verdict : « indéterminé » est distinct d’un défaut', () => {
  // Garde sans verdict.
  assert.equal(juger({ fusionne: new Map([['matrice', 'indetermine']]) }).code, SORTIE_INDETERMINE);
  // Rouge sans contre-épreuve sur main : ni défaut ni sain.
  const v = juger({ fusionne: new Map([['matrice', 'echec']]), principal: new Map() });
  assert.equal(v.code, SORTIE_INDETERMINE);
  assert.match(v.motif, /^indéterminé/);
  // Rouge sur main rejoué sans verdict : indéterminé aussi.
  assert.equal(juger({ fusionne: new Map([['matrice', 'echec']]), principal: new Map([['matrice', 'indetermine']]) }).code, SORTIE_INDETERMINE);
  // Un défaut certain l'emporte sur un indéterminé voisin.
  const mixte = juger({ fusionne: new Map([['matrice', 'echec'], ['invariants-ci', 'indetermine']]), principal: new Map([['matrice', 'ok']]) });
  assert.equal(mixte.code, SORTIE_DEFAUT);
});

test('verdict : tout vert — sain', () => {
  const v = juger({ fusionne: new Map([['matrice', 'ok'], ['vitest:web/src/a.guard.test.ts', 'ok']]) });
  assert.equal(v.code, SORTIE_SAIN);
  assert.match(v.motif, /2 garde\(s\) jouée\(s\), toutes vertes/);
});

test('arguments : un numéro, et `--source` une fois', () => {
  assert.deepEqual(analyserArguments(['12']), { pr: 12, source: null });
  assert.deepEqual(analyserArguments(['12', '--source', '/x']), { pr: 12, source: '/x' });
  assert.deepEqual(analyserArguments(['--source', '/x', '12']), { pr: 12, source: '/x' });
  for (const argv of [[], ['0'], ['12', '13'], ['12', '--source'], ['12', '--merge'], ['--source', '/x']]) {
    assert.ok(analyserArguments(argv).erreur, JSON.stringify(argv));
  }
});

// ── Collecte, sur un vrai dépôt ─────────────────────────────────────────────

const PR = 7;
const GARDE_VITEST = 'web/src/lib/a.guard.test.ts';

function g(cwd, ...args) {
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Banc', '-c', 'user.email=banc@exemple.invalid', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function ecrire(dossier, fichiers) {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    if (contenu === null) {
      rmSync(join(dossier, chemin));
      continue;
    }
    mkdirSync(dirname(join(dossier, chemin)), { recursive: true });
    writeFileSync(join(dossier, chemin), contenu);
  }
}

/**
 * Un dépôt : `base` commun, `pr` (branche de la PR, poussée en
 * `refs/pull/7/head`), `main` (avance de `main` après la base ; `null` : main
 * n'avance pas). Une copie source qui prête un `node_modules` concordant.
 */
function depot({ base = {}, pr = {}, main = {}, prDepuisMain = false } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'wn-banc-fusion-'));
  const origine = join(tmp, 'origine.git');
  const clone = join(tmp, 'clone');
  const source = join(tmp, 'source');
  g(tmp, 'init', '--quiet', '--bare', '-b', 'main', origine);
  g(tmp, 'clone', '--quiet', origine, clone);
  g(clone, 'checkout', '--quiet', '-b', 'main');
  ecrire(clone, {
    'web/package-lock.json': JSON.stringify(VERROU),
    'web/prisma/schema.prisma': 'model A { id Int @id }\n',
    'scripts/lib/decisions-numerotation.mjs': '',
    [GARDE_VITEST]: '',
    'docs/texte.md': 'un\n',
    ...base,
  });
  g(clone, 'add', '-A');
  g(clone, 'commit', '--quiet', '-m', 'base');
  g(clone, 'push', '--quiet', 'origin', 'main');
  const avancer = () => {
    if (main === null) return;
    ecrire(clone, { 'main.txt': 'avance\n', ...main });
    g(clone, 'add', '-A');
    g(clone, 'commit', '--quiet', '-m', 'main avance');
    g(clone, 'push', '--quiet', 'origin', 'main');
  };
  if (prDepuisMain) avancer();
  g(clone, 'checkout', '--quiet', '-b', 'pr');
  ecrire(clone, { 'pr.txt': 'pr\n', ...pr });
  g(clone, 'add', '-A');
  g(clone, 'commit', '--quiet', '-m', 'pr');
  g(clone, 'push', '--quiet', 'origin', `pr:refs/pull/${PR}/head`);
  const tete = g(clone, 'rev-parse', 'HEAD');
  g(clone, 'checkout', '--quiet', 'main');
  if (!prDepuisMain) avancer();
  else {
    ecrire(clone, { 'main2.txt': 'encore\n' });
    g(clone, 'add', '-A');
    g(clone, 'commit', '--quiet', '-m', 'main avance encore');
    g(clone, 'push', '--quiet', 'origin', 'main');
  }
  // `origin/main` local reculé d'un commit : le contrôle doit lire `main`
  // après son propre fetch, jamais une référence locale périmée.
  if (main !== null || prDepuisMain) g(clone, 'update-ref', 'refs/remotes/origin/main', g(clone, 'rev-parse', 'HEAD~1'));
  ecrire(source, {
    'web/node_modules/.package-lock.json': JSON.stringify(INSTALLE),
    'web/prisma/schema.prisma': 'model A { id Int @id }\n',
    'web/src/generated/prisma/index.js': '',
  });
  const futur = new Date(Date.now() + 60_000);
  utimesSync(join(source, 'web/src/generated/prisma/index.js'), futur, futur);
  return { tmp, clone, source, tete };
}

/**
 * Les gardes simulés : `regle(dossier)` rend `{ numerotation, matrice,
 * invariants, vitest }` (vrai = vert) d'après l'arbre réellement extrait.
 * `appels` garde chaque dossier vu.
 */
function gardesSimules(regle, appels = []) {
  return (cmd, args, { cwd }) => {
    assert.equal(cmd, 'node');
    if (args[0] === 'node_modules/vitest/vitest.mjs') {
      const dossier = dirname(cwd);
      appels.push({ dossier, vitest: true });
      const sortie = args.find((a) => a.startsWith('--outputFile=')).slice('--outputFile='.length);
      const fichiers = args.slice(args.indexOf(`--outputFile=${sortie}`) + 1);
      const vert = regle(dossier).vitest;
      writeFileSync(sortie, JSON.stringify({ testResults: fichiers.map((f) => ({ name: join(cwd, f), status: vert ? 'passed' : 'failed' })) }));
      return { code: vert ? 0 : 1, signal: null, erreur: null };
    }
    appels.push({ dossier: cwd, garde: args.at(-1) });
    const id = GARDES_NODE.find((x) => x.args.at(-1) === args.at(-1)).id;
    const etat = regle(cwd)[{ numerotation: 'numerotation', matrice: 'matrice', 'invariants-ci': 'invariants' }[id]];
    if (etat === 'delai') return { code: null, signal: 'SIGTERM', erreur: null };
    return { code: etat === false ? 1 : 0, signal: null, erreur: null };
  };
}

const tousVerts = () => ({ numerotation: true, matrice: true, invariants: true, vitest: true });

function cacheMemoire() {
  const m = new Map();
  return { m, lire: (c) => m.get(c) ?? null, ecrire: (c, v) => m.set(c, v) };
}

function jouer(d, { regle = tousVerts, etat = 'open', cache = cacheMemoire(), lireJson, appels = [], teteApi } = {}) {
  return controler({
    pr: PR,
    racine: d.clone,
    source: d.source,
    lireJson: lireJson ?? (() => ({ state: etat, base: { ref: 'main' }, head: { sha: teteApi ?? d.tete } })),
    git: (a) => {
      const r = spawnSync('git', a, { cwd: d.clone, encoding: 'utf8' });
      return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
    },
    executer: gardesSimules(regle, appels),
    cache,
  });
}

const derniere = (r) => r.lignes.at(-1);

test('collecte : main immobile depuis la base de la PR — contrôle non requis, aucun garde joué', (t) => {
  const d = depot({ main: null });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const appels = [];
  const r = jouer(d, { appels });
  assert.equal(r.code, SORTIE_SAIN);
  assert.match(r.lignes[0], /non requis/);
  assert.equal(appels.length, 0);
});

test('collecte : main a bougé, sans conflit, gardes verts — sain, puis verdict en cache', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const appels = [];
  const cache = cacheMemoire();
  const r = jouer(d, { appels, cache });
  assert.equal(r.code, SORTIE_SAIN, r.lignes.join('\n'));
  assert.match(derniere(r), new RegExp(`^CONTROLE fusion code=0 pr=${PR} main=[0-9a-f]{8} tete=${d.tete.slice(0, 8)} cache=non duree=`));
  assert.equal(appels.length, GARDES_NODE.length + 1);
  // L'arbre extrait a été retiré, liens compris, et la source est intacte.
  assert.ok(!existsSync(appels[0].dossier));
  assert.ok(existsSync(join(d.source, 'web/node_modules/.package-lock.json')));
  // Second passage, mêmes sha : en cache, aucun garde rejoué.
  const encore = [];
  const r2 = jouer(d, { appels: encore, cache });
  assert.equal(r2.code, SORTIE_SAIN);
  assert.match(r2.lignes[0], /verdict en cache/);
  assert.match(derniere(r2), /cache=oui/);
  assert.equal(encore.length, 0);
});

test('collecte : l’arbre extrait est l’arbre fusionné, indexé, sans node_modules dans l’index', (t) => {
  const d = depot({ pr: { 'web/src/de-la-pr.ts': '' }, main: { 'web/src/de-main.ts': '' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  let suivis = null;
  const r = jouer(d, {
    regle: (dossier) => {
      suivis ??= execFileSync('git', ['ls-files'], { cwd: dossier, encoding: 'utf8' }).split('\n');
      return tousVerts();
    },
  });
  assert.equal(r.code, SORTIE_SAIN);
  assert.ok(suivis.includes('web/src/de-la-pr.ts') && suivis.includes('web/src/de-main.ts'));
  assert.ok(!suivis.some((f) => f.startsWith('web/node_modules') || f.startsWith('web/src/generated')));
});

test('collecte : un conflit est un défaut, mis en cache, sans garde joué', (t) => {
  const d = depot({ pr: { 'docs/texte.md': 'pr\n' }, main: { 'docs/texte.md': 'main\n' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const appels = [];
  const cache = cacheMemoire();
  const r = jouer(d, { appels, cache });
  assert.equal(r.code, SORTIE_DEFAUT);
  assert.match(r.lignes[0], /conflit sur 1 chemin\(s\) : docs\/texte\.md/);
  assert.equal(appels.length, 0);
  assert.equal(cache.m.size, 1);
});

test('collecte : deux vertes séparément, rouge ensemble — défaut imputable (conflit sémantique)', (t) => {
  // Le banc de balayage arrive par main, la route non classée par la PR.
  const d = depot({ pr: { 'web/src/route-neuve.ts': '' }, main: { 'web/src/banc-balayage.ts': '' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const regle = (dossier) => ({
    ...tousVerts(),
    vitest: !(existsSync(join(dossier, 'web/src/route-neuve.ts')) && existsSync(join(dossier, 'web/src/banc-balayage.ts'))),
  });
  const r = jouer(d, { regle });
  assert.equal(r.code, SORTIE_DEFAUT, r.lignes.join('\n'));
  assert.match(r.lignes[0], new RegExp(`vert\\(s\\) sur main seul : vitest:${GARDE_VITEST.replaceAll('.', '\\.')}`));
});

test('collecte : PR de réparation partielle sur main rouge — admise, le reste est préexistant', (t) => {
  // Main est rouge sur deux gardes ; la PR, partie de ce main rouge, en répare un.
  const d = depot({
    base: { casse1: '', casse2: '' },
    pr: { casse1: null },
    prDepuisMain: true,
  });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const regle = (dossier) => ({ ...tousVerts(), matrice: !existsSync(join(dossier, 'casse1')), vitest: !existsSync(join(dossier, 'casse2')) });
  const r = jouer(d, { regle });
  assert.equal(r.code, SORTIE_SAIN, r.lignes.join('\n'));
  assert.match(r.lignes[1], /^· garde\(s\) rouge\(s\) aussi sur main seul, non imputable\(s\) à la PR : vitest:/);
});

test('collecte : empreinte discordante — indéterminé, aucun garde joué, rien en cache', (t) => {
  const d = depot({ pr: { 'web/package-lock.json': JSON.stringify({ packages: { ...VERROU.packages, 'node_modules/b': { version: '1.0.0' } } }) } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const appels = [];
  const cache = cacheMemoire();
  const r = jouer(d, { appels, cache });
  assert.equal(r.code, SORTIE_INDETERMINE);
  assert.match(r.lignes[0], /indéterminé — l'environnement prêté .* node_modules\/b absent de node_modules/);
  assert.equal(appels.length, 0);
  assert.equal(cache.m.size, 0);
});

test('collecte : schéma Prisma changé par la PR — indéterminé (client à régénérer)', (t) => {
  const d = depot({ pr: { 'web/prisma/schema.prisma': 'model B { id Int @id }\n' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const r = jouer(d);
  assert.equal(r.code, SORTIE_INDETERMINE);
  assert.match(r.lignes[0], /schéma Prisma/);
});

test('collecte : un garde hors délai — indéterminé, jamais en cache', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const cache = cacheMemoire();
  const r = jouer(d, { regle: () => ({ ...tousVerts(), invariants: 'delai' }), cache });
  assert.equal(r.code, SORTIE_INDETERMINE);
  assert.match(r.lignes[0], /invariants-ci/);
  assert.equal(cache.m.size, 0);
});

test('collecte : PR fermée, lecture impossible, tête inconnue — indéterminé', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  assert.equal(jouer(d, { etat: 'closed' }).code, SORTIE_INDETERMINE);
  const illisible = jouer(d, {
    lireJson: () => {
      throw new Error('HTTP 502');
    },
  });
  assert.equal(illisible.code, SORTIE_INDETERMINE);
  assert.match(illisible.lignes[0], /lecture de la PR impossible : HTTP 502/);
  const autreBase = jouer(d, { lireJson: () => ({ state: 'open', base: { ref: 'dev' }, head: { sha: d.tete } }) });
  assert.match(autreBase.lignes[0], /vise dev, pas main/);
  const inconnue = jouer(d, { teteApi: 'f'.repeat(40) });
  assert.equal(inconnue.code, SORTIE_INDETERMINE);
  assert.match(inconnue.lignes[0], /absente du dépôt/);
});

test('collecte : un sha qui change invalide le cache', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const cache = cacheMemoire();
  assert.equal(jouer(d, { cache }).code, SORTIE_SAIN);
  // Main avance : nouvelle clé, gardes rejoués.
  const autre = join(d.tmp, 'autre');
  g(d.tmp, 'clone', '--quiet', join(d.tmp, 'origine.git'), autre);
  ecrire(autre, { 'main3.txt': '' });
  g(autre, 'add', '-A');
  g(autre, 'commit', '--quiet', '-m', 'main avance encore');
  g(autre, 'push', '--quiet', 'origin', 'main');
  const appels = [];
  const r = jouer(d, { cache, appels });
  assert.match(derniere(r), /cache=non/);
  assert.ok(appels.length > 0);
  assert.equal(cache.m.size, 2);
});

// ── Parité avec le dépôt ────────────────────────────────────────────────────

test('parité : tout banc Vitest qui balaie une arborescence est un `guard` ou dans BANCS_BALAYAGE', () => {
  const tests = execFileSync('git', ['ls-files', '--', 'web/src', 'web/prisma'], { cwd: RACINE, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.test\.tsx?$/.test(f));
  const balayeurs = tests.filter((f) => !MOTIF_GUARD.test(f) && /\b(readdirSync|opendirSync|globSync)\b/.test(lire(f)));
  assert.deepEqual(balayeurs.sort(), [...BANCS_BALAYAGE].sort());
  for (const f of BANCS_BALAYAGE) assert.ok(existsSync(join(RACINE, f)), f);
});

test('parité : les gardes Node existent, et le motif `guard` suit l’`include` de Vitest', () => {
  for (const garde of GARDES_NODE) assert.ok(existsSync(join(RACINE, garde.args.at(-1))), garde.id);
  const config = lire('web/vitest.config.ts');
  for (const motif of ["'src/**/*.test.ts'", "'src/**/*.test.tsx'", "'prisma/**/*.test.ts'"]) assert.ok(config.includes(motif), motif);
  assert.ok(JSON.parse(lire('web/package.json')).devDependencies.vitest, 'vitest, lancé par node_modules/vitest/vitest.mjs');
});

test('parité : le banc est enregistré dans `bancs-outillage-check`', () => {
  const scripts = JSON.parse(lire('web/package.json')).scripts;
  assert.match(scripts['bancs-outillage-check'], /scripts\/wn-controle-fusion\.test\.mjs/);
});

test('CLI : un usage invalide sort en 3 sans rien lire', () => {
  const r = spawnSync(process.execPath, [join(RACINE, 'scripts/wn-controle-fusion.mjs'), 'abc'], { encoding: 'utf8' });
  assert.equal(r.status, SORTIE_USAGE);
  assert.match(r.stderr, /usage/);
});
