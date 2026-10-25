import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CANDIDATS_NABM } from './candidatsNabm';
import {
  COMPOSITIONS_PREPAREES,
  OPERANDES_ABSENTS,
  TYPES_COMPOSITION,
  compositionPrepareePour,
  operandesAbsentsPour,
} from './compositionsPreparees';

// La liste préparée de F80 (D-323 §1) : sa FORME — chaque code existe au
// catalogue, rien ne se compose de lui-même, aucun composé n'est composant
// d'un autre —, jamais son contenu clinique, qui reste la signature du
// praticien.

const MIGRATIONS = join(__dirname, '../../../prisma/migrations');

/** Les codes que les migrations insèrent dans `biology_analytes`. */
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

const entrees = Object.entries(COMPOSITIONS_PREPAREES);

describe('compositions préparées (F80, D-323)', () => {
  it('chaque composé et chaque composant existent au catalogue', () => {
    const catalogue = codesAnalytesInseres();
    for (const [code, preparee] of entrees) {
      expect(catalogue.has(code), code).toBe(true);
      for (const composant of preparee.composants) expect(catalogue.has(composant), `${code} → ${composant}`).toBe(true);
    }
    for (const code of Object.keys(OPERANDES_ABSENTS)) expect(catalogue.has(code), code).toBe(true);
  });

  it('aucun composé ne se compose de lui-même, aucun composant n’est répété', () => {
    for (const [code, preparee] of entrees) {
      expect(preparee.composants, code).not.toContain(code);
      expect(new Set(preparee.composants).size, code).toBe(preparee.composants.length);
      expect(preparee.composants.length, code).toBeGreaterThan(0);
      expect(TYPES_COMPOSITION).toContain(preparee.type);
    }
  });

  it('aucun composé n’est composant d’un autre : pas d’imbrication, donc pas de cycle', () => {
    const composes = new Set(Object.keys(COMPOSITIONS_PREPAREES));
    for (const [code, preparee] of entrees) {
      for (const composant of preparee.composants) expect(composes.has(composant), `${code} → ${composant}`).toBe(false);
    }
  });

  it('le type suit la liste NABM : groupe et regroupement, calcul pour une valeur calculée', () => {
    for (const [code, preparee] of entrees) {
      const situation = CANDIDATS_NABM[code]?.situation;
      if (preparee.type === 'calcul') expect(situation, code).toBe('valeur_calculee');
      if (preparee.type === 'regroupement') expect(situation, code).toBe('regroupement');
      if (preparee.type === 'groupe') expect(situation, code).not.toBe('valeur_calculee');
    }
  });

  it('chaque valeur calculée de la liste NABM a une composition préparée ou un motif d’opérandes absents', () => {
    const calcules = Object.entries(CANDIDATS_NABM)
      .filter(([, c]) => c.situation === 'valeur_calculee')
      .map(([code]) => code);
    for (const code of calcules) {
      const prepare = compositionPrepareePour(code) !== null;
      const absent = operandesAbsentsPour(code) !== null;
      expect(prepare !== absent, code).toBe(true);
    }
  });

  it('les arbitrages du responsable tiennent : le LDL calculé est constituant du profil lipidique (D-323 §5)', () => {
    expect(compositionPrepareePour('BIO_PROFIL_LIPIDIQUE')?.composants).toContain('BIO_LDL_CALCULE');
    expect(compositionPrepareePour('BIO_LDL_CALCULE')).toBeNull();
    expect(compositionPrepareePour('BIO_NFS')?.composants).toHaveLength(20);
  });

  it('les rapports d’acides gras de D-364 : aucune liste avant la migration constatée (D-087)', () => {
    for (const code of ['BIO_RATIO_AA_EPA', 'BIO_RATIO_LA_DGLA', 'BIO_RATIO_OMEGA6_OMEGA3']) {
      expect(compositionPrepareePour(code), code).toBeNull();
    }
    expect(operandesAbsentsPour('BIO_RATIO_OMEGA6_OMEGA3')).toMatch(/pas au catalogue/);
  });

  it('une clé héritée de l’objet ne passe pas pour une composition', () => {
    expect(compositionPrepareePour('toString')).toBeNull();
    expect(operandesAbsentsPour('constructor')).toBeNull();
  });
});
