import { describe, expect, it } from 'vitest';
import {
  estFichierSource,
  estUnTest,
  fichiersSource,
  IMPORT_NON_CONSTANT,
  lire,
  specificateursSyntaxiques,
} from '../bio-parcours/balayageSources';

// [[D-480]] §8 — LA BIBLIOTHÈQUE N'AUTORISE AUCUNE PRESCRIPTION. Aucun
// parcours, courrier, portail, document remis ni appel à un modèle ne la lit.
// Ce banc lit le SOURCE de `web/src` et refuse tout importeur de production
// hors de son dossier.
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

const importeLaBibliotheque = (specificateur: string) =>
  specificateur === IMPORT_NON_CONSTANT || /(^|\/)bibliotheque-options(\/|$)/.test(specificateur);

describe('bibliothèque des options — aucun lecteur hors des bancs (D-480 §8)', () => {
  const sources = fichiersSource();

  it('le balayage voit le module lui-même (anti-vacuité)', () => {
    expect(sources).toContain(`${DOSSIER}bibliothequeBesoin2V1.ts`);
    expect(sources).toContain(`${DOSSIER}vocabulaire.ts`);
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
    const importeurs = sources
      .filter(chemin => !estUnTest(chemin) && !chemin.startsWith(DOSSIER))
      .filter(chemin => specificateursSyntaxiques(lire(chemin), chemin).some(importeLaBibliotheque));
    expect(importeurs).toEqual([...LECTEURS_ADMIS]);
    // Le parseur lit tout `web/src` : même délai que l'autre banc qui le fait (`replisAssietteV1`).
  }, 30_000);

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
    // Un import constant d'un autre module n'est ni la bibliothèque ni un lecteur possible.
    expect(specificateursSyntaxiques('const z = import("@/lib/" + "autre/module");', 'x.ts')).toEqual(['@/lib/autre/module']);
    // La seule forme de production qui touche `import.meta` : lue par son chemin, sans sentinelle.
    expect(
      specificateursSyntaxiques("new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();", 'x.tsx'),
    ).toEqual(['pdfjs-dist/build/pdf.worker.min.mjs']);
  });
});
