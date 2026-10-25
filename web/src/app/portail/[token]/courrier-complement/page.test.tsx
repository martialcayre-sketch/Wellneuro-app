import { afterEach, describe, expect, it, vi } from 'vitest';

// La page du courrier complément remis ([[D-345]], J3-12h lot 4) n'existe pas
// tant que `WN_COURRIER_COMPLEMENT` est fermé. Le composant a son propre banc.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/courrier-complement/CourrierComplementLecture', () => ({
  CourrierComplementLecture: () => null,
}));

import PortailCourrierComplementPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = () => PortailCourrierComplementPage({ params: Promise.resolve({ token: 'TOK' }) });

describe('la page « Courrier à remettre à votre médecin »', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : notFound()', async valeur => {
    vi.stubEnv('WN_COURRIER_COMPLEMENT', valeur);
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau ouvert : la page se rend', async () => {
    vi.stubEnv('WN_COURRIER_COMPLEMENT', 'true');
    await expect(page()).resolves.toBeTruthy();
  });
});
