import { afterEach, describe, expect, it, vi } from 'vitest';

// « Mes échanges » ([[D-293]]) n'existe pas tant que `WN_PORTAIL_MES_ECHANGES`
// est fermé. Le composant a son propre banc.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/mes-echanges/MesEchangesJournal', () => ({ MesEchangesJournal: () => null }));

import PortailMesEchangesPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = () => PortailMesEchangesPage({ params: Promise.resolve({ token: 'TOK' }) });

describe('la page « Mes échanges »', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : notFound()', async valeur => {
    vi.stubEnv('WN_PORTAIL_MES_ECHANGES', valeur);
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau ouvert : la page se rend', async () => {
    vi.stubEnv('WN_PORTAIL_MES_ECHANGES', 'true');
    await expect(page()).resolves.toBeTruthy();
  });
});
