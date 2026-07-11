import { describe, it, expect } from 'vitest';
import { calculerNiveauPreuveBesoin, listerSourcesPreuveBesoin } from './evidence';

describe('evidence — niveaux de preuve par besoin', () => {
  it('besoin sans réponse doit être NON_MESURE', () => {
    const result = calculerNiveauPreuveBesoin(5, {});
    expect(result).toBe('NON_MESURE');
  });

  it('besoin 3 (aucune source mappée) doit rester NON_MESURE même avec des réponses ailleurs', () => {
    const result = calculerNiveauPreuveBesoin(3, { Q_ALI_01: { MO1: '4' } });
    expect(result).toBe('NON_MESURE');
  });

  it('besoin 5 avec seule source Q_SOM_01 répondue doit être A', () => {
    const result = calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' } });
    expect(result).toBe('A');
  });

  it('besoin 5 avec sources A+B répondues doit retomber au plus faible (B)', () => {
    const result = calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' }, Q_MOD_01: { ACT1: '1' } });
    expect(result).toBe('B');
  });

  it('listerSourcesPreuveBesoin ne renvoie que les sources effectivement répondues', () => {
    const sources = listerSourcesPreuveBesoin(5, { Q_SOM_01: { P1: '1' } });
    expect(sources).toHaveLength(1);
    expect(sources[0]?.idQuestionnaire).toBe('Q_SOM_01');
    expect(sources[0]?.grade).toBe('A');
  });
});
