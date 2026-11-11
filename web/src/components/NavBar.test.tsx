// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NavBar, RAIL_ESCAMOTE_STORAGE_KEY } from './NavBar';

// BANC DE L'EN-TÊTE ET DES TROIS ÉTATS DU RAIL PRATICIEN (lot PRA-1).
// - [[D-484]] : plus de vues rapides dans l'en-tête, à toute largeur.
// - [[D-486]] : déplié, réduit en icônes, escamoté. `wn-rail-expanded`
//   inchangée ; l'escamotage mémorisé par rôle, sans donnée patient ;
//   « Masquer la navigation » au pied du rail, « Afficher la navigation »
//   dans l'en-tête ; le focus suit la commande.
// jsdom n'applique pas Tailwind : on lit l'attribut `hidden`, qui retire le
// rail du rendu, du clavier et de l'arbre d'accessibilité.

const pathnameMock = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock() }));
vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

beforeEach(() => {
  window.localStorage.clear();
  pathnameMock.mockReturnValue('/dashboard');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) }) as unknown as Response));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  pathnameMock.mockReset();
});

function rendre() {
  return render(
    <NavBar email="praticien@exemple.test" buildLabel="build 0000000">
      <p>Contenu</p>
    </NavBar>,
  );
}

const rail = (container: HTMLElement) => container.querySelector<HTMLElement>('aside#rail-praticien')!;

describe('NavBar — en-tête sans vues rapides (D-484)', () => {
  it('aucune navigation « Vues rapides », aucun lien de destination dans l’en-tête', () => {
    const { container } = rendre();
    expect(screen.queryByRole('navigation', { name: 'Vues rapides' })).toBeNull();
    const entete = container.querySelector('header')!;
    expect(within(entete).queryAllByRole('link')).toEqual([]);
    expect(entete.textContent).not.toMatch(/Fil du jour|Consultation\b/);
  });

  it('la marque de l’en-tête (tablette) est Empreinte, sans initiales', () => {
    const { container } = rendre();
    const entete = container.querySelector('header')!;
    expect(entete.querySelector('[data-tone="light"]')).not.toBeNull();
    expect(entete.textContent).not.toMatch(/\bWN\b/);
  });
});

describe('NavBar — déplié et réduit (clé wn-rail-expanded inchangée)', () => {
  it('déplié par défaut ; « Réduire la navigation » réduit et mémorise', () => {
    const { container } = rendre();
    const bouton = within(rail(container)).getByRole('button', { name: 'Réduire la navigation' });
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(bouton);
    expect(window.localStorage.getItem('wn-rail-expanded')).toBe('false');
    expect(within(rail(container)).getByRole('button', { name: 'Étendre la navigation' })).toBeTruthy();
  });

  it('le focus reste sur la commande après « Réduire » puis « Étendre » (revue CodeRabbit #1997)', () => {
    const { container } = rendre();
    const reduire = within(rail(container)).getByRole('button', { name: 'Réduire la navigation' });
    reduire.focus();
    fireEvent.click(reduire);
    const etendre = within(rail(container)).getByRole('button', { name: 'Étendre la navigation' });
    // Même nœud : le bouton n'a pas été remonté, le focus ne s'est pas perdu.
    expect(etendre).toBe(reduire);
    expect(document.activeElement).toBe(etendre);
    fireEvent.click(etendre);
    expect(document.activeElement).toBe(within(rail(container)).getByRole('button', { name: 'Réduire la navigation' }));
  });

  it('un choix « réduit » mémorisé est relu au montage', async () => {
    window.localStorage.setItem('wn-rail-expanded', 'false');
    const { container } = rendre();
    expect(await within(rail(container)).findByRole('button', { name: 'Étendre la navigation' })).toBeTruthy();
  });
});

describe('NavBar — escamotage (D-486)', () => {
  it('« Masquer la navigation » retire le rail et rend le focus à « Afficher la navigation »', () => {
    const { container } = rendre();
    expect(rail(container).hidden).toBe(false);
    expect(screen.queryByRole('button', { name: 'Afficher la navigation' })).toBeNull();

    const masquer = within(rail(container)).getByRole('button', { name: 'Masquer la navigation' });
    masquer.focus();
    fireEvent.click(masquer);

    expect(rail(container).hidden).toBe(true);
    // Hors de l'arbre d'accessibilité : plus de bouton du rail, et le rail
    // n'est plus une navigation atteignable (seule la barre du téléphone reste
    // dans le DOM de jsdom).
    expect(screen.queryByRole('button', { name: 'Masquer la navigation' })).toBeNull();
    expect(screen.getAllByRole('navigation', { name: 'Navigation principale' })).toHaveLength(1);

    const afficher = within(container.querySelector('header')!).getByRole('button', { name: 'Afficher la navigation' });
    expect(document.activeElement).toBe(afficher);
  });

  it('mémorisé par rôle, sans donnée patient : la clé porte le rôle, la valeur « true »', () => {
    pathnameMock.mockReturnValue('/dashboard/patients/PAT_SEED_01');
    const { container } = rendre();
    fireEvent.click(within(rail(container)).getByRole('button', { name: 'Masquer la navigation' }));
    expect(RAIL_ESCAMOTE_STORAGE_KEY).toBe('wn-rail-escamote-praticien');
    expect(window.localStorage.getItem(RAIL_ESCAMOTE_STORAGE_KEY)).toBe('true');
    for (let i = 0; i < window.localStorage.length; i++) {
      const cle = window.localStorage.key(i)!;
      expect(`${cle}=${window.localStorage.getItem(cle)}`).not.toMatch(/PAT_|patients/);
    }
    // La clé du repli n'est pas touchée par l'escamotage.
    expect(window.localStorage.getItem('wn-rail-expanded')).toBeNull();
  });

  it('« Afficher la navigation » rouvre le rail, rend le focus à son pied et oublie l’escamotage', () => {
    const { container } = rendre();
    fireEvent.click(within(rail(container)).getByRole('button', { name: 'Masquer la navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Afficher la navigation' }));

    expect(rail(container).hidden).toBe(false);
    expect(screen.queryByRole('button', { name: 'Afficher la navigation' })).toBeNull();
    expect(document.activeElement).toBe(within(rail(container)).getByRole('button', { name: 'Masquer la navigation' }));
    expect(window.localStorage.getItem(RAIL_ESCAMOTE_STORAGE_KEY)).toBeNull();
  });

  it('un rail escamoté reste escamoté au rechargement', async () => {
    window.localStorage.setItem(RAIL_ESCAMOTE_STORAGE_KEY, 'true');
    const { container } = rendre();
    await act(async () => {});
    expect(rail(container).hidden).toBe(true);
    expect(screen.getByRole('button', { name: 'Afficher la navigation' })).toBeTruthy();
  });

  it('la barre du téléphone n’est pas touchée par l’escamotage du rail', () => {
    const { container } = rendre();
    fireEvent.click(within(rail(container)).getByRole('button', { name: 'Masquer la navigation' }));
    const barre = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(barre).getAllByRole('link').map((l) => l.textContent)).toEqual(['Le Fil', 'Fiches', 'Synthèses']);
  });
});
