// Banc du fichier de mentions tierces (`scripts/licences-tierces.mjs`, lot
// `licences-tierces-bundle`). Une VRAIE compilation webpack — celle que Next
// embarque — en mode production, sur des paquets de fixture : la
// concaténation des modules y est active, comme dans `next build`. Le banc
// rougit si un paquet livré manque au fichier, si un paquet non livré y
// entre, ou si un paquet livré sans licence lisible laisse le build vert.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COPIES_NEXT_SANS_LICENCE, POLICES_OFL, POLYFILLS_NEXT, TEXTE_OFL } from '../../scripts/licences-hors-graphe.mjs';
import {
  PluginLicencesTierces,
  composerMentions,
  dossierSousVendor,
  lirePaquet,
  racinePaquet,
  sansLicence,
  textesTypes,
} from '../../scripts/licences-tierces.mjs';

const requireNext = createRequire(path.join(process.cwd(), 'package.json'));
const webpackNext = requireNext('next/dist/compiled/webpack/webpack');
webpackNext.init();
const webpack = webpackNext.webpack as (options: unknown) => {
  run: (rappel: (erreur: Error | null, stats?: { compilation: { errors: Error[] } }) => void) => void;
};

let racine: string;

function ecrire(relatif: string, contenu: string) {
  const chemin = path.join(racine, relatif);
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, contenu);
}

function paquet(dossier: string, manifeste: Record<string, unknown>, licence?: string) {
  ecrire(`${dossier}/package.json`, JSON.stringify(manifeste));
  if (licence) ecrire(`${dossier}/LICENSE`, licence);
}

type Compilateur = {
  hooks: { thisCompilation: { tap: (nom: string, f: (c: Compilation) => void) => void } };
  webpack: { Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: number }; sources: { RawSource: new (s: string) => unknown } };
};
type Compilation = {
  hooks: { processAssets: { tap: (o: object, f: () => void) => void } };
  emitAsset: (nom: string, source: unknown) => void;
};

/** Émet des fichiers hors de tout morceau, comme le `CopyFilePlugin` de Next. */
function emetteur(fichiers: Record<string, string>) {
  return {
    apply(k: Compilateur) {
      k.hooks.thisCompilation.tap('Emetteur', (c) => {
        c.hooks.processAssets.tap({ name: 'Emetteur', stage: k.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS }, () => {
          for (const [nom, contenu] of Object.entries(fichiers)) c.emitAsset(nom, new k.webpack.sources.RawSource(contenu));
        });
      });
    },
  };
}

const sha256 = (texte: string | Buffer) => createHash('sha256').update(texte).digest('hex');

/** Tables de fixture : un fichier de polyfills (contenu « 1 ») et une police reconnus. */
const POLYFILLS_ESSAI = {
  [sha256('1')]: { next: '0.0.0-essai', composants: [{ nom: 'poly', version: '1.0.0', licence: 'MIT', texte: 'Copyright Poly' }] },
};
const POLICES_ESSAI = { 'Police Connue': { droits: 'Copyright Police Connue' } };
/** Copies vendues sans licence de fixture : l'une reconnue par son empreinte, l'autre altérée. */
const COPIES_ESSAI = {
  'copie-nue': {
    fichier: 'index.js',
    empreinte: sha256('module.exports = 9;\n'),
    version: '1.2.3',
    licence: 'MIT',
    auteur: 'Amont',
    source: 'copie-nue@1.2.3 (essai)',
    textes: [{ nom: 'LICENSE', texte: 'Copyright Amont' }],
  },
  'copie-alteree': { fichier: 'index.js', empreinte: sha256('autre'), version: '1.0.0', licence: 'MIT', auteur: 'Amont', source: 'essai', textes: [] },
};

function compiler(
  entree: string,
  sortie: string,
  { horsGraphe = [path.join(racine, 'runtime')], fichiers = {} }: { horsGraphe?: string[]; fichiers?: Record<string, string> } = {},
) {
  return new Promise<Error[]>((resoudre, rejeter) => {
    webpack({
      mode: 'production',
      context: racine,
      entry: path.join(racine, entree),
      output: { path: path.join(racine, 'dist'), filename: 'bundle.js' },
      // Le minificateur par défaut n'est pas embarqué par Next ; la
      // concaténation, elle, reste active — c'est elle que le banc éprouve.
      optimization: { minimize: false, concatenateModules: true },
      plugins: [emetteur(fichiers), new PluginLicencesTierces({ sortie, horsGraphe, polyfills: POLYFILLS_ESSAI, polices: POLICES_ESSAI, copiesSansLicence: COPIES_ESSAI })],
    }).run((erreur, stats) => {
      if (erreur) rejeter(erreur);
      else resoudre(stats!.compilation.errors);
    });
  });
}

beforeAll(() => {
  racine = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-licences-'));
  // Paquet ESM sans effets de bord : ses deux modules sont concaténés dans le
  // module de l'application, et n'ont plus de `resource` propre.
  paquet('node_modules/concat', { name: 'concat', version: '1.0.0', license: 'MIT', type: 'module', sideEffects: false }, 'Copyright (c) Concat');
  ecrire('node_modules/concat/index.js', "export { aide } from './aide.js';\n");
  ecrire('node_modules/concat/aide.js', 'export const aide = (x) => x * 2;\n');
  // Paquet vendu DANS un autre, avec un sous-dossier dont le manifeste n'a pas
  // de nom : le fichier est attribué au paquet vendu, pas à l'hôte.
  paquet('node_modules/hote', { name: 'hote', version: '9.0.0', license: 'MIT' }, 'Copyright (c) Hote');
  paquet('node_modules/hote/dist/compiled/vendu', { name: 'vendu', version: '2.0.0', license: 'Apache-2.0' }, 'Apache License');
  ecrire('node_modules/hote/dist/compiled/vendu/NOTICE', 'Vendu NOTICE');
  ecrire('node_modules/hote/dist/compiled/vendu/esm/package.json', '{"type":"commonjs"}');
  ecrire('node_modules/hote/dist/compiled/vendu/esm/index.js', 'module.exports = function vendu() { return 7; };\n');
  // Paquet installé, jamais importé : il ne doit pas entrer au fichier.
  paquet('node_modules/absent', { name: 'absent', version: '3.0.0', license: 'MIT' }, 'Copyright (c) Absent');
  ecrire('node_modules/absent/index.js', 'module.exports = 1;\n');
  // Paquet MIT sans fichier de licence : texte type, droits tirés d'`author`.
  paquet('node_modules/type', { name: 'type', version: '4.0.0', license: 'MIT', author: { name: 'Ada' } });
  ecrire('node_modules/type/index.js', 'module.exports = 5;\n');
  // Paquet sans fichier de licence ni champ `license`.
  paquet('node_modules/muet', { name: 'muet', version: '0.1.0' });
  ecrire('node_modules/muet/index.js', 'module.exports = 3;\n');
  // Paquet Apache-2.0 sans fichier : aucun texte type, le build doit rougir.
  paquet('node_modules/apache-nu', { name: 'apache-nu', version: '1.2.0', license: 'Apache-2.0' });
  ecrire('node_modules/apache-nu/index.js', 'module.exports = 4;\n');
  // Paquet chargé dans un morceau asynchrone seulement (`import()`).
  paquet('node_modules/asynchrone', { name: 'asynchrone', version: '6.0.0', license: 'ISC' }, 'Copyright Asynchrone');
  ecrire('node_modules/asynchrone/index.js', 'module.exports = 6;\n');
  // Code vendu sans manifeste propre : rien ne le distingue de son hôte.
  ecrire('node_modules/hote/dist/compiled/sans-manifeste/index.js', 'module.exports = 8;\n');
  // Paquet du runtime webpack, déclaré à part.
  paquet('runtime', { name: 'webpack', version: '5.0.0', license: 'MIT' }, 'Copyright JS Foundation');

  ecrire(
    'src/app.js',
    "import { aide } from 'concat';\nimport vendu from 'hote/dist/compiled/vendu/esm/index.js';\nimport type from 'type';\nconsole.log(aide(vendu() + type));\nimport('asynchrone').then(console.log);\n",
  );
  ecrire('src/sans-manifeste.js', "import x from 'hote/dist/compiled/sans-manifeste/index.js';\nconsole.log(x);\n");
  ecrire('src/muet.js', "import muet from 'muet';\nimport nu from 'apache-nu';\nconsole.log(muet + nu);\n");
  // Polices de `next/font` : le chargeur de Next passe la famille dans la
  // requête du module (`target.css?{"import":"Police_Connue",…}`).
  paquet('node_modules/next', { name: 'next', version: '0.0.0-essai', license: 'MIT' }, 'Copyright Next');
  ecrire('node_modules/next/font/google/target.js', 'module.exports = {};\n');
  ecrire('src/police.js', `import p from 'next/font/google/target.js?{"import":"Police_Connue"}';\nconsole.log(p);\n`);
  // Code vendu sous `lib-vendor/` dans un dossier qui porte sa licence : il
  // revient à ce dossier d'origine, pas à son hôte.
  paquet('node_modules/hote-vendor', { name: 'hote-vendor', version: '1.0.0', license: 'MIT', main: 'index.js' }, 'Copyright (c) Hote Vendor');
  ecrire('node_modules/hote-vendor/index.js', "module.exports = require('./lib-vendor/origine/src/index.js');\n");
  ecrire('node_modules/hote-vendor/lib-vendor/origine/LICENSE', 'Copyright Origine');
  ecrire('node_modules/hote-vendor/lib-vendor/origine/src/index.js', 'module.exports = 10;\n');
  ecrire('src/vendor.js', "import v from 'hote-vendor';\nconsole.log(v);\n");
  // Code vendu sous `vendor/` sans licence d'origine : à même le dossier, ou
  // dans un sous-dossier qui n'en porte pas.
  paquet('node_modules/hote-nu', { name: 'hote-nu', version: '1.0.0', license: 'MIT' }, 'Copyright (c) Hote Nu');
  ecrire('node_modules/hote-nu/vendor/outil.js', 'module.exports = 11;\n');
  ecrire('node_modules/hote-nu/vendor/sans-licence/index.js', 'module.exports = 12;\n');
  ecrire(
    'src/vendor-nu.js',
    "import a from 'hote-nu/vendor/outil.js';\nimport b from 'hote-nu/vendor/sans-licence/index.js';\nconsole.log(a + b);\n",
  );
  // Copies vendues par Next sans licence ni version (querystring-es3…).
  paquet('node_modules/hote/dist/compiled/copie-nue', { name: 'copie-nue', main: 'index.js' });
  ecrire('node_modules/hote/dist/compiled/copie-nue/index.js', 'module.exports = 9;\n');
  paquet('node_modules/hote/dist/compiled/copie-alteree', { name: 'copie-alteree', main: 'index.js' });
  ecrire('node_modules/hote/dist/compiled/copie-alteree/index.js', 'module.exports = 13;\n');
  ecrire('src/copie-nue.js', "import c from 'hote/dist/compiled/copie-nue/index.js';\nconsole.log(c);\n");
  ecrire('src/copie-alteree.js', "import c from 'hote/dist/compiled/copie-alteree/index.js';\nconsole.log(c);\n");
  ecrire('src/police-inconnue.js', `import p from 'next/font/google/target.js?{"import":"Police_Inconnue"}';\nconsole.log(p);\n`);
});

afterAll(() => {
  fs.rmSync(racine, { recursive: true, force: true });
});

describe('PluginLicencesTierces sur une vraie compilation webpack', () => {
  it('liste les paquets livrés, concaténés ou vendus, et eux seuls', async () => {
    const sortie = path.join(racine, 'public', 'licences-tierces.txt');
    const erreurs = await compiler('src/app.js', sortie, {
      fichiers: { 'static/chunks/polyfills-0a1b2c.js': '1', 'static/abc/_buildManifest.js': '2' },
    });
    expect(erreurs).toEqual([]);
    const texte = fs.readFileSync(sortie, 'utf8');
    expect(texte).toContain('concat@1.0.0');
    expect(texte).toContain('Copyright (c) Concat');
    expect(texte).toContain('vendu@2.0.0');
    expect(texte).toContain('Vendu NOTICE');
    expect(texte).toContain('webpack@5.0.0');
    expect(texte).not.toContain('absent@');
    expect(texte).not.toContain('hote@');
    expect(texte).toContain('type@4.0.0');
    expect(texte).toContain('Copyright (c) Ada');
    expect(texte).toContain('Permission is hereby granted, free of charge');
    expect(texte).toContain('asynchrone@6.0.0');
    expect(texte).toContain('Composants : 5.');
    expect(texte).not.toContain('ne couvre pas encore');
    expect(texte).toContain('Fichier de polyfills de Next.js (static/chunks/polyfills-0a1b2c.js)');
    expect(texte).toContain('poly@1.0.0');
    expect(texte).toContain('Copyright Poly');
    expect(texte).not.toContain('Polices servies par next/font');
  });

  it('reproduit la mention de droits et le texte OFL de chaque police servie par next/font', async () => {
    const sortie = path.join(racine, 'public-police', 'licences-tierces.txt');
    const erreurs = await compiler('src/police.js', sortie);
    expect(erreurs).toEqual([]);
    const texte = fs.readFileSync(sortie, 'utf8');
    expect(texte).toContain('Polices servies par next/font');
    expect(texte).toContain('Police Connue\nCopyright Police Connue');
    expect(texte).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });

  it('rougit le build sur une police next/font sans mention de droits, sans écrire le fichier', async () => {
    const sortie = path.join(racine, 'public-police-inconnue', 'licences-tierces.txt');
    const erreurs = await compiler('src/police-inconnue.js', sortie);
    expect(erreurs.map((e) => e.message).join('\n')).toMatch(/police\(s\) next\/font sans mention de droits.*Police Inconnue/);
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it("rougit le build sur un fichier de polyfills d'empreinte inconnue (Next mis à jour : réénumérer)", async () => {
    const sortie = path.join(racine, 'public-polyfills', 'licences-tierces.txt');
    const erreurs = await compiler('src/app.js', sortie, { fichiers: { 'static/chunks/polyfills-0a1b2c.js': '2' } });
    expect(erreurs.map((e) => e.message).join('\n')).toContain(`polyfills-0a1b2c.js : ${sha256('2')}`);
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it("rougit le build si un paquet livré n'a aucune licence lisible, sans écrire le fichier", async () => {
    const sortie = path.join(racine, 'public-muet', 'licences-tierces.txt');
    const erreurs = await compiler('src/muet.js', sortie);
    const message = erreurs.map((e) => e.message).join('\n');
    expect(message).toMatch(/sans licence lisible/);
    expect(message).toContain('muet@0.1.0');
    expect(message).toContain('apache-nu@1.2.0');
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it("retire au refus le fichier d'un build précédent : il ne reste pas servi depuis public/", async () => {
    const sortie = path.join(racine, 'public-perime', 'licences-tierces.txt');
    fs.mkdirSync(path.dirname(sortie), { recursive: true });
    fs.writeFileSync(sortie, 'mentions d’un build précédent\n');
    const erreurs = await compiler('src/muet.js', sortie);
    expect(erreurs.map((e) => e.message).join('\n')).toMatch(/sans licence lisible/);
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it('rougit le build si un composant déclaré hors du graphe est introuvable', async () => {
    const sortie = path.join(racine, 'public-runtime', 'licences-tierces.txt');
    const erreurs = await compiler('src/app.js', sortie, { horsGraphe: [path.join(racine, 'pas-de-runtime')] });
    expect(erreurs.map((e) => e.message).join('\n')).toMatch(/hors du graphe introuvable/);
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it("rougit le build sur du code vendu sans manifeste, au lieu de l'attribuer à son hôte", async () => {
    const sortie = path.join(racine, 'public-vendu', 'licences-tierces.txt');
    const erreurs = await compiler('src/sans-manifeste.js', sortie);
    expect(erreurs.map((e) => e.message).join('\n')).toMatch(/vendu sans manifeste propre.*sans-manifeste/);
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it("attribue le code vendu sous lib-vendor/ au dossier d'origine qui porte sa licence, pas à son hôte", async () => {
    const sortie = path.join(racine, 'public-sous-vendor', 'licences-tierces.txt');
    const erreurs = await compiler('src/vendor.js', sortie);
    expect(erreurs).toEqual([]);
    const texte = fs.readFileSync(sortie, 'utf8');
    expect(texte).toContain('origine (vendu par hote-vendor@1.0.0)\nLicence : celle du fichier reproduit ci-dessous');
    expect(texte).toContain('--- LICENSE ---\n\nCopyright Origine');
    // L'hôte reste listé pour son propre code (`index.js`).
    expect(texte).toContain('hote-vendor@1.0.0\nLicence déclarée : MIT');
    expect(texte).toContain('Composants : 3.');
  });

  it("rougit le build sur du code vendu sous vendor/ sans licence d'origine, sans écrire le fichier", async () => {
    const sortie = path.join(racine, 'public-vendor-nu', 'licences-tierces.txt');
    const erreurs = await compiler('src/vendor-nu.js', sortie);
    const message = erreurs.map((e) => e.message).join('\n');
    expect(message).toMatch(/vendu sous vendor\/ sans fichier de licence/);
    expect(message).toContain(path.join('hote-nu', 'vendor', 'outil.js'));
    expect(message).toContain(path.join('hote-nu', 'vendor', 'sans-licence', 'index.js'));
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it("donne à une copie vendue sans licence, reconnue par son empreinte, la version et les droits de l'amont", async () => {
    const sortie = path.join(racine, 'public-copie-nue', 'licences-tierces.txt');
    const erreurs = await compiler('src/copie-nue.js', sortie);
    expect(erreurs).toEqual([]);
    const texte = fs.readFileSync(sortie, 'utf8');
    expect(texte).toContain('copie-nue@1.2.3\nLicence déclarée : MIT\nAuteur : Amont');
    expect(texte).toContain("mentions reprises de l'amont : copie-nue@1.2.3 (essai)");
    expect(texte).toContain('--- LICENSE ---\n\nCopyright Amont');
    expect(texte).not.toContain('copie-nue@?');
  });

  it("rougit le build sur une copie vendue sans licence dont l'empreinte a changé, sans écrire le fichier", async () => {
    const sortie = path.join(racine, 'public-copie-alteree', 'licences-tierces.txt');
    const erreurs = await compiler('src/copie-alteree.js', sortie);
    const message = erreurs.map((e) => e.message).join('\n');
    expect(message).toContain(`copie-alteree (index.js : ${sha256('module.exports = 13;\n')})`);
    expect(message).toMatch(/réidentifier la version amont/);
    expect(fs.existsSync(sortie)).toBe(false);
  });

  it('rougit le build sur du code servi hors des morceaux et inconnu (.js, .wasm, polyfills hors de static/chunks)', async () => {
    const sortie = path.join(racine, 'public-hors', 'licences-tierces.txt');
    const erreurs = await compiler('src/app.js', sortie, { fichiers: { 'static/chunks/copie-tierce.js': '1', 'static/media/tiers.wasm': '2', 'static/polyfills.js': '3' } });
    expect(erreurs.map((e) => e.message).join('\n')).toMatch(/hors des morceaux : static\/chunks\/copie-tierce\.js, static\/media\/tiers\.wasm, static\/polyfills\.js/);
    expect(fs.existsSync(sortie)).toBe(false);
  });
});

// Les tables de `licences-hors-graphe.mjs` contre ce que l'application livre
// vraiment : le fichier de polyfills de la version INSTALLÉE de Next, et les
// polices importées par `app/layout.tsx`. Un écart rougit ici avant le build.
describe('licences-hors-graphe : les tables couvrent ce qui est livré', () => {
  it('reconnaît le fichier de polyfills de la version installée de Next, et ses composants y figurent', () => {
    const fichier = fs.readFileSync(requireNext.resolve('next/dist/build/polyfills/polyfill-nomodule.js'));
    const table = POLYFILLS_NEXT as Record<string, { next: string; composants: { nom: string; version: string; texte: string }[] }>;
    const entree = table[sha256(fichier)];
    expect(entree, 'empreinte inconnue : réénumérer depuis @next/polyfill-nomodule').toBeDefined();
    expect(entree.next).toBe(requireNext('next/package.json').version);
    expect(entree.composants.map((c) => c.nom)).toEqual(['core-js', 'object-assign', 'whatwg-fetch']);
    // core-js inscrit sa version dans le code compilé : la seule présente est la déclarée.
    const versions = new Set(fichier.toString('utf8').match(/version:"\d+\.\d+\.\d+",mode:"global"/g));
    expect([...versions]).toEqual([`version:"${entree.composants[0].version}",mode:"global"`]);
    for (const c of entree.composants) expect(c.texte).toMatch(/^(The MIT License \(MIT\)\n\n)?Copyright \(c\) /);
  });

  it('a une mention de droits pour chaque police importée de next/font/google', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    const importees = /import \{([^}]+)\} from 'next\/font\/google'/
      .exec(layout)?.[1]
      .split(',')
      .map((n) => n.trim().replace(/_/g, ' '));
    expect(importees?.length).toBeGreaterThan(0);
    for (const nom of importees ?? []) expect(Object.keys(POLICES_OFL), nom).toContain(nom);
    expect(TEXTE_OFL).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007');
  });
});

describe('licences-hors-graphe : les copies que Next vend sans licence', () => {
  it("reconnaît les copies de la version installée de Next, toujours livrées sans licence", () => {
    const copies = COPIES_NEXT_SANS_LICENCE as Record<string, { fichier: string; empreinte: string; version: string; licence: string; auteur: string }>;
    expect(Object.keys(copies).sort()).toEqual(['constants-browserify', 'querystring-es3']);
    for (const [nom, copie] of Object.entries(copies)) {
      const fichier = requireNext.resolve(`next/dist/compiled/${nom}/${copie.fichier}`);
      expect(sha256(fs.readFileSync(fichier)), `${nom} : empreinte changée, réidentifier la version amont`).toBe(copie.empreinte);
      // Si Next fournit un jour la licence, l'entrée n'a plus lieu d'être.
      expect(sansLicence(lirePaquet(path.dirname(fichier))), nom).toBe(true);
      expect(textesTypes(copie.licence), nom).not.toBeNull();
      expect(copie.auteur.length, nom).toBeGreaterThan(0);
    }
  });
});

describe('dossierSousVendor', () => {
  it("rend le dossier d'origine sous vendor/, lib-vendor/ ou vendored/, null à même le dossier, undefined ailleurs", () => {
    const h = path.join(racine, 'node_modules', 'h');
    expect(dossierSousVendor(h, path.join(h, 'lib-vendor', 'd3-scale', 'src', 'x.js'))).toBe(path.join(h, 'lib-vendor', 'd3-scale'));
    expect(dossierSousVendor(h, path.join(h, 'build', 'vendored', '@s', 'p', 'x.js'))).toBe(path.join(h, 'build', 'vendored', '@s', 'p'));
    expect(dossierSousVendor(h, path.join(h, 'build', 'esm', 'vendor', 'x.js'))).toBeNull();
    expect(dossierSousVendor(h, path.join(h, 'dist', 'vendors.js'))).toBeUndefined();
    expect(dossierSousVendor(h, path.join(h, 'es', 'd3-scale.js'))).toBeUndefined();
  });
});

describe('racinePaquet', () => {
  it("rend null hors de node_modules : le code de l'application n'est pas un composant tiers", () => {
    expect(racinePaquet(path.join(racine, 'src', 'app.js'))).toBeNull();
  });
});

describe('textesTypes', () => {
  it('AND exige chaque terme, OR se contente de ceux qu’on sait reproduire', () => {
    expect(textesTypes('MIT AND ISC')?.map((t: { licence: string }) => t.licence)).toEqual(['MIT', 'ISC']);
    expect(textesTypes('MIT AND Apache-2.0')).toBeNull();
    expect(textesTypes('(MIT OR Apache-2.0)')?.map((t: { licence: string }) => t.licence)).toEqual(['MIT']);
    expect(textesTypes('Apache-2.0')).toBeNull();
    expect(textesTypes(null)).toBeNull();
  });
});

describe('composerMentions', () => {
  it('dédoublonne et trie par nom@version', () => {
    const p = (nom: string) => ({ nom, version: '1.0.0', licence: 'MIT', auteur: null, textesLicence: [], notices: [] });
    const texte = composerMentions([p('b'), p('a'), p('b')]);
    expect(texte).toContain('Composants : 2.');
    expect(texte.indexOf('a@1.0.0')).toBeLessThan(texte.indexOf('b@1.0.0'));
  });
});
