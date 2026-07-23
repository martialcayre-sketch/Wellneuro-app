// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VuesRapides } from './VuesRapides';

// Bandeau « Vues rapides » de la maquette Spirale : quatre onglets, l'actif
// est annoncé par aria-current — jamais par la couleur seule.

let cheminCourant = '/dashboard';
vi.mock('next/navigation', () => ({ usePathname: () => cheminCourant }));

afterEach(() => cleanup());

describe('VuesRapides', () => {
  it('affiche les quatre vues de la maquette, dans son ordre', () => {
    cheminCourant = '/dashboard';
    render(<VuesRapides />);
    const nav = screen.getByRole('navigation', { name: 'Vues rapides' });
    const liens = Array.from(nav.querySelectorAll('a')).map(a => a.textContent);
    expect(liens).toEqual(['Fil du jour', 'Trajectoire', 'Consultation', 'Correspondance']);
  });

  it('marque la vue active par aria-current', () => {
    cheminCourant = '/dashboard/patients/PAT_SEED_01';
    render(<VuesRapides />);
    expect(screen.getByRole('link', { name: 'Trajectoire' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Fil du jour' }).getAttribute('aria-current')).toBeNull();
  });

  it('« Fil du jour » n’est actif que sur l’accueil exact — pas sur toute l’arborescence', () => {
    cheminCourant = '/dashboard/copilote';
    render(<VuesRapides />);
    expect(screen.getByRole('link', { name: 'Fil du jour' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Consultation' }).getAttribute('aria-current')).toBe('page');
  });
});
