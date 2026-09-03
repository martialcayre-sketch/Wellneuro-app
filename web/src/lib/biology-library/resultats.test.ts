import { describe, expect, it } from 'vitest';
import { TOLERANCE_FUTUR_MS, validerSaisieResultat } from './resultats';

const MAINTENANT = new Date('2026-09-03T12:00:00.000Z');

describe('validerSaisieResultat', () => {
  it('accepte une mesure quantitative datée, heure comprise', () => {
    const verdict = validerSaisieResultat(
      { valeur: 42.5, preleveLe: '2026-09-01T08:30:00.000Z' },
      MAINTENANT,
    );
    expect(verdict).toEqual({
      ok: true,
      valeur: 42.5,
      preleveLe: new Date('2026-09-01T08:30:00.000Z'),
    });
  });

  it('accepte une valeur négative : certaines mesures le sont (aucune borne inventée, DC-19)', () => {
    const verdict = validerSaisieResultat(
      { valeur: -2.5, preleveLe: '2026-09-01T08:30:00.000Z' },
      MAINTENANT,
    );
    expect(verdict.ok).toBe(true);
  });

  it.each([
    ['absente', undefined],
    ['chaîne', '42,5'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('refuse une valeur %s', (_nom, valeur) => {
    const verdict = validerSaisieResultat(
      { valeur, preleveLe: '2026-09-01T08:30:00.000Z' },
      MAINTENANT,
    );
    expect(verdict).toEqual({ ok: false, raison: 'valeur_invalide' });
  });

  it.each([
    ['absente', undefined],
    ['vide', '   '],
    ['illisible', 'hier matin'],
  ])('refuse une date %s', (_nom, preleveLe) => {
    const verdict = validerSaisieResultat({ valeur: 1, preleveLe }, MAINTENANT);
    expect(verdict).toEqual({ ok: false, raison: 'date_invalide' });
  });

  it('refuse un prélèvement au-delà de maintenant + 24 h', () => {
    const futur = new Date(MAINTENANT.getTime() + TOLERANCE_FUTUR_MS + 60_000).toISOString();
    const verdict = validerSaisieResultat({ valeur: 1, preleveLe: futur }, MAINTENANT);
    expect(verdict).toEqual({ ok: false, raison: 'date_future' });
  });

  it('tolère 24 h d’avance : fuseaux et horloges décalées, pas un délai clinique', () => {
    const demain = new Date(MAINTENANT.getTime() + TOLERANCE_FUTUR_MS - 60_000).toISOString();
    const verdict = validerSaisieResultat({ valeur: 1, preleveLe: demain }, MAINTENANT);
    expect(verdict.ok).toBe(true);
  });
});
