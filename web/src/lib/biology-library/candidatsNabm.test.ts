import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  CANDIDATS_NABM,
  MILLESIME_LISTE_NABM,
  SITUATIONS_AVEC_ACTE,
  SITUATIONS_NABM,
  candidatsNabmPour,
  type CandidatsAnalyteNabm,
} from './candidatsNabm';
import { CODE_ACTE_RE, NATURES_NABM } from './correspondancesNabm';

// Les constantes viennent du module serveur, qui importe Prisma : le banc ne
// lit aucune base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

// La liste préparée de M-3b (F54) : sa FORME, jamais son contenu clinique —
// chaque code d'acte relu au millésime courant reste le travail du serveur.

const MIGRATIONS = join(__dirname, '../../../prisma/migrations');

/** Les codes que les migrations insèrent dans `biology_analytes` (patron de
 *  `portesBiologiquesAssiettesV1.guard.test.ts`). */
function codesAnalytesInseres(): Set<string> {
  const codes = new Set<string>();
  for (const dossier of readdirSync(MIGRATIONS, { withFileTypes: true })) {
    if (!dossier.isDirectory()) continue;
    const sql = readFileSync(join(MIGRATIONS, dossier.name, 'migration.sql'), 'utf8');
    for (const bloc of sql.matchAll(/INSERT INTO "biology_analytes"[\s\S]*?;/g)) {
      for (const m of bloc[0].matchAll(/'(BIO_[A-Z0-9_]+)'/g)) codes.add(m[1]);
    }
  }
  return codes;
}

const entrees = Object.entries(CANDIDATS_NABM) as [string, CandidatsAnalyteNabm][];

describe('candidats NABM — la liste préparée (M-3b)', () => {
  it('couvre exactement les analytes que les migrations insèrent au catalogue', () => {
    const catalogue = codesAnalytesInseres();
    expect(catalogue.size).toBe(94);
    expect(Object.keys(CANDIDATS_NABM).sort()).toEqual([...catalogue].sort());
  });

  it('chaque code d’acte a quatre chiffres, chaque nature est l’une des trois, chaque motif est écrit', () => {
    for (const [analyte, fiche] of entrees) {
      expect(SITUATIONS_NABM).toContain(fiche.situation);
      if (!('candidats' in fiche)) {
        expect(fiche.motif.trim(), analyte).not.toBe('');
        continue;
      }
      for (const c of fiche.candidats) {
        expect(c.codeActe, analyte).toMatch(CODE_ACTE_RE);
        expect(NATURES_NABM, analyte).toContain(c.nature);
        expect(c.motif.trim(), analyte).not.toBe('');
      }
    }
  });

  it('une situation avec acte porte au moins un candidat, sans doublon ; les autres n’en portent aucun', () => {
    for (const [analyte, fiche] of entrees) {
      const avecActe = SITUATIONS_AVEC_ACTE.includes(fiche.situation);
      expect('candidats' in fiche, analyte).toBe(avecActe);
      if ('candidats' in fiche) {
        const codes = fiche.candidats.map(c => c.codeActe);
        expect(codes.length, analyte).toBeGreaterThan(0);
        expect(new Set(codes).size, analyte).toBe(codes.length);
      }
    }
  });

  it('les comptes relus le 2026-10-15, le 2026-10-18 et le 2026-10-24 tiennent (millésime V105, D-323 §6, D-360)', () => {
    expect(MILLESIME_LISTE_NABM).toBe('V105');
    const parSituation = Object.fromEntries(SITUATIONS_NABM.map(s => [s, 0])) as Record<string, number>;
    for (const [, fiche] of entrees) parSituation[fiche.situation] += 1;
    expect(parSituation).toEqual({
      libelle_explicite: 35,
      acte_de_groupe: 21,
      a_juger: 10,
      aucun_acte: 20,
      valeur_calculee: 7,
      regroupement: 1,
    });
  });

  it('un analyte hors de la liste rend null — y compris une clé héritée de l’objet', () => {
    expect(candidatsNabmPour('BIO_INCONNU')).toBeNull();
    expect(candidatsNabmPour('toString')).toBeNull();
    expect(candidatsNabmPour('BIO_FERRITINE')).toEqual(CANDIDATS_NABM.BIO_FERRITINE);
  });
});
