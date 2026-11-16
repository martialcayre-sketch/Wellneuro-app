import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { PluginLicencesTierces } from '../../../scripts/licences-tierces.mjs';
import { lire, RACINE } from './balayageSources';
import { WEB } from './resolutionImports';

const { parseConfigFileTextToJson } = ts;

// `web/next.config.mjs` est ÉVALUÉ par le verrou plus bas : l'enveloppe Sentry
// y est remplacée par une capture de ses deux arguments.
vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (configNext: unknown, optionsSentry: unknown) => ({ CAPTURE: true, configNext, optionsSentry }),
}));

// LES VERROUS DE CONFIGURATION DE LA RÉSOLUTION — communs à tous les bancs de
// garde qui résolvent leurs imports par `resolutionImports` (la bibliothèque
// des options, [[D-480]] §8, d'où ils viennent, et ceux du lot
// `bp17-extension-bancs-garde`). Une résolution par TypeScript n'est fidèle
// au bundler que si rien ne la déplace : ni alias propre à Next, ni second
// tsconfig, ni babel, ni `#imports`, ni chargeur au lancement. Ce banc fige
// ce qui le pourrait ; tout changement le rougit, et se relit avant que
// l'empreinte ou la liste ne s'ajustent. Déplacés tels quels du banc de la
// bibliothèque, où chaque verrou a été posé par une contre-passe.

/**
 * LE VERROU DE NEXT porte sur la configuration ÉVALUÉE, pas sur son texte : une
 * clé calculée (`['res' + 'olveAlias']`) ou un `typescript.tsconfigPath` vers
 * un autre tsconfig échappaient à un motif (contre-passe Codex sur 05c5ea2b).
 * Toute clé hors de ces listes — `turbopack`, `experimental`, `typescript`,
 * `modularizeImports`… — rougit le banc, quelle que soit son écriture ;
 * l'ajout d'une clé légitime s'y inscrit nommément, en revue. `webpack` y est
 * inscrite sous le contrat ci-dessous.
 */
const CLES_NEXT_ADMISES = ['headers', 'reactStrictMode', 'redirects', 'webpack'];

/**
 * LA CLÉ `webpack` EST ADMISE SOUS DEUX CONDITIONS (lot `licences-tierces-bundle`).
 *
 * 1. SON TEXTE est exactement celui-ci. C'est la vraie fermeture : une
 *    évaluation ne voit ni une branche sur une variable d'environnement ou un
 *    argument absent du stub, ni une mutation différée, ni une propriété non
 *    énumérable (revue `wn-reviewer` du lot). Toute autre fonction rougit.
 * 2. ÉVALUÉE sur les compilations de Next (client, serveur, edge ; production
 *    ou développement), elle rend la configuration reçue, n'y change rien hors
 *    de `plugins`, et n'y ajoute qu'une instance directe de
 *    `PluginLicencesTierces`, sans `apply` propre, sur le client en production.
 *
 * Le plugin, lui, est figé par son empreinte, et son rappel de
 * `thisCompilation` est éprouvé plus bas.
 */
const TEXTE_WEBPACK_ADMIS = `webpack(config, { isServer, dev }) {
    if (!isServer && !dev) config.plugins.push(new PluginLicencesTierces());
    return config;
  }`;
// Vitest (Vite) réindente le module évalué et préfixe ses imports
// (`__vite_ssr_import_1__.PluginLicencesTierces`) : les deux textes sont
// comparés blancs repliés, préfixe retiré. Un autre transformateur rougit le
// banc, il ne le rend pas vert.
const texteNormalise = (t: string) => t.replace(/__vite_ssr_import_\d+__\./g, '').replace(/\s+/g, ' ').trim();
function webpackAdmis(fonction: unknown): boolean {
  if (typeof fonction !== 'function' || texteNormalise(String(fonction)) !== texteNormalise(TEXTE_WEBPACK_ADMIS)) {
    return false;
  }
  for (const [isServer, nextRuntime] of [[false, undefined], [true, 'nodejs'], [true, 'edge']] as const) {
    for (const dev of [false, true]) {
      const config = { resolve: { alias: {} }, resolveLoader: {}, module: { rules: [] }, plugins: [] as unknown[] };
      const avant = JSON.stringify(config);
      const rendu = fonction(config, { isServer, dev, nextRuntime, dir: WEB });
      if (rendu !== config) return false;
      const attendus = !isServer && !dev ? 1 : 0;
      if (config.plugins.length !== attendus) return false;
      const p = config.plugins[0];
      if (attendus === 1 && (Object.getPrototypeOf(p) !== PluginLicencesTierces.prototype || Object.hasOwn(p as object, 'apply'))) {
        return false;
      }
      config.plugins = [];
      if (JSON.stringify(config) !== avant || Reflect.ownKeys(config).length !== 4) return false;
    }
  }
  return true;
}
const CLES_SENTRY_ADMISES = ['authToken', 'org', 'project', 'silent', 'sourcemaps', 'telemetry', 'webpack', 'widenClientFileUpload'];

/** Un fichier qui peut déplacer la résolution d'un module, où qu'il soit sous `web/`. */
const CONFIG_DE_RESOLUTION =
  /(^|\/)(package\.json|[jt]sconfig[^/]*\.json|\.babelrc[^/]*|babel\.config\.[^/]+|\.swcrc|next\.config\.[^/]+)$/i;
// `license` (UNLICENSED, réponse à 20261114-1825-d) : métadonnée seule, sans effet sur la résolution.
const CLES_PACKAGE_ADMISES = ['dependencies', 'devDependencies', 'engines', 'license', 'name', 'overrides', 'private', 'scripts', 'version'];
const CLES_TSCONFIG_ADMISES = [
  'allowJs', 'esModuleInterop', 'incremental', 'isolatedModules', 'jsx', 'lib', 'module', 'moduleResolution',
  'noEmit', 'paths', 'plugins', 'resolveJsonModule', 'skipLibCheck', 'strict', 'target',
];
const EMPREINTE_NEXT_CONFIG = '19a1dab2af4f1a7cfa0fafe0c252aa76ce8b3dc460d33539b0dbc57990986d21';
// Le plugin que `webpack` installe s'exécute dans la compilation client : une
// édition pourrait y réécrire une résolution (`normalModuleFactory`). Figé.
const EMPREINTE_PLUGIN_LICENCES = 'b8c067980c2fe1957e719a670bd91e18fb89b3121997040dc8f1d659137db7e3';
// Le module que le plugin importe s'exécute avec lui : figé de même. Données
// seules (textes de licence, lot `licences-hors-graphe`) — il le reste.
const EMPREINTE_LICENCES_HORS_GRAPHE = 'ead0885c73c4b576130b5c330564d0fbe661d408bb64332762521e065801dcbc';

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
  if ('webpack' in configNext && !webpackAdmis((configNext as { webpack?: unknown }).webpack)) ecarts.push('next.webpack');
  for (const cle of Reflect.ownKeys(optionsSentry)) {
    if (!CLES_SENTRY_ADMISES.includes(String(cle))) ecarts.push(`sentry.${String(cle)}`);
  }
  const webpack = (optionsSentry as { webpack?: unknown }).webpack;
  if (JSON.stringify(webpack) !== JSON.stringify({ treeshake: { removeDebugLogging: true } })) ecarts.push('sentry.webpack');
  return ecarts;
}

describe('résolution des imports — configurations verrouillées (bancs de garde)', () => {
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
    // `typeSeul` (`balayageSources.ts`) suppose que l'import nommé tout en
    // `type` est EFFACÉ : sous `verbatimModuleSyntax` ou `preserveValueImports`,
    // il devient un import latéral qui charge le module, et les bancs qui
    // exemptent les types (bundle client, écritures, réserve D-465, sites IA)
    // verraient vert un chargement réel. Ces options ne s'admettent qu'après
    // avoir retiré cette exemption (`wn-reviewer` sur bp17-extension-bancs-garde).
    for (const option of ['verbatimModuleSyntax', 'preserveValueImports', 'importsNotUsedAsValues']) {
      expect(config.compilerOptions, option).not.toHaveProperty(option);
    }

    // `next.config.mjs` : empreinte du fichier entier. Une branche conditionnelle
    // (`NODE_ENV`, variable d'environnement) n'est vue par aucune évaluation.
    // AVANT d'ajuster l'empreinte : vérifier que le changement n'ajoute aucun
    // alias, aucun `turbopack`, `typescript.tsconfigPath`, `experimental`,
    // `modularizeImports`, rien dans `webpack` hors du plugin admis, ni rien
    // qui déplace une résolution.
    const empreinte = createHash('sha256').update(lire('web/next.config.mjs')).digest('hex');
    expect(empreinte).toBe(EMPREINTE_NEXT_CONFIG);
    // Le plugin admis sous `webpack` : AVANT d'ajuster, vérifier qu'il ne touche
    // ni `normalModuleFactory`, ni `contextModuleFactory`, ni `compiler.options`,
    // ni aucun crochet de résolution.
    const empreintePlugin = createHash('sha256').update(lire('web/scripts/licences-tierces.mjs')).digest('hex');
    expect(empreintePlugin).toBe(EMPREINTE_PLUGIN_LICENCES);
    // Son module de données : AVANT d'ajuster, vérifier qu'il n'exporte que
    // des littéraux (aucun import, aucune fonction).
    const empreinteHorsGraphe = createHash('sha256').update(lire('web/scripts/licences-hors-graphe.mjs')).digest('hex');
    expect(empreinteHorsGraphe).toBe(EMPREINTE_LICENCES_HORS_GRAPHE);
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
      [
        {
          webpack: (c: { resolve: { alias: object }; plugins: unknown[] }, o: { isServer: boolean; dev: boolean }) => {
            if (!o.isServer && !o.dev) c.plugins.push(new PluginLicencesTierces());
            c.resolve.alias = { '@options': './x' };
            return c;
          },
        },
        sentry,
        'next.webpack',
      ],
      [
        {
          webpack: (c: { plugins: unknown[] }, o: { isServer: boolean; dev: boolean }) => {
            if (!o.isServer && !o.dev) c.plugins.push(new PluginLicencesTierces(), {});
            return c;
          },
        },
        sentry,
        'next.webpack',
      ],
      [{ webpack: (c: { plugins: unknown[] }) => (c.plugins.push(new PluginLicencesTierces()), c) }, sentry, 'next.webpack'],
      [{ experimental: { turbo: { resolveAlias: {} } } }, sentry, 'next.experimental'],
      [{ modularizeImports: {} }, sentry, 'next.modularizeImports'],
      [{ [Symbol('cle')]: 1 }, sentry, 'next.Symbol(cle)'],
      [{}, { webpack: { treeshake: { removeDebugLogging: true }, resolve: {} } }, 'sentry.webpack'],
      [{}, { ...sentry, aliasDeBuild: {} }, 'sentry.aliasDeBuild'],
    ];
    for (const [next, options, attendu] of mutations) expect(ecartsConfigNext(next, options), attendu).toContain(attendu);
    expect(ecartsConfigNext({ headers: 1, reactStrictMode: 1, redirects: 1 }, sentry)).toEqual([]);
  });

  // Le plugin admis ne se branche que sur `thisCompilation`, et son rappel que
  // sur `processAssets` : il ne lit ni `compiler.options` (où vivent `resolve`
  // et les chargeurs), ni les fabriques de modules passées au rappel.
  it('le plugin admis sous `webpack` ne touche que thisCompilation, puis processAssets', () => {
    const touches: string[] = [];
    const espion = (nom: string, valeur: object = {}): object =>
      new Proxy(valeur, {
        get: (cible, cle) => {
          touches.push(`${nom}.${String(cle)}`);
          return Reflect.get(cible, cle) ?? espion(`${nom}.${String(cle)}`);
        },
      });
    const rappels: ((...a: unknown[]) => void)[] = [];
    const compilateur = {
      context: WEB,
      webpack: { Compilation: { PROCESS_ASSETS_STAGE_REPORT: 5000 }, WebpackError: Error },
      hooks: { thisCompilation: { tap: (_: string, f: (...a: unknown[]) => void) => void rappels.push(f) } },
      options: espion('options'),
    };
    new PluginLicencesTierces().apply(compilateur);
    expect(rappels).toHaveLength(1);
    const compilation = espion('compilation', { hooks: espion('compilation.hooks', { processAssets: { tap: () => undefined } }) });
    rappels[0](compilation, espion('fabriques'));
    expect(touches).toEqual(['compilation.hooks', 'compilation.hooks.processAssets']);
  });
});
