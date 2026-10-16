import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  natureDuTerme,
  RE_FICHE_USAGE,
  RE_HYPOTHESE,
  RE_POPULATION,
  RUBRIQUES_FICHE_USAGE,
} from './vocabulaire';

// La base ferme les mêmes listes que ce module (D-314 §8). Ce banc lit la
// migration et refuse que les deux divergent : une rubrique ajoutée d'un seul
// côté serait refusée par la base sans que le code le sache, ou acceptée par
// le code sans que la base le sache.

const RACINE = path.resolve(__dirname, '../../../..');
const MIGRATION = path.join(RACINE, 'web/prisma/migrations/20261016090000_fiches_usage_v1/migration.sql');
const sql = readFileSync(MIGRATION, 'utf8');

/** Les littéraux de la première liste `IN (…)` qui suit `ancre`. */
function listeApres(ancre: string): string[] {
  const debut = sql.indexOf(ancre);
  expect(debut, `ancre introuvable dans la migration : ${ancre}`).toBeGreaterThan(-1);
  const bloc = /IN \(([^)]*)\)/.exec(sql.slice(debut));
  expect(bloc, `liste IN (…) introuvable après ${ancre}`).not.toBeNull();
  return [...(bloc as RegExpExecArray)[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
}

describe('vocabulaire des fiches d’usage — aligné sur la migration (D-314 §8)', () => {
  it('le CHECK des actes ferme exactement les rubriques du module', () => {
    expect(listeApres('"fiches_usage_actes_rubrique_fermee"').sort()).toEqual([...RUBRIQUES_FICHE_USAGE].sort());
  });

  it('le trigger des versions ferme exactement les rubriques du module', () => {
    expect(listeApres('IF cle NOT IN').sort()).toEqual([...RUBRIQUES_FICHE_USAGE].sort());
  });

  it('« explication patient » reste hors de la liste (arbitrage 6)', () => {
    expect(RUBRIQUES_FICHE_USAGE).not.toContain('explication_patient');
  });

  it('les formats d’identifiants sont ceux de la base (arbitrage 14)', () => {
    expect(sql).toContain(`'${RE_FICHE_USAGE.source}'`);
    expect(sql).toContain(`'${RE_HYPOTHESE.source}'`);
    expect(sql).toContain(`'${RE_POPULATION.source}'`);
  });

  it('la nature se lit au préfixe, et un terme sans préfixe n’en a aucune', () => {
    expect(natureDuTerme('HYP_A1')).toBe('hypothese');
    expect(natureDuTerme('POP_ADULTE')).toBe('population');
    expect(natureDuTerme('FU_X')).toBeNull();
    expect(natureDuTerme('hyp_a')).toBeNull();
    expect(natureDuTerme('HYP-A')).toBeNull();
  });
});
