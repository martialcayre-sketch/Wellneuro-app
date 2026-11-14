import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore, redirect } = vi.hoisted(() => ({
  cookieStore: { valeur: undefined as string | undefined },
  // `redirect` de Next lève pour interrompre le rendu : on lève de même.
  redirect: vi.fn((cible: string) => {
    throw new Error(`REDIRECT:${cible}`);
  }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nom: string) =>
      nom === 'wn_portail' && cookieStore.valeur !== undefined ? { name: nom, value: cookieStore.valeur } : undefined,
  }),
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { signPatientSession } from '@/lib/patient-session';
import DossierDeLaPageLayout from './layout';

// Le segment canonique ([[D-481]], complément DOC-12, Q9 a) : une page ouverte
// sous `/portail/[token]` avec une session valide d'un autre `idPatient` renvoie
// à `/portail/<idPatient>`, sans texte. Sans session, rien ne change.

const enfant = 'contenu';
const rendre = (token: string) => DossierDeLaPageLayout({ children: enfant, params: Promise.resolve({ token }) });

describe('layout du dossier de la page — segment canonique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    cookieStore.valeur = undefined;
  });

  it('sans session : la page est rendue telle quelle, sous n’importe quel segment', async () => {
    expect(await rendre('jeton-de-parcours')).toBe(enfant);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('cookie falsifié : rien ne change', async () => {
    cookieStore.valeur = `${signPatientSession({ idPatient: 'PAT_SEED_01', email: 'sophie@example.test' })}x`;
    expect(await rendre('jeton-de-parcours')).toBe(enfant);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('session valide, segment égal à son idPatient : rendue', async () => {
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_SEED_01', email: 'sophie@example.test' });
    expect(await rendre('PAT_SEED_01')).toBe(enfant);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('session valide, segment quelconque : renvoi à l’entrée de son dossier', async () => {
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_SEED_01', email: 'sophie@example.test' });
    await expect(rendre('jeton-de-parcours')).rejects.toThrow('REDIRECT:/portail/PAT_SEED_01');
  });

  it('session valide, segment d’un autre dossier : renvoi à l’entrée du sien', async () => {
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_SEED_02', email: 'jennifer@example.test' });
    await expect(rendre('PAT_SEED_01')).rejects.toThrow('REDIRECT:/portail/PAT_SEED_02');
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
