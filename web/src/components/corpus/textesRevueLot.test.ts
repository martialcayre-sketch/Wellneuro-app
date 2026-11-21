import { describe, expect, it } from 'vitest';
import { libelleConfirmerLot, questionSoumissionLot } from './textesRevueLot';

// T-71 et T-72, mot pour mot de D-488, variantes comprises.
describe('textes de la confirmation de la revue en lot (T-71, T-72)', () => {
  it('forme pleine, deux termes au pluriel', () => {
    expect(questionSoumissionLot(3, 2)).toBe(
      'Soumettre 5 décisions (3 validations, 2 rejets) ? Chaque décision est enregistrée séparément.',
    );
  });

  it('un terme à zéro s’omet', () => {
    expect(questionSoumissionLot(2, 0)).toBe(
      'Soumettre 2 décisions (2 validations) ? Chaque décision est enregistrée séparément.',
    );
    expect(questionSoumissionLot(0, 2)).toBe(
      'Soumettre 2 décisions (2 rejets) ? Chaque décision est enregistrée séparément.',
    );
  });

  it('un terme égal à 1 s’écrit au singulier', () => {
    expect(questionSoumissionLot(1, 1)).toBe(
      'Soumettre 2 décisions (1 validation, 1 rejet) ? Chaque décision est enregistrée séparément.',
    );
  });

  it('une seule décision : sans la seconde phrase', () => {
    expect(questionSoumissionLot(1, 0)).toBe('Soumettre 1 décision (1 validation) ?');
    expect(questionSoumissionLot(0, 1)).toBe('Soumettre 1 décision (1 rejet) ?');
  });

  it('T-72 au singulier pour une seule décision', () => {
    expect(libelleConfirmerLot(1)).toBe('Confirmer la décision');
    expect(libelleConfirmerLot(2)).toBe('Confirmer les décisions');
  });
});
