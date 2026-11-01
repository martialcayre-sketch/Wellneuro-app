// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MobileBottomNav } from './MobileBottomNav';

// La feuille « Plus » est portée par Radix hors du layout, sur le fond nuit du
// rail. Un item actif qui ne pose pas sa couleur de texte hérite de <body>,
// qui n'en pose aucune : noir sur nuit, illisible. Jusqu'ici seul
// « Paramètres » la posait, et le passage à `plusItems` l'avait perdue.

const pathnameMock = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock() }));

afterEach(() => {
  cleanup();
  pathnameMock.mockReset();
});

function ouvrirFeuilleSur(chemin: string) {
  pathnameMock.mockReturnValue(chemin);
  render(<MobileBottomNav />);
  fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
  return within(screen.getByRole('dialog')).getAllByRole('link');
}

describe('MobileBottomNav — la feuille « Plus »', () => {
  it('re-pose data-theme sur le portail — Radix portale hors du thème du layout', () => {
    ouvrirFeuilleSur('/dashboard');
    expect(screen.getByRole('dialog').getAttribute('data-theme')).toBe('praticien');
  });

  it('sur chacune de ses destinations, le libellé actif est en rail-foreground', () => {
    const destinations = ouvrirFeuilleSur('/dashboard').map((lien) => lien.getAttribute('href') ?? '');
    cleanup();
    expect(destinations.length).toBeGreaterThan(0);

    for (const chemin of destinations) {
      const liens = ouvrirFeuilleSur(chemin);
      const actifs = liens.filter((lien) => lien.getAttribute('aria-current') === 'page');
      expect(actifs.map((lien) => lien.getAttribute('href'))).toEqual([chemin]);
      expect(actifs[0].classList.contains('text-rail-foreground')).toBe(true);
      cleanup();
    }
  });
});
