import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  LIBELLE_AXE,
  LIBELLE_SENS,
  libelleNiveauPreuve,
  lireLiensAxe,
  type LigneLienAxe,
} from './liensAxe';

// F79 ([[D-351]] §4) — le nul de `niveau_preuve` est « non gradé », jamais une
// lettre : ni lu, ni trié, ni compté comme A à D.

function ligne(surcharge: Partial<LigneLienAxe> = {}): LigneLienAxe {
  return {
    cibleCode: 'inflammation',
    direction: 'haut_evocateur',
    claimId: 'WN-CL-0999-001',
    versionClaim: 'v1.0',
    niveauPreuve: null,
    ...surcharge,
  };
}

const MIGRATIONS = path.resolve(__dirname, '../../../prisma/migrations');

/** Les valeurs d'un `IN (…)` du CHECK nommé, lues dans sa migration. */
function valeursCheck(migration: string, contrainte: string): string[] {
  const sql = readFileSync(path.join(MIGRATIONS, migration, 'migration.sql'), 'utf8');
  const debut = sql.indexOf(`"${contrainte}"`);
  expect(debut).toBeGreaterThan(-1);
  const bloc = sql.slice(sql.indexOf('IN (', debut), sql.indexOf(')', sql.indexOf('IN (', debut)));
  return [...bloc.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
}

describe('liens d’axe — le niveau de preuve', () => {
  it('un nul se lit « non gradé », et se dit ainsi', () => {
    const [lien] = lireLiensAxe([ligne()]);
    expect(lien.niveauPreuve).toEqual({ statut: 'non_gradé' });
    expect(libelleNiveauPreuve(lien.niveauPreuve)).toBe('non gradé');
  });

  it('une lettre A à D garde sa lettre', () => {
    for (const lettre of ['A', 'B', 'C', 'D']) {
      const [lien] = lireLiensAxe([ligne({ niveauPreuve: lettre })]);
      expect(lien.niveauPreuve).toEqual({ statut: 'gradé', lettre });
      expect(libelleNiveauPreuve(lien.niveauPreuve)).toBe(lettre);
    }
  });

  it('une valeur hors A-D est écartée, jamais rendue « non gradé » ni lettre inventée', () => {
    expect(lireLiensAxe([ligne({ niveauPreuve: 'E' }), ligne({ niveauPreuve: '' })])).toEqual([]);
  });

  // Le tri ne lit jamais le niveau : sur un même axe, l'ordre est celui du
  // claim, que le lien soit gradé ou non.
  it('le tri suit la liste fermée puis le claim, jamais le niveau', () => {
    const liens = lireLiensAxe([
      ligne({ cibleCode: 'corticotrope', claimId: 'WN-CL-0999-003', niveauPreuve: 'A' }),
      ligne({ cibleCode: 'methylation', claimId: 'WN-CL-0999-009', niveauPreuve: 'A' }),
      ligne({ cibleCode: 'methylation', claimId: 'WN-CL-0999-002', niveauPreuve: null }),
    ]);
    expect(liens.map(l => `${l.axe}/${l.claimId}`)).toEqual([
      'methylation/WN-CL-0999-002',
      'methylation/WN-CL-0999-009',
      'corticotrope/WN-CL-0999-003',
    ]);
  });
});

describe('liens d’axe — le vocabulaire', () => {
  it('un axe ou un sens inconnu est écarté, y compris une clé du prototype', () => {
    expect(
      lireLiensAxe([
        ligne({ cibleCode: 'axe_inconnu' }),
        ligne({ cibleCode: 'constructor' }),
        ligne({ direction: 'toString' }),
      ]),
    ).toEqual([]);
  });

  // Les libellés couvrent exactement les codes que la base admet : un code
  // ajouté à la liste fermée sans libellé ferait disparaître ses liens.
  it('les dix axes sont ceux du CHECK de la liste fermée (D-348 §2), dans son ordre', () => {
    expect(Object.keys(LIBELLE_AXE)).toEqual(
      valeursCheck('20261024100000_biology_axes_liste_fermee_v1', 'biology_analyte_links_cible_axe_check'),
    );
  });

  it('les trois sens sont ceux du CHECK de direction', () => {
    expect(Object.keys(LIBELLE_SENS).sort()).toEqual(
      valeursCheck('20260725160000_cb_biologie_catalogue_v1', 'biology_analyte_links_direction_check').sort(),
    );
  });
});
