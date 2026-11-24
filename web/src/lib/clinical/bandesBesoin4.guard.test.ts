import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import {
  BANDES_HYPEREXCITABILITE_SOURCE,
  CONVENTION_FRONTIERE_BESOIN_4,
  GRILLES_TFD_SOURCE,
  MAX_HYPEREXCITABILITE,
  RANG_VALEUR_FRONTIERE_81,
  bandesHyperexcitabilite,
  bandesTfd,
  valeursFrontieresTfd,
  type BandeBesoin4,
  type CleGrilleTfd,
} from './bandesBesoin4';

// BANDES DU BESOIN 4 ([[D-526]] §5.2, appliquée par [[D-548]] §2.3) : chaque
// borne vit en constante nommée avec son claim ; la convention des valeurs
// frontières est un arbitrage du praticien, nommé comme tel.

const CLES: CleGrilleTfd[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'GLOBAL'];

function bandesDeLEntier(bandes: BandeBesoin4[], v: number): BandeBesoin4[] {
  return bandes.filter(b => v >= b.min && v <= b.max);
}

describe('la convention des valeurs frontières (D-526 §6.2)', () => {
  it('est nommée comme un arbitrage du praticien, avec sa décision', () => {
    expect(CONVENTION_FRONTIERE_BESOIN_4).toMatchObject({ decision: 'D-526', section: '§6.2', option: 'B' });
    expect(CONVENTION_FRONTIERE_BESOIN_4.nature).toContain('arbitrage du praticien');
  });

  it.each(CLES)('TFD %s : la valeur basse va à la bande A, la valeur haute à la bande C', cle => {
    const g = GRILLES_TFD_SOURCE[cle];
    const { basse, haute } = valeursFrontieresTfd(g);
    const bandes = bandesTfd(cle);
    expect(bandesDeLEntier(bandes, basse).map(b => b.label[0])).toEqual(['A']);
    expect(bandesDeLEntier(bandes, haute).map(b => b.label[0])).toEqual(['C']);
  });

  it.each(CLES)('TFD %s : chaque entier de 0 au maximum a exactement une bande, et B est celle de la source', cle => {
    const g = GRILLES_TFD_SOURCE[cle];
    const bandes = bandesTfd(cle);
    for (let v = 0; v <= g.max; v++) {
      expect(bandesDeLEntier(bandes, v)).toHaveLength(1);
    }
    expect(bandes[1]).toMatchObject({ min: g.bDe, max: g.bA });
    expect(g.claimId).toMatch(/^WN-CL-0464-00[1-6]$/);
  });

  it('le digestif supérieur : 13 passe de B à C (la seule valeur du TFD dont le rangement change)', () => {
    const c1 = bandesTfd('C1');
    expect(bandesDeLEntier(c1, 12)[0].label[0]).toBe('B');
    expect(bandesDeLEntier(c1, 13)[0].label[0]).toBe('C');
    expect(bandesDeLEntier(c1, 7)[0].label[0]).toBe('A');
  });
});

describe("le catalogue sert exactement les bandes nommées", () => {
  const tfd = QUESTIONNAIRE_CATALOGUE.Q_GAS_01.scoring as {
    subScores: { id: string; ranges: BandeBesoin4[] }[];
    globalInterpretation: BandeBesoin4[];
  };
  it.each(['C1', 'C2', 'C3', 'C4', 'C5'] as const)('Q_GAS_01 %s', cle => {
    expect(tfd.subScores.find(s => s.id === cle)?.ranges).toEqual(bandesTfd(cle));
  });
  it('Q_GAS_01 global', () => {
    expect(tfd.globalInterpretation).toEqual(bandesTfd('GLOBAL'));
  });
  it("Q_INF_01 : cinq bandes de la pièce pro, plus les quartiles d'avant", () => {
    const sc = QUESTIONNAIRE_CATALOGUE.Q_INF_01.scoring as { interpretation: BandeBesoin4[] };
    expect(sc.interpretation).toEqual(bandesHyperexcitabilite());
    expect(sc.interpretation).toHaveLength(5);
  });
});

describe("la grille d'hyperexcitabilité (D-526 §3.2)", () => {
  const bandes = bandesHyperexcitabilite();

  it('porte les cinq bandes des claims 0446-007 à 0446-011, sans trou ni chevauchement de 0 à 96', () => {
    expect(BANDES_HYPEREXCITABILITE_SOURCE.map(b => b.claimId)).toEqual([
      'WN-CL-0446-007',
      'WN-CL-0446-008',
      'WN-CL-0446-009',
      'WN-CL-0446-010',
      'WN-CL-0446-011',
    ]);
    for (let v = 0; v <= MAX_HYPEREXCITABILITE; v++) {
      expect(bandesDeLEntier(bandes, v)).toHaveLength(1);
    }
    expect(bandes.map(b => [b.min, b.max])).toEqual([
      [0, 20],
      [21, 40],
      [41, 60],
      [61, 80],
      [81, 96],
    ]);
  });

  it("fige le rang de la valeur frontière 81 — arbitré par le responsable (20261124-0800-b), isolé en une constante", () => {
    expect(RANG_VALEUR_FRONTIERE_81).toBe('bande_superieure');
    expect(bandesDeLEntier(bandes, 80)[0].label).toContain('sévère');
    expect(bandesDeLEntier(bandes, 81)[0].label).toContain('très sévère');
    // L'autre lecture ne coûte que la constante : 81 retombe dans « sévère ».
    const autre = bandesHyperexcitabilite('bande_inferieure');
    expect(bandesDeLEntier(autre, 81)[0].label).not.toContain('très sévère');
    for (let v = 0; v <= MAX_HYPEREXCITABILITE; v++) expect(bandesDeLEntier(autre, v)).toHaveLength(1);
  });
});
