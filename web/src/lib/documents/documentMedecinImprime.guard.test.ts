import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES IMPRESSIONS ET LES TÉLÉCHARGEMENTS DU DOCUMENT POUR LE
// MÉDECIN ([[D-307]], F38). Patron de `lettresAdressageRemises.guard.test.ts`.
//
// La base refuse déjà UPDATE et TRUNCATE, une synthèse non validée ou d'un
// autre dossier, un autre praticien, et le téléchargement d'une impression
// remplacée. Elle ADMET le DELETE, voulu : l'effacement nommé du dossier doit
// pouvoir supprimer. Ce banc garde ce que la base ne peut pas dire — QUEL CODE
// écrit :
//   — une ligne ne se supprime QUE dans `patient/effacement.ts` ;
//   — aucun code ne la réécrit, ni par Prisma, ni en SQL brut ;
//   — UN SEUL ENDROIT crée : `documents/documentMedecinImprime.ts`, qui relit
//     le partage avec le médecin traitant sous verrou avant d'écrire. Une
//     seconde écriture, ailleurs, contournerait cette garde.

const RACINE = process.cwd();
const RACINES = ['src', 'scripts', 'prisma', 'e2e', path.join('..', 'scripts')]
  .map(dossier => path.join(RACINE, dossier));
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');
const EMETTEUR = path.join('src', 'lib', 'documents', 'documentMedecinImprime.ts');

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

const MODELES = '(?:documentMedecinImprime|telechargementDocumentMedecin)';
const CREER = new RegExp(`\\.${MODELES}\\s*\\.\\s*(?:create|createMany|createManyAndReturn)\\s*\\(`);
const SUPPRIMER = new RegExp(`\\.${MODELES}\\s*\\.\\s*(?:delete|deleteMany)\\s*\\(`);
const REECRIRE = new RegExp(`\\.${MODELES}\\s*\\.\\s*(?:update|updateMany|updateManyAndReturn|upsert)\\s*\\(`);
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?(?:documents_medecin_imprimes|telechargements_documents_medecin)\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : les relations inverses sont `documentsMedecinImprimes`
 * (patient, synthèse), `telechargementsDocumentsMedecin` (patient) et
 * `telechargements` (impression).
 */
const IMBRIQUEE = /\b(?:documentsMedecinImprimes|telechargementsDocumentsMedecin|telechargements)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Document pour le médecin — qui écrit (D-307, F38)', () => {
  it('seul l’effacement nommé du dossier supprime — une instruction par table', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 2 }]);
  });

  it('aucun code ne réécrit une ligne, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('un seul endroit crée — une impression, un téléchargement —, et aucune écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([{ fichier: EMETTEUR, n: 2 }]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.telechargementDocumentMedecin.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.documentMedecinImprime.create({ data })')).toBe(true);
    expect(CREER.test('prisma.telechargementDocumentMedecin.createMany({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.documentMedecinImprime.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.documents_medecin_imprimes WHERE')).toBe(true);
    expect(SQL_BRUT.test('insert into "telechargements_documents_medecin" values')).toBe(true);
    expect(IMBRIQUEE.test('data: { telechargements: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { documentsMedecinImprimes: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
