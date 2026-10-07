import { describe, expect, it } from 'vitest';
import { TOLERANCE_FUTUR_MS, validerDatePrelevement, validerSaisieResultat } from './resultats';

const MAINTENANT = new Date('2026-09-03T12:00:00.000Z');

describe('validerSaisieResultat', () => {
  it('accepte une mesure quantitative datée, heure comprise', () => {
    const verdict = validerSaisieResultat(
      { valeur: '42,5', preleveLe: '2026-09-01T08:30:00.000Z' },
      MAINTENANT,
    );
    expect(verdict).toEqual({
      ok: true,
      valeur: '42.5',
      preleveLe: new Date('2026-09-01T08:30:00.000Z'),
    });
  });

  it('rend la forme CANONIQUE, exacte au-delà du flottant (LOT-10)', () => {
    for (const [saisie, attendue] of [
      ['0,30000000000000004', '0.30000000000000004'],
      ['12345678901234567,1', '12345678901234567.1'],
      ['007,500', '7.5'],
    ]) {
      const verdict = validerSaisieResultat({ valeur: saisie, preleveLe: '2026-09-01T08:30:00.000Z' }, MAINTENANT);
      expect(verdict.ok && verdict.valeur, saisie).toBe(attendue);
    }
  });

  it('refuse au-delà de la colonne DECIMAL(65,30) — 36 chiffres entiers ou 31 décimales — mais pas en deçà', () => {
    const juge = (valeur: string) =>
      validerSaisieResultat({ valeur, preleveLe: '2026-09-01T08:30:00.000Z' }, MAINTENANT);
    expect(juge(`${'9'.repeat(35)},${'9'.repeat(30)}`).ok).toBe(true);
    expect(juge('9'.repeat(36))).toEqual({ ok: false, raison: 'valeur_hors_capacite' });
    expect(juge(`0,${'1'.repeat(31)}`)).toEqual({ ok: false, raison: 'valeur_hors_capacite' });
    // Les zéros de queue ne comptent pas : la valeur n'a qu'une décimale.
    expect(juge(`0,1${'0'.repeat(40)}`).ok).toBe(true);
  });

  it('accepte une valeur négative : certaines mesures le sont (aucune borne inventée, DC-19)', () => {
    const verdict = validerSaisieResultat(
      { valeur: '-2,5', preleveLe: '2026-09-01T08:30:00.000Z' },
      MAINTENANT,
    );
    expect(verdict.ok).toBe(true);
  });

  it.each([
    ['absente', undefined],
    // Un `number` a déjà perdu l'exactitude que la chaîne garde (LOT-10).
    ['en nombre JSON', 42.5],
    ['NaN', Number.NaN],
    ['Infinity (chaîne)', 'Infinity'],
    ['vide', '   '],
    ['textuelle', 'douze'],
    ['à exposant', '1e3'],
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
    const verdict = validerSaisieResultat({ valeur: '1', preleveLe }, MAINTENANT);
    expect(verdict).toEqual({ ok: false, raison: 'date_invalide' });
  });

  it('refuse un prélèvement au-delà de maintenant + 24 h', () => {
    const futur = new Date(MAINTENANT.getTime() + TOLERANCE_FUTUR_MS + 60_000).toISOString();
    const verdict = validerSaisieResultat({ valeur: '1', preleveLe: futur }, MAINTENANT);
    expect(verdict).toEqual({ ok: false, raison: 'date_future' });
  });

  it('tolère 24 h d’avance : fuseaux et horloges décalées, pas un délai clinique', () => {
    const demain = new Date(MAINTENANT.getTime() + TOLERANCE_FUTUR_MS - 60_000).toISOString();
    const verdict = validerSaisieResultat({ valeur: '1', preleveLe: demain }, MAINTENANT);
    expect(verdict.ok).toBe(true);
  });
});

// La date SEULE, telle que la juge la saisie groupée d'un bilan (LOT-01) :
// mêmes refus, même tolérance que dans `validerSaisieResultat`, qui l'appelle.
describe('validerDatePrelevement', () => {
  it('accepte une date ISO, heure comprise', () => {
    expect(validerDatePrelevement('2026-09-01T08:30:00.000Z', MAINTENANT)).toEqual({
      ok: true,
      preleveLe: new Date('2026-09-01T08:30:00.000Z'),
    });
  });

  it('refuse une date absente, blanche, non textuelle ou illisible', () => {
    for (const brut of [undefined, null, '', '   ', 42, 'pas une date']) {
      expect(validerDatePrelevement(brut, MAINTENANT)).toEqual({ ok: false, raison: 'date_invalide' });
    }
  });

  it('refuse au-delà de la tolérance, accepte en deçà', () => {
    const au_dela = new Date(MAINTENANT.getTime() + TOLERANCE_FUTUR_MS + 60_000).toISOString();
    const en_deca = new Date(MAINTENANT.getTime() + TOLERANCE_FUTUR_MS - 60_000).toISOString();
    expect(validerDatePrelevement(au_dela, MAINTENANT)).toEqual({ ok: false, raison: 'date_future' });
    expect(validerDatePrelevement(en_deca, MAINTENANT).ok).toBe(true);
  });
});
