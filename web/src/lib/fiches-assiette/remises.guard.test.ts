import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES REMISES DE FICHES D'ASSIETTE ([[D-251]], lot 7, M2).
//
// La base refuse déjà UPDATE et TRUNCATE (triggers de la migration M2), et elle
// refuse d'insérer une remise qui ne serait pas la version de référence. Elle
// ADMET le DELETE, et c'est voulu : chaque remise est une donnée patient, que
// l'effacement nommé du dossier doit pouvoir supprimer. Ce banc garde ce que la
// base ne peut pas dire — QUEL CODE supprime :
//   — une remise ne se supprime QUE dans `patient/effacement.ts` ;
//   — aucun code ne la réécrit, ni par Prisma, ni en SQL brut ;
//   — UN SEUL ENDROIT en crée : `remise.ts` (lot 8), par `createMany` — la
//     base annule sans erreur une remise identique à la remise en cours, et un
//     `create` qui attend sa ligne en retour échouerait. La route de diffusion
//     l'appelle ; elle n'écrit pas elle-même.

const RACINE = path.join(process.cwd(), 'src');
const EFFACEMENT = path.join('lib', 'patient', 'effacement.ts');
const REMISE = path.join('lib', 'fiches-assiette', 'remise.ts');

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

const CREER = /\.ficheAssietteRemise\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const CREER_UNE = /\.ficheAssietteRemise\s*\.\s*create\s*\(/;
const SUPPRIMER = /\.ficheAssietteRemise\s*\.\s*(?:delete|deleteMany)\s*\(/;
const REECRIRE = /\.ficheAssietteRemise\s*\.\s*(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?fiches_assiette_remises\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : `protocolDiffusionApproval.create({ data: {
 * fichesAssietteRemises: { create: … } } })` créerait une remise sans passer
 * par les motifs ci-dessus. Les deux relations inverses sont nommées
 * `fichesAssietteRemises` (patient, approbation) et `remises` (version).
 */
const IMBRIQUEE = /\b(?:fichesAssietteRemises|remises)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Remises des fiches d’assiette — qui écrit (D-251, lot 7)', () => {
  it('seul l’effacement nommé du dossier supprime une remise — et il le fait (le banc n’est pas vide)', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 1 }]);
  });

  it('aucun code ne réécrit une remise, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('un seul endroit crée des remises — `remise.ts`, par `createMany` —, et aucune écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([{ fichier: REMISE, n: 1 }]);
    // Jamais `create` : une remise identique à la remise en cours rend zéro
    // ligne, et le `create` qui attend la sienne échouerait.
    expect(occurrences(CREER_UNE)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.ficheAssietteRemise.deleteMany({ where: par })')).toBe(true);
    expect(CREER_UNE.test('tx.ficheAssietteRemise.create({ data })')).toBe(true);
    expect(CREER_UNE.test('client.ficheAssietteRemise.createMany({ data })')).toBe(false);
    expect(REECRIRE.test('prisma.ficheAssietteRemise.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.fiches_assiette_remises WHERE')).toBe(true);
    expect(SQL_BRUT.test('update "fiches_assiette_remises" set')).toBe(true);
    expect(IMBRIQUEE.test('data: { fichesAssietteRemises: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { remises: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
