// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// BANC DE LA PAGE DE CONNEXION (lot PRA-2a) : habillage seulement. Le lien
// d'évitement ([[D-488]] T-16) et le <main id="contenu"> sont propres à la
// page, rendue hors du shell ; un seul h1, qui porte la marque.

const signInMock = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));
const parametres = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => parametres,
}));

import LoginPage from './page';

afterEach(() => {
  cleanup();
  signInMock.mockReset();
});

describe('Connexion — lien d’évitement et repères', () => {
  it('« Aller au contenu » est le premier arrêt de tabulation et vise le <main id="contenu"> unique', () => {
    const { container } = render(<LoginPage />);
    const evitement = screen.getByRole('link', { name: 'Aller au contenu' });
    expect(container.querySelector('a, button, summary, input, select, textarea')).toBe(evitement);
    expect(evitement.getAttribute('href')).toBe('#contenu');
    expect(evitement.className).toMatch(/(^|\s)sr-only(\s|$)/);
    expect(evitement.className).toMatch(/\bfocus:not-sr-only\b/);
    expect(container.querySelectorAll('#contenu')).toHaveLength(1);
    expect(screen.getByRole('main').id).toBe('contenu');
  });

  it('un seul h1, qui porte le nom « Wellneuro » en texte', () => {
    render(<LoginPage />);
    const titres = screen.getAllByRole('heading', { level: 1 });
    expect(titres).toHaveLength(1);
    expect(titres[0].textContent).toContain('Wellneuro');
  });

  // Lot PRA-2 décor ([[D-481]] §1 bis, Q8 a) : le fond `login-calm` est posé
  // une fois, par `LienDecor`, sous le contenu et hors de l'accessibilité ; il
  // ne prend pas la place du lien d'évitement (premier arrêt, test ci-dessus).
  it('le décor de la connexion est posé une fois, hors de l’accessibilité, sous le contenu', () => {
    const { container } = render(<LoginPage />);
    const decors = container.querySelectorAll('[data-lien-decor]');
    expect(decors).toHaveLength(1);
    const decor = decors[0];
    expect(decor.getAttribute('data-lien-decor')).toBe('connexion-praticien');
    expect(decor.getAttribute('aria-hidden')).toBe('true');
    expect(decor.className).toMatch(/\bpointer-events-none\b/);
    expect(decor.className).toMatch(/\bprint:hidden\b/);
    expect(decor.className).toMatch(/(^|\s)-z-10(\s|$)/);
    // `isolate` borne le `-z-10` au cadre de la page : le fond ne passe pas
    // sous le `bg-background` qui le porte.
    const cadre = decor.parentElement as HTMLElement;
    expect(cadre.getAttribute('data-theme')).toBe('praticien');
    expect(cadre.className).toMatch(/\bisolate\b/);
    expect(cadre.className).toMatch(/\brelative\b/);
    expect(decor.querySelector('a, button, input, select, textarea, [tabindex]')).toBeNull();
  });

  it('le flux de connexion est inchangé : Google, retour au tableau de bord', () => {
    render(<LoginPage />);
    screen.getByRole('button', { name: 'Se connecter avec Google Workspace' }).click();
    expect(signInMock).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
  });
});
