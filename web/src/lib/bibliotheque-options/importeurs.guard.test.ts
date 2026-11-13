import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createModuleResolutionCache,
  parseConfigFileTextToJson,
  parseJsonConfigFileContent,
  resolveModuleName,
  sys,
  type CompilerOptions,
  type ModuleResolutionCache,
  type ModuleResolutionHost,
} from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import {
  estFichierSource,
  estUnTest,
  fichiersSource,
  IMPORT_NON_CONSTANT,
  lire,
  RACINE,
  specificateursSyntaxiques,
} from '../bio-parcours/balayageSources';

// `web/next.config.mjs` est ÉVALUÉ par le verrou plus bas : l'enveloppe Sentry
// y est remplacée par une capture de ses deux arguments.
vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (configNext: unknown, optionsSentry: unknown) => ({ CAPTURE: true, configNext, optionsSentry }),
}));

// [[D-480]] §8 — LA BIBLIOTHÈQUE N'AUTORISE AUCUNE PRESCRIPTION. Aucun
// parcours, courrier, portail, document remis ni appel à un modèle ne la lit.
// Ce banc lit le SOURCE de tout `web/` (entrées, `web/scripts/` compris) et
// refuse tout importeur de production hors de son dossier.
//
// LES LECTEURS ADMIS s'ajoutent nommément, par la PR qui les apporte : l'atelier
// (PR 5) et le cockpit sous drapeau éteint (PR 6) du découpage de D-480. Un
// parcours, un courrier, le portail ou un appel à un modèle n'y entrent jamais.
//
// LE PARSEUR, PAS LE TEXTE : les spécificateurs sont lus par
// `specificateursSyntaxiques`, décodés — un commentaire entre `import` et la
// chaîne, ou un échappement dans le chemin, ne fait pas sortir un importeur du
// banc (passe Codex sur #2006). L'argument d'un `import()` ou d'un `require()`
// est lu par sa valeur constante ; s'il n'en a pas, le fichier compte comme un
// lecteur possible (contre-passe Codex) — aucun n'existe en production.
const DOSSIER = 'web/src/lib/bibliotheque-options/';
// PR 5 : le module de l'atelier qui rend la structure de références à ses
// routes, à sa lecture et à son écriture — seul importeur, sous drapeau éteint
// (`WN_BIBLIOTHEQUE_OPTIONS_ATELIER`).
const LECTEURS_ADMIS: readonly string[] = ['web/src/lib/atelier-bibliotheque-options/structure.ts'];

// Le motif ignore la casse : un système de fichiers qui l'ignore aussi (macOS)
// résout `./BIBLIOTHEQUE-options/…` (`wn-reviewer` sur #2006).
const importeLaBibliotheque = (specificateur: string) =>
  specificateur === IMPORT_NON_CONSTANT || /(^|\/)bibliotheque-options(\/|$)/i.test(specificateur);

/**
 * LES DÉTOURS PAR LA CONFIGURATION (passe Codex P1-4 sur #2006) : un alias
 * `paths` ou `baseUrl` de `tsconfig`, ou un `#import` de `package.json`, mène
 * au dossier par un spécificateur qui ne le nomme pas (`"@options"`). Chaque
 * spécificateur est donc RÉSOLU comme le fait TypeScript, avec les options de
 * `web/tsconfig.json`, et le fichier atteint est comparé au dossier (casse
 * ignorée). UN LIEN SYMBOLIQUE est suivi : TypeScript garde le chemin du
 * lien pour un import relatif (`./detour/vocabulaire` sous un lien
 * `detour -> bibliotheque-options`), alors que le bundler charge la cible —
 * le fichier atteint est donc CANONICALISÉ (`realpath`) avant la comparaison
 * (contre-passe Codex n° 7 sur #2006, routée vers BP-17 PR 4 par l'arbitrage
 * du 2026-11-13). Next reprend `paths` et `baseUrl` dans webpack ; ses alias
 * propres, que TypeScript ne voit pas, sont verrouillés plus bas.
 */
const WEB = join(RACINE, 'web');

/** Le chemin réel, ou le chemin tel quel s'il n'existe pas sur disque (hôte de résolution en mémoire). */
function cheminReel(chemin: string): string {
  try {
    return realpathSync(chemin);
  } catch {
    return chemin;
  }
}

function optionsDeResolution(): CompilerOptions {
  const fichier = join(WEB, 'tsconfig.json');
  const { config, error } = parseConfigFileTextToJson(fichier, lire('web/tsconfig.json'));
  if (error || !config) throw new Error('web/tsconfig.json illisible');
  // `include` vidé : seules les options comptent, pas l'énumération des fichiers.
  return parseJsonConfigFileContent({ ...config, include: [], files: [] }, sys, WEB, undefined, fichier).options;
}

/**
 * Le fichier qu'atteint un spécificateur, relatif à la racine du dépôt,
 * CANONICALISÉ (liens symboliques suivis, de la racine comme de la cible), ou
 * `null` s'il ne se résout pas.
 */
function fichierAtteint(
  specificateur: string,
  importeur: string,
  options: CompilerOptions,
  hote: ModuleResolutionHost = sys,
  cache?: ModuleResolutionCache,
  racine: string = RACINE,
): string | null {
  if (specificateur === IMPORT_NON_CONSTANT) return null;
  const { resolvedModule } = resolveModuleName(specificateur, join(racine, importeur), options, hote, cache);
  if (!resolvedModule) return null;
  return relative(cheminReel(racine), cheminReel(resolvedModule.resolvedFileName)).split(sep).join('/');
}

function resoutDansLeDossier(
  specificateur: string,
  importeur: string,
  options: CompilerOptions,
  hote: ModuleResolutionHost = sys,
  cache?: ModuleResolutionCache,
  racine: string = RACINE,
): boolean {
  const atteint = fichierAtteint(specificateur, importeur, options, hote, cache, racine);
  return atteint !== null && atteint.toLowerCase().startsWith(DOSSIER.toLowerCase());
}

/**
 * UN FICHIER DE TEST OU IGNORÉ QU'IMPORTE LA PRODUCTION EST DE LA PRODUCTION
 * (`wn-reviewer` sur #2006, routé vers BP-17 PR 4) : le bundler l'embarque, et
 * ce qu'il importe avec. Le balayage part des sources de production et suit
 * chaque import qui se résout sous `web/`, hors de `node_modules` : un test, un
 * fichier ignoré (client Prisma généré compris) ou non suivi atteint ainsi est
 * balayé à son tour, jusqu'au point fixe. Rend les importeurs de la
 * bibliothèque, dans l'ordre de découverte, et les fichiers atteints hors du
 * départ.
 */
function importeursDeLaBibliotheque(
  depart: readonly string[],
  racine: string = RACINE,
): { importeurs: string[]; atteints: string[] } {
  const options = optionsDeResolution();
  // Le cache n'est partagé que sur le dépôt lui-même ; une racine d'essai résout sans cache.
  const cache = racine === RACINE ? createModuleResolutionCache(WEB, x => x, options) : undefined;
  const dependances = dependancesDeclarees();
  const vus = new Set(depart);
  const file = [...depart];
  const importeurs: string[] = [];
  const atteints: string[] = [];
  while (file.length > 0) {
    const chemin = file.shift() as string;
    // Le client Prisma GÉNÉRÉ importe les dépendances de `@prisma/client`
    // (`@prisma/client-runtime-utils`), installées avec lui : la règle des noms
    // nus ne vaut que pour le code écrit au dépôt. Il reste suivi par motif et
    // par résolution.
    const genere = chemin.startsWith('web/src/generated/');
    let lecteur = false;
    for (const s of specificateursSyntaxiques(readFileSync(join(racine, chemin), 'utf8'), chemin)) {
      if (importeLaBibliotheque(s) || (!genere && nomNuInconnu(s, dependances))) {
        lecteur = true;
        continue;
      }
      const atteint = fichierAtteint(s, chemin, options, sys, cache, racine);
      if (atteint === null) continue;
      if (atteint.toLowerCase().startsWith(DOSSIER.toLowerCase())) {
        lecteur = true;
        continue;
      }
      // Partout DANS le dépôt, pas seulement sous `web/` : un relais posé à la
      // racine (`shared/relais.test.ts`) serait embarqué de même (passe Codex
      // sur #2060). Hors du dépôt et dans `node_modules`, rien n'est suivi.
      if (
        !atteint.startsWith('../') &&
        !/(^|\/)node_modules\//.test(atteint) &&
        estFichierSource(atteint) &&
        !vus.has(atteint)
      ) {
        vus.add(atteint);
        atteints.push(atteint);
        file.push(atteint);
      }
    }
    if (lecteur) importeurs.push(chemin);
  }
  return { importeurs, atteints };
}

/**
 * LE VERROU DE NEXT porte sur la configuration ÉVALUÉE, pas sur son texte : une
 * clé calculée (`['res' + 'olveAlias']`) ou un `typescript.tsconfigPath` vers
 * un autre tsconfig échappaient à un motif (contre-passe Codex sur 05c5ea2b).
 * Toute clé hors de ces listes — `webpack`, `turbopack`, `experimental`,
 * `typescript`, `modularizeImports`… — rougit le banc, quelle que soit son
 * écriture ; l'ajout d'une clé légitime s'y inscrit nommément, en revue.
 */
const CLES_NEXT_ADMISES = ['headers', 'reactStrictMode', 'redirects'];
const CLES_SENTRY_ADMISES = ['authToken', 'org', 'project', 'silent', 'sourcemaps', 'telemetry', 'webpack', 'widenClientFileUpload'];

/**
 * UN NOM NU INCONNU EST UN LECTEUR POSSIBLE (contre-passe Codex n° 3 sur
 * db10dd9f) : `NODE_PATH`, que Next ajoute aux `resolve.modules` de webpack,
 * peut venir d'un script ou de l'environnement de déploiement — hors du dépôt,
 * hors de tout verrou de configuration. Un spécificateur nu doit donc nommer
 * une dépendance déclarée de `web/package.json` ou un module natif de Node ;
 * sinon il ferme le verrou, quel que soit l'environnement.
 */
function dependancesDeclarees(): Set<string> {
  const paquet = JSON.parse(lire('web/package.json')) as Record<string, Record<string, string> | undefined>;
  return new Set([...Object.keys(paquet.dependencies ?? {}), ...Object.keys(paquet.devDependencies ?? {})]);
}

function nomNuInconnu(specificateur: string, dependances: ReadonlySet<string>): boolean {
  // Seuls `.`, `..`, `./…` et `../…` sont relatifs : `.detour/x` est un nom nu (contre-passe Codex n° 4).
  if (specificateur === IMPORT_NON_CONSTANT || /^(\.\.?(\/|$)|\/|@\/)/.test(specificateur)) return false;
  if (specificateur.startsWith('node:')) return false;
  // Un module natif ne s'admet qu'en entrée exacte (`fs/promises`, pas `fs/charge`) ; une dépendance, avec ses sous-chemins.
  if (builtinModules.includes(specificateur)) return false;
  const nom = specificateur.startsWith('@') ? specificateur.split('/').slice(0, 2).join('/') : specificateur.split('/')[0];
  return !dependances.has(nom);
}

/**
 * POURQUOI CELA FERME `NODE_PATH`, OÙ QU'IL POINTE (contre-passe Codex n° 5) :
 * au-dessus du dossier, le spécificateur nomme `bibliotheque-options` et le
 * motif le voit ; dans le dossier, son premier segment est un nom du dossier —
 * inconnu, il ferme le verrou ; nom de dépendance ou de module natif, ou
 * portée `@…` d'un nom à portée, il est interdit à TOUTE profondeur du
 * dossier par le banc ci-dessous.
 */
function segmentsDuDossier(fichiers: readonly string[]): string[] {
  return fichiers.flatMap(f =>
    f
      .slice(DOSSIER.length)
      .split('/')
      // Le nom brut et chacun de ses préfixes avant un point (`zod.ts`, `zod.test.ts` → `zod`).
      .flatMap(seg => seg.split('.').map((_, i, parts) => parts.slice(0, i + 1).join('.'))),
  );
}

/** Un fichier qui peut déplacer la résolution d'un module, où qu'il soit sous `web/`. */
const CONFIG_DE_RESOLUTION =
  /(^|\/)(package\.json|[jt]sconfig[^/]*\.json|\.babelrc[^/]*|babel\.config\.[^/]+|\.swcrc|next\.config\.[^/]+)$/i;
const CLES_PACKAGE_ADMISES = ['dependencies', 'devDependencies', 'engines', 'name', 'overrides', 'private', 'scripts', 'version'];
const CLES_TSCONFIG_ADMISES = [
  'allowJs', 'esModuleInterop', 'incremental', 'isolatedModules', 'jsx', 'lib', 'module', 'moduleResolution',
  'noEmit', 'paths', 'plugins', 'resolveJsonModule', 'skipLibCheck', 'strict', 'target',
];
const EMPREINTE_NEXT_CONFIG = 'fc39557e9be8db01158baa1ecd5fe13666746b36e299926ee4f58156bd4c8778';

/** La chaîne de lancement de production, figée (voir le banc « chaîne de lancement »). */
const EMPREINTES_LANCEMENT: Record<string, string> = {
  'web/Procfile': 'a8d5dfe89dbd0f8dd1bbd575852137507bcfbbf7cf048c7c57a36a2e107b89ad',
  'web/cron.json': '28f5dd8a770e1926cc41999094be61e80d5728556da9d7282eee0168c7164e74',
  'web/scripts/build.sh': '3987d84d0e777382128baa5c22043090dad119f9a75272c16617d254b746b493',
  // Lancé par `db:deploy` (postdeploy du Procfile) : un script qu'une valeur
  // figée appelle est figé lui aussi (passe Codex sur #2060).
  'web/scripts/db-deploy.sh': 'de03d4de80c2eabad2dfff601594bea8da4bfc87b23ad4170f61479518ad1423',
  'web/prisma/runWithAlias.js': 'f6e4fa4ffa1ae7c7070fc157aba28661308fd5f7e9969af8d0bb67d4794918fa',
};
const SCRIPTS_LANCEMENT: Record<string, string> = {
  build: 'bash scripts/build.sh',
  // Appelé par `web/scripts/build.sh`.
  'prisma:generate': 'prisma generate',
  'start:scalingo': 'next start -p ${PORT:-3000}',
  'bio:worker-extraction': 'node prisma/runWithAlias.js scripts/bioExtractionWorker.ts',
  'db:deploy': 'bash scripts/db-deploy.sh',
  'bio:purge-echeance': 'node prisma/runWithAlias.js scripts/purgeComptesRendusEcheance.ts',
};
const CYCLE_DE_VIE_NPM = [
  'preinstall', 'install', 'postinstall', 'prepare', 'preprepare', 'postprepare', 'prepublish',
  'prepack', 'postpack', 'dependencies',
];
// Les crochets du buildpack Node (dérivé de Heroku) : `heroku-postbuild`
// REMPLACE `build`, les autres l'encadrent. Refusés par préfixe, avec leurs
// homonymes `scalingo-` (revue wn-reviewer sur #2060).
const CROCHETS_BUILDPACK = /^(heroku|scalingo)-/;
const DEPLACE_LA_RESOLUTION = /\bNODE_PATH\b|\bNODE_OPTIONS\b|--(import|require|loader|experimental-loader|conditions)\b|\s-[rC]\s/;

function ecartsConfigNext(configNext: object, optionsSentry: object): string[] {
  const ecarts: string[] = [];
  for (const cle of Reflect.ownKeys(configNext)) {
    if (!CLES_NEXT_ADMISES.includes(String(cle))) ecarts.push(`next.${String(cle)}`);
  }
  for (const cle of Reflect.ownKeys(optionsSentry)) {
    if (!CLES_SENTRY_ADMISES.includes(String(cle))) ecarts.push(`sentry.${String(cle)}`);
  }
  const webpack = (optionsSentry as { webpack?: unknown }).webpack;
  if (JSON.stringify(webpack) !== JSON.stringify({ treeshake: { removeDebugLogging: true } })) ecarts.push('sentry.webpack');
  return ecarts;
}

/**
 * HORS DE `web/src`, du code tourne aussi : les entrées de `web/`
 * (`instrumentation-client.ts` dans le bundle client, `sentry.*.config.ts`),
 * le worker et le cron de `web/scripts/` (alias `@/`, appel à un modèle)
 * (`wn-reviewer` sur #2006). Ils sont balayés avec `web/src`. L'outillage de
 * `scripts/` et `tools/`, hors de la production, a son propre banc plus bas.
 */
const fichiersHorsSrc = () =>
  execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'web', ':!web/src'],
    { cwd: RACINE, encoding: 'utf8' },
  )
    .split('\n')
    .filter(estFichierSource);

describe('bibliothèque des options — aucun lecteur hors des bancs (D-480 §8)', () => {
  const sources = [...fichiersSource(), ...fichiersHorsSrc()];

  // Un pragma `@jsxImportSource` n'importe que `<dossier>/jsx-runtime` : le
  // dossier n'en porte aucun, ni fichier, ni dossier, ni `package.json` qui y
  // renverrait — TOUS ses fichiers sont listés, pas seulement les sources
  // (contre-passes `wn-reviewer` sur b1524e75 et 7ca05b18).
  it('le dossier ne porte aucun jsx-runtime', () => {
    const tous = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '--', DOSSIER],
      { cwd: RACINE, encoding: 'utf8' },
    ).split('\n').filter(Boolean);
    expect(tous).toContain(`${DOSSIER}vocabulaire.ts`);
    const runtime = /(^|\/)jsx-(dev-)?runtime(\.|\/|$)/i;
    expect(tous.filter(f => runtime.test(f.slice(DOSSIER.length)))).toEqual([]);
    for (const f of ['jsx-runtime.ts', 'jsx-runtime/index.ts', 'jsx-runtime/package.json', 'JSX-Dev-Runtime/index.tsx']) {
      expect(runtime.test(f), f).toBe(true);
    }
  });

  it('le balayage voit le module lui-même et les entrées hors de web/src (anti-vacuité)', () => {
    expect(sources).toContain(`${DOSSIER}bibliothequeBesoin2V1.ts`);
    expect(sources).toContain(`${DOSSIER}vocabulaire.ts`);
    expect(sources).toContain('web/instrumentation-client.ts');
    expect(sources).toContain('web/sentry.server.config.ts');
    expect(sources).toContain('web/scripts/bioExtractionWorker.ts');
  });

  // CONTRE-ÉPREUVE du balayage : un `.js`/`.jsx` de production en est
  // (`allowJs`) ; le retirer du filtre ferait rougir ce banc.
  it('le balayage admet .ts, .tsx, .js, .jsx, .mjs, .cjs, .mts et .cts, et rien d’autre', () => {
    for (const f of ['a.ts', 'a.tsx', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs', 'a.mts', 'a.cts']) {
      expect(estFichierSource(`web/src/${f}`), f).toBe(true);
    }
    for (const f of ['a.json', 'a.css', 'a.md', 'a.d.ts.map', 'a.mjsx', 'a.ctsx']) {
      expect(estFichierSource(`web/src/${f}`), f).toBe(false);
    }
    expect(estUnTest('web/src/a.test.mjs')).toBe(true);
  });

  it('aucun code de production hors du dossier n’importe la bibliothèque', () => {
    const { importeurs, atteints } = importeursDeLaBibliotheque(
      sources.filter(chemin => !estUnTest(chemin) && !chemin.startsWith(DOSSIER)),
    );
    expect(importeurs).toEqual([...LECTEURS_ADMIS]);
    // Anti-vacuité du suivi : le client Prisma généré, ignoré, est atteint par
    // la production et balayé à son tour.
    expect(atteints.some(f => f.startsWith('web/src/generated/prisma/'))).toBe(true);
    // Le parseur et le résolveur lisent tout `web/` : délai élargi.
  }, 120_000);

  // CONTRE-ÉPREUVE : un fichier de test qu'importe la production est atteint,
  // et l'import de la bibliothèque qu'il porte est vu.
  it('un fichier de test ou ignoré qu’importe la production est balayé (wn-reviewer sur #2006)', () => {
    const racine = mkdtempSync(join(tmpdir(), 'wn-bp17-atteint-'));
    try {
      const options = optionsDeResolution();
      const ecrire = (relatif: string, texte: string) => {
        mkdirSync(join(racine, relatif, '..'), { recursive: true });
        writeFileSync(join(racine, relatif), texte);
      };
      ecrire(`${DOSSIER}vocabulaire.ts`, 'export const X = 1;\n');
      ecrire('web/src/lib/relais.test.ts', "export { X } from './bibliotheque-options/vocabulaire';\n");
      ecrire('web/src/app/page.tsx', "import { X } from '../lib/relais.test';\nexport default X;\n");
      const atteint = fichierAtteint('../lib/relais.test', 'web/src/app/page.tsx', options, sys, undefined, racine);
      expect(atteint).toBe('web/src/lib/relais.test.ts');
      expect(estUnTest(atteint as string)).toBe(true);
      // Le parcours complet : le relais est atteint, balayé, et nommé.
      expect(importeursDeLaBibliotheque(['web/src/app/page.tsx'], racine)).toEqual({
        importeurs: ['web/src/lib/relais.test.ts'],
        atteints: ['web/src/lib/relais.test.ts'],
      });
      // Un relais HORS de `web/`, à la racine du dépôt (passe Codex sur #2060).
      ecrire('shared/relais.test.ts', "export { X } from '../web/src/lib/bibliotheque-options/vocabulaire';\n");
      ecrire('web/src/app/autre.tsx', "import { X } from '../../../shared/relais.test';\nexport default X;\n");
      expect(importeursDeLaBibliotheque(['web/src/app/autre.tsx'], racine)).toEqual({
        importeurs: ['shared/relais.test.ts'],
        atteints: ['shared/relais.test.ts'],
      });
    } finally {
      rmSync(racine, { recursive: true, force: true });
    }
  });

  // CONTRE-ÉPREUVE SUR UN VRAI LIEN (contre-passe Codex n° 7 sur #2006) : un
  // lien `detour -> bibliotheque-options` hors du dossier, atteint par un
  // import relatif. TypeScript rend le chemin du lien ; le chemin réel est
  // dans le dossier, et le banc le voit.
  it('un lien symbolique hors du dossier vers lui est vu (contre-passe Codex n° 7)', () => {
    const racine = mkdtempSync(join(tmpdir(), 'wn-bp17-lien-'));
    try {
      const options = optionsDeResolution();
      mkdirSync(join(racine, DOSSIER), { recursive: true });
      mkdirSync(join(racine, 'web/src/app'), { recursive: true });
      writeFileSync(join(racine, DOSSIER, 'vocabulaire.ts'), 'export const X = 1;\n');
      symlinkSync(join(racine, DOSSIER), join(racine, 'web/src/lib/detour'), 'dir');
      const brut = resolveModuleName('../lib/detour/vocabulaire', join(racine, 'web/src/app/page.tsx'), options, sys);
      // Le constat de la contre-passe : TypeScript garde le chemin du lien.
      expect(brut.resolvedModule?.resolvedFileName).toContain('/web/src/lib/detour/vocabulaire.ts');
      expect(resoutDansLeDossier('../lib/detour/vocabulaire', 'web/src/app/page.tsx', options, sys, undefined, racine)).toBe(true);
      // Un lien de fichier, aussi.
      symlinkSync(join(racine, DOSSIER, 'vocabulaire.ts'), join(racine, 'web/src/lib/raccourci.ts'), 'file');
      expect(resoutDansLeDossier('../lib/raccourci', 'web/src/app/page.tsx', options, sys, undefined, racine)).toBe(true);
      expect(resoutDansLeDossier('../lib/autre', 'web/src/app/page.tsx', options, sys, undefined, racine)).toBe(false);
    } finally {
      rmSync(racine, { recursive: true, force: true });
    }
  });

  // CONTRE-ÉPREUVE P1-4 : le cas reproduit par la passe Codex, en mémoire, sans
  // toucher aucun fichier — l'alias échappe au motif, pas à la résolution.
  it('un alias de configuration qui mène au dossier est vu (passe Codex P1-4)', () => {
    const base = optionsDeResolution();
    expect(base.paths).toEqual({ '@/*': ['./src/*'] });
    const importeur = 'web/src/app/page.tsx';
    // La configuration réelle : l'alias `@/` est résolu, un autre module ne l'est pas vers le dossier.
    expect(resoutDansLeDossier('@/lib/bibliotheque-options/vocabulaire', importeur, base)).toBe(true);
    expect(resoutDansLeDossier('@/lib/bio-parcours/balayageSources', importeur, base)).toBe(false);
    expect(resoutDansLeDossier('../lib/bibliotheque-options/vocabulaire', importeur, base)).toBe(true);
    expect(resoutDansLeDossier('typescript', importeur, base)).toBe(false);

    // `paths` : la reproduction de la passe.
    const avecAlias: CompilerOptions = {
      ...base,
      paths: { ...base.paths, '@options': ['./src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts'] },
    };
    const specs = specificateursSyntaxiques('import { BIBLIOTHEQUE_BESOIN2_V1 } from "@options";', 'x.ts');
    expect(specs).toEqual(['@options']);
    expect(specs.some(importeLaBibliotheque)).toBe(false);
    expect(resoutDansLeDossier('@options', importeur, avecAlias)).toBe(true);
    expect(resoutDansLeDossier('@options', importeur, base)).toBe(false);

    // `paths` à joker, et `baseUrl`.
    const joker: CompilerOptions = { ...base, paths: { ...base.paths, 'opt/*': ['./src/lib/bibliotheque-options/*'] } };
    expect(resoutDansLeDossier('opt/vocabulaire', importeur, joker)).toBe(true);
    expect(resoutDansLeDossier('lib/bibliotheque-options/vocabulaire', importeur, { ...base, baseUrl: join(WEB, 'src') })).toBe(true);

    // `imports` de `package.json` (`#options`), par un hôte qui ne réécrit rien sur disque.
    const paquet = join(WEB, 'package.json');
    const hote: ModuleResolutionHost = {
      ...sys,
      fileExists: f => sys.fileExists(f),
      readFile: f => {
        const texte = sys.readFile(f);
        if (f !== paquet || texte === undefined) return texte;
        return JSON.stringify({ ...JSON.parse(texte), imports: { '#options': './src/lib/bibliotheque-options/vocabulaire.ts' } });
      },
    };
    expect(resoutDansLeDossier('#options', importeur, base, hote)).toBe(true);
    expect(resoutDansLeDossier('#options', importeur, base)).toBe(false);
  });

  // L'OUTILLAGE DE `scripts/` ET `tools/` ne tourne pas en production, mais il
  // peut appeler un modèle ou produire un document : il ne lit pas davantage la
  // bibliothèque (routé de #2006 vers BP-17 PR 4). Il charge souvent par des
  // chemins CALCULÉS (`import(cheminDuBanc)`) : 34 fichiers rendaient la
  // sentinelle d'import non constant à la PR 3. Ce banc juge donc ses
  // spécificateurs CONSTANTS, par motif et par résolution ; un chargement
  // calculé n'y est pas vu — limite déclarée, hors de la production.
  it('l’outillage de scripts/ et tools/ ne lit pas la bibliothèque (spécificateurs constants)', () => {
    const outillage = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'scripts', 'tools'],
      { cwd: RACINE, encoding: 'utf8' },
    )
      .split('\n')
      .filter(estFichierSource);
    // Anti-vacuité : le balayage voit l'outillage.
    expect(outillage).toContain('scripts/wn-matrice-consommation.mjs');
    expect(outillage.length).toBeGreaterThan(100);
    const options = optionsDeResolution();
    const cache = createModuleResolutionCache(WEB, x => x, options);
    const lecteurs = outillage.filter(chemin =>
      specificateursSyntaxiques(lire(chemin), chemin).some(
        s => s !== IMPORT_NON_CONSTANT && (importeLaBibliotheque(s) || resoutDansLeDossier(s, chemin, options, sys, cache)),
      ),
    );
    expect(lecteurs).toEqual([]);
  }, 60_000);

  // LA CHAÎNE DE LANCEMENT DE PRODUCTION EST FIGÉE (routé de #2006 vers BP-17
  // PR 4 : la clé `scripts` de `web/package.json` était admise sans que son
  // contenu soit lu). Ce qui démarre le code en production peut déplacer une
  // résolution — `NODE_PATH`, un chargeur `--import`/`--require`, l'alias du
  // chargeur `jiti` du worker et du cron, un script `pre…`/`post…` qu'npm
  // enchaîne seul. Sont donc figés : le Procfile, la tâche planifiée, le
  // script de build et le chargeur `runWithAlias.js` (empreintes), la valeur
  // exacte de chaque script que la chaîne appelle, l'absence de tout script
  // d'installation ou de cycle de vie autour d'eux, de tout crochet du
  // buildpack (`heroku-*`, `scalingo-*`) et de `web/.npmrc`. AVANT d'ajuster une
  // empreinte : vérifier que le changement ne pose ni alias, ni `NODE_PATH`, ni
  // chargeur, ni configuration de résolution. Aucun script, enfin, ne nomme
  // `NODE_PATH`, `NODE_OPTIONS` ni un drapeau de chargeur. LIMITE : une
  // variable posée dans l'environnement de déploiement, hors du dépôt, n'est
  // vue que par la règle des noms nus (`NODE_PATH`).
  it('la chaîne de lancement de production est figée (scripts de web/package.json)', () => {
    const empreinte = (f: string) => createHash('sha256').update(lire(f)).digest('hex');
    expect(Object.fromEntries(Object.keys(EMPREINTES_LANCEMENT).map(f => [f, empreinte(f)]))).toEqual(EMPREINTES_LANCEMENT);

    // Les scripts que la chaîne appelle : `npm run X` du Procfile, de la tâche
    // planifiée et de tout fichier figé (le build appelle `prisma:generate`), plus `build`.
    const textesFiges = Object.keys(EMPREINTES_LANCEMENT).map(lire).join('\n');
    const appeles = [...textesFiges.matchAll(/npm run ([\w:.-]+)/g)].map(m => m[1]);
    expect([...new Set(['build', ...appeles])].sort()).toEqual(Object.keys(SCRIPTS_LANCEMENT).sort());
    const scripts = (JSON.parse(lire('web/package.json')) as { scripts: Record<string, string> }).scripts;
    for (const [nom, valeur] of Object.entries(SCRIPTS_LANCEMENT)) expect(scripts[nom], nom).toBe(valeur);
    // Tout script shell ou chargeur JavaScript qu'une valeur figée lance est
    // figé lui aussi (`bash x.sh`, `node x.js`) ; une source TypeScript lancée
    // (le worker) est balayée par le banc des importeurs.
    const lances = Object.values(SCRIPTS_LANCEMENT).flatMap(v =>
      [...v.matchAll(/\b(?:bash|sh|node)\s+(\S+\.(?:sh|[cm]?js))\b/g)].map(m => `web/${m[1]}`),
    );
    expect(lances.length).toBeGreaterThan(0);
    for (const f of lances) expect(Object.keys(EMPREINTES_LANCEMENT), f).toContain(f);

    // Aucun script de cycle de vie autour d'eux, ni d'installation (npm ci les enchaîne au build).
    const cycle = Object.keys(scripts).filter(
      nom =>
        CYCLE_DE_VIE_NPM.includes(nom) ||
        CROCHETS_BUILDPACK.test(nom) ||
        Object.keys(SCRIPTS_LANCEMENT).some(x => nom === `pre${x}` || nom === `post${x}`),
    );
    expect(cycle).toEqual([]);
    for (const nom of ['heroku-prebuild', 'heroku-postbuild', 'heroku-cleanup', 'scalingo-postbuild']) {
      expect(CROCHETS_BUILDPACK.test(nom), nom).toBe(true);
    }
    // Aucune configuration npm de projet : un `node-options=--require …` d'un
    // `.npmrc` s'appliquerait à chaque `npm run` sans passer par les scripts.
    // LIMITE : une configuration npm de l'utilisateur ou globale, hors du dépôt.
    expect(existsSync(join(RACINE, 'web/.npmrc'))).toBe(false);

    // Aucun script ne déplace la résolution de Node.
    expect(Object.entries(scripts).filter(([, v]) => DEPLACE_LA_RESOLUTION.test(v)).map(([nom]) => nom)).toEqual([]);
    // CONTRE-ÉPREUVE du motif.
    for (const v of ['NODE_PATH=src next build', 'NODE_OPTIONS=--x next start', 'node --import ./x.mjs y', 'node -r ./x y', 'node --require=./x y', 'node --loader ./x y', 'node --experimental-loader=./x y', 'node --conditions=dev y', 'node -C dev y']) {
      expect(DEPLACE_LA_RESOLUTION.test(v), v).toBe(true);
    }
    for (const v of ['next build', 'bash scripts/build.sh', 'node prisma/runWithAlias.js scripts/x.ts', 'vitest run --reporter=dot', 'node --test x.test.mjs']) {
      expect(DEPLACE_LA_RESOLUTION.test(v), v).toBe(false);
    }
  });

  // CONTRE-ÉPREUVE n° 3 : un nom nu qui n'est ni une dépendance ni un module
  // natif ferme le verrou ; et le dossier ne porte aucune entrée au nom d'une
  // dépendance (un `NODE_PATH` vers lui servirait `zod/…` après node_modules).
  it('un nom nu inconnu est un lecteur possible (contre-passe Codex n° 3, NODE_PATH)', () => {
    const dependances = dependancesDeclarees();
    for (const s of ['vocabulaire', 'bibliothequeBesoin2V1', 'options/vocabulaire', '@inconnu/paquet', '@inconnu', '.detour/vocabulaire', '..detour/x', '.x', 'fs/charge', 'path/detour']) {
      expect(nomNuInconnu(s, dependances), s).toBe(true);
    }
    for (const s of ['react', 'next/server', '@sentry/nextjs', 'node:fs', 'fs/promises', 'path', 'path/posix', '@/lib/x', './x', '../x', '.', '..', IMPORT_NON_CONSTANT]) {
      expect(nomNuInconnu(s, dependances), s).toBe(false);
    }
    const fichiers = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', DOSSIER], {
      cwd: RACINE,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
    expect(fichiers.length).toBeGreaterThan(0);
    // Un segment `@…` est le premier segment d'un nom à portée (`@detour/paquet`) : interdit tel quel (contre-passe Codex n° 6).
    // Casse ignorée : un build sur système insensible à la casse servirait `react/…` depuis `React/` (`wn-reviewer`).
    const interdit = (n: string) => {
      const bas = n.toLowerCase();
      return bas !== '' && (bas.startsWith('@') || dependances.has(bas) || builtinModules.includes(bas));
    };
    expect(segmentsDuDossier(fichiers).filter(interdit)).toEqual([]);
    // CONTRE-ÉPREUVE : à toute profondeur, fichier ou dossier, avec ou sans extension.
    for (const f of ['detour/fs/charge.ts', 'a/b/react/x.ts', 'a/path.ts', 'a/react.test.ts', '.detour/next/x.ts', 'detour/@detour/paquet/charge.ts', '@x.ts', 'a/React/x.ts', 'FS.ts']) {
      expect(segmentsDuDossier([`${DOSSIER}${f}`]).some(interdit), f).toBe(true);
    }
    expect(segmentsDuDossier([`${DOSSIER}detour/charge.ts`]).some(interdit)).toBe(false);
  });

  // LES CONFIGURATIONS DE RÉSOLUTION SONT VERROUILLÉES (contre-passe Codex n° 2
  // sur c12bd412) : interpréter chaque détour en appelle un autre — condition
  // `types` d'un `#import` que TypeScript et le bundler résolvent
  // différemment, alias webpack posé sous `NODE_ENV === 'production'` seul.
  // Le banc fige donc ce qui peut déplacer une résolution ; tout changement le
  // rougit, et se relit avant que l'empreinte ou la liste ne s'ajustent.
  it('les configurations de résolution sont celles admises (verrou, passe Codex P1-4)', () => {
    // Aucun babel (plugin module-resolver), swc, jsconfig, second tsconfig ni package.json imbriqué.
    const configs = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'web'], {
      cwd: RACINE,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(f => CONFIG_DE_RESOLUTION.test(f))
      .sort();
    expect(configs).toEqual(['web/next.config.mjs', 'web/package.json', 'web/tsconfig.json']);
    for (const f of ['web/.babelrc', 'web/src/babel.config.cjs', 'web/.swcrc', 'web/jsconfig.json', 'web/tsconfig.options.json', 'web/src/x/package.json']) {
      expect(CONFIG_DE_RESOLUTION.test(f), f).toBe(true);
    }

    // `package.json` : ni `imports`, ni `exports`, ni `browser` — aucune clé hors de la liste.
    const paquet = JSON.parse(lire('web/package.json')) as object;
    expect(Object.keys(paquet).sort()).toEqual(CLES_PACKAGE_ADMISES);

    // `tsconfig.json` : ni `extends`, ni `baseUrl`, `rootDirs`, `customConditions`… ; `paths` figé.
    const { config } = parseConfigFileTextToJson('tsconfig.json', lire('web/tsconfig.json')) as {
      config: { compilerOptions: Record<string, unknown> };
    };
    expect(Object.keys(config).sort()).toEqual(['compilerOptions', 'exclude', 'include']);
    expect(Object.keys(config.compilerOptions).sort()).toEqual(CLES_TSCONFIG_ADMISES);
    expect(config.compilerOptions.paths).toEqual({ '@/*': ['./src/*'] });
    expect(config.compilerOptions.moduleResolution).toBe('bundler');

    // `next.config.mjs` : empreinte du fichier entier. Une branche conditionnelle
    // (`NODE_ENV`, variable d'environnement) n'est vue par aucune évaluation.
    // AVANT d'ajuster l'empreinte : vérifier que le changement n'ajoute aucun
    // alias, aucun `webpack`, `turbopack`, `typescript.tsconfigPath`,
    // `experimental`, `modularizeImports` ni rien qui déplace une résolution.
    const empreinte = createHash('sha256').update(lire('web/next.config.mjs')).digest('hex');
    expect(empreinte).toBe(EMPREINTE_NEXT_CONFIG);
  });

  // VERROU : un alias propre à Next (`webpack`, `turbopack.resolveAlias`) ou un
  // autre tsconfig (`typescript.tsconfigPath`) n'est pas vu par le résolveur
  // ci-dessus ; la configuration évaluée de Next n'en porte donc aucun.
  it('next.config, évalué, ne porte que des clés admises (verrou, passe Codex P1-4)', async () => {
    const evalue = (await import(pathToFileURL(join(WEB, 'next.config.mjs')).href)) as {
      default: { CAPTURE?: boolean; configNext: object; optionsSentry: object };
    };
    // L'export est l'enveloppe Sentry de l'objet de configuration — ni fonction de phase, ni autre forme.
    expect(evalue.default.CAPTURE).toBe(true);
    expect(Object.keys(evalue).sort()).toEqual(['default']);
    expect(ecartsConfigNext(evalue.default.configNext, evalue.default.optionsSentry)).toEqual([]);

    // CONTRE-ÉPREUVE : les détours relevés, en objets évalués.
    const sentry = { webpack: { treeshake: { removeDebugLogging: true } } };
    const mutations: [object, object, string][] = [
      [{ turbopack: { ['res' + 'olveAl' + 'ias']: { '@options': './x' } } }, sentry, 'next.turbopack'],
      [{ typescript: { tsconfigPath: 'tsconfig.options.json' } }, sentry, 'next.typescript'],
      [{ webpack: (c: unknown) => c }, sentry, 'next.webpack'],
      [{ experimental: { turbo: { resolveAlias: {} } } }, sentry, 'next.experimental'],
      [{ modularizeImports: {} }, sentry, 'next.modularizeImports'],
      [{ [Symbol('cle')]: 1 }, sentry, 'next.Symbol(cle)'],
      [{}, { webpack: { treeshake: { removeDebugLogging: true }, resolve: {} } }, 'sentry.webpack'],
      [{}, { ...sentry, aliasDeBuild: {} }, 'sentry.aliasDeBuild'],
    ];
    for (const [next, options, attendu] of mutations) expect(ecartsConfigNext(next, options), attendu).toContain(attendu);
    expect(ecartsConfigNext({ headers: 1, reactStrictMode: 1, redirects: 1 }, sentry)).toEqual([]);
  });

  // CONTRE-ÉPREUVE : la mutation attendue — un import, par alias ou relatif,
  // statique, dynamique ou CommonJS, masqué par un commentaire ou un
  // échappement — est vue ; une prose qui cite le dossier ne l'est pas.
  it('le détecteur voit chaque forme d’import et ignore une citation', () => {
    const formes = [
      "import { BIBLIOTHEQUE_BESOIN2_V1 } from '@/lib/bibliotheque-options/bibliothequeBesoin2V1';",
      "export { RUBRIQUES_OPTION } from '../bibliotheque-options/vocabulaire';",
      "const v = await import('@/lib/bibliotheque-options/vocabulaire');",
      "const b = require('./bibliotheque-options/bibliothequeBesoin2V1');",
      'const g = await import(`@/lib/bibliotheque-options/vocabulaire`);',
      'import/**/"@/lib/bibliotheque-options/vocabulaire";',
      'import { BIBLIOTHEQUE_BESOIN2_V1 }\n  from "@/lib/\\u0062ibliotheque-options/bibliothequeBesoin2V1";',
      "import r = require('@/lib/bibliotheque-options/vocabulaire');",
      "type T = typeof import('@/lib/bibliotheque-options/vocabulaire');",
      // Arguments constants sans être des littéraux (contre-passe Codex).
      'const p = import(("@/lib/bibliotheque-options/vocabulaire"));',
      'const c = import("@/lib/" + "bibliotheque-options/vocabulaire");',
      'const t = require(`@/lib/${"bibliotheque-options"}/vocabulaire`);',
      'const a = import("@/lib/bibliotheque-options/vocabulaire" as string);',
      // Arguments non constants : lecteurs possibles, le verrou se ferme.
      'const n = import(`@/lib/bibliotheque-options/${nom}`);',
      'const m = require(chemin);',
      // Appelé déballé, et toute autre mention de `require` ou `import.meta` (contre-passe Codex sur 302b80d8).
      'const d = (0, require)("./bibliotheque-options/vocabulaire");',
      'const e = (require as (s: string) => unknown)("./bibliotheque-options/vocabulaire");',
      'const f = module.require("./bibliotheque-options/vocabulaire");',
      'const r = require; r("./bibliotheque-options/vocabulaire");',
      'const k = require.context("../bibliotheque-options");',
      'const w = new Worker(new URL("../bibliotheque-options/vocabulaire", import.meta.url));',
      'const q = import.meta.webpackContext("../bibliotheque-options");',
      // Accès calculé, constructeur et base déballés (contre-passe Codex sur c847d0f5).
      'const s = module[`req` + "uire"]("./bibliotheque-options/vocabulaire");',
      'const v = new Worker(new (URL as typeof URL)("./bibliotheque-options/vocabulaire", (0, import.meta.url)));',
      'const h = new globalThis.URL("./bibliotheque-options/vocabulaire", import.meta.url);',
      'const i = import.meta.url;',
      // AMD, pragma JSX, casse (`wn-reviewer` sur bab68ad7).
      'define(["./bibliotheque-options/vocabulaire"], () => 0);',
      'define("m", ["./bibliotheque-options/vocabulaire"], function () { return 1; });',
      'define(dependances, function () {});',
      'const amd = define;',
      '/** @jsxImportSource @/lib/bibliotheque-options */\nexport const C = () => <div />;',
      "import { X } from './BIBLIOTHEQUE-options/vocabulaire';",
      // Fabrique AMD à paramètres, pragma collé à `*/` (contre-passe sur b1524e75).
      'define(function (r) { return r("./bibliotheque-options/vocabulaire"); });',
      'define(["require"], function (r) { return r("./bibliotheque-options/vocabulaire"); });',
      '/*@jsxImportSource @/lib/bibliotheque-options*/\nexport const D = () => <div />;',
      // Remplacement à chaud de webpack (routé de #2006 vers BP-17 PR 4).
      'module.hot.accept("./bibliotheque-options/vocabulaire", () => {});',
      'module.hot.decline(["./bibliotheque-options/vocabulaire"]);',
      'const hmr = module.hot; hmr.accept("./bibliotheque-options/vocabulaire");',
    ];
    for (const forme of formes) {
      expect(specificateursSyntaxiques(forme, 'x.ts').filter(importeLaBibliotheque), forme).toHaveLength(1);
    }
    for (const chemin of ['x.js', 'x.jsx', 'x.mjs', 'x.cjs', 'x.mts', 'x.cts']) {
      const source = "const b = require('./bibliotheque-options/vocabulaire');";
      expect(specificateursSyntaxiques(source, chemin).filter(importeLaBibliotheque)).toHaveLength(1);
    }
    const prose = [
      '// voir web/src/lib/bibliotheque-options/',
      "/* import '@/lib/bibliotheque-options/vocabulaire' */",
      "const texte = 'import from @/lib/bibliotheque-options/vocabulaire';",
    ].join('\n');
    expect(specificateursSyntaxiques(prose, 'x.ts').filter(importeLaBibliotheque)).toEqual([]);
    // Un `require` entre parenthèses : chemin exact, ou sentinelle s'il n'est pas constant.
    expect(specificateursSyntaxiques('(require)("./bibliotheque-options/vocabulaire");', 'x.js')).toEqual([
      './bibliotheque-options/vocabulaire',
    ]);
    expect(specificateursSyntaxiques('(require)(chemin);', 'x.js')).toEqual([IMPORT_NON_CONSTANT]);
    // Accès calculé à `require` et `new URL` déballé : chemin exact, ou sentinelle.
    const exacts: [string, string[]][] = [
      ['module["require"]("./bibliotheque-options/vocabulaire");', ['./bibliotheque-options/vocabulaire']],
      ['module["require"](chemin);', [IMPORT_NON_CONSTANT]],
      ['new Worker(new URL("./bibliotheque-options/vocabulaire", (import.meta.url)));', ['./bibliotheque-options/vocabulaire']],
      ['new Worker(new (URL)("./bibliotheque-options/vocabulaire", import.meta.url));', ['./bibliotheque-options/vocabulaire']],
      ['new Worker(new URL(chemin, import.meta.url));', [IMPORT_NON_CONSTANT]],
      ['define(["./bibliotheque-options/vocabulaire"], () => 0);', ['./bibliotheque-options/vocabulaire']],
      ['define(["./bibliotheque-options/vocabulaire"], v => v);', ['./bibliotheque-options/vocabulaire', IMPORT_NON_CONSTANT]],
      ['define("m", ["./a", "./b"], function () {});', ['./a', './b']],
      ['define({ a: 1 });', []],
      ['const o = { define: 1 }; o.define;', []],
      // Toute mention du pragma ferme le verrou, quel que soit le séparateur.
      ['/** @jsxImportSource @/lib/bibliotheque-options */', [IMPORT_NON_CONSTANT]],
      ['/*@jsxImportSource @/lib/bibliotheque-options*/', [IMPORT_NON_CONSTANT]],
      ['/* @jsxImportSource\u0085@/lib/bibliotheque-options */', [IMPORT_NON_CONSTANT]],
      ['/* @jsxImportSource react */', [IMPORT_NON_CONSTANT]],
      ['define(["exports", "require"], (e, r) => r("./x"));', ['exports', 'require', IMPORT_NON_CONSTANT]],
      ['define(function () { return 1; });', []],
      // `module.hot` (routé de #2006 vers BP-17 PR 4) : chemins exacts, auto-acceptation, ou sentinelle.
      ['module.hot.accept("./bibliotheque-options/vocabulaire", () => {});', ['./bibliotheque-options/vocabulaire']],
      ['module.hot.accept(["./a", "./b"], () => {});', ['./a', './b']],
      ['module["hot"].decline("./a");', ['./a']],
      ['(module.hot as any).accept(("./a"));', ['./a']],
      ['module.hot.accept();', []],
      ['module.hot.accept(() => {});', []],
      ['module.hot.accept(chemin);', [IMPORT_NON_CONSTANT]],
      ['module.hot.dispose(() => {});', [IMPORT_NON_CONSTANT]],
      ['const h = module.hot; h.accept("./a");', [IMPORT_NON_CONSTANT]],
      ['if (module.hot) {}', [IMPORT_NON_CONSTANT]],
      ['const o = { hot: 1 }; o.hot; module.exports = 1;', []],
    ];
    for (const [forme, attendu] of exacts) expect(specificateursSyntaxiques(forme, 'x.js'), forme).toEqual(attendu);
    // Un import constant d'un autre module n'est ni la bibliothèque ni un lecteur possible.
    expect(specificateursSyntaxiques('const z = import("@/lib/" + "autre/module");', 'x.ts')).toEqual(['@/lib/autre/module']);
    // La seule forme de production qui touche `import.meta` : lue par son chemin, sans sentinelle.
    expect(
      specificateursSyntaxiques("new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();", 'x.tsx'),
    ).toEqual(['pdfjs-dist/build/pdf.worker.min.mjs']);
  });
});
