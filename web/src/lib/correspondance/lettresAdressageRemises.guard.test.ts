import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES REMISES DE LETTRE D'ADRESSAGE ([[D-262]], LOT-01).
//
// La base refuse déjà UPDATE et TRUNCATE, et toute remise qui ne porterait pas
// la lettre active du dossier sous une diffusion qui s'ouvre sur l'orientation.
// Elle ADMET le DELETE, voulu : l'effacement nommé du dossier doit pouvoir la
// supprimer. Ce banc garde ce que la base ne peut pas dire — QUEL CODE écrit :
//   — une remise ne se supprime QUE dans `patient/effacement.ts` ;
//   — aucun code ne la réécrit, ni par Prisma, ni en SQL brut ;
//   — UN SEUL ENDROIT en crée : `lettreAdressageRemise.ts` (LOT-02), par
//     `createMany` — la base annule sans erreur une remise identique à la
//     remise en cours, et un `create` qui attend sa ligne échouerait. La route
//     de diffusion l'appelle ; elle n'écrit pas elle-même.

// LA PORTÉE EST CELLE DE LA GARDE DES ADRESSAGES : `src/`, `scripts/`,
// `prisma/`, `e2e/` et les scripts de la racine du dépôt, en TypeScript,
// JavaScript, SQL et shell (revue de la PR #1300) — un seed, un script ou un
// `psql -c` contournerait le banc aussi sûrement qu'une route. Restent dehors
// les migrations (le DDL) et `prisma/checks/` (les contrats, joués dans une
// transaction annulée).
const RACINE = process.cwd();
const RACINES = ['src', 'scripts', 'prisma', 'e2e', path.join('..', 'scripts')]
  .map(dossier => path.join(RACINE, dossier));
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');
const EMETTEUR = path.join('src', 'lib', 'correspondance', 'lettreAdressageRemise.ts');

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

const CREER = /\.lettreAdressageRemise\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const CREER_UNE = /\.lettreAdressageRemise\s*\.\s*create\s*\(/;
const SUPPRIMER = /\.lettreAdressageRemise\s*\.\s*(?:delete|deleteMany)\s*\(/;
const REECRIRE = /\.lettreAdressageRemise\s*\.\s*(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?lettres_adressage_remises\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : les relations inverses sont `lettresAdressageRemises`
 * (patient, approbation) et `remisesPatient` (lettre consignée).
 */
const IMBRIQUEE = /\b(?:lettresAdressageRemises|remisesPatient)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Remises de lettre d’adressage — qui écrit (D-262, LOT-01)', () => {
  it('seul l’effacement nommé du dossier supprime une remise — et il le fait', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 1 }]);
  });

  it('aucun code ne réécrit une remise, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('un seul endroit crée des remises — par `createMany` —, et aucune écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([{ fichier: EMETTEUR, n: 1 }]);
    expect(occurrences(CREER_UNE)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.lettreAdressageRemise.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.lettreAdressageRemise.createMany({ data })')).toBe(true);
    expect(CREER_UNE.test('tx.lettreAdressageRemise.create({ data })')).toBe(true);
    expect(CREER_UNE.test('client.lettreAdressageRemise.createMany({ data })')).toBe(false);
    expect(REECRIRE.test('prisma.lettreAdressageRemise.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.lettres_adressage_remises WHERE')).toBe(true);
    expect(SQL_BRUT.test('update "lettres_adressage_remises" set')).toBe(true);
    expect(IMBRIQUEE.test('data: { remisesPatient: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { lettresAdressageRemises: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
