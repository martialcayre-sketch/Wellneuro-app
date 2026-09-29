import { afterEach, describe, expect, it, vi } from 'vitest';

// Les deux pages de l'espace de lecture ([[D-251]] §8, lot 10) n'existent pas
// tant que `WN_FICHES_ASSIETTE_LECTURE` est fermé. Les composants sont simulés :
// ils ont leurs propres bancs.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient/fiches-assiette/FichesRemises', () => ({ FichesRemises: () => null }));
vi.mock('@/components/patient/fiches-assiette/FicheRemiseLecture', () => ({ FicheRemiseLecture: () => null }));

import PortailFichesPage from './page';
import PortailFichePage from './[idRemise]/page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const liste = () => PortailFichesPage({ params: Promise.resolve({ token: 'TOK' }) });
const fiche = () => PortailFichePage({ params: Promise.resolve({ token: 'TOK', idRemise: 'rem_1' }) });

describe('les pages de l’espace de lecture', () => {
  it.each([undefined, 'TRUE', '1'])('drapeau de lecture %s : les deux pages rendent notFound()', async valeur => {
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', valeur as string);
    await expect(liste()).rejects.toBe(NON_TROUVE);
    await expect(fiche()).rejects.toBe(NON_TROUVE);
  });

  it('le drapeau d’ÉMISSION ouvert n’ouvre pas les pages', async () => {
    vi.stubEnv('WN_FICHES_ASSIETTE', 'true');
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', undefined as unknown as string);
    await expect(liste()).rejects.toBe(NON_TROUVE);
    await expect(fiche()).rejects.toBe(NON_TROUVE);
  });

  it('drapeau de lecture ouvert : les pages se rendent', async () => {
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', 'true');
    await expect(liste()).resolves.toBeTruthy();
    await expect(fiche()).resolves.toBeTruthy();
  });

  it('la page d’une fiche passe à l’écran CETTE fiche, qui consignera sa lecture une fois le texte affiché', async () => {
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', 'true');
    const element = await fiche();
    const enfants = (element as { props: { children: { props: Record<string, unknown> }[] } }).props.children;
    expect(enfants.map(e => e.props)).toContainEqual({ token: 'TOK', idRemise: 'rem_1' });
  });
});
