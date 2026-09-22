// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { cookieStore } = vi.hoisted(() => ({ cookieStore: { valeur: undefined as string | undefined } }));
// `cookies()` est asynchrone en Next 15 — le layout l'`await`.
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nom: string) =>
      nom === 'wn_portail' && cookieStore.valeur !== undefined ? { name: nom, value: cookieStore.valeur } : undefined,
  }),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { signPatientSession } from '@/lib/patient-session';
import PortailLayout from './layout';

afterEach(cleanup);

// CE BANC EXISTE PARCE QU'IL MANQUAIT — relevé par la revue adversariale de la
// PR #1211 : aucun banc ne touchait `layout.tsx`, et `sessionOuverte` aurait pu
// être câblé à `true` sans que rien ne rougisse. Le bouton serait alors apparu
// pour tout le monde, y compris sur la page de connexion, où il n'a rien à
// faire — un patient non connecté à qui l'on propose de se déconnecter.
describe('layout du portail — visibilité de « Se déconnecter »', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    cookieStore.valeur = undefined;
  });

  const rendre = async () => render(await PortailLayout({ children: <p>contenu</p> }));
  const bouton = () => screen.queryByRole('button', { name: 'Se déconnecter' });

  it('aucun cookie : pas de bouton', async () => {
    await rendre();
    expect(bouton()).toBeNull();
    // Le portail reste rendu : c'est un bouton qui manque, pas la page.
    expect(screen.getByText('contenu')).toBeTruthy();
  });

  it('cookie illisible ou falsifié : pas de bouton', async () => {
    cookieStore.valeur = `${signPatientSession({ idPatient: 'PAT_1', email: 'p@example.test' })}x`;
    await rendre();
    expect(bouton()).toBeNull();

    cookieStore.valeur = 'pas-une-session-signee';
    cleanup();
    await rendre();
    expect(bouton()).toBeNull();
  });

  it('session signée valide : le bouton est là', async () => {
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_1', email: 'p@example.test' });
    await rendre();
    expect(bouton()).toBeTruthy();
  });
});
