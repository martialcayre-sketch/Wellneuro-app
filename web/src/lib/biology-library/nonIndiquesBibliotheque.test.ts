import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDICATIONS_BIOLOGIE_V1, type RegleIndicationPanel } from './indicationsBiologieV1';
import {
  ANALYTE_ALTERNATIF_NON_INDIQUE,
  explorationsNonIndiqueesParAnalyte,
  reglesNonIndiquees,
} from './nonIndiquesBibliotheque';

/** Tous les couples de la table admissibles — les cas historiques ([[D-472]]). */
const TOUS_ADMISSIBLES: ReadonlySet<string> = new Set(
  INDICATIONS_BIOLOGIE_V1.flatMap(r => r.justificationClaims).map(c => `${c.claimId}::${c.versionClaim}`),
);

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
    const parAnalyte = explorationsNonIndiqueesParAnalyte(LIBELLES, TOUS_ADMISSIBLES, INDICATIONS_BIOLOGIE_V1, true).parAnalyte;
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
    const parAnalyte = explorationsNonIndiqueesParAnalyte(LIBELLES, TOUS_ADMISSIBLES, INDICATIONS_BIOLOGIE_V1, true).parAnalyte;
    for (const regle of reglesNonIndiquees()) {
      const [item] = parAnalyte.get(ANALYTE_ALTERNATIF_NON_INDIQUE[regle.id]) ?? [];
      expect(item?.claimId).toBe(regle.justificationClaims[0].claimId);
      expect(item?.versionClaim).toBe(regle.justificationClaims[0].versionClaim);
      expect(item?.versionClaim).toMatch(/^v\d+\.\d+$/);
    }
  });

  it('table non signée : rien ne s’affiche (fail-closed)', () => {
    expect(explorationsNonIndiqueesParAnalyte(LIBELLES, TOUS_ADMISSIBLES, INDICATIONS_BIOLOGIE_V1, false).parAnalyte.size).toBe(0);
  });

  it('bilan absent (inactif), règle suspendue ou non rattachée : rien pour elle', () => {
    const regles: RegleIndicationPanel[] = INDICATIONS_BIOLOGIE_V1.map(regle =>
      regle.id === 'BIO-NIA-02' ? { ...regle, statut: 'suspendue' } : regle,
    );
    const sansMg = new Map([['PANEL_CORTISOL_ISOLE', 'Cortisol matinal isolé']]);
    expect(explorationsNonIndiqueesParAnalyte(sansMg, TOUS_ADMISSIBLES, regles, true).parAnalyte.size).toBe(0);

    const orpheline: RegleIndicationPanel = {
      ...INDICATIONS_BIOLOGIE_V1.find(r => r.id === 'BIO-NIA-01')!,
      id: 'BIO-NIA-99',
    };
    const seule = explorationsNonIndiqueesParAnalyte(LIBELLES, TOUS_ADMISSIBLES, [orpheline], true).parAnalyte;
    expect(seule.size).toBe(0);
  });

  it('D-472 : un claim non admissible suspend motif ET citation, et la mention est comptée', () => {
    const nia01 = INDICATIONS_BIOLOGIE_V1.find(r => r.id === 'BIO-NIA-01')!;
    const sansNia01 = new Set(
      [...TOUS_ADMISSIBLES].filter(k => !nia01.justificationClaims.some(c => k === `${c.claimId}::${c.versionClaim}`)),
    );
    const { parAnalyte, suspenduesParAnalyte } = explorationsNonIndiqueesParAnalyte(
      LIBELLES, sansNia01, INDICATIONS_BIOLOGIE_V1, true,
    );
    expect(parAnalyte.has('BIO_MAGNESIUM_ERYTHROCYTAIRE')).toBe(false);
    expect(suspenduesParAnalyte.get('BIO_MAGNESIUM_ERYTHROCYTAIRE')).toBe(1);
    // L'autre règle reste servie, et rien n'est suspendu pour elle.
    expect(parAnalyte.get('BIO_CAR')).toHaveLength(1);
    expect(suspenduesParAnalyte.has('BIO_CAR')).toBe(false);
  });

  it('D-472 : TOUS les claims de la règle comptent, pas seulement le premier cité', () => {
    const nia01 = INDICATIONS_BIOLOGIE_V1.find(r => r.id === 'BIO-NIA-01')!;
    const second = { claimId: 'WN-CL-9999-003', versionClaim: 'v1.0' };
    const regles = INDICATIONS_BIOLOGIE_V1.map(r =>
      r.id === 'BIO-NIA-01' ? { ...r, justificationClaims: [...nia01.justificationClaims, second] } : r,
    );
    const { parAnalyte, suspenduesParAnalyte } = explorationsNonIndiqueesParAnalyte(
      LIBELLES, TOUS_ADMISSIBLES, regles, true,
    );
    expect(parAnalyte.has('BIO_MAGNESIUM_ERYTHROCYTAIRE')).toBe(false);
    expect(suspenduesParAnalyte.get('BIO_MAGNESIUM_ERYTHROCYTAIRE')).toBe(1);
  });

  it('D-472 : tous les claims admissibles, rien n’est suspendu', () => {
    const { suspenduesParAnalyte } = explorationsNonIndiqueesParAnalyte(
      LIBELLES, TOUS_ADMISSIBLES, INDICATIONS_BIOLOGIE_V1, true,
    );
    expect(suspenduesParAnalyte.size).toBe(0);
  });
});
