import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI SUPPRIME DANS LE STAGING D'IMPORT BIOLOGIQUE ([[D-256]] A2/A5,
// BIO-INGEST LOT-02, migration `bio_ingest_staging_v1`).
//
// La base refuse déjà ce qui réécrirait la trace : UPDATE du compte rendu,
// réécriture de ce qu'une extraction a lu, seconde décision, TRUNCATE
// (triggers de la migration). Elle ADMET le DELETE, et c'est voulu : chaque
// ligne est une donnée patient, que l'effacement nommé du dossier doit pouvoir
// supprimer. Ce banc garde ce que la base ne peut pas dire — QUEL CODE
// supprime : l'effacement nommé, une fois par table. Un compte
// rendu ou une extraction supprimés ailleurs effaceraient la provenance d'un
// résultat validé (A5). Le SECOND auteur, admis nommément par la PR 2 :
// le retrait d'un dépôt erroné (arbitrage du 2026-10-01), tant qu'aucune ligne
// n'est validée — `import/retrait.ts`, une fois par table lui aussi.
//
// PORTÉE : le code de l'application, mais aussi les scripts, le dossier
// Prisma (seed) et les E2E (un nettoyage Playwright) — un script qui
// supprimerait du staging n'en serait pas moins un auteur (revue
// `wn-reviewer`). Les bancs unitaires (`*.test.*`) en sont exclus : ils
// nomment les motifs qu'ils éprouvent.

const WEB = process.cwd();
const RACINES = [
  path.join(WEB, 'src'),
  path.join(WEB, 'scripts'),
  path.join(WEB, 'prisma'),
  path.join(WEB, 'e2e'),
  path.join(WEB, '..', 'scripts'),
];
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');
const RETRAIT = path.join('src', 'lib', 'biology-library', 'import', 'retrait.ts');

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules' || entree === '.next' || entree === 'generated') continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.(?:tsx?|mjs|cjs|js)$/.test(entree) && !/\.test\.(?:tsx?|mjs|js)$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return RACINES.filter(racine => existsSync(racine))
    .flatMap(racine => fichiersSources(racine))
    .map(fichier => ({
      fichier: path.relative(WEB, fichier),
      n: [...readFileSync(fichier, 'utf8').matchAll(new RegExp(motif.source, `${motif.flags}g`))].length,
    }))
    .filter(o => o.n > 0);
}

const SUPPRIMER =
  /\.(?:compteRenduBiologique|importBiologique|ligneBiologiqueCandidate)\s*\.\s*(?:delete|deleteMany)\s*\(/;
const SQL_BRUT =
  /(?:DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?(?:comptes_rendus_biologiques|imports_biologiques|lignes_biologiques_candidates)\b/i;

describe('Staging d’import biologique — qui supprime (D-256, LOT-02)', () => {
  it('seuls l’effacement nommé du dossier et le retrait d’un dépôt erroné suppriment, une fois par table', () => {
    const auteurs = occurrences(SUPPRIMER).sort((a, b) => a.fichier.localeCompare(b.fichier));
    expect(auteurs).toEqual([{ fichier: RETRAIT, n: 3 }, { fichier: EFFACEMENT, n: 3 }]);
  });

  it('aucun code ne supprime le staging en SQL brut', () => {
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.ligneBiologiqueCandidate.deleteMany({ where: par })')).toBe(true);
    expect(SUPPRIMER.test('prisma.compteRenduBiologique.delete({ where: { id } })')).toBe(true);
    expect(SUPPRIMER.test('prisma.importBiologique.findMany({')).toBe(false);
    expect(SQL_BRUT.test('DELETE FROM public.comptes_rendus_biologiques WHERE')).toBe(true);
    expect(SQL_BRUT.test('truncate table "lignes_biologiques_candidates"')).toBe(true);
  });
});
