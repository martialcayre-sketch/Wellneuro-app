import { describe, expect, it } from 'vitest';
import { statutTransmission, type EtatDocumentTransmis } from './transmissionStatut';

// Le statut vu par le patient ([[D-269]] §4) : dérivé dans l'ordre du tableau,
// le premier vrai l'emporte.

const NEUF: EtatDocumentTransmis = { motifEcart: null, purge: false, aUneLigneValidee: false, aUneLecture: false };

describe('statutTransmission (D-269 §4)', () => {
  it('rien n’a eu lieu : en attente', () => {
    expect(statutTransmission(NEUF)).toBe('en_attente');
  });

  it('une lecture lancée — même échouée — : reçu ; jamais un verdict tiré d’un échec technique', () => {
    expect(statutTransmission({ ...NEUF, aUneLecture: true })).toBe('recu');
  });

  it('une ligne validée : validé', () => {
    expect(statutTransmission({ ...NEUF, aUneLecture: true, aUneLigneValidee: true })).toBe('valide');
  });

  it('écarté : refusé ou illisible selon le motif, et cela prime sur tout le reste', () => {
    expect(statutTransmission({ ...NEUF, purge: true, aUneLecture: true, motifEcart: 'illisible' })).toBe('illisible');
    expect(statutTransmission({ ...NEUF, purge: true, aUneLecture: true, motifEcart: 'document_non_conforme' })).toBe('refuse');
  });

  it('PRÉCISION du 2026-10-07 : purgé sans écart (échéance, lignes toutes écartées), le document reste « reçu »', () => {
    expect(statutTransmission({ ...NEUF, purge: true })).toBe('recu');
    expect(statutTransmission({ ...NEUF, purge: true, aUneLecture: true })).toBe('recu');
    // Purgé à la dernière décision avec une ligne validée : validé.
    expect(statutTransmission({ ...NEUF, purge: true, aUneLecture: true, aUneLigneValidee: true })).toBe('valide');
  });
});
