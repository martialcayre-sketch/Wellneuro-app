// Banc du fichier de mentions tierces (`scripts/licences-tierces.mjs`, lot
// `licences-tierces-bundle`). Une VRAIE compilation webpack — celle que Next
// embarque — en mode production, sur des paquets de fixture : la
// concaténation des modules y est active, comme dans `next build`. Le banc
// rougit si un paquet livré manque au fichier, si un paquet non livré y
// entre, ou si un paquet livré sans licence lisible laisse le build vert.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PluginLicencesTierces,
  composerMentions,
  racinePaquet,
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
      plugins: [emetteur(fichiers), new PluginLicencesTierces({ sortie, horsGraphe })],
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
    expect(texte).toContain('ne couvre pas encore');
    expect(texte).toContain('static/chunks/polyfills-0a1b2c.js');
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

  it('rougit le build sur du code servi hors des morceaux et inconnu (.js, .wasm, polyfills hors de static/chunks)', async () => {
    const sortie = path.join(racine, 'public-hors', 'licences-tierces.txt');
    const erreurs = await compiler('src/app.js', sortie, { fichiers: { 'static/chunks/copie-tierce.js': '1', 'static/media/tiers.wasm': '2', 'static/polyfills.js': '3' } });
    expect(erreurs.map((e) => e.message).join('\n')).toMatch(/hors des morceaux : static\/chunks\/copie-tierce\.js, static\/media\/tiers\.wasm, static\/polyfills\.js/);
    expect(fs.existsSync(sortie)).toBe(false);
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
