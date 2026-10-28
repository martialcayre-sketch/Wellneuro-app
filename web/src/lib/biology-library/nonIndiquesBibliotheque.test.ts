import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDICATIONS_BIOLOGIE_V1, type RegleIndicationPanel } from './indicationsBiologieV1';
import {
  ANALYTE_ALTERNATIF_NON_INDIQUE,
  explorationsNonIndiqueesParAnalyte,
  reglesNonIndiquees,
} from './nonIndiquesBibliotheque';

const LIBELLES = new Map([
  ['PANEL_MG_PLASMATIQUE', 'Magnésium plasmatique'],
  ['PANEL_CORTISOL_ISOLE', 'Cortisol matinal isolé'],
]);

/** Les codes d'analytes semés par les migrations du catalogue. */
function analytesSemes(): Set<string> {
  const racine = path.resolve(__dirname, '../../../prisma/migrations');
  const codes = new Set<string>();
  for (const dossier of readdirSync(racine)) {
    let sql: string;
    try {
      sql = readFileSync(path.join(racine, dossier, 'migration.sql'), 'utf8');
    } catch {
      continue;
    }
    for (const m of sql.matchAll(/\('bioan_[a-z0-9_]+',\s*'(BIO_[A-Z0-9_]+)'/g)) codes.add(m[1]);
  }
  return codes;
}

describe('rattachement des explorations non indiquées (D-320 §3)', () => {
  it('chaque règle non indiquée publiée de la table signée est rattachée — une nouvelle règle sans rattachement rougit ici', () => {
    const regles = reglesNonIndiquees();
    expect(regles.map(regle => regle.id).sort()).toEqual(
      Object.keys(ANALYTE_ALTERNATIF_NON_INDIQUE).sort(),
    );
  });

  it('chaque analyte de rattachement existe au catalogue semé', () => {
    const semes = analytesSemes();
    for (const code of Object.values(ANALYTE_ALTERNATIF_NON_INDIQUE)) {
      expect(semes.has(code), code).toBe(true);
    }
  });

  it('le motif de la règle nomme l’analyte de rattachement (l’exploration pertinente)', () => {
    const nomme: Record<string, RegExp> = {
      BIO_MAGNESIUM_ERYTHROCYTAIRE: /exploration pertinente est le magnésium érythrocytaire/,
      BIO_CAR: /exploration pertinente est le cortisol awakening response/,
    };
    for (const regle of reglesNonIndiquees()) {
      expect(regle.motif).toMatch(nomme[ANALYTE_ALTERNATIF_NON_INDIQUE[regle.id]]);
    }
  });

  it('rend motif VERBATIM, premier claim et libellé du bilan, par analyte', () => {
    const parAnalyte = explorationsNonIndiqueesParAnalyte(LIBELLES, INDICATIONS_BIOLOGIE_V1, true);
    const regle = INDICATIONS_BIOLOGIE_V1.find(r => r.id === 'BIO-NIA-01')!;
    expect(parAnalyte.get('BIO_MAGNESIUM_ERYTHROCYTAIRE')).toEqual([
      {
        exploration: 'Magnésium plasmatique',
        motif: regle.motif,
        claimId: 'WN-CL-0242-007',
        versionClaim: regle.justificationClaims[0].versionClaim,
      },
    ]);
    expect(parAnalyte.get('BIO_CAR')?.[0].exploration).toBe('Cortisol matinal isolé');
    expect([...parAnalyte.keys()].sort()).toEqual(['BIO_CAR', 'BIO_MAGNESIUM_ERYTHROCYTAIRE']);
  });

  it('le claim est cité avec sa version, lue dans la table signée, jamais écrite ici (D-389 §3)', () => {
    const parAnalyte = explorationsNonIndiqueesParAnalyte(LIBELLES, INDICATIONS_BIOLOGIE_V1, true);
    for (const regle of reglesNonIndiquees()) {
      const [item] = parAnalyte.get(ANALYTE_ALTERNATIF_NON_INDIQUE[regle.id]) ?? [];
      expect(item?.claimId).toBe(regle.justificationClaims[0].claimId);
      expect(item?.versionClaim).toBe(regle.justificationClaims[0].versionClaim);
      expect(item?.versionClaim).toMatch(/^v\d+\.\d+$/);
    }
  });

  it('table non signée : rien ne s’affiche (fail-closed)', () => {
    expect(explorationsNonIndiqueesParAnalyte(LIBELLES, INDICATIONS_BIOLOGIE_V1, false).size).toBe(0);
  });

  it('bilan absent (inactif), règle suspendue ou non rattachée : rien pour elle', () => {
    const regles: RegleIndicationPanel[] = INDICATIONS_BIOLOGIE_V1.map(regle =>
      regle.id === 'BIO-NIA-02' ? { ...regle, statut: 'suspendue' } : regle,
    );
    const sansMg = new Map([['PANEL_CORTISOL_ISOLE', 'Cortisol matinal isolé']]);
    expect(explorationsNonIndiqueesParAnalyte(sansMg, regles, true).size).toBe(0);

    const orpheline: RegleIndicationPanel = {
      ...INDICATIONS_BIOLOGIE_V1.find(r => r.id === 'BIO-NIA-01')!,
      id: 'BIO-NIA-99',
    };
    const seule = explorationsNonIndiqueesParAnalyte(LIBELLES, [orpheline], true);
    expect(seule.size).toBe(0);
  });
});
