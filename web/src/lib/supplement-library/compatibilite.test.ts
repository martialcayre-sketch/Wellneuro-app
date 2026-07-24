import { beforeEach, describe, expect, it } from 'vitest';

import { construireTableauCompatibilite } from './compatibilite';
import type { CandidatProtocolReviewFlag } from './types';

function candidat(overrides: Partial<CandidatProtocolReviewFlag> = {}): CandidatProtocolReviewFlag {
  return {
    contractVersion: 'c4b-sentinelle-v1',
    typeFlag: 'cumul_substance',
    statutPropose: 'ouvert',
    niveauAlerte: 'orange',
    ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
    ingredientsConcernes: ['magnesium'],
    dosesEnPresence: [],
    seuil: null,
    alerteSecurite: null,
    message: 'Cumul de substance : le praticien arbitre.',
    suggestionAction: 'Examiner les doses en présence.',
    ...overrides,
  };
}

describe('construireTableauCompatibilite', () => {
  beforeEach(() => {
    process.env.WN_C4_ENABLED = 'true';
  });

  it('refuse toute lecture quand le drapeau C4 est désactivé (fail-closed)', () => {
    delete process.env.WN_C4_ENABLED;
    expect(() => construireTableauCompatibilite()).toThrow(/WN_C4_ENABLED/);
  });

  it('rend les quatre lignes actées et rien d\'autre — aucun verdict global', () => {
    const tableau = construireTableauCompatibilite();
    expect(Object.keys(tableau).sort()).toEqual([
      'aucunScoreGlobal',
      'compatibiliteProtocole',
      'contractVersion',
      'derniereRevue',
      'donneesManquantes',
      'qualiteFormulation',
    ]);
    expect(tableau.aucunScoreGlobal).toBe(true);
    expect(JSON.stringify(tableau)).not.toMatch(/"(score|verdict|note|rang|global)":/i);
  });

  it('rend « non évaluée » honnêtement tout ce qui dépend d\'une fiche produit (LOT-02a)', () => {
    const tableau = construireTableauCompatibilite();
    expect(tableau.qualiteFormulation.valeur).toBe('non_evaluee');
    expect(tableau.donneesManquantes).toMatchObject({ valeur: 'non_evaluee', elements: [] });
    expect(tableau.derniereRevue).toMatchObject({ valeur: 'non_evaluee', date: null });
    expect(tableau.compatibiliteProtocole.valeur).toBe('non_evaluee');
    for (const ligne of [
      tableau.qualiteFormulation, tableau.compatibiliteProtocole,
      tableau.donneesManquantes, tableau.derniereRevue,
    ]) {
      expect(ligne.justification.length).toBeGreaterThan(0);
    }
  });

  it('lit la compatibilité protocole depuis les candidats de la sentinelle, sans décision automatique', () => {
    expect(construireTableauCompatibilite({ candidatsSentinelle: [] })
      .compatibiliteProtocole.valeur).toBe('compatible');
    const avecSignal = construireTableauCompatibilite({ candidatsSentinelle: [candidat()] });
    expect(avecSignal.compatibiliteProtocole.valeur).toBe('compatible_avec_vigilance');
    expect(avecSignal.compatibiliteProtocole.justification).toMatch(/aucun n'emporte de décision automatique/i);
    const avecAlerte = construireTableauCompatibilite({
      candidatsSentinelle: [candidat(), candidat({
        typeFlag: 'depassement_seuil',
        niveauAlerte: 'rouge',
        alerteSecurite: {
          id: 'alerte_renale',
          code: 'insuffisance_renale',
          messageFr: 'Prudence en cas d\'insuffisance rénale.',
          niveauAlerte: 'rouge',
        },
      })],
    });
    expect(avecAlerte.compatibiliteProtocole.valeur).toBe('vigilance_requise');
    expect(avecAlerte.compatibiliteProtocole.justification).toMatch(/arbitrage praticien requis/i);
  });
});
