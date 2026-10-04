import { describe, expect, it } from 'vitest';
import { verifierDc03 } from './verifierDc03';

// Fixtures neutres : aucun claim ni seuil réel — des jetons, comparés.
const SOURCES = [
  'Hypothèse H-01 ; claims cites : ferritine@2, SAF-EI-01. Durée bornée : 21 jours.',
  'Dose : 0,5 unité (source jointe). Version D-266.',
];

describe('verifierDc03 — une justification n\'est jamais générée (DC-03, BP-01)', () => {
  it('une sortie qui ne cite que des jetons des sources passe', () => {
    expect(verifierDc03('Selon ferritine@2 et SAF-EI-01, sur 21 jours, à 0.5 unité.', SOURCES))
      .toEqual({ ok: true, inconnus: { identifiants: [], nombres: [] } });
  });

  it('un identifiant inventé refuse la sortie', () => {
    const v = verifierDc03('Appuyé sur ferritine@3 et DC-99.', SOURCES);
    expect(v.ok).toBe(false);
    expect(v.inconnus.identifiants).toEqual(['DC-99', 'ferritine@3']);
  });

  it('un nombre inventé refuse la sortie', () => {
    const v = verifierDc03('Pendant 30 jours, 2 fois par jour.', SOURCES);
    expect(v.ok).toBe(false);
    expect(v.inconnus.nombres).toEqual(['2', '30']);
  });

  it('les chiffres d\'un identifiant connu ne comptent pas comme nombres cités', () => {
    expect(verifierDc03('Voir SAF-EI-01 et D-266.', SOURCES).ok).toBe(true);
  });

  it('une même valeur écrite autrement n\'est pas une invention', () => {
    expect(verifierDc03('0,5 unité ; 021 jours.', SOURCES).ok).toBe(true);
  });

  it('une dose collée à son unité est lue — et refusée si elle est inventée', () => {
    const v = verifierDc03('Prendre 500mg, puis 2g, soit 1000UI ou 25µg, x3 par jour.', SOURCES);
    expect(v.ok).toBe(false);
    expect(v.inconnus.nombres).toEqual(['1000', '2', '25', '3', '500']);
  });

  it('un séparateur de milliers ne coupe pas le nombre', () => {
    expect(verifierDc03('Soit 1 000 mg.', SOURCES).inconnus.nombres).toEqual(['1000']);
    expect(verifierDc03('Soit 1 000 mg.', ['Dose de 1000 mg.']).ok).toBe(true);
  });

  it('sans source, tout identifiant ou nombre refuse', () => {
    expect(verifierDc03('Durée : 7 jours.', []).ok).toBe(false);
    expect(verifierDc03('Un texte sans jeton.', []).ok).toBe(true);
  });
});
