// MENTIONS DE LICENCE DES DÉPENDANCES LIVRÉES AU NAVIGATEUR (lot
// `licences-tierces-bundle`, file D).
//
// Le minificateur de Next.js retire tous les commentaires, `/*! … */` et
// `@license` compris : le bundle servi ne porte aucune mention de droits
// (examen : `docs/claude/propositions/2026-11-14-orchestration-5-licence/
// examen-bundle-navigateur.md`). Or MIT, ISC, BSD et Apache-2.0 demandent que
// la mention de droits et le texte de la licence accompagnent les copies
// redistribuées ; Apache-2.0 demande en plus le fichier NOTICE.
//
// Ce plugin webpack se branche sur la SEULE compilation client de `next build`
// (celle dont les fichiers partent au navigateur). Il lit les modules qui
// figurent réellement dans les morceaux émis — pas `package.json`, qui
// mélangerait le serveur (Prisma, pg, nodemailer…) et oublierait ce que Next
// embarque lui-même sous `next/dist/compiled/` (React, scheduler…). Il écrit
// `public/licences-tierces.txt`, servi à `/licences-tierces.txt`.
//
// Un paquet livré sans fichier de licence reçoit le texte type de sa licence
// déclarée, MIT ou ISC seulement ; sans l'un ni l'autre, IL REND LE BUILD
// ROUGE : on ne sert pas une liste dont on sait qu'elle est incomplète.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { POLICES_OFL, POLYFILLS_NEXT as POLYFILLS_RECONNUS, TEXTE_OFL } from './licences-hors-graphe.mjs';

const NOM_PLUGIN = 'PluginLicencesTierces';
const SEGMENT_NODE_MODULES = `${path.sep}node_modules${path.sep}`;
const MOTIF_LICENCE = /^(licen[cs]e|copying)([.-].*)?$/i;
const MOTIF_NOTICE = /^notice([.-].*)?$/i;

/** Chemin du fichier d'un module, sans requête de chargeur (`?…`) ni préfixe. */
export function cheminRessource(module) {
  const brut = module?.resource ?? module?.userRequest;
  if (typeof brut !== 'string' || brut.length === 0) return null;
  const sansRequete = brut.split('?')[0];
  const dernier = sansRequete.lastIndexOf('!');
  return dernier >= 0 ? sansRequete.slice(dernier + 1) : sansRequete;
}

/**
 * Les modules feuilles d'un module : un module concaténé (ModuleConcatenation
 * Plugin, actif en production) n'a pas de `resource` à lui — ses modules
 * internes, si. Les oublier ferait disparaître les paquets les mieux
 * optimisés, c'est-à-dire presque tous.
 */
export function modulesFeuilles(module) {
  const internes = module?.modules;
  if (internes && typeof internes[Symbol.iterator] === 'function') {
    return [...internes].flatMap(modulesFeuilles);
  }
  return [module];
}

/**
 * Le dossier du paquet qui contient `fichier` : le plus proche dossier parent
 * dont le `package.json` porte un `name`, sans remonter au-dessus du
 * `node_modules` le plus profond. Un `package.json` sans nom (`{"type":
 * "module"}` d'un sous-dossier `esm/`) n'est pas un paquet. Un paquet vendu
 * DANS un autre (`next/dist/compiled/react`) est trouvé pour lui-même.
 * `null` hors de `node_modules` : c'est le code de l'application.
 */
export function racinePaquet(fichier, cache = new Map()) {
  if (!fichier || !fichier.includes(SEGMENT_NODE_MODULES)) return null;
  const plancher = fichier.slice(0, fichier.lastIndexOf(SEGMENT_NODE_MODULES) + SEGMENT_NODE_MODULES.length - 1);
  let dossier = path.dirname(fichier);
  const parcourus = [];
  while (dossier.length > plancher.length) {
    if (cache.has(dossier)) {
      const connu = cache.get(dossier);
      for (const d of parcourus) cache.set(d, connu);
      return connu;
    }
    parcourus.push(dossier);
    const manifeste = path.join(dossier, 'package.json');
    if (fs.existsSync(manifeste)) {
      try {
        const contenu = JSON.parse(fs.readFileSync(manifeste, 'utf8'));
        if (typeof contenu.name === 'string' && contenu.name.length > 0) {
          for (const d of parcourus) cache.set(d, dossier);
          return dossier;
        }
      } catch {
        // manifeste illisible : on remonte
      }
    }
    dossier = path.dirname(dossier);
  }
  for (const d of parcourus) cache.set(d, null);
  return null;
}

function licenceDeclaree(manifeste) {
  const { license, licenses } = manifeste;
  if (typeof license === 'string') return license;
  if (license && typeof license.type === 'string') return license.type;
  if (Array.isArray(licenses)) {
    const types = licenses.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    if (types.length > 0) return types.length === 1 ? types[0] : `(${types.join(' OR ')})`;
  }
  return null;
}

function auteur(manifeste) {
  const a = manifeste.author;
  if (typeof a === 'string') return a;
  if (a && typeof a.name === 'string') return a.name;
  return null;
}

function lireFichiers(dossier, motif) {
  let noms;
  try {
    noms = fs.readdirSync(dossier, { withFileTypes: true });
  } catch {
    return [];
  }
  return noms
    .filter((e) => e.isFile() && motif.test(e.name))
    .map((e) => e.name)
    .sort()
    .map((nom) => ({ nom, texte: fs.readFileSync(path.join(dossier, nom), 'utf8').trim() }));
}

/** Ce que le fichier de mentions dit d'un paquet, lu dans son dossier. */
export function lirePaquet(dossier) {
  const manifeste = JSON.parse(fs.readFileSync(path.join(dossier, 'package.json'), 'utf8'));
  return {
    nom: manifeste.name,
    version: typeof manifeste.version === 'string' ? manifeste.version : null,
    licence: licenceDeclaree(manifeste),
    auteur: auteur(manifeste),
    textesLicence: lireFichiers(dossier, MOTIF_LICENCE),
    notices: lireFichiers(dossier, MOTIF_NOTICE),
  };
}

// TEXTES TYPES, pour le composant qui déclare sa licence sans en fournir le
// fichier (next-auth, victory-vendor… constaté le 2026-11-16). Recopiés des
// fichiers de licence de composants livrés (clsx pour MIT, d3-color pour ISC),
// sans la ligne de droits, que `author` remplace. Seules ces deux licences en
// ont un : toute autre licence sans fichier rend le build rouge.
const TEXTES_TYPES = {
  MIT: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
  ISC: `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
};

/**
 * Les textes types dus à une expression SPDX (`MIT`, `MIT AND ISC`,
 * `(MIT OR Apache-2.0)`), ou `null` si l'un des termes requis n'en a pas.
 * `AND` : tous les termes ; `OR` : ceux qu'on sait reproduire, au moins un.
 */
export function textesTypes(expression) {
  if (!expression) return null;
  const nette = expression.replace(/[()]/g, ' ').trim();
  const disjonction = /\sOR\s/.test(nette) && !/\sAND\s/.test(nette);
  const termes = nette.split(/\s+(?:AND|OR)\s+/).map((t) => t.trim());
  const connus = termes.filter((t) => TEXTES_TYPES[t]);
  if (connus.length === 0 || (!disjonction && connus.length !== termes.length)) return null;
  return connus.map((t) => ({ licence: t, texte: TEXTES_TYPES[t] }));
}

/** Un paquet dont on ne sait reproduire ni le texte ni un texte type : le build doit rougir. */
export function sansLicence(paquet) {
  return paquet.textesLicence.length === 0 && textesTypes(paquet.licence) === null;
}

function cle(paquet) {
  return `${paquet.nom}@${paquet.version ?? '?'}`;
}

/**
 * Le texte servi à `/licences-tierces.txt`, trié et sans doublon.
 * `horsGraphe` : ce qui est livré hors du graphe des modules (lot
 * `licences-hors-graphe`) — `polyfills` [{ fichier, next, composants }] et
 * `polices` [{ nom, droits }], déjà reconnus par le plugin.
 */
export function composerMentions(paquets, horsGraphe = {}) {
  const uniques = new Map();
  for (const p of paquets) if (!uniques.has(cle(p))) uniques.set(cle(p), p);
  const tries = [...uniques.values()].sort((a, b) => cle(a).localeCompare(cle(b), 'en'));
  const trait = '='.repeat(78);
  const lignes = [
    'Wellneuro — mentions de licence des composants tiers',
    '',
    "Ce fichier accompagne le code livré au navigateur par l'application. Il",
    'reproduit, pour chaque composant tiers inclus, sa mention de droits, le',
    'texte de sa licence et, le cas échéant, son fichier NOTICE, tels que le',
    'composant les fournit. Il est généré au build à partir des modules',
    'réellement livrés.',
    '',
    `Composants : ${tries.length}.`,
  ];
  for (const p of tries) {
    lignes.push('', trait, cle(p), `Licence déclarée : ${p.licence ?? 'non déclarée'}`);
    if (p.auteur) lignes.push(`Auteur : ${p.auteur}`);
    lignes.push(trait);
    if (p.textesLicence.length === 0) {
      lignes.push(
        '',
        `Le composant ne fournit pas de fichier de licence : texte type de la licence déclarée (${p.licence}),`,
        'mention de droits tirée de son champ « author ».',
      );
      for (const { licence, texte } of textesTypes(p.licence) ?? []) {
        lignes.push('', `--- ${licence} ---`, '', `Copyright (c) ${p.auteur ?? `the ${p.nom} authors`}`, '', texte);
      }
    }
    for (const f of [...p.textesLicence, ...p.notices]) lignes.push('', `--- ${f.nom} ---`, '', f.texte);
  }
  // HORS DU GRAPHE (lot `licences-hors-graphe`) : le fichier de polyfills de
  // Next, qui compile plusieurs composants sans leurs licences, et les polices
  // de `next/font`, dont les droits ne sont que dans les fichiers de police.
  const { polyfills = [], polices = [] } = horsGraphe;
  for (const { fichier, next, composants } of polyfills) {
    lignes.push(
      '',
      trait,
      `Fichier de polyfills de Next.js (${fichier})`,
      trait,
      '',
      `Copié tel quel depuis next@${next} (next/dist/build/polyfills/polyfill-nomodule.js), il compile les composants suivants.`,
    );
    for (const c of composants) {
      lignes.push('', trait, `${c.nom}@${c.version}`, `Licence déclarée : ${c.licence}`, trait, '', c.texte);
    }
  }
  if (polices.length > 0) {
    lignes.push('', trait, 'Polices servies par next/font (SIL Open Font License, version 1.1)', trait);
    for (const { nom, droits } of polices) lignes.push('', nom, droits);
    lignes.push('', '--- SIL Open Font License 1.1 ---', '', TEXTE_OFL);
  }
  return `${lignes.join('\n')}\n`;
}

const SEGMENT_VENDU = `dist${path.sep}compiled${path.sep}`;
const MOTIF_POLICE_NEXT = `${path.sep}next${path.sep}font${path.sep}`;

/**
 * Ce que les morceaux émis livrent : les dossiers des paquets, les fichiers
 * VENDUS SANS MANIFESTE (du code sous `<paquet>/dist/compiled/` que rien ne
 * distingue de son hôte : il serait attribué en silence à l'hôte, à tort) et
 * les polices de `next/font` (reconnues par leur nom, `POLICES_OFL`).
 */
export function dossiersLivres(compilation, cache = new Map()) {
  const dossiers = new Set();
  const vendusSansManifeste = new Set();
  const polices = new Set();
  for (const morceau of compilation.chunks) {
    for (const module of compilation.chunkGraph.getChunkModulesIterable(morceau)) {
      for (const feuille of modulesFeuilles(module)) {
        const fichier = cheminRessource(feuille);
        const dossier = racinePaquet(fichier, cache);
        if (!dossier) continue;
        dossiers.add(dossier);
        if (path.relative(dossier, fichier).startsWith(SEGMENT_VENDU)) vendusSansManifeste.add(fichier);
        if (fichier.includes(MOTIF_POLICE_NEXT)) {
          const nom = /"import":"([^"]+)"/.exec(String(feuille.resource ?? ''))?.[1];
          if (nom) polices.add(nom.replace(/_/g, ' '));
        }
      }
    }
  }
  return { dossiers, vendusSansManifeste, polices };
}

/**
 * Les fichiers JavaScript servis sous `static/` qui ne viennent d'AUCUN morceau
 * (un `CopyFilePlugin`, par exemple) : leurs composants échappent au graphe.
 * Deux formes sont connues : les manifestes générés par Next (son propre code,
 * couvert par l'entrée `next`), et le fichier de polyfills de Next, reconnu
 * par son empreinte (`POLYFILLS_RECONNUS`). Toute autre rend le build rouge.
 */
const MANIFESTES_NEXT = /(^|\/)_(build|ssg)Manifest\.js$/;
const POLYFILLS_NEXT = /^static\/chunks\/polyfills-[0-9a-f]+\.js$/;
const CODE_SERVI = /\.(m?js|wasm)$/;
export function fichiersHorsMorceaux(compilation) {
  const deMorceaux = new Set();
  for (const morceau of compilation.chunks) {
    for (const f of [...morceau.files, ...(morceau.auxiliaryFiles ?? [])]) deMorceaux.add(f);
  }
  return compilation
    .getAssets()
    .map((a) => a.name)
    .filter((nom) => nom.startsWith('static/') && CODE_SERVI.test(nom) && !deMorceaux.has(nom))
    .sort();
}

/**
 * Les composants livrés hors du graphe des modules, par défaut : le runtime
 * webpack (son code d'amorçage n'a pas de fichier source) et Tailwind CSS (son
 * « preflight », dérivé de modern-normalize, part dans le CSS par `@tailwind
 * base`). Dossiers RÉSOLUS depuis le dossier du projet (`compiler.context`),
 * sans `import.meta` (les bancs de garde des imports le refusent) : dans un
 * worktree dont `web/node_modules` ne porte que des caches, `next` se résout
 * ailleurs, et un chemin écrit en dur rougissait le build (signal de la file A,
 * 2026-11-16). Un paquet introuvable garde son chemin attendu : le build rougit
 * en le nommant.
 */
function horsGrapheParDefaut(contexte) {
  const resoudre = createRequire(path.join(contexte, 'package.json'));
  const dossierDe = (nom) => {
    try {
      return path.dirname(resoudre.resolve(`${nom}/package.json`));
    } catch {
      return path.join(contexte, 'node_modules', nom);
    }
  };
  return [path.join(dossierDe('next'), 'dist', 'compiled', 'webpack'), dossierDe('tailwindcss')];
}

/** L'empreinte SHA-256 d'un fichier émis par la compilation. */
function empreinteFichier(compilation, nom) {
  return createHash('sha256').update(compilation.getAsset(nom).source.source()).digest('hex');
}

export class PluginLicencesTierces {
  /**
   * @param {{ sortie?: string, horsGraphe?: string[], polyfills?: object, polices?: object }} [options]
   *   `sortie` : chemin absolu du fichier écrit (défaut : `public/
   *   licences-tierces.txt` sous le dossier du projet, `compiler.context`) ;
   *   `horsGraphe` : dossiers des composants livrés hors du graphe des modules
   *   (défaut : `horsGrapheParDefaut`) ; `polyfills` et `polices` : tables des
   *   fichiers de polyfills et des polices reconnus (défaut :
   *   `licences-hors-graphe.mjs`).
   */
  constructor({ sortie, horsGraphe, polyfills, polices } = {}) {
    this.sortie = sortie ?? null;
    this.horsGraphe = horsGraphe ?? null;
    this.polyfills = polyfills ?? POLYFILLS_RECONNUS;
    this.polices = polices ?? POLICES_OFL;
  }

  apply(compiler) {
    const { Compilation, WebpackError } = compiler.webpack;
    const sortie = this.sortie ?? path.join(compiler.context, 'public', 'licences-tierces.txt');
    const horsGraphe = this.horsGraphe ?? horsGrapheParDefaut(compiler.context);
    compiler.hooks.thisCompilation.tap(NOM_PLUGIN, (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: NOM_PLUGIN, stage: Compilation.PROCESS_ASSETS_STAGE_REPORT },
        () => {
          const refus = [];
          const introuvables = horsGraphe.filter((d) => !fs.existsSync(path.join(d, 'package.json')));
          if (introuvables.length > 0) {
            refus.push(`composant(s) déclaré(s) hors du graphe introuvable(s) : ${introuvables.join(', ')}`);
          }
          const { dossiers, vendusSansManifeste, polices } = dossiersLivres(compilation);
          if (vendusSansManifeste.size > 0) {
            refus.push(
              `code vendu sans manifeste propre, attribuable à tort à son hôte : ${[...vendusSansManifeste].sort().join(', ')}`,
            );
          }
          const horsMorceaux = fichiersHorsMorceaux(compilation);
          const inconnus = horsMorceaux.filter((nom) => !MANIFESTES_NEXT.test(nom) && !POLYFILLS_NEXT.test(nom));
          if (inconnus.length > 0) refus.push(`fichier(s) de code servi(s) hors des morceaux : ${inconnus.join(', ')}`);
          const polyfills = horsMorceaux
            .filter((nom) => POLYFILLS_NEXT.test(nom))
            .map((fichier) => ({ fichier, empreinte: empreinteFichier(compilation, fichier) }));
          const polyfillsInconnus = polyfills.filter((p) => !Object.hasOwn(this.polyfills, p.empreinte));
          if (polyfillsInconnus.length > 0) {
            refus.push(
              `fichier(s) de polyfills de Next d'empreinte inconnue (${polyfillsInconnus.map((p) => `${p.fichier} : ${p.empreinte}`).join(', ')}) : ` +
                'réénumérer ses composants depuis la source de @next/polyfill-nomodule (licences-hors-graphe.mjs)',
            );
          }
          const policesInconnues = [...polices].filter((nom) => !Object.hasOwn(this.polices, nom)).sort();
          if (policesInconnues.length > 0) {
            refus.push(`police(s) next/font sans mention de droits (licences-hors-graphe.mjs) : ${policesInconnues.join(', ')}`);
          }
          if (refus.length === 0) {
            for (const d of horsGraphe) dossiers.add(d);
            const muets = [...dossiers].map(lirePaquet).filter(sansLicence);
            if (muets.length > 0) {
              refus.push(
                `${muets.length} composant(s) livré(s) au navigateur sans licence lisible ` +
                  `(ni fichier de licence, ni licence déclarée MIT ou ISC) : ${muets.map(cle).join(', ')}`,
              );
            }
          }
          if (refus.length > 0) {
            for (const r of refus) {
              compilation.errors.push(new WebpackError(`${NOM_PLUGIN} : ${r}. Le fichier de mentions serait incomplet.`));
            }
            // Le fichier d'un build précédent ne reste pas servi depuis
            // `public/` : il décrirait un autre bundle que celui-ci.
            fs.rmSync(sortie, { force: true });
            return;
          }
          const horsDuGraphe = {
            polyfills: polyfills.map(({ fichier, empreinte }) => ({ fichier, ...this.polyfills[empreinte] })),
            polices: [...polices].sort().map((nom) => ({ nom, droits: this.polices[nom].droits })),
          };
          fs.mkdirSync(path.dirname(sortie), { recursive: true });
          fs.writeFileSync(sortie, composerMentions([...dossiers].map(lirePaquet), horsDuGraphe));
        },
      );
    });
  }
}
