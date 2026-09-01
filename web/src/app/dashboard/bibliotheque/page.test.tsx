// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// La page compose des panneaux lourds (fetch au montage) : on les stubbe pour
// n'observer QUE le garde-fou du drapeau. Le stub de chaque rayon est un
// témoin : présent = monté, absent = non monté.
vi.mock('@/components/BibliothequePanel', () => ({
  BibliothequePanel: () => <div data-testid="biblio-panel" />,
}));
vi.mock('@/components/complements/RayonComplementsPanel', () => ({
  RayonComplementsPanel: () => <div data-testid="rayon-complements-panel" />,
}));
vi.mock('@/components/biologie/RayonBiologiePanel', () => ({
  RayonBiologiePanel: () => <div data-testid="rayon-biologie-panel" />,
}));
vi.mock('@/components/corpus/RechercheCorpusRayonPanel', () => ({
  RechercheCorpusRayonPanel: () => <div data-testid="recherche-corpus-panel" />,
}));
vi.mock('@/lib/bibliotheque', () => ({ listeBibliotheque: () => [] }));

import BibliothequePage from './page';

afterEach(() => {
  cleanup();
  delete process.env.WN_C4_ENABLED;
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
});

describe('BibliothequePage — garde-fou du rayon compléments', () => {
  it('drapeau éteint : rien n’est monté, une bannière d’indisponibilité SANS code de chantier', () => {
    delete process.env.WN_C4_ENABLED;
    render(<BibliothequePage />);

    // Le panneau du rayon n'est PAS monté.
    expect(screen.queryByTestId('rayon-complements-panel')).toBeNull();
    // Bannière d'indisponibilité présente — regex propre au rayon : celle des
    // autres rayons partage la même phrase et matcherait à sa place.
    expect(screen.getByText(/rayon compléments n['’]est pas encore ouvert/i)).toBeTruthy();
    // Aucun code de chantier visible (« C4 », « différé »).
    expect(document.body.textContent).not.toMatch(/\bC4\b/);
    expect(document.body.textContent).not.toMatch(/diff[eé]r[eé]/i);
  });

  it('drapeau levé : le panneau du rayon est monté, pas de bannière d’indisponibilité', () => {
    process.env.WN_C4_ENABLED = 'true';
    render(<BibliothequePage />);

    expect(screen.getByTestId('rayon-complements-panel')).toBeTruthy();
    expect(screen.queryByText(/rayon compléments n['’]est pas encore ouvert/i)).toBeNull();
  });
});

describe('BibliothequePage — garde-fou du rayon biologie', () => {
  it('drapeau éteint : rien n’est monté, une bannière d’indisponibilité SANS code de chantier', () => {
    delete process.env.WN_CB_ENABLED;
    render(<BibliothequePage />);

    expect(screen.queryByTestId('rayon-biologie-panel')).toBeNull();
    expect(
      screen.getByText(/rayon biologie fonctionnelle n['’]est pas encore ouvert/i),
    ).toBeTruthy();
    // Aucun code de chantier visible (« CB-08 » n'est pas un texte d'écran).
    expect(document.body.textContent).not.toMatch(/\bCB-08\b/);
  });

  it('drapeau levé : le panneau du rayon est monté, pas de bannière d’indisponibilité', () => {
    process.env.WN_CB_ENABLED = 'true';
    render(<BibliothequePage />);

    expect(screen.getByTestId('rayon-biologie-panel')).toBeTruthy();
    expect(
      screen.queryByText(/rayon biologie fonctionnelle n['’]est pas encore ouvert/i),
    ).toBeNull();
  });

  it('ce drapeau est indépendant de WN_C4_ENABLED', () => {
    delete process.env.WN_C4_ENABLED;
    process.env.WN_CB_ENABLED = 'true';
    render(<BibliothequePage />);

    expect(screen.getByTestId('rayon-biologie-panel')).toBeTruthy();
    expect(screen.queryByTestId('rayon-complements-panel')).toBeNull();
  });
});

describe('BibliothequePage — garde-fou de la recherche corpus clinique', () => {
  it('drapeau éteint : rien n’est monté, une bannière d’indisponibilité dédiée', () => {
    delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
    render(<BibliothequePage />);

    expect(screen.queryByTestId('recherche-corpus-panel')).toBeNull();
    expect(screen.getByText(/recherche corpus clinique n['’]est pas encore ouverte/i)).toBeTruthy();
  });

  it('drapeau levé : le panneau de recherche corpus est monté, pas de bannière d’indisponibilité', () => {
    process.env.WN_RECHERCHE_CORPUS_ENABLED = 'true';
    render(<BibliothequePage />);

    expect(screen.getByTestId('recherche-corpus-panel')).toBeTruthy();
    expect(screen.queryByText(/recherche corpus clinique n['’]est pas encore ouverte/i)).toBeNull();
  });

  it('ce drapeau est indépendant de WN_C4_ENABLED', () => {
    delete process.env.WN_C4_ENABLED;
    process.env.WN_RECHERCHE_CORPUS_ENABLED = 'true';
    render(<BibliothequePage />);

    expect(screen.getByTestId('recherche-corpus-panel')).toBeTruthy();
  });
});
