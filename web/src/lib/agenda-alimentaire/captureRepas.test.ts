import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureRepasOuverte, captureRepasServie } from './captureRepas';

// [[D-437]] §4 et §6 : chaîne exacte `'true'`, absent = fermé, jamais ouvert
// quand `WN_AGENDA_ALI` est fermé ; servi au seul dossier majeur.

const MAINTENANT = Date.parse('2026-11-04T10:00:00.000Z');

afterEach(() => vi.unstubAllEnvs());

describe('captureRepasOuverte', () => {
  it('absent = fermé', () => {
    expect(captureRepasOuverte(undefined, 'true')).toBe(false);
  });

  it.each(['1', 'TRUE', 'True', ' true', ''])('« %s » ne l’ouvre pas', valeur => {
    expect(captureRepasOuverte(valeur, 'true')).toBe(false);
  });

  it('ouvert seulement avec l’agenda alimentaire ouvert', () => {
    expect(captureRepasOuverte('true', 'true')).toBe(true);
    expect(captureRepasOuverte('true', undefined)).toBe(false);
    expect(captureRepasOuverte('true', 'false')).toBe(false);
  });

  it('lit l’environnement par défaut', () => {
    vi.stubEnv('WN_PORTAIL_CAPTURE_REPAS', 'true');
    vi.stubEnv('WN_AGENDA_ALI', 'true');
    expect(captureRepasOuverte()).toBe(true);
    vi.stubEnv('WN_AGENDA_ALI', '');
    expect(captureRepasOuverte()).toBe(false);
  });
});

describe('captureRepasServie', () => {
  function ouvrir() {
    vi.stubEnv('WN_PORTAIL_CAPTURE_REPAS', 'true');
    vi.stubEnv('WN_AGENDA_ALI', 'true');
  }

  it('dossier majeur, drapeaux ouverts : servie', () => {
    ouvrir();
    expect(captureRepasServie('1985-03-14', MAINTENANT)).toBe(true);
  });

  it('dossier mineur : jamais', () => {
    ouvrir();
    expect(captureRepasServie('2010-01-01', MAINTENANT)).toBe(false);
  });

  it.each([null, undefined, '', 'pas une date', '2026-02-31', '2030-01-01'])(
    'âge inconnu (%s) : jamais',
    date => {
      ouvrir();
      expect(captureRepasServie(date, MAINTENANT)).toBe(false);
    },
  );

  it('drapeaux fermés : jamais, même majeur', () => {
    vi.stubEnv('WN_PORTAIL_CAPTURE_REPAS', '');
    vi.stubEnv('WN_AGENDA_ALI', 'true');
    expect(captureRepasServie('1985-03-14', MAINTENANT)).toBe(false);
  });
});
