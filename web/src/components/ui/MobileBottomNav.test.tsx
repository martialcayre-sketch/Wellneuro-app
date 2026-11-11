// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MobileBottomNav } from './MobileBottomNav';
import { SidebarRail } from './SidebarRail';

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

// LA PARITÉ FEUILLE / RAIL (D-324 §5), vérifiée d'un rendu à l'autre et non
// recopiée : « Comptes du cabinet » était dans le rail depuis #1780 sans aucun
// lien sous 768 px (Q26 de l'audit des rails, arbitrée « oubli » le 2026-11-02).
// La barre du bas et la feuille réunies doivent couvrir tout le rail, dans son
// ordre ; seule « Synthèses » est propre au téléphone.
describe('MobileBottomNav — les mêmes destinations que le rail', () => {
  it('chaque entrée du rail est dans la barre ou dans la feuille, et la feuille suit l’ordre du rail', () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) }) as unknown as Response));
    pathnameMock.mockReturnValue('/dashboard');
    const rail = render(<SidebarRail collapsed={false} />);
    const destinationsRail = within(rail.container)
      .getAllByRole('link')
      .map((lien) => lien.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/dashboard'));
    cleanup();
    vi.unstubAllGlobals();

    pathnameMock.mockReturnValue('/dashboard');
    render(<MobileBottomNav />);
    const barre = within(screen.getByRole('navigation', { name: 'Navigation principale' }))
      .getAllByRole('link')
      .map((lien) => lien.getAttribute('href') ?? '');
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
    const feuille = within(screen.getByRole('dialog'))
      .getAllByRole('link')
      .map((lien) => lien.getAttribute('href') ?? '');

    expect(feuille).toContain('/dashboard/cabinet');
    expect(feuille).toEqual(destinationsRail.filter((href) => !barre.includes(href)));
    expect(barre.filter((href) => !destinationsRail.includes(href))).toEqual(['/dashboard/synthese']);
  });
});

// UNE FICHE OUVERTE ALLUME « FICHES » (étape 1 de la refonte Lien, constat C4,
// 2026-11-11) : la barre ne comparait que le préfixe de « Fiches »
// (`/dashboard/trajectoires`), si bien qu'aucune case n'était active sur une
// fiche, quand le rail y allume « Fiche-trajectoire ».
describe('MobileBottomNav — état actif sur une fiche patient', () => {
  it('« Fiches » porte aria-current sur /dashboard/patients/<id>, et elle seule', () => {
    pathnameMock.mockReturnValue('/dashboard/patients/p-1');
    render(<MobileBottomNav />);
    const barre = screen.getByRole('navigation', { name: 'Navigation principale' });
    const actifs = within(barre)
      .getAllByRole('link')
      .filter((lien) => lien.getAttribute('aria-current') === 'page');
    expect(actifs.map((lien) => lien.getAttribute('href'))).toEqual(['/dashboard/trajectoires']);
  });

  it('la liste des patients n’allume pas « Fiches »', () => {
    pathnameMock.mockReturnValue('/dashboard/patients');
    render(<MobileBottomNav />);
    const barre = screen.getByRole('navigation', { name: 'Navigation principale' });
    const actifs = within(barre)
      .getAllByRole('link')
      .filter((lien) => lien.getAttribute('aria-current') === 'page');
    expect(actifs).toEqual([]);
  });
});

// FEUILLE « PLUS » PAR GROUPES ([[D-481]] §5, [[D-487]]) et entrée active Lien
// (filet champagne, revue de COM-0 routée vers PRA-1).
describe('MobileBottomNav — intertitres et entrée active (PRA-1)', () => {
  it('la feuille porte les quatre intertitres, chacun avant ses entrées', () => {
    pathnameMock.mockReturnValue('/dashboard');
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
    const feuille = within(screen.getByRole('dialog'));
    const groupeDe = (libelle: string) =>
      feuille.getByRole('link', { name: libelle }).parentElement?.querySelector('p')?.textContent;
    expect(groupeDe('Patients')).toBe('Travail');
    expect(groupeDe('Confiance & droits')).toBe('Travail');
    expect(groupeDe('Questionnaires')).toBe('Bibliothèque');
    expect(groupeDe('Atelier corpus')).toBe('Ateliers');
    expect(groupeDe('Comptes du cabinet')).toBe('Cabinet');
    expect(groupeDe('Paramètres')).toBe('Cabinet');
  });

  it('l’entrée active de la barre : fond rail-surface et filet rail-accent, plus de pastille pétrole', () => {
    pathnameMock.mockReturnValue('/dashboard');
    render(<MobileBottomNav />);
    const barre = screen.getByRole('navigation', { name: 'Navigation principale' });
    const actif = within(barre).getByRole('link', { name: 'Le Fil' });
    expect(actif.getAttribute('aria-current')).toBe('page');
    expect(actif.className).toMatch(/\bbg-rail-surface\b/);
    expect(actif.className).toContain('var(--rail-accent)');
    expect(barre.innerHTML).not.toMatch(/bg-rail-primary/);
  });

  it('« Plus » porte le même état quand la page courante est dans la feuille', () => {
    pathnameMock.mockReturnValue('/dashboard/cabinet');
    render(<MobileBottomNav />);
    expect(screen.getByRole('button', { name: 'Plus' }).className).toContain('var(--rail-accent)');
  });

  it('aucune entrée sans lien dans la feuille : ni Documents, ni Règles, ni Positions d’expert (D-485 §2)', () => {
    const liens = ouvrirFeuilleSur('/dashboard');
    const hrefs = liens.map((lien) => lien.getAttribute('href'));
    for (const absent of ['/dashboard/documents', '/dashboard/regles', '/dashboard/bibliotheque/positions-expert']) {
      expect(hrefs).not.toContain(absent);
    }
    expect(liens.map((lien) => lien.textContent)).not.toContain('Documents');
  });

  it('icônes au trait Lien (1,75)', () => {
    pathnameMock.mockReturnValue('/dashboard');
    render(<MobileBottomNav />);
    const barre = screen.getByRole('navigation', { name: 'Navigation principale' });
    const traits = [...barre.querySelectorAll('svg')].map((svg) => svg.getAttribute('stroke-width'));
    expect(new Set(traits)).toEqual(new Set(['1.75']));
  });
});
