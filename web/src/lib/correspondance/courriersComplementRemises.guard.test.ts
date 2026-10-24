import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES LISTES ET LES REMISES DE COURRIER COMPLÉMENT
// ([[D-345]], J3-12h lot 2), sur le patron de `lettresAdressageRemises.guard.test.ts`.
//
// La base refuse déjà UPDATE et TRUNCATE sur les deux tables, une liste qui
// n'est pas celle d'un courrier complément du dossier, et une remise dont la
// liste n'est pas celle du protocole approuvé ET du courrier. Elle ADMET le
// DELETE, voulu : l'effacement nommé du dossier doit pouvoir les supprimer.
// Ce banc garde ce que la base ne peut pas dire — QUEL CODE écrit :
//   — remises et listes ne se suppriment QUE dans `patient/effacement.ts` ;
//   — aucun code ne les réécrit, ni par Prisma, ni en SQL brut ;
//   — AUCUN CODE N'EN CRÉE avant le lot 3 : la migration part seule
//     ([[D-087]]) ; le lot 3 nommera ici ses émetteurs — le générateur du
//     courrier pour la liste, la remise au clic par `createMany` (la base
//     annule sans erreur une remise rejouée, et un `create` qui attend sa
//     ligne échouerait).

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

const MODELE = String.raw`\.courrierComplement(?:Remise|Liste)\s*\.\s*`;
const CREER = new RegExp(`${MODELE}(?:create|createMany|createManyAndReturn)\\s*\\(`);
const SUPPRIMER = new RegExp(`${MODELE}(?:delete|deleteMany)\\s*\\(`);
const REECRIRE = new RegExp(`${MODELE}(?:update|updateMany|updateManyAndReturn|upsert)\\s*\\(`);
// Le schéma, cité ou non : `public.`, `"public".` (revue CodeRabbit de #1679).
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:"?public"?\.)?"?courriers_complement_(?:remises|listes)\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : les relations inverses sont `courriersComplementRemises`
 * (patient, approbation), `courriersComplementListes` (patient), `remiseComplement`
 * et `listeComplement` (courrier consigné), `remise` et `liste` (entre les deux tables).
 */
const IMBRIQUEE = /\b(?:courriersComplementRemises|courriersComplementListes|remiseComplement|listeComplement|remise|liste)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Listes et remises de courrier complément — qui écrit (D-345, J3-12h lot 2)', () => {
  it('seul l’effacement nommé du dossier supprime remises et listes — et il le fait', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 2 }]);
  });

  it('aucun code ne réécrit une remise ou une liste, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('aucun code ne crée de remise ni de liste avant le lot 3, ni par écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.courrierComplementRemise.deleteMany({ where: par })')).toBe(true);
    expect(SUPPRIMER.test('tx.courrierComplementListe.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.courrierComplementRemise.createMany({ data })')).toBe(true);
    expect(CREER.test('tx.courrierComplementListe.create({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.courrierComplementListe.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.courriers_complement_remises WHERE')).toBe(true);
    expect(SQL_BRUT.test('insert into "courriers_complement_listes" (')).toBe(true);
    expect(SQL_BRUT.test('INSERT INTO "public"."courriers_complement_listes" (')).toBe(true);
    expect(SQL_BRUT.test('TRUNCATE TABLE "public"."courriers_complement_remises"')).toBe(true);
    expect(IMBRIQUEE.test('data: { remiseComplement: { create: {} } }')).toBe(true);
    expect(IMBRIQUEE.test('data: { listeComplement: { create: {} } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { courriersComplementRemises: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
