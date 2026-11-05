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
// Le menu « Mon espace » ([[D-442]]) lit le chemin quand son drapeau est ouvert.
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_1' }),
  usePathname: () => '/portail/PAT_1/suivi',
}));

import { signPatientSession } from '@/lib/patient-session';
import PortailLayout, { generateViewport } from './layout';

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

// MENU « MON ESPACE » ([[D-442]] §6 et §8) : drapeau fermé, le portail est
// celui d'avant ; ouvert, le lien d'évitement ouvre la page et vise <main>.
describe('layout du portail — drapeau `WN_PORTAIL_MENU`', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_1', email: 'p@example.test' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
  });
  afterEach(() => {
    delete process.env.WN_PORTAIL_MENU;
    vi.unstubAllGlobals();
  });

  const rendre = async () => render(await PortailLayout({ children: <p>contenu</p> }));

  it('fermé : ni lien d’évitement, ni lien d’accueil, ni `id` sur <main>', async () => {
    const { container } = await rendre();
    expect(screen.queryByRole('link', { name: 'Aller au contenu' })).toBeNull();
    expect(screen.getByText('Wellneuro').closest('a')).toBeNull();
    expect(screen.getByRole('main').id).toBe('');
    expect(screen.getByRole('main').getAttribute('tabindex')).toBeNull();
    expect(container.querySelector('#contenu')).toBeNull();
  });

  it('ouvert : « Aller au contenu » est le premier lien de la page et vise <main id="contenu">', async () => {
    process.env.WN_PORTAIL_MENU = 'true';
    const { container } = await rendre();
    const evitement = screen.getByRole('link', { name: 'Aller au contenu' });
    expect(container.querySelector('a, button, summary')).toBe(evitement);
    expect(evitement.getAttribute('href')).toBe('#contenu');
    expect(evitement.className).toMatch(/\bsr-only\b/);
    expect(evitement.className).toMatch(/\bfocus:not-sr-only\b/);
    expect(screen.getByRole('main').id).toBe('contenu');
  });

  it('ouvert, lectures en échec : aucun bouton « Menu » (fail-closed)', async () => {
    process.env.WN_PORTAIL_MENU = 'true';
    await rendre();
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});


// BARRE BASSE ([[D-444]] §4, §8) : sans effet menu fermé ; ouverte, le viewport
// prend `viewport-fit=cover` et le conteneur rend les zones sûres latérales.
describe('layout du portail — drapeau `WN_PORTAIL_BARRE_BASSE`', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_1', email: 'p@example.test' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
  });
  afterEach(() => {
    delete process.env.WN_PORTAIL_MENU;
    delete process.env.WN_PORTAIL_BARRE_BASSE;
    vi.unstubAllGlobals();
  });

  const rendre = async () => render(await PortailLayout({ children: <p>contenu</p> }));
  // Latérales et basse : sans la basse, une page sans barre (mineur, murs)
  // passerait sous l'indicateur d'accueil (revue PR-Agent de #1875).
  const zonesSures = (container: HTMLElement) => {
    const classe = (container.firstElementChild as HTMLElement).className;
    const poses = ['left', 'right', 'bottom'].map(cote => classe.includes(`safe-area-inset-${cote}`));
    expect(new Set(poses).size).toBe(1);
    return poses[0];
  };

  for (const [cas, menu, barre] of [
    ['les deux fermés', undefined, undefined],
    ['barre seule, menu fermé', undefined, 'true'],
    ['menu seul', 'true', undefined],
  ] as const) {
    it(`${cas} : viewport par défaut, ni barre, ni zones sûres`, async () => {
      if (menu) process.env.WN_PORTAIL_MENU = menu;
      if (barre) process.env.WN_PORTAIL_BARRE_BASSE = barre;
      expect(generateViewport()).toEqual({});
      const { container } = await rendre();
      expect(screen.queryByRole('navigation', { name: 'Accès rapides' })).toBeNull();
      expect(zonesSures(container)).toBe(false);
    });
  }

  it('les deux ouverts : `viewport-fit=cover`, zones sûres ; lectures en échec, pas de barre', async () => {
    process.env.WN_PORTAIL_MENU = 'true';
    process.env.WN_PORTAIL_BARRE_BASSE = 'true';
    expect(generateViewport()).toEqual({ viewportFit: 'cover' });
    const { container } = await rendre();
    expect(zonesSures(container)).toBe(true);
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('navigation', { name: 'Accès rapides' })).toBeNull();
  });
});

// RAIL LATÉRAL ([[D-447]] §8) : sans effet menu fermé ; ouvert, le `main` passe
// dans le cadre du rail, qui ne fait que l'étirer tant que la garde n'est pas
// lue — lectures en échec : ni rail, ni colonne.
describe('layout du portail — drapeau `WN_PORTAIL_RAIL_LATERAL`', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    cookieStore.valeur = signPatientSession({ idPatient: 'PAT_1', email: 'p@example.test' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
  });
  afterEach(() => {
    delete process.env.WN_PORTAIL_MENU;
    delete process.env.WN_PORTAIL_RAIL_LATERAL;
    vi.unstubAllGlobals();
  });

  const rendre = async () => render(await PortailLayout({ children: <p>contenu</p> }));
  const parent = () => screen.getByRole('main').parentElement as HTMLElement;

  for (const [cas, menu, rail] of [
    ['les deux fermés', undefined, undefined],
    ['rail seul, menu fermé', undefined, 'true'],
    ['menu seul', 'true', undefined],
  ] as const) {
    it(`${cas} : le \`main\` est enfant direct du conteneur, sans cadre`, async () => {
      if (menu) process.env.WN_PORTAIL_MENU = menu;
      if (rail) process.env.WN_PORTAIL_RAIL_LATERAL = rail;
      const { container } = await rendre();
      expect(parent()).toBe(container.firstElementChild);
      expect(screen.getByRole('main').className).not.toMatch(/\bmin-w-0\b/);
    });
  }

  it('les deux ouverts, lectures en échec : le cadre étire le `main`, ni rail ni colonne', async () => {
    process.env.WN_PORTAIL_MENU = 'true';
    process.env.WN_PORTAIL_RAIL_LATERAL = 'true';
    await rendre();
    await new Promise(r => setTimeout(r, 0));
    expect(parent().className).toBe('flex flex-1 flex-col');
    expect(screen.getByRole('main').className).toMatch(/\bmin-w-0\b/);
    expect(screen.queryByRole('navigation', { name: 'Mon espace' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});
