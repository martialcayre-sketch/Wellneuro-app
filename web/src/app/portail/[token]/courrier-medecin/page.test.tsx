import { afterEach, describe, expect, it, vi } from 'vitest';

// La page du courrier remis ([[D-262]], LOT-03a) n'existe pas tant que
// `WN_LETTRE_ADRESSAGE_PATIENT` est fermé. Le composant a son propre banc.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/lettre-adressage/CourrierMedecinLecture', () => ({ CourrierMedecinLecture: () => null }));

import PortailCourrierMedecinPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = () => PortailCourrierMedecinPage({ params: Promise.resolve({ token: 'TOK' }) });

describe('la page « Courrier pour votre médecin »', () => {
  it.each(['', 'TRUE', '1'])('drapeau « %s » : notFound()', async valeur => {
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', valeur);
    await expect(page()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau ouvert : la page se rend', async () => {
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', 'true');
    await expect(page()).resolves.toBeTruthy();
  });
});
