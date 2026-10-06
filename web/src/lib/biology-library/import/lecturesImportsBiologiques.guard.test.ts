import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES ACTES DE LECTURE D'UN IMPORT BIOLOGIQUE ([[D-268]],
// BIO-PARCOURS BP-10, migration `lectures_imports_biologiques_v1`).
//
// Une ligne `lecture` RÉSOUT le signalement d'un import validé : elle dit
// qu'un praticien a lu le compte rendu. La base refuse déjà UPDATE et
// TRUNCATE, l'acte d'un autre praticien que celui du dossier, la lecture d'un
// import sans ligne validée et une seconde lecture active. Elle ADMET le
// DELETE, et c'est voulu : chaque ligne est une donnée patient, que
// l'effacement nommé du dossier doit pouvoir supprimer. Ce banc garde ce que
// la base ne peut pas dire — QUEL CODE écrit :
//   — un acte ne se supprime QUE dans `patient/effacement.ts` (supprimer une
//     révocation ferait passer pour lue une lecture révoquée) ;
//   — aucun code ne le réécrit, ni par Prisma, ni en SQL brut ;
//   — AUCUN écrivain ni lecteur à ce jour : la migration est livrée seule
//     ([[D-087]], [[D-266]] §11). La PR du code consommateur nommera ici la
//     route de l'acte et le lecteur de la carte du Fil, et eux seuls.
//
// LA PORTÉE COUVRE `src/`, `scripts/`, `prisma/`, `e2e/` ET les scripts de la
// racine du dépôt, en TypeScript, JavaScript, SQL et shell (patron du banc des
// adressages sur signal d'alerte). Restent dehors les migrations (le DDL) et
// `prisma/checks/` (les contrats, joués dans une transaction annulée).

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

const CREER = /\.lectureImportBiologique\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const SUPPRIMER = /\.lectureImportBiologique\s*\.\s*(?:delete|deleteMany)\s*\(/;
const REECRIRE = /\.lectureImportBiologique\s*\.\s*(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/;
const LIRE = /\.lectureImportBiologique\s*\.\s*(?:findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|aggregate|groupBy)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?lectures_imports_biologiques\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : `importBiologique.update({ data: { lectures: {
 * create: … } } })` créerait un acte sans passer par les motifs ci-dessus. Les
 * relations inverses sont nommées `lecturesImportsBiologiques` (patient),
 * `lectures` (import) et `revocations` (la lecture révoquée) — ce dernier nom
 * est partagé avec les adressages, dont le banc refuse déjà la même forme.
 */
const IMBRIQUEE = /\b(?:lecturesImportsBiologiques|lectures|revocations)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Actes de lecture d’un import biologique — qui écrit, qui lit (D-268, BP-10)', () => {
  it('seul l’effacement nommé supprime un acte — et il le fait', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 1 }]);
  });

  it('aucun code ne réécrit un acte, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('aucun écrivain ni lecteur avant le code consommateur, sans écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([]);
    expect(occurrences(LIRE)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.lectureImportBiologique.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.lectureImportBiologique.create({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.lectureImportBiologique.upsert({')).toBe(true);
    expect(LIRE.test('prisma.lectureImportBiologique.findMany({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.lectures_imports_biologiques WHERE')).toBe(true);
    expect(SQL_BRUT.test('update "lectures_imports_biologiques" set')).toBe(true);
    expect(IMBRIQUEE.test('data: { lectures: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { revocations: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
