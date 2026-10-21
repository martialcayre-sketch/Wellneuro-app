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

// L'AIDE PERMANENTE DU PORTAIL ([[D-293]] §3, amendement du 2026-10-21) : le
// pied de page de toutes les pages porte les numéros, chacun cliquable, et le
// délai de lecture. Textes validés tels quels par le responsable.
describe('layout du portail — pied de page et numéros d’urgence', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    cookieStore.valeur = undefined;
  });

  const rendre = async () => render(await PortailLayout({ children: <p>contenu</p> }));
  const texte = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim();

  it('le délai de lecture est dit au pied de page', async () => {
    await rendre();
    const pied = screen.getByRole('contentinfo');
    expect(texte(pied)).toContain(
      'Cet espace ne constitue pas un diagnostic médical. Vos informations sont transmises à votre praticien, qui ne les lit pas en temps réel.',
    );
  });

  it('les numéros, au texte validé, chacun cliquable — y compris sans session', async () => {
    await rendre();
    const pied = screen.getByRole('contentinfo');
    const ligne = [...pied.querySelectorAll('p')].map(texte).find(t => t?.startsWith('Besoin d’aide maintenant ?'));
    expect(ligne).toBe('Besoin d’aide maintenant ? Idées suicidaires : 3114 · Danger immédiat : 15 ou 112 · Par SMS : 114');
    for (const numero of ['3114', '15', '112', '114']) {
      expect(screen.getByRole('link', { name: numero }).getAttribute('href')).toBe(`tel:${numero}`);
    }
  });
});
