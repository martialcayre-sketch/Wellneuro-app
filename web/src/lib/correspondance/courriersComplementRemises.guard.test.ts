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
//   — DEUX ÉMETTEURS, NOMMÉS (lot 3) : la consignation du générateur écrit la liste
//     avec son courrier, dans une seule transaction ; la remise au clic passe
//     par `createMany` (la base annule sans erreur une remise rejouée, et un
//     `create` qui attend sa ligne échouerait). Aucun troisième, et aucune
//     écriture imbriquée.

// LA PORTÉE EST CELLE DU PATRON : `src/`, `scripts/`, `prisma/`, `e2e/` et les
// scripts de la racine du dépôt, en TypeScript, JavaScript, SQL et shell.
// Restent dehors les migrations (le DDL) et `prisma/checks/` (les contrats,
// joués dans une transaction annulée).
const RACINE = process.cwd();
const RACINES = ['src', 'scripts', 'prisma', 'e2e', path.join('..', 'scripts')]
  .map(dossier => path.join(RACINE, dossier));
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');
const GENERATEUR = path.join('src', 'lib', 'correspondance', 'courrierComplementConsignation.ts');
const REMISE_AU_CLIC = path.join('src', 'lib', 'correspondance', 'courrierComplementRemise.ts');
const CREER_LISTE = /\.courrierComplementListe\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const CREER_REMISE = /\.courrierComplementRemise\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const CREER_REMISE_PAR_LOT = /\.courrierComplementRemise\s*\.\s*createMany\s*\(/;

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
// Le schéma, cité ou non, avec ou sans espaces autour du point : `public.`,
// `"public".`, `"public" . ` (revue CodeRabbit de #1679). Un filet, pas un
// analyseur SQL : un commentaire glissé entre les deux noms lui échappe.
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:"?public"?\s*\.\s*)?"?courriers_complement_(?:remises|listes)\b/i;
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

  it('deux émetteurs nommés — le générateur pour la liste, la remise au clic par `createMany` —, aucune écriture imbriquée', () => {
    const parFichier = <T extends { fichier: string }>(o: T[]) => [...o].sort((a, b) => a.fichier.localeCompare(b.fichier));
    expect(parFichier(occurrences(CREER))).toEqual(parFichier([
      { fichier: GENERATEUR, n: 1 },
      { fichier: REMISE_AU_CLIC, n: 1 },
    ]));
    expect(occurrences(CREER_LISTE)).toEqual([{ fichier: GENERATEUR, n: 1 }]);
    expect(occurrences(CREER_REMISE)).toEqual([{ fichier: REMISE_AU_CLIC, n: 1 }]);
    expect(occurrences(CREER_REMISE_PAR_LOT)).toEqual([{ fichier: REMISE_AU_CLIC, n: 1 }]);
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
    expect(SQL_BRUT.test('DELETE FROM "public" . "courriers_complement_listes" WHERE')).toBe(true);
    expect(IMBRIQUEE.test('data: { remiseComplement: { create: {} } }')).toBe(true);
    expect(IMBRIQUEE.test('data: { listeComplement: { create: {} } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { courriersComplementRemises: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
