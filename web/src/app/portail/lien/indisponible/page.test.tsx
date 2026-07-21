// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));

import LienIndisponiblePage from './page';

afterEach(cleanup);

// L'écran de refus du lien magique a gagné une branche avec le gate G5 : quand
// l'entrée par Google est ouverte, ce cul-de-sac cesse d'en être un. Une branche
// conditionnelle sans test se met à mentir dans un sens ou dans l'autre — ici,
// proposer Google alors que la route répond 404.
describe('/portail/lien/indisponible — la passerelle vers Google', () => {
  beforeEach(() => {
    process.env.WN_G4_LIEN_MAGIQUE = 'true';
    delete process.env.WN_G4_REDEMANDE_PATIENT;
  });

  it('G5 éteint : aucune proposition Google', () => {
    delete process.env.WN_G5_GOOGLE_PATIENT;
    render(LienIndisponiblePage());
    expect(screen.queryByRole('link', { name: 'Continuer avec Google' })).toBeNull();
  });

  it('G5 allumé : un lien mène à la page d’entrée', () => {
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    render(LienIndisponiblePage());
    const lien = screen.getByRole('link', { name: 'Continuer avec Google' });
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
  });

  // Le message de refus du lien magique ne bouge pas : il reste le même pour
  // consommé, expiré, inconnu et révoqué, que Google soit ouvert ou non.
  it('le titre unique du refus ne varie pas avec le drapeau', () => {
    for (const drapeau of [undefined, 'true']) {
      if (drapeau) process.env.WN_G5_GOOGLE_PATIENT = drapeau;
      else delete process.env.WN_G5_GOOGLE_PATIENT;
      render(LienIndisponiblePage());
      expect(screen.getAllByRole('heading', { name: 'Votre lien n’est plus valable' }).length)
        .toBeGreaterThan(0);
      cleanup();
    }
  });
});
