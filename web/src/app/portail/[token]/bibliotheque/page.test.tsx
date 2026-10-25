import { afterEach, describe, expect, it, vi } from 'vitest';

// « Ma bibliothèque » ([[D-357]]) n'existe pas tant que
// `WN_PORTAIL_BIBLIOTHEQUE` est fermé. Le composant a son propre banc.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/bibliotheque/Bibliotheque', () => ({ Bibliotheque: () => null }));

import PortailBibliothequePage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = () => PortailBibliothequePage({ params: Promise.resolve({ token: 'TOK' }) });

describe('la page « Ma bibliothèque »', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : notFound()', async valeur => {
    vi.stubEnv('WN_PORTAIL_BIBLIOTHEQUE', valeur);
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau ouvert : la page se rend', async () => {
    vi.stubEnv('WN_PORTAIL_BIBLIOTHEQUE', 'true');
    await expect(page()).resolves.toBeTruthy();
  });
});
