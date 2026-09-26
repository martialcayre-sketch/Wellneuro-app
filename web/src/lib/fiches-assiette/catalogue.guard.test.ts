import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LE CATALOGUE DES FICHES D'ASSIETTE ([[D-251]], lot 4).
//
// La base refuse déjà toute réécriture et tout effacement des deux tables
// (triggers de la migration M1). Ce banc garde l'autre moitié, que la base ne
// voit pas : QUEL CODE écrit.
//   — une version ne se crée QUE par la voie d'ingestion (`ingestion.ts`), qui
//     ne dépose que des brouillons ;
//   — aucun code ne crée encore d'acte : la validation arrive au lot 6, par
//     une route du responsable. Ce jour-là, ce banc s'ouvre à ce seul fichier,
//     et jamais à `ingestion.ts` (`DC-16` : « jamais le même chemin ») ;
//   — aucun code ne tente de réécrire ou d'effacer, ni par Prisma, ni en SQL
//     brut. Le trigger refuserait, mais une route qui échoue en production est
//     un défaut que le banc voit avant elle.

const RACINE = path.join(process.cwd(), 'src');
const INGESTION = path.join('lib', 'fiches-assiette', 'ingestion.ts');

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

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return fichiersSources(RACINE)
    .map(fichier => ({
      fichier: path.relative(RACINE, fichier),
      n: [...readFileSync(fichier, 'utf8').matchAll(new RegExp(motif.source, `${motif.flags}g`))].length,
    }))
    .filter(o => o.n > 0);
}

const CREER_VERSION = /\.ficheAssietteVersion\s*\.\s*create\s*\(/;
const CREER_ACTE = /\.ficheAssietteActe\s*\.\s*create\s*\(/;
const REECRIRE =
  /\.ficheAssiette(?:Version|Acte)\s*\.\s*(?:createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?fiches_assiette_(?:versions|actes)\b/i;

describe('Catalogue des fiches d’assiette — qui écrit (D-251, lot 4)', () => {
  it('seule la voie d’ingestion crée une version — et elle le fait (le banc n’est pas vide)', () => {
    expect(occurrences(CREER_VERSION)).toEqual([{ fichier: INGESTION, n: 1 }]);
  });

  it('aucun code ne crée d’acte : la validation n’a pas encore de chemin (lot 6)', () => {
    expect(occurrences(CREER_ACTE)).toEqual([]);
  });

  it('aucun code ne réécrit ni n’efface une version ou un acte, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('le motif SQL reconnaît bien les formes qu’il doit refuser', () => {
    expect(SQL_BRUT.test('INSERT INTO public.fiches_assiette_versions')).toBe(true);
    expect(SQL_BRUT.test('update "fiches_assiette_actes" set')).toBe(true);
    expect(SQL_BRUT.test('pg_advisory_xact_lock(hashtext(fiches_assiette_versions:WN-SRC-0300))')).toBe(false);
  });
});
