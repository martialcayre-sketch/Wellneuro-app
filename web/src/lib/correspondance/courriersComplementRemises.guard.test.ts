import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES REMISES DE COURRIER COMPLÉMENT ([[D-345]], J3-12h
// lot 2), sur le patron de `lettresAdressageRemises.guard.test.ts`.
//
// La base refuse déjà UPDATE et TRUNCATE, et toute remise dont la liste n'est
// pas celle du protocole approuvé ou dont le courrier n'est pas un courrier
// complément du dossier. Elle ADMET le DELETE, voulu : l'effacement nommé du
// dossier doit pouvoir la supprimer. Ce banc garde ce que la base ne peut pas
// dire — QUEL CODE écrit :
//   — une remise ne se supprime QUE dans `patient/effacement.ts` ;
//   — aucun code ne la réécrit, ni par Prisma, ni en SQL brut ;
//   — AUCUN CODE N'EN CRÉE avant le lot 3 : la migration part seule
//     ([[D-087]]) ; le lot 3 nommera ici son émetteur unique, par `createMany`
//     (la base annule sans erreur une remise rejouée pour la même liste, et un
//     `create` qui attend sa ligne échouerait).

// LA PORTÉE EST CELLE DU PATRON : `src/`, `scripts/`, `prisma/`, `e2e/` et les
// scripts de la racine du dépôt, en TypeScript, JavaScript, SQL et shell.
// Restent dehors les migrations (le DDL) et `prisma/checks/` (les contrats,
// joués dans une transaction annulée).
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

const CREER = /\.courrierComplementRemise\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const SUPPRIMER = /\.courrierComplementRemise\s*\.\s*(?:delete|deleteMany)\s*\(/;
const REECRIRE = /\.courrierComplementRemise\s*\.\s*(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?courriers_complement_remises\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : les relations inverses sont `courriersComplementRemises`
 * (patient, approbation) et `remiseComplement` (courrier consigné).
 */
const IMBRIQUEE = /\b(?:courriersComplementRemises|remiseComplement)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Remises de courrier complément — qui écrit (D-345, J3-12h lot 2)', () => {
  it('seul l’effacement nommé du dossier supprime une remise — et il le fait', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 1 }]);
  });

  it('aucun code ne réécrit une remise, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('aucun code ne crée de remise avant le lot 3, ni par écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.courrierComplementRemise.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.courrierComplementRemise.createMany({ data })')).toBe(true);
    expect(CREER.test('tx.courrierComplementRemise.create({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.courrierComplementRemise.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.courriers_complement_remises WHERE')).toBe(true);
    expect(SQL_BRUT.test('insert into "courriers_complement_remises" (')).toBe(true);
    expect(IMBRIQUEE.test('data: { remiseComplement: { create: {} } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { courriersComplementRemises: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
