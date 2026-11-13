import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  createSourceFile,
  forEachChild,
  isIdentifier,
  parseConfigFileTextToJson,
  parseJsonConfigFileContent,
  resolveModuleName,
  ScriptKind,
  ScriptTarget,
  sys,
  type CompilerOptions,
  type Node,
} from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  estFichierSource,
  estUnTest,
  IMPORT_NON_CONSTANT,
  lire,
  RACINE,
  specificateursSyntaxiques,
} from '../bio-parcours/balayageSources';

// [[D-480]] §5.4 — AUCUNE SÉLECTION D'APRÈS LE DOSSIER : la bibliothèque des
// options ne lit aucune donnée patient — ni patient, ni réponse, ni résultat
// biologique. Elle énumère TOUTES les options d'une hypothèse ; c'est BP-18a
// qui choisira (cadrage `:260`, `:394`).
//
// CE QUE CE BANC PROUVE. Un module ne lit un dossier que par un accès : un
// client de base (Prisma, `pg`), un appel réseau (`fetch`, une route), une
// lecture de fichier, ou une variable d'environnement qui en mène à un. Ce banc
// suit la FERMETURE des imports du code de production du dossier — résolus
// comme le fait TypeScript, liens symboliques suivis — et exige :
//   1. qu'elle soit EXACTEMENT la liste ci-dessous : les vocabulaires et
//      structures signées dont la bibliothèque tire sa clé et sa population,
//      et le hachage. Tout module ajouté à la fermeture — un service, une
//      lecture, un client — rougit ce banc et se relit avant d'y entrer ;
//   2. que le seul module extérieur soit `crypto` (le hachage des empreintes) ;
//   3. qu'aucun fichier de la fermeture ne nomme un accès global au monde
//      extérieur (`fetch`, `process`, `globalThis`, le navigateur…) ;
//   4. qu'aucun import n'y soit calculé (un chargement qu'on ne lit pas).
// Les fonctions du module prennent leurs structures en paramètre : ce qu'un
// appelant leur passe n'est pas une lecture du module, et le banc §8
// (`importeurs.guard.test.ts`) tient la liste des appelants — vide.

const DOSSIER = 'web/src/lib/bibliotheque-options/';

/** La fermeture admise : les sources de production qu'atteint le dossier, dossier compris. */
const FERMETURE_ADMISE = [
  'web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts',
  'web/src/lib/bibliotheque-options/vocabulaire.ts',
  'web/src/lib/clinical/corpusSyntheseV1.ts',
  'web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts',
  'web/src/lib/fiches-usage/vocabulaire.ts',
  'web/src/lib/positions-expert/vocabulaire.ts',
];
const MODULES_EXTERIEURS_ADMIS = ['crypto'];

/**
 * Les noms d'un accès au monde extérieur sans import : réseau, environnement,
 * processus, navigateur, et les portes vers eux (`globalThis`, `eval`). Un
 * identifiant qui porte l'un de ces noms, où qu'il soit — appel, accès,
 * propriété —, rougit le banc : fail-closed.
 */
const ACCES_GLOBAUX = new Set([
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Request', 'navigator', 'window', 'document',
  'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'process', 'globalThis', 'global', 'self',
  'eval', 'Function', 'require', 'module', 'Deno', 'Bun', 'importScripts',
]);

function optionsDeResolution(): CompilerOptions {
  const fichier = join(RACINE, 'web/tsconfig.json');
  const { config, error } = parseConfigFileTextToJson(fichier, lire('web/tsconfig.json'));
  if (error || !config) throw new Error('web/tsconfig.json illisible');
  return parseJsonConfigFileContent({ ...config, include: [], files: [] }, sys, join(RACINE, 'web'), undefined, fichier).options;
}

const cheminReel = (chemin: string) => {
  try {
    return realpathSync(chemin);
  } catch {
    return chemin;
  }
};

/** Les identifiants d'accès global qu'un source nomme. */
function accesGlobaux(source: string, chemin: string): string[] {
  const fichier = createSourceFile(chemin, source, ScriptTarget.Latest, true, chemin.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS);
  const trouves = new Set<string>();
  const visiter = (n: Node): void => {
    if (isIdentifier(n) && ACCES_GLOBAUX.has(n.text)) trouves.add(n.text);
    forEachChild(n, visiter);
  };
  visiter(fichier);
  return [...trouves].sort();
}

/** La fermeture des imports du dossier : fichiers atteints, et spécificateurs qui ne mènent à aucun fichier du dépôt. */
function fermeture(): { fichiers: string[]; exterieurs: string[]; calcules: string[] } {
  const options = optionsDeResolution();
  const depart = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', DOSSIER], {
    cwd: RACINE,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(f => estFichierSource(f) && !estUnTest(f));
  const vus = new Set(depart);
  const file = [...depart];
  const exterieurs = new Set<string>();
  const calcules: string[] = [];
  while (file.length > 0) {
    const chemin = file.shift() as string;
    for (const s of specificateursSyntaxiques(lire(chemin), chemin)) {
      if (s === IMPORT_NON_CONSTANT) {
        calcules.push(chemin);
        continue;
      }
      const { resolvedModule } = resolveModuleName(s, join(RACINE, chemin), options, sys);
      const atteint = resolvedModule
        ? relative(cheminReel(RACINE), cheminReel(resolvedModule.resolvedFileName)).split(sep).join('/')
        : null;
      if (atteint && atteint.startsWith('web/src/') && !atteint.includes('/node_modules/')) {
        if (!vus.has(atteint)) {
          vus.add(atteint);
          file.push(atteint);
        }
      } else {
        exterieurs.add(s);
      }
    }
  }
  return { fichiers: [...vus].sort(), exterieurs: [...exterieurs].sort(), calcules };
}

describe('bibliothèque des options — aucune lecture de dossier (D-480 §5.4)', () => {
  const { fichiers, exterieurs, calcules } = fermeture();

  it('la fermeture des imports est exactement celle admise', () => {
    // Anti-vacuité : le dossier lui-même y est.
    expect(fichiers).toContain(`${DOSSIER}bibliothequeBesoin2V1.ts`);
    expect(fichiers).toEqual([...FERMETURE_ADMISE].sort());
  });

  it('le seul module extérieur est le hachage, et aucun import n’est calculé', () => {
    expect(exterieurs).toEqual(MODULES_EXTERIEURS_ADMIS);
    expect(calcules).toEqual([]);
  });

  it('aucun fichier de la fermeture ne nomme un accès au monde extérieur', () => {
    const acces = fichiers.flatMap(f => accesGlobaux(lire(f), f).map(nom => `${f}:${nom}`));
    expect(acces).toEqual([]);
  });

  // CONTRE-ÉPREUVE : chaque forme d'accès est vue ; un mot dans une chaîne ou un commentaire ne l'est pas.
  it('le détecteur voit chaque accès global, et ignore la prose', () => {
    const formes: [string, string][] = [
      ['const r = await fetch("/api/patients");', 'fetch'],
      ['const u = process.env.DATABASE_URL;', 'process'],
      ['const g = globalThis["fe" + "tch"];', 'globalThis'],
      ['const f = new Function("return 1");', 'Function'],
      ['window.location.href;', 'window'],
      ['const x = (0, eval)("1");', 'eval'],
      ['const m = module.require("pg");', 'module'],
    ];
    for (const [source, attendu] of formes) expect(accesGlobaux(source, 'x.ts'), source).toContain(attendu);
    expect(accesGlobaux('// fetch process\nconst t = "fetch window";', 'x.ts')).toEqual([]);
  });

  // CONTRE-ÉPREUVE de la fermeture : un import de lecture ajouté au module
  // sort de la liste admise — `@/lib/prisma` y entrerait, et nommé.
  it('un import de lecture ajouté au dossier sort de la fermeture admise', () => {
    const options = optionsDeResolution();
    const importeur = join(RACINE, `${DOSSIER}bibliothequeBesoin2V1.ts`);
    for (const s of ['@/lib/prisma', '@/lib/biology-library/lecture', '../patients/x']) {
      const { resolvedModule } = resolveModuleName(s, importeur, options, sys);
      const atteint = resolvedModule ? relative(RACINE, resolvedModule.resolvedFileName).split(sep).join('/') : s;
      expect(FERMETURE_ADMISE, s).not.toContain(atteint);
    }
    expect(MODULES_EXTERIEURS_ADMIS).not.toContain('@prisma/client');
    expect(MODULES_EXTERIEURS_ADMIS).not.toContain('pg');
  });
});
