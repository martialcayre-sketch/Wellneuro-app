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
//   — AUCUN code ne la crée encore : LOT-01 livre la table seule ([[D-087]]).
//     Le LOT-02 nommera ici son unique émetteur, par `createMany` (la base
//     annule sans erreur une remise identique à la remise en cours).

const RACINE = path.join(process.cwd(), 'src');
const EFFACEMENT = path.join('lib', 'patient', 'effacement.ts');

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

const CREER = /\.lettreAdressageRemise\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
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

  it('aucun code ne crée encore de remise, ni directement ni par écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.lettreAdressageRemise.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.lettreAdressageRemise.createMany({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.lettreAdressageRemise.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.lettres_adressage_remises WHERE')).toBe(true);
    expect(SQL_BRUT.test('update "lettres_adressage_remises" set')).toBe(true);
    expect(IMBRIQUEE.test('data: { remisesPatient: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { lettresAdressageRemises: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
