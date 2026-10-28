// Banc du contrôle sur l'arbre fusionné (D-373 §4) — sans réseau : un vrai
// dépôt Git temporaire (origine nue, `refs/pull/N/head` poussée d'un autre
// clone, `main` qui avance), des gardes simulés qui jugent l'arbre réellement
// extrait, et l'API simulée. La parité avec le dépôt (liste des bancs de
// balayage, gardes présents, `include` de Vitest, banc enregistré) se lit sur
// les fichiers réels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
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
  purgerAnciens,
  signaturesNode,
} from './wn-controle-fusion.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');

// ── Empreinte d'environnement ───────────────────────────────────────────────

const VERROU = {
  packages: {
    '': { name: 'web' },
    'node_modules/a': { version: '1.0.0', integrity: 'sha512-a' },
    'node_modules/swc-linux': { version: '2.0.0', integrity: 'sha512-s', optional: true },
    'node_modules/fsevents': { version: '2.3.3', integrity: 'sha512-f', devOptional: true },
  },
};
const INSTALLE = { packages: { 'node_modules/a': { version: '1.0.0', integrity: 'sha512-a' } } };

test('verrous : concordants malgré des optionnelles absentes (autre plateforme)', () => {
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

test('empreinte : node_modules absent ou sans verrou caché, schéma différent, client absent ou périmé', () => {
  const sain = { verrouArbre: VERROU, verrouInstalle: INSTALLE, schemaArbre: 'x', schemaSource: 'x', client: { present: true, aJour: true } };
  assert.deepEqual(ecartsEnvironnement(sain), []);
  assert.deepEqual(ecartsEnvironnement({ ...sain, verrouInstalle: null }), ['node_modules absent de la copie source']);
  assert.match(ecartsEnvironnement({ ...sain, verrouInstalle: undefined })[0], /sans node_modules\/\.package-lock\.json/);
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
  assert.deepEqual(bancsVitest(['web/src/lib/d.test.ts']), []);
});

test('signatures node : tests TAP en échec et violations, sans numéro de ligne', () => {
  const sortie = [
    'ok 1 - passe',
    'not ok 2 - la matrice couvre la route',
    '    not ok 3 - sous-test imbriqué',
    '✗ docs/DECISIONS.md:1204 — D-372 en double',
    'texte quelconque',
  ].join('\n');
  assert.deepEqual(signaturesNode(sortie), ['test : la matrice couvre la route', 'test : sous-test imbriqué', '✗ docs/DECISIONS.md — D-372 en double'].sort());
  assert.deepEqual(signaturesNode(''), []);
});

const R = (nom, status, echecs = []) => ({
  name: `/tmp/arbre/${nom}`,
  status,
  assertionResults: [{ fullName: 'passe', status: 'passed' }, ...echecs.map((fullName) => ({ fullName, status: 'failed' }))],
});

test('rapport Vitest : états et assertions en échec ; absent du rapport = indéterminé', () => {
  const rapport = { testResults: [R('web/src/a.guard.test.ts', 'passed'), R('web/src/b.guard.test.ts', 'failed', ['route X classée']), R('web/src/d.guard.test.ts', 'failed')] };
  const etats = lireRapportVitest(rapport, ['web/src/a.guard.test.ts', 'web/src/b.guard.test.ts', 'web/src/c.guard.test.ts', 'web/src/d.guard.test.ts'], '/tmp/arbre', 1);
  assert.deepEqual(etats.get('vitest:web/src/a.guard.test.ts'), { etat: 'ok', signatures: [] });
  assert.deepEqual(etats.get('vitest:web/src/b.guard.test.ts'), { etat: 'echec', signatures: ['test : route X classée'] });
  assert.equal(etats.get('vitest:web/src/c.guard.test.ts').etat, 'indetermine');
  // Un fichier rouge sans assertion rouge (import cassé) : rouge au niveau du fichier.
  assert.deepEqual(etats.get('vitest:web/src/d.guard.test.ts'), { etat: 'echec', signatures: ['(fichier)'] });
  assert.equal(lireRapportVitest(null, ['web/src/a.guard.test.ts'], '/tmp/arbre', 1).get('vitest:web/src/a.guard.test.ts').etat, 'indetermine');
  // Vert sans assertion réussie (tout sauté) : rien n'est prouvé.
  const saute = { testResults: [{ name: '/tmp/arbre/web/src/a.guard.test.ts', status: 'passed', assertionResults: [{ fullName: 'x', status: 'skipped' }] }] };
  assert.equal(lireRapportVitest(saute, ['web/src/a.guard.test.ts'], '/tmp/arbre', 0).get('vitest:web/src/a.guard.test.ts').etat, 'indetermine');
});

test('rapport Vitest : sortie en erreur sans aucun fichier rouge — tout indéterminé, jamais vert', () => {
  const rapport = { success: false, testResults: [R('web/src/a.guard.test.ts', 'passed')] };
  assert.equal(lireRapportVitest(rapport, ['web/src/a.guard.test.ts'], '/tmp/arbre', 1).get('vitest:web/src/a.guard.test.ts').etat, 'indetermine');
  const succes = { success: true, testResults: [R('web/src/a.guard.test.ts', 'passed')] };
  assert.equal(lireRapportVitest(succes, ['web/src/a.guard.test.ts'], '/tmp/arbre', 1).get('vitest:web/src/a.guard.test.ts').etat, 'indetermine');
  assert.equal(lireRapportVitest(succes, ['web/src/a.guard.test.ts'], '/tmp/arbre', 0).get('vitest:web/src/a.guard.test.ts').etat, 'ok');
});

// ── Verdict ─────────────────────────────────────────────────────────────────

const ok = { etat: 'ok', signatures: [] };
const rouge = (...signatures) => ({ etat: 'echec', signatures });
const sansVerdict = { etat: 'indetermine', signatures: [] };

test('verdict : un conflit est un défaut', () => {
  const v = juger({ conflits: ['docs/DECISIONS.md'] });
  assert.equal(v.code, SORTIE_DEFAUT);
  assert.match(v.motif, /conflit sur 1 chemin\(s\) : docs\/DECISIONS\.md/);
});

test('verdict : rouge sur l’arbre fusionné, vert ou absent sur main — défaut imputable', () => {
  const v = juger({ fusionne: new Map([['matrice', rouge('t')], ['numerotation', ok]]), principal: new Map([['matrice', ok]]) });
  assert.equal(v.code, SORTIE_DEFAUT);
  assert.match(v.motif, /imputable\(s\) à la PR : matrice/);
  const absent = juger({ fusionne: new Map([['vitest:x', rouge('t')]]), absents: new Set(['vitest:x']) });
  assert.equal(absent.code, SORTIE_DEFAUT);
  assert.match(absent.motif, /vitest:x \(absent de main\)/);
});

test('verdict : rouge à l’identique des deux côtés — préexistant, la PR passe sans main vert', () => {
  const v = juger({ fusionne: new Map([['matrice', rouge('t')], ['numerotation', ok]]), principal: new Map([['matrice', rouge('t')]]) });
  assert.equal(v.code, SORTIE_SAIN);
  assert.equal(v.preexistants, 1);
  assert.match(v.notes[0], /non imputable\(s\) à la PR : matrice/);
  // Moins de rouges que sur main : la PR répare, préexistant aussi.
  assert.equal(juger({ fusionne: new Map([['matrice', rouge('t')]]), principal: new Map([['matrice', rouge('t', 'u')]]) }).code, SORTIE_SAIN);
});

test('verdict : un test rouge de plus dans un banc déjà rouge sur main — défaut', () => {
  const v = juger({ fusionne: new Map([['vitest:b', rouge('route A', 'route B')]]), principal: new Map([['vitest:b', rouge('route A')]]) });
  assert.equal(v.code, SORTIE_DEFAUT);
  assert.match(v.motif, /vitest:b \(route B\)/);
});

test('verdict : « indéterminé » est distinct d’un défaut', () => {
  assert.equal(juger({ fusionne: new Map([['matrice', sansVerdict]]) }).code, SORTIE_INDETERMINE);
  const instable = juger({ fusionne: new Map([['matrice', { etat: 'instable', signatures: [] }]]) });
  assert.equal(instable.code, SORTIE_INDETERMINE);
  assert.match(instable.motif, /^indéterminé .* matrice \(instable\)/);
  // Rouge sans contre-épreuve sur main : ni défaut ni sain.
  assert.match(juger({ fusionne: new Map([['matrice', rouge('t')]]) }).motif, /matrice \(main non rejoué\)/);
  assert.equal(juger({ fusionne: new Map([['matrice', rouge('t')]]), principal: new Map([['matrice', sansVerdict]]) }).code, SORTIE_INDETERMINE);
  // Un défaut certain l'emporte sur un indéterminé voisin.
  const mixte = juger({ fusionne: new Map([['matrice', rouge('t')], ['invariants-ci', sansVerdict]]), principal: new Map([['matrice', ok]]) });
  assert.equal(mixte.code, SORTIE_DEFAUT);
});

test('verdict : tout vert — sain', () => {
  const v = juger({ fusionne: new Map([['matrice', ok], ['vitest:web/src/a.guard.test.ts', ok]]) });
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

test('purge : seuls les dossiers du contrôle plus vieux que six heures sont retirés', (t) => {
  const racine = mkdtempSync(join(tmpdir(), 'wn-banc-purge-'));
  t.after(() => rmSync(racine, { recursive: true, force: true }));
  for (const nom of ['wn-controle-fusion-vieux', 'wn-controle-fusion-recent', 'autre-vieux']) mkdirSync(join(racine, nom));
  const vieux = new Date(Date.now() - 7 * 3600 * 1000);
  utimesSync(join(racine, 'wn-controle-fusion-vieux'), vieux, vieux);
  utimesSync(join(racine, 'autre-vieux'), vieux, vieux);
  purgerAnciens(racine);
  assert.ok(!existsSync(join(racine, 'wn-controle-fusion-vieux')));
  assert.ok(existsSync(join(racine, 'wn-controle-fusion-recent')));
  assert.ok(existsSync(join(racine, 'autre-vieux')));
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

function commit(clone, fichiers, message) {
  ecrire(clone, fichiers);
  g(clone, 'add', '-A', '-f');
  g(clone, 'commit', '--quiet', '-m', message);
}

/**
 * Un dépôt : `base` commun ; la PR, écrite dans un clone à part et poussée
 * seulement en `refs/pull/7/head` (le clone du contrôle ne l'a qu'en la
 * récupérant) ; `main` qui avance après la base (`null` : n'avance pas). Avec
 * `prDepuisMain`, la PR part d'un premier pas de `main`. Une copie source qui
 * prête un `node_modules` concordant et un client Prisma à jour.
 */
function depot({ base = {}, pr = {}, main = {}, prDepuisMain = false } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'wn-banc-fusion-'));
  const origine = join(tmp, 'origine.git');
  const clone = join(tmp, 'clone');
  const auteur = join(tmp, 'auteur');
  const source = join(tmp, 'source');
  g(tmp, 'init', '--quiet', '--bare', '-b', 'main', origine);
  g(tmp, 'clone', '--quiet', origine, clone);
  g(clone, 'checkout', '--quiet', '-b', 'main');
  commit(
    clone,
    {
      'web/package-lock.json': JSON.stringify(VERROU),
      'web/prisma/schema.prisma': 'model A { id Int @id }\n',
      'scripts/lib/decisions-numerotation.mjs': '',
      'scripts/wn-matrice-consommation.test.mjs': '',
      'scripts/ci-invariants.test.mjs': '',
      [GARDE_VITEST]: '',
      'docs/texte.md': 'un\n',
      ...base,
    },
    'base',
  );
  g(clone, 'push', '--quiet', 'origin', 'main');
  if (prDepuisMain) {
    commit(clone, { 'main.txt': 'avance\n' }, 'main avance');
    g(clone, 'push', '--quiet', 'origin', 'main');
  }
  g(tmp, 'clone', '--quiet', origine, auteur);
  commit(auteur, { 'pr.txt': 'pr\n', ...pr }, 'pr');
  g(auteur, 'push', '--quiet', 'origin', `HEAD:refs/pull/${PR}/head`);
  const tete = g(auteur, 'rev-parse', 'HEAD');
  if (main !== null) {
    commit(clone, { 'main2.txt': 'avance\n', ...main }, 'main avance encore');
    g(clone, 'push', '--quiet', 'origin', 'main');
    // `origin/main` local reculé : le contrôle doit lire `main` après son
    // propre fetch, jamais une référence locale périmée.
    g(clone, 'update-ref', 'refs/remotes/origin/main', g(clone, 'rev-parse', 'HEAD~1'));
  }
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
 * Les gardes simulés. `regle(dossier, passe)` rend, par garde (`numerotation`,
 * `matrice`, `invariants`, `vitest`) : `true` vert, `false` rouge, un tableau
 * de noms de tests rouges, `'delai'` ou `'code2'` ; et `vitestCode` pour forcer
 * le code de sortie de Vitest. `passe` compte les appels sur ce dossier.
 * `appels` garde chaque appel.
 */
function gardesSimules(regle, appels = []) {
  const passes = new Map();
  return (cmd, args, { cwd }) => {
    assert.equal(cmd, 'node');
    const vitest = args[0] === 'node_modules/vitest/vitest.mjs';
    const dossier = vitest ? dirname(cwd) : cwd;
    const cle = `${dossier}:${vitest ? 'vitest' : args.at(-1)}`;
    passes.set(cle, (passes.get(cle) ?? 0) + 1);
    const r = regle(dossier, passes.get(cle));
    if (vitest) {
      assert.ok(args.includes('--no-cache'));
      const sortie = args.find((a) => a.startsWith('--outputFile=')).slice('--outputFile='.length);
      const fichiers = args.slice(args.indexOf(`--outputFile=${sortie}`) + 1);
      appels.push({ dossier, vitest: fichiers });
      const echecs = r.vitest === false ? ['un test'] : Array.isArray(r.vitest) ? r.vitest : [];
      writeFileSync(
        sortie,
        JSON.stringify({
          success: echecs.length === 0,
          testResults: fichiers.map((f) => ({
            name: join(cwd, f),
            status: echecs.length ? 'failed' : 'passed',
            assertionResults: [{ fullName: 'passe', status: 'passed' }, ...echecs.map((fullName) => ({ fullName, status: 'failed' }))],
          })),
        }),
      );
      return { code: r.vitestCode ?? (echecs.length ? 1 : 0), signal: null, erreur: null, sortie: '' };
    }
    appels.push({ dossier, garde: args.at(-1) });
    const id = GARDES_NODE.find((x) => x.args.at(-1) === args.at(-1)).id;
    const etat = r[{ numerotation: 'numerotation', matrice: 'matrice', 'invariants-ci': 'invariants' }[id]];
    if (etat === 'delai') return { code: null, signal: 'SIGTERM', erreur: null, sortie: '' };
    if (etat === 'code2') return { code: 2, signal: null, erreur: null, sortie: '✗ registre illisible' };
    const noms = etat === false ? ['un test'] : Array.isArray(etat) ? etat : [];
    return { code: noms.length ? 1 : 0, signal: null, erreur: null, sortie: noms.map((n, i) => `not ok ${i + 1} - ${n}`).join('\n') };
  };
}

const tousVerts = () => ({ numerotation: true, matrice: true, invariants: true, vitest: true });

function cacheMemoire() {
  const m = new Map();
  return { m, lire: (c) => m.get(c) ?? null, ecrire: (c, v) => m.set(c, v) };
}

function jouer(d, { regle = tousVerts, etat = 'open', cache = cacheMemoire(), lireJson, appels = [], teteApi, mergeable } = {}) {
  return controler({
    pr: PR,
    racine: d.clone,
    source: d.source,
    lireJson: lireJson ?? (() => ({ state: etat, mergeable, base: { ref: 'main' }, head: { sha: teteApi ?? d.tete } })),
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
  assert.match(derniere(r), /requis=non/);
  assert.equal(appels.length, 0);
});

test('collecte : la tête n’existe que sous refs/pull/N/head — récupérée, puis jugée', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  assert.notEqual(spawnSync('git', ['cat-file', '-e', `${d.tete}^{commit}`], { cwd: d.clone }).status, 0);
  assert.equal(jouer(d).code, SORTIE_SAIN);
});

test('collecte : main a bougé, sans conflit, gardes verts — sain, puis verdict en cache', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const appels = [];
  const cache = cacheMemoire();
  const r = jouer(d, { appels, cache });
  assert.equal(r.code, SORTIE_SAIN, r.lignes.join('\n'));
  assert.match(derniere(r), new RegExp(`^CONTROLE fusion code=0 pr=${PR} main=[0-9a-f]{8} tete=${d.tete.slice(0, 8)} requis=oui cache=non rouges=0 preexistants=0 duree=`));
  assert.equal(appels.length, GARDES_NODE.length + 1);
  // L'arbre extrait a été retiré, liens compris, et la source est intacte.
  assert.ok(!existsSync(appels[0].dossier));
  assert.ok(existsSync(join(d.source, 'web/node_modules/.package-lock.json')));
  const encore = [];
  const r2 = jouer(d, { appels: encore, cache });
  assert.equal(r2.code, SORTIE_SAIN);
  assert.match(r2.lignes[0], /verdict en cache/);
  assert.match(derniere(r2), /cache=oui/);
  assert.equal(encore.length, 0);
});

test('collecte : l’arbre extrait est l’arbre fusionné, indexé à l’identique, sans les liens', (t) => {
  // Un fichier suivi mais ignoré (`.env.example` dans le dépôt réel) reste indexé.
  const d = depot({ base: { '.gitignore': '*.exemple\n', 'config.exemple': 'x\n' }, pr: { 'web/src/de-la-pr.ts': '' }, main: { 'web/src/de-main.ts': '' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  let suivis = null;
  const r = jouer(d, {
    regle: (dossier) => {
      suivis ??= execFileSync('git', ['ls-files'], { cwd: dossier, encoding: 'utf8' }).split('\n').filter(Boolean);
      return tousVerts();
    },
  });
  assert.equal(r.code, SORTIE_SAIN);
  for (const f of ['web/src/de-la-pr.ts', 'web/src/de-main.ts', 'config.exemple']) assert.ok(suivis.includes(f), f);
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

test('collecte : GitHub voit un conflit que merge-tree ne voit pas — défaut, hors cache', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const cache = cacheMemoire();
  const r = jouer(d, { mergeable: false, cache });
  assert.equal(r.code, SORTIE_DEFAUT);
  assert.match(r.lignes[0], /mergeable/);
  assert.equal(cache.m.size, 0);
  // Un « sain » déjà en cache ne masque pas le conflit vu par GitHub (revue CodeRabbit de #1753).
  assert.equal(jouer(d, { cache }).code, SORTIE_SAIN);
  assert.equal(cache.m.size, 1);
  const apres = jouer(d, { mergeable: false, cache });
  assert.equal(apres.code, SORTIE_DEFAUT);
  assert.match(derniere(apres), /cache=non/);
});

test('collecte : deux vertes séparément, rouge ensemble — défaut imputable (conflit sémantique)', (t) => {
  // Le banc de balayage arrive par main, la route non classée par la PR.
  const d = depot({ pr: { 'web/src/route-neuve.ts': '' }, main: { 'web/src/banc-balayage.ts': '' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const regle = (dossier) => ({
    ...tousVerts(),
    vitest: !(existsSync(join(dossier, 'web/src/route-neuve.ts')) && existsSync(join(dossier, 'web/src/banc-balayage.ts'))),
  });
  const appels = [];
  const r = jouer(d, { regle, appels });
  assert.equal(r.code, SORTIE_DEFAUT, r.lignes.join('\n'));
  assert.match(r.lignes[0], new RegExp(`imputable\\(s\\) à la PR : vitest:${GARDE_VITEST.replaceAll('.', '\\.')}`));
  assert.match(derniere(r), /rouges=1/);
  // Le rouge est confirmé seul sur l'arbre fusionné, puis rejoué seul sur main.
  const vitest = appels.filter((a) => a.vitest);
  assert.equal(vitest.length, 3);
  assert.deepEqual(vitest[1].vitest, [GARDE_VITEST.slice('web/'.length)]);
  assert.notEqual(vitest[2].dossier, vitest[0].dossier);
});

test('collecte : rouge sous la charge, vert au rejeu seul — indéterminé, jamais un défaut ni en cache', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const cache = cacheMemoire();
  const r = jouer(d, { regle: (_, passe) => ({ ...tousVerts(), vitest: passe > 1 }), cache });
  assert.equal(r.code, SORTIE_INDETERMINE, r.lignes.join('\n'));
  assert.match(r.lignes[0], /\(instable\)/);
  assert.equal(cache.m.size, 0);
});

test('collecte : un banc ajouté par la PR, rouge sur l’arbre fusionné — défaut (absent de main)', (t) => {
  const neuf = 'web/src/lib/neuf.guard.test.ts';
  const d = depot({ pr: { [neuf]: '' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const regle = (dossier) => ({ ...tousVerts(), vitest: !existsSync(join(dossier, neuf)) });
  const r = jouer(d, { regle });
  assert.equal(r.code, SORTIE_DEFAUT, r.lignes.join('\n'));
  assert.match(r.lignes[0], /absent de main/);
});

test('collecte : PR de réparation partielle sur main rouge — admise, le reste est préexistant', (t) => {
  // Main est rouge sur deux gardes ; la PR, partie de ce main rouge, en répare un.
  const d = depot({ base: { casse1: '', casse2: '' }, pr: { casse1: null }, prDepuisMain: true });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const regle = (dossier) => ({ ...tousVerts(), matrice: !existsSync(join(dossier, 'casse1')), vitest: !existsSync(join(dossier, 'casse2')) });
  const r = jouer(d, { regle });
  assert.equal(r.code, SORTIE_SAIN, r.lignes.join('\n'));
  assert.match(r.lignes[1], /^· garde\(s\) rouge\(s\) à l'identique sur main seul, non imputable\(s\) à la PR : vitest:/);
  assert.match(derniere(r), /rouges=1 preexistants=1/);
});

test('collecte : un test rouge de plus dans un banc déjà rouge sur main — défaut', (t) => {
  const d = depot({ base: { casse: '' }, pr: { 'web/src/route-b.ts': '' }, prDepuisMain: true });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const regle = (dossier) => ({
    ...tousVerts(),
    vitest: ['route A non classée', ...(existsSync(join(dossier, 'web/src/route-b.ts')) ? ['route B non classée'] : [])],
  });
  const r = jouer(d, { regle });
  assert.equal(r.code, SORTIE_DEFAUT, r.lignes.join('\n'));
  assert.match(r.lignes[0], /route B non classée/);
  assert.doesNotMatch(r.lignes[0], /route A/);
});

test('collecte : Vitest sort en erreur avec un rapport tout vert — indéterminé', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const r = jouer(d, { regle: () => ({ ...tousVerts(), vitestCode: 1 }) });
  assert.equal(r.code, SORTIE_INDETERMINE);
});

test('collecte : la numérotation refuse d’être verte (code 2) — indéterminé, pas préexistant', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const r = jouer(d, { regle: () => ({ ...tousVerts(), numerotation: 'code2' }) });
  assert.equal(r.code, SORTIE_INDETERMINE);
  assert.match(r.lignes[0], /numerotation/);
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

test('collecte : schéma Prisma changé par la PR, ou client plus ancien que le schéma — indéterminé', (t) => {
  const d = depot({ pr: { 'web/prisma/schema.prisma': 'model B { id Int @id }\n' } });
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  assert.match(jouer(d).lignes[0], /schéma Prisma/);
  const e = depot();
  t.after(() => rmSync(e.tmp, { recursive: true, force: true }));
  const passe = new Date(Date.now() - 3600_000);
  utimesSync(join(e.source, 'web/src/generated/prisma/index.js'), passe, passe);
  const r = jouer(e);
  assert.equal(r.code, SORTIE_INDETERMINE);
  assert.match(r.lignes[0], /prisma generate/);
});

test('collecte : un parent suivi comme lien symbolique — indéterminé, rien posé hors du dossier', (t) => {
  const d = depot();
  t.after(() => rmSync(d.tmp, { recursive: true, force: true }));
  const auteur = join(d.tmp, 'auteur');
  const dehors = join(d.tmp, 'dehors');
  mkdirSync(dehors);
  mkdirSync(join(auteur, 'web/src'), { recursive: true });
  symlinkSync(dehors, join(auteur, 'web/src/generated'));
  g(auteur, 'add', '-A');
  g(auteur, 'commit', '--quiet', '-m', 'lien');
  g(auteur, 'push', '--quiet', '--force', 'origin', `HEAD:refs/pull/${PR}/head`);
  const r = jouer(d, { teteApi: g(auteur, 'rev-parse', 'HEAD') });
  assert.equal(r.code, SORTIE_INDETERMINE, r.lignes.join('\n'));
  assert.match(r.lignes[0], /web\/src\/generated n'est pas un dossier/);
  assert.ok(!existsSync(join(dehors, 'prisma')));
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

test('collecte : PR fermée, lecture impossible, autre base, tête inconnue — indéterminé', (t) => {
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
  const autre = join(d.tmp, 'autre');
  g(d.tmp, 'clone', '--quiet', join(d.tmp, 'origine.git'), autre);
  commit(autre, { 'main3.txt': '' }, 'main avance encore');
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
  const balayeurs = tests.filter((f) => !MOTIF_GUARD.test(f) && /\b(readdirSync|opendirSync|globSync|readdir|glob)\b/.test(lire(f)));
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
