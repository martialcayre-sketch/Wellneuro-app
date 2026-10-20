import { afterEach, describe, expect, it, vi } from 'vitest';

// « Déposer un document » ([[D-330]]) n'existe pas tant que
// `WN_PORTAIL_DEPOT_DOCUMENTS` est fermé. Le composant a son propre banc.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/collecte/DepotDocuments', () => ({ DepotDocuments: () => null }));

import PortailDepotDocumentsPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = () => PortailDepotDocumentsPage({ params: Promise.resolve({ token: 'TOK' }) });

describe('la page « Déposer un document »', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : notFound()', async valeur => {
    vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', valeur);
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau ouvert : la page se rend', async () => {
    vi.stubEnv('WN_PORTAIL_DEPOT_DOCUMENTS', 'true');
    await expect(page()).resolves.toBeTruthy();
  });
});
