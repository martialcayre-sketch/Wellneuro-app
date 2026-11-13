import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contexteResolution, designe, importsResolus } from '../bio-parcours/resolutionImports';

// GARDE : QUI ÉCRIT LES POSITIONS D'EXPERT ET LES ARBITRAGES (D-439, patron de
// `fiches-usage/ecritures.guard.test.ts`).
//
// La base refuse UPDATE, DELETE et TRUNCATE sur les trois tables (triggers de
// la migration `20261104230000_positions_expert_v1`). Ce banc garde ce qu'elle
// ne peut pas dire, QUEL CODE insère : `ecriture.ts` seul, qui porte les
// refus de la route (alternance, même fiche, une position par fiche, liste
// curée). Aucun autre code n'écrit, par Prisma ou en SQL brut, et aucune
// écriture imbriquée ne contourne ces motifs. Et aucun code hors de l'atelier
// ne LIT ces tables.

const RACINE = path.join(process.cwd(), 'src');
const ECRITURE = path.join('lib', 'positions-expert', 'ecriture.ts');

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
const MODELES = ['positionExpertVersion', 'positionExpertActe', 'arbitrageConflitSource'];
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?(?:positions_expert_versions|positions_expert_actes|arbitrages_conflits_sources)\b/i;
const IMBRIQUEE = /\b(?:actes|arbitrages|revisePar|remplacePar)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Positions d’expert — qui écrit (D-439)', () => {
  it('chaque table ne reçoit d’insertion que dans `ecriture.ts` — et y en reçoit (le banc n’est pas vide)', () => {
    expect(occurrences(modele('positionExpertVersion', CREER))).toEqual([{ fichier: ECRITURE, n: 1 }]);
    expect(occurrences(modele('positionExpertActe', CREER))).toEqual([{ fichier: ECRITURE, n: 1 }]);
    // Une pose et une révocation.
    expect(occurrences(modele('arbitrageConflitSource', CREER))).toEqual([{ fichier: ECRITURE, n: 2 }]);
  });

  it('aucun code ne réécrit ni ne supprime', () => {
    for (const m of MODELES) expect(occurrences(modele(m, REECRIRE))).toEqual([]);
  });

  it('aucun SQL brut n’écrit dans les trois tables, aucune écriture imbriquée', () => {
    expect(occurrences(SQL_BRUT)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  // QUI LIT (D-439 « Ne touche pas », A2) : ni portail, ni courrier, ni
  // scoring, ni orientation, ni recherche corpus, ni IA. Le module et les
  // routes de l'atelier seuls. Un lecteur neuf (le cockpit de la PR 4) doit
  // passer par le drapeau, et s'ajoute ici en connaissance de cause (revue
  // `wn-reviewer`).
  it('seuls le module et les routes de l’atelier lisent ces tables ou importent sa lecture', () => {
    const LIRE = 'findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|aggregate|groupBy';
    const SQL_LECTURE = /\b(?:FROM|JOIN)\s+(?:public\.)?"?(?:positions_expert_versions|positions_expert_actes|arbitrages_conflits_sources)\b/i;
    // L'IMPORT est lu par le parseur et RÉSOLU (lot `bp17-extension-bancs-garde`) :
    // relatif, `require`, `import()`, commentaire glissé, alias ou lien
    // symbolique ne le cachent plus ; un import indéterminé (non constant, nom
    // nu inconnu) compte comme lecteur. `import type` reste exempté.
    const contexte = contexteResolution();
    const MODULES_LECTURE = ['lecture', 'ecriture', 'http'].map(m => `web/src/lib/positions-expert/${m}.ts`);
    const importeLaLecture = (fichier: string, source?: string) =>
      importsResolus(`web/src/${fichier.split(path.sep).join('/')}`, contexte, source).some(
        i => !i.typeSeul && designe(i, /(^|\/)positions-expert\/(?:lecture|ecriture|http)$/, MODULES_LECTURE),
      );
    const admis = (fichier: string) =>
      fichier.startsWith(path.join('lib', 'positions-expert') + path.sep)
      || fichier.startsWith(path.join('app', 'api', 'praticien', 'positions-expert') + path.sep);
    for (const m of MODELES) expect(occurrences(modele(m, LIRE)).filter(o => !admis(o.fichier))).toEqual([]);
    expect(occurrences(SQL_LECTURE).filter(o => !admis(o.fichier))).toEqual([]);
    expect(SOURCES.map(s => s.fichier).filter(f => !admis(f) && importeLaLecture(f))).toEqual([]);
    // Le banc n'est pas vide : la lecture lit bien.
    expect(occurrences(modele('arbitrageConflitSource', LIRE)).length).toBeGreaterThan(0);
    expect(SOURCES.map(s => s.fichier).filter(f => admis(f) && importeLaLecture(f)).length).toBeGreaterThan(0);
    const neuf = path.join('lib', 'neuf', 'a.ts');
    for (const source of [
      "import { lireAtelierPositions } from '@/lib/positions-expert/lecture';",
      "import { lireAtelierPositions } from '../positions-expert/lecture';",
      'import/**/"@/lib/positions-expert/ecriture";',
      'const h = require("@/lib/positions-expert/" + "http");',
      'const m = await import(chemin);',
    ]) {
      expect(importeLaLecture(neuf, source), source).toBe(true);
    }
    expect(importeLaLecture(neuf, "import type { AtelierPositions } from '@/lib/positions-expert/lecture';")).toBe(false);
    // Tous les noms en `type` : effacé à la compilation (tant que `verbatimModuleSyntax` reste absent, verrou commun).
    expect(importeLaLecture(neuf, "import { type AtelierPositions } from '@/lib/positions-expert/lecture';")).toBe(false);
    expect(importeLaLecture(neuf, "import { type AtelierPositions, lireAtelierPositions } from '@/lib/positions-expert/lecture';")).toBe(true);
    expect(importeLaLecture(neuf, "import { x } from '@/lib/positions-expert/vocabulaire';")).toBe(false);
    // Le parseur et le résolveur lisent tout `web/src` : délai élargi.
  }, 120_000);

  it('la garde rougit sur une source fabriquée (elle n’est pas décorative)', () => {
    expect(modele('positionExpertActe', REECRIRE).test('tx.positionExpertActe.update({})')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.arbitrages_conflits_sources')).toBe(true);
    expect(IMBRIQUEE.test('actes: { create: {} }')).toBe(true);
  });
});
