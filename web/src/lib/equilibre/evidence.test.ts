import { describe, it, expect } from 'vitest';
import { calculerNiveauPreuveBesoin, listerSourcesPreuveBesoin } from './evidence';
import { BESOIN_SOURCES, NIVEAU_PREUVE_PAR_SOURCE } from './constants';

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

// Invariant ajouté par la revue adversariale du 2026-07-27 : le retrait de
// Q_SOM_06 de NIVEAU_PREUVE_PAR_SOURCE se justifiait par « une clé orpheline
// affirmerait que le Pichot reste une source de Mon équilibre ». La propriété
// était revendiquée en commentaire sans que rien ne la garde — le garde du
// registre contrôle le registre, pas cette table.
describe('cohérence NIVEAU_PREUVE_PAR_SOURCE ↔ BESOIN_SOURCES', () => {
  const idsSources = new Set(
    Object.values(BESOIN_SOURCES).flat().map(source => source.idQuestionnaire)
  );

  it('aucune clé orpheline : tout niveau de preuve déclaré correspond à une source vivante', () => {
    const orphelines = Object.keys(NIVEAU_PREUVE_PAR_SOURCE).filter(id => !idsSources.has(id));
    expect(orphelines).toEqual([]);
  });

  it('aucune source muette : toute source de BESOIN_SOURCES déclare son niveau de preuve', () => {
    const sansNiveau = [...idsSources].filter(id => !(id in NIVEAU_PREUVE_PAR_SOURCE));
    expect(sansNiveau).toEqual([]);
  });
});
