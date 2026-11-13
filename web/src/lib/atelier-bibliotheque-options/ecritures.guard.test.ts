import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT ET QUI LIT LE TEXTE DE LA BIBLIOTHÈQUE DES OPTIONS
// ([[D-480]] §3, §8 ; patron de `positions-expert/ecritures.guard.test.ts`).
//
// La base refuse UPDATE, DELETE et TRUNCATE sur les deux tables (triggers de
// la migration `20261111180000_bibliotheque_options_textes_v1`). Ce banc garde
// ce qu'elle ne peut pas dire : QUEL CODE insère — `ecriture.ts` seul, qui
// porte les refus de la route (option déclarée, état vu, structure signée) —
// et QUEL CODE lit : le module et les routes de l'atelier, rien d'autre. Ni
// portail, ni courrier, ni scoring, ni recherche, ni modèle (D-480 §8). Le
// cockpit (PR 6) s'ajoutera ici, sous son drapeau, en connaissance de cause.

const RACINE = path.join(process.cwd(), 'src');
const ECRITURE = path.join('lib', 'atelier-bibliotheque-options', 'ecriture.ts');

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules' || entree === '.next' || entree === 'generated') continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

const SOURCES = fichiersSources(RACINE).map(fichier => ({
  fichier: path.relative(RACINE, fichier),
  texte: readFileSync(fichier, 'utf8'),
}));

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return SOURCES
    .map(({ fichier, texte }) => ({ fichier, n: [...texte.matchAll(new RegExp(motif.source, `${motif.flags}g`))].length }))
    .filter(o => o.n > 0);
}

const modele = (nom: string, methodes: string) => new RegExp(`\\.${nom}\\s*\\.\\s*(?:${methodes})\\s*\\(`);
const CREER = 'create|createMany|createManyAndReturn';
const REECRIRE = 'update|updateMany|updateManyAndReturn|upsert|delete|deleteMany';
const LIRE = 'findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|aggregate|groupBy';
const MODELES = ['bibliothequeOptionTexte', 'bibliothequeOptionTexteActe'];
const TABLES = '(?:bibliotheque_options_textes_actes|bibliotheque_options_textes)';
const SQL_BRUT = new RegExp(`(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|TRUNCATE(?:\\s+TABLE)?)\\s+(?:public\\.)?"?${TABLES}\\b`, 'i');
const SQL_LECTURE = new RegExp(`\\b(?:FROM|JOIN)\\s+(?:public\\.)?"?${TABLES}\\b`, 'i');
const IMBRIQUEE = /\b(?:actes|texte)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;
const IMPORT_LECTURE = /import\s+(?!type\b)[^;]*from\s+['"]@\/lib\/atelier-bibliotheque-options\/(?:lecture|ecriture|http)['"]/;

describe('Bibliothèque des options — qui écrit et qui lit le texte (D-480 §3, §8)', () => {
  it('chaque table ne reçoit d’insertion que dans `ecriture.ts` — et y en reçoit (le banc n’est pas vide)', () => {
    expect(occurrences(modele('bibliothequeOptionTexte', CREER))).toEqual([{ fichier: ECRITURE, n: 1 }]);
    expect(occurrences(modele('bibliothequeOptionTexteActe', CREER))).toEqual([{ fichier: ECRITURE, n: 1 }]);
  });

  it('aucun code ne réécrit ni ne supprime ; aucun SQL brut, aucune écriture imbriquée', () => {
    for (const m of MODELES) expect(occurrences(modele(m, REECRIRE))).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('seuls le module et les routes de l’atelier lisent ces tables ou importent sa lecture', () => {
    const admis = (fichier: string) =>
      fichier.startsWith(path.join('lib', 'atelier-bibliotheque-options') + path.sep)
      || fichier.startsWith(path.join('app', 'api', 'praticien', 'atelier-options') + path.sep);
    for (const m of MODELES) expect(occurrences(modele(m, LIRE)).filter(o => !admis(o.fichier))).toEqual([]);
    expect(occurrences(SQL_LECTURE).filter(o => !admis(o.fichier))).toEqual([]);
    expect(occurrences(IMPORT_LECTURE).filter(o => !admis(o.fichier))).toEqual([]);
    // Le banc n'est pas vide : la lecture lit bien.
    expect(occurrences(modele('bibliothequeOptionTexte', LIRE)).length).toBeGreaterThan(0);
  });

  it('la garde rougit sur une source fabriquée (elle n’est pas décorative)', () => {
    expect(modele('bibliothequeOptionTexteActe', REECRIRE).test('tx.bibliothequeOptionTexteActe.update({})')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.bibliotheque_options_textes')).toBe(true);
    expect(SQL_LECTURE.test('SELECT * FROM "bibliotheque_options_textes_actes"')).toBe(true);
    expect(IMBRIQUEE.test('actes: { create: {} }')).toBe(true);
    expect(IMPORT_LECTURE.test("import { lireAtelierOptions } from '@/lib/atelier-bibliotheque-options/lecture';")).toBe(true);
    expect(IMPORT_LECTURE.test("import type { AtelierOptions } from '@/lib/atelier-bibliotheque-options/lecture';")).toBe(false);
  });
});
