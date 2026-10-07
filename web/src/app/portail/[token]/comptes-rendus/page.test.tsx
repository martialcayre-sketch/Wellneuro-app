import { afterEach, describe, expect, it, vi } from 'vitest';

// La page de transmission ([[D-269]], LOT-04) n'existe pas tant que
// `WN_BIO_PORTAIL_ENABLED` (et l'import qu'il exige) est fermé.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/biologie/TransmissionCompteRendu', () => ({ TransmissionCompteRendu: () => null }));

import PortailComptesRendusPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = () => PortailComptesRendusPage({ params: Promise.resolve({ token: 'TOK' }) });

function importOuvert() {
  vi.stubEnv('WN_CB_ENABLED', 'true');
  vi.stubEnv('WN_CB_RESULTS_ENABLED', 'true');
  vi.stubEnv('WN_BIO_INGEST_ENABLED', 'true');
}

describe('la page « Transmettre un compte rendu d’analyses »', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : notFound()', async valeur => {
    importOuvert();
    vi.stubEnv('WN_BIO_PORTAIL_ENABLED', valeur);
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau posé sur un import fermé : notFound()', async () => {
    vi.stubEnv('WN_BIO_INGEST_ENABLED', '');
    vi.stubEnv('WN_BIO_PORTAIL_ENABLED', 'true');
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau ouvert : la page se rend', async () => {
    importOuvert();
    vi.stubEnv('WN_BIO_PORTAIL_ENABLED', 'true');
    await expect(page()).resolves.toBeTruthy();
  });
});
