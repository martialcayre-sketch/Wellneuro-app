import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
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
const LECTEURS_ADMIS: readonly string[] = [];

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
 * ignorée). UN LIEN SYMBOLIQUE n'est PAS suivi pour un import relatif :
 * TypeScript garde le chemin du lien (constaté) — détour routé vers la PR 4
 * (contre-passe Codex n° 7, arbitrage du 2026-11-13). Next reprend `paths` et `baseUrl` dans
 * webpack ; ses alias propres, que TypeScript ne voit pas, sont verrouillés
 * plus bas.
 */
const WEB = join(RACINE, 'web');

function optionsDeResolution(): CompilerOptions {
  const fichier = join(WEB, 'tsconfig.json');
  const { config, error } = parseConfigFileTextToJson(fichier, lire('web/tsconfig.json'));
  if (error || !config) throw new Error('web/tsconfig.json illisible');
  // `include` vidé : seules les options comptent, pas l'énumération des fichiers.
  return parseJsonConfigFileContent({ ...config, include: [], files: [] }, sys, WEB, undefined, fichier).options;
}

function resoutDansLeDossier(
  specificateur: string,
  importeur: string,
  options: CompilerOptions,
  hote: ModuleResolutionHost = sys,
  cache?: ModuleResolutionCache,
): boolean {
  if (specificateur === IMPORT_NON_CONSTANT) return false;
  const { resolvedModule } = resolveModuleName(specificateur, join(RACINE, importeur), options, hote, cache);
  if (!resolvedModule) return false;
  const atteint = relative(RACINE, resolvedModule.resolvedFileName).split(sep).join('/');
  return atteint.toLowerCase().startsWith(DOSSIER.toLowerCase());
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
 * `scripts/` et `tools/`, hors de la production, charge par des chemins
 * calculés : il relève du banc de consommation de la PR 4.
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
    const options = optionsDeResolution();
    const cache = createModuleResolutionCache(WEB, x => x, options);
    const dependances = dependancesDeclarees();
    const importeurs = sources
      .filter(chemin => !estUnTest(chemin) && !chemin.startsWith(DOSSIER))
      .filter(chemin =>
        specificateursSyntaxiques(lire(chemin), chemin).some(
          s =>
            importeLaBibliotheque(s) ||
            nomNuInconnu(s, dependances) ||
            resoutDansLeDossier(s, chemin, options, sys, cache),
        ),
      );
    expect(importeurs).toEqual([...LECTEURS_ADMIS]);
    // Le parseur et le résolveur lisent tout `web/` : délai élargi.
  }, 60_000);

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

  // VERROU : un alias propre à Next (`webpack`, `turbopack.resolveAlias`) ou un
  // autre tsconfig (`typescript.tsconfigPath`) n'est pas vu par le résolveur
  // ci-dessus ; la configuration évaluée de Next n'en porte donc aucun.
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
    const interdit = (n: string) => n !== '' && (n.startsWith('@') || dependances.has(n) || builtinModules.includes(n));
    expect(segmentsDuDossier(fichiers).filter(interdit)).toEqual([]);
    // CONTRE-ÉPREUVE : à toute profondeur, fichier ou dossier, avec ou sans extension.
    for (const f of ['detour/fs/charge.ts', 'a/b/react/x.ts', 'a/path.ts', 'a/react.test.ts', '.detour/next/x.ts', 'detour/@detour/paquet/charge.ts', '@x.ts']) {
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
