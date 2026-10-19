import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LA COLLECTE DOCUMENTAIRE ([[D-329]], J3-collecte). Patron
// de `documents/documentMedecinImprime.guard.test.ts`.
//
// La base refuse déjà TRUNCATE, un dépôt hors bornes, une catégorie hors
// liste, toute modification d'un document autre que sa première consultation
// et son retrait, un autre praticien que celui du dossier, et la réécriture
// d'un classement. Elle ADMET le DELETE, voulu : l'effacement nommé du dossier
// doit pouvoir supprimer. Ce banc garde ce que la base ne peut pas dire — QUEL
// CODE écrit :
//   — une ligne ne se supprime QUE dans `patient/effacement.ts` : le patient
//     ne supprime pas lui-même un document (G-11), le retrait efface le
//     contenu et garde la ligne ;
//   — à la migration, AUCUN code ne dépose, ne consulte, ne classe ni ne
//     retire : la PR qui ouvre ces gestes nomme ici ses écrivains, un par
//     geste, et ce banc rougit tant qu'elle ne l'a pas fait.

const RACINE = process.cwd();
const RACINES = ['src', 'scripts', 'prisma', 'e2e', path.join('..', 'scripts')]
  .map(dossier => path.join(RACINE, dossier));
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (['node_modules', '.next', 'generated', 'migrations', 'checks'].includes(entree)) continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.(?:[cm]?[jt]sx?|sql|sh)$/.test(entree) && !/\.test\.[cm]?[jt]sx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return RACINES.flatMap(fichiersSources)
    .map(fichier => ({
      fichier: path.relative(RACINE, fichier),
      n: [...readFileSync(fichier, 'utf8').matchAll(new RegExp(motif.source, `${motif.flags}g`))].length,
    }))
    .filter(o => o.n > 0);
}

const MODELES = '(?:documentDeposePatient|classementDocumentDepose)';
const CREER = new RegExp(`\\.${MODELES}\\s*\\.\\s*(?:create|createMany|createManyAndReturn)\\s*\\(`);
const SUPPRIMER = new RegExp(`\\.${MODELES}\\s*\\.\\s*(?:delete|deleteMany)\\s*\\(`);
const REECRIRE = new RegExp(`\\.${MODELES}\\s*\\.\\s*(?:update|updateMany|updateManyAndReturn|upsert)\\s*\\(`);
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?(?:documents_deposes_patient|classements_documents_deposes)\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : les relations inverses sont `documentsDeposes` et
 * `classementsDocumentsDeposes` (patient), et `classements` (document).
 */
const IMBRIQUEE = /\b(?:documentsDeposes|classementsDocumentsDeposes|classements)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Collecte documentaire — qui écrit (D-329, J3-collecte)', () => {
  it('seul l’effacement nommé du dossier supprime — une instruction par table', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 2 }]);
  });

  it('aucun code ne dépose, ne consulte, ne retire ni ne classe encore', () => {
    expect(occurrences(CREER)).toEqual([]);
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.classementDocumentDepose.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.documentDeposePatient.create({ data })')).toBe(true);
    expect(CREER.test('prisma.classementDocumentDepose.createMany({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.documentDeposePatient.update({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.documents_deposes_patient WHERE')).toBe(true);
    expect(SQL_BRUT.test('update "classements_documents_deposes" set')).toBe(true);
    expect(IMBRIQUEE.test('data: { classements: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { documentsDeposes: { orderBy: { deposeLe: "desc" } } }')).toBe(false);
  });
});
