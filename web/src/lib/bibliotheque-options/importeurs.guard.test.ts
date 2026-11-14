import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';
import type { CompilerOptions, ModuleResolutionCache, ModuleResolutionHost } from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  estFichierSource,
  estUnTest,
  fichiersSource,
  IMPORT_NON_CONSTANT,
  lire,
  RACINE,
  specificateursSyntaxiques,
} from '../bio-parcours/balayageSources';
import {
  atteintSous,
  contexteResolution,
  dependancesDeclarees,
  fichierAtteint,
  importsResolus,
  nomNuInconnu,
  optionsDeResolution,
  segmentsInterditsDuDossier,
  WEB,
} from '../bio-parcours/resolutionImports';

const { createModuleResolutionCache, resolveModuleName, sys } = ts;

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

// LA RÉSOLUTION, PAS LE MOTIF SEUL (passe Codex P1-4 et contre-passe n° 7 sur
// #2006) : chaque spécificateur est résolu comme le fait TypeScript, liens
// symboliques suivis, par `bio-parcours/resolutionImports` — extrait de ce banc
// et partagé avec les autres bancs de garde. Les verrous de configuration qui
// rendent cette résolution fidèle au bundler (`tsconfig`, `package.json`,
// `next.config` évalué, chaîne de lancement) sont dans
// `bio-parcours/resolutionImports.guard.test.ts`.
function resoutDansLeDossier(
  specificateur: string,
  importeur: string,
  options: CompilerOptions,
  hote: ModuleResolutionHost = sys,
  cache?: ModuleResolutionCache,
  racine: string = RACINE,
): boolean {
  return atteintSous(fichierAtteint(specificateur, importeur, options, hote, cache, racine), [DOSSIER]);
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
  const contexte = contexteResolution(racine);
  const vus = new Set(depart);
  const file = [...depart];
  const importeurs: string[] = [];
  const atteints: string[] = [];
  while (file.length > 0) {
    const chemin = file.shift() as string;
    // Le client Prisma GÉNÉRÉ est exempté de la règle des noms nus
    // (`importsResolus`) ; il reste suivi par motif et par résolution.
    let lecteur = false;
    for (const { specificateur, atteint, indetermine } of importsResolus(chemin, contexte)) {
      if (importeLaBibliotheque(specificateur) || indetermine || atteintSous(atteint, [DOSSIER])) {
        lecteur = true;
        continue;
      }
      if (atteint === null) continue;
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
    expect(segmentsInterditsDuDossier(DOSSIER, fichiers, dependances)).toEqual([]);
    // CONTRE-ÉPREUVE : à toute profondeur, fichier ou dossier, avec ou sans extension.
    for (const f of ['detour/fs/charge.ts', 'a/b/react/x.ts', 'a/path.ts', 'a/react.test.ts', '.detour/next/x.ts', 'detour/@detour/paquet/charge.ts', '@x.ts', 'a/React/x.ts', 'FS.ts']) {
      expect(segmentsInterditsDuDossier(DOSSIER, [`${DOSSIER}${f}`], dependances), f).not.toEqual([]);
    }
    expect(segmentsInterditsDuDossier(DOSSIER, [`${DOSSIER}detour/charge.ts`], dependances)).toEqual([]);
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
