import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LA COLLECTE DOCUMENTAIRE ([[D-330]], J3-collecte). Patron
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
//   — à la migration, AUCUN code ne déposait, ne consultait, ne classait ni ne
//     retirait. La PR du code ([[D-330]] §4) nomme ici ses écrivains, un par
//     geste, tous dans `collecte/documentsDeposesServeur.ts` : le dépôt et le
//     classement (deux `create`), la première consultation et le retrait
//     (deux `updateMany`, conditionnels). Un écrivain de plus fait rougir ;
//   — une LISTE ne charge jamais le document : `contenu: true` ne se lit
//     qu'une fois, dans la consultation, et aucune relation inverse n'est
//     incluse en entier (un `include` chargerait toutes les colonnes).

const RACINE = process.cwd();
const RACINES = ['src', 'scripts', 'prisma', 'e2e', path.join('..', 'scripts')]
  .map(dossier => path.join(RACINE, dossier));
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');
const SERVEUR = path.join('src', 'lib', 'collecte', 'documentsDeposesServeur.ts');

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

/** Une relation inverse incluse en entier : toutes les colonnes, `contenu` compris. */
const INCLUSION = /\b(?:documentsDeposes|document)\s*:\s*true\b|include\s*:\s*\{\s*(?:documentsDeposes|document)\b/;

/** Une lecture du modèle des documents (`count` ne charge aucune colonne). */
const LECTURE_DOCUMENT = /\.documentDeposePatient\s*\.\s*(?:findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow)\s*\(/g;
const SELECT = /\bselect\s*:/;

/** Le texte des arguments d'un appel, de la parenthèse ouverte à sa fermante. */
function argumentsDe(source: string, debut: number): string {
  let profondeur = 1;
  for (let i = debut; i < source.length; i++) {
    if (source[i] === '(') profondeur++;
    else if (source[i] === ')' && --profondeur === 0) return source.slice(debut, i);
  }
  return source.slice(debut);
}

describe('Collecte documentaire — qui écrit (D-330, J3-collecte)', () => {
  it('seul l’effacement nommé du dossier supprime — une instruction par table', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 2 }]);
  });

  it('un seul module dépose, classe, consulte et retire — un écrivain par geste', () => {
    expect(occurrences(CREER)).toEqual([{ fichier: SERVEUR, n: 2 }]);
    expect(occurrences(REECRIRE)).toEqual([{ fichier: SERVEUR, n: 2 }]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('le document ne se charge qu’à la consultation, jamais dans une liste', () => {
    // Parmi les fichiers qui lisent la collecte : `contenu` est une colonne
    // d'autres tables aussi (comptes rendus, documents remis).
    const lecteurs = new Set(occurrences(new RegExp(`\\.${MODELES}\\b|\\bdocumentsDeposes\\b`)).map(o => o.fichier));
    expect(occurrences(/\bcontenu\s*:\s*true\b/).filter(o => lecteurs.has(o.fichier))).toEqual([{ fichier: SERVEUR, n: 1 }]);
    expect(occurrences(INCLUSION)).toEqual([]);
  });

  it('toute lecture d’un document porte son `select` — sans lui, `contenu` serait chargé', () => {
    const sansSelect: string[] = [];
    for (const fichier of RACINES.flatMap(fichiersSources)) {
      const source = readFileSync(fichier, 'utf8');
      for (const appel of source.matchAll(LECTURE_DOCUMENT)) {
        if (!SELECT.test(argumentsDe(source, (appel.index ?? 0) + appel[0].length))) {
          sansSelect.push(path.relative(RACINE, fichier));
        }
      }
    }
    expect(sansSelect).toEqual([]);
    // Contre-épreuve : le motif voit une lecture nue, et l'accepte avec `select`.
    const nue = 'prisma.documentDeposePatient.findMany({ where: { idPatient } })';
    const avec = 'prisma.documentDeposePatient.findFirst({ where: { id }, select: { id: true } })';
    expect(SELECT.test(argumentsDe(nue, nue.indexOf('(') + 1))).toBe(false);
    expect(SELECT.test(argumentsDe(avec, avec.indexOf('(') + 1))).toBe(true);
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
    expect(INCLUSION.test('include: { documentsDeposes: { orderBy: { deposeLe: "desc" } } }')).toBe(true);
    expect(INCLUSION.test('select: { document: true }')).toBe(true);
  });
});
