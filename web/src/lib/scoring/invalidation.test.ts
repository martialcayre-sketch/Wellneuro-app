import { describe, expect, it } from 'vitest';

import { champsInvalidation, MOTIF_MAX, validerDemandeInvalidation } from './invalidation';

describe('validerDemandeInvalidation', () => {
  it('accepte une invalidation motivée', () => {
    const verdict = validerDemandeInvalidation({ statutDemande: 'INVALID', motif: '  Doublon technique  ' });
    expect(verdict).toEqual({ ok: true, statut: 'INVALID', motif: 'Doublon technique' });
  });

  it('refuse une invalidation sans motif', () => {
    const verdict = validerDemandeInvalidation({ statutDemande: 'INVALID', motif: '   ' });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.raison).toBe('motif_manquant');
  });

  it('refuse un motif au-delà de la borne', () => {
    const verdict = validerDemandeInvalidation({ statutDemande: 'INVALID', motif: 'x'.repeat(MOTIF_MAX + 1) });
    expect(verdict.ok === false && verdict.raison).toBe('motif_trop_long');
  });

  it('accepte un rétablissement sans motif', () => {
    expect(validerDemandeInvalidation({ statutDemande: 'VALID' })).toEqual({
      ok: true,
      statut: 'VALID',
      motif: null,
    });
  });

  // Les deux statuts que l'écran ne pose pas : leur sémantique tient à autre
  // chose qu'une intention de praticien (un remplacement pour l'un, une reprise
  // de données pour l'autre).
  it.each(['SUPERSEDED', 'HISTORICAL_ONLY', 'AMBIGUOUS', 'inconnu', ''])(
    'refuse le statut %s',
    (statutDemande) => {
      const verdict = validerDemandeInvalidation({ statutDemande, motif: 'motif suffisant' });
      expect(verdict.ok === false && verdict.raison).toBe('statut_invalide');
    },
  );

  it('refuse un statut non textuel', () => {
    expect(validerDemandeInvalidation({ statutDemande: 42 }).ok).toBe(false);
    expect(validerDemandeInvalidation({}).ok).toBe(false);
  });
});

describe('champsInvalidation', () => {
  const maintenant = new Date('2026-08-11T10:00:00.000Z');

  it('renseigne la trace en invalidant', () => {
    const verdict = validerDemandeInvalidation({ statutDemande: 'INVALID', motif: 'Réponses au hasard' });
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;
    expect(champsInvalidation(verdict, 'praticien@wellneuro.fr', maintenant)).toEqual({
      statutValidite: 'INVALID',
      invalideLe: maintenant,
      invalidePar: 'praticien@wellneuro.fr',
      motifInvalidation: 'Réponses au hasard',
    });
  });

  it('efface la trace en rétablissant — elle ne décrit plus l’état courant', () => {
    const verdict = validerDemandeInvalidation({ statutDemande: 'VALID' });
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;
    expect(champsInvalidation(verdict, 'praticien@wellneuro.fr', maintenant)).toEqual({
      statutValidite: 'VALID',
      invalideLe: null,
      invalidePar: null,
      motifInvalidation: null,
    });
  });
});
