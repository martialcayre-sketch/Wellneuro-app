// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// Un rayon par page depuis D-324 §4. Les pages composent des panneaux lourds
// (fetch au montage) : on les stubbe pour n'observer QUE ce que la page monte
// et le garde-fou de son drapeau. Le stub de chaque panneau est un témoin :
// présent = monté, absent = non monté. Ces cas étaient ceux de la page unique
// jusqu'au 2026-10-18 ; ils suivent chaque rayon sur sa page.
vi.mock('@/components/BibliothequePanel', () => ({
  BibliothequePanel: () => <div data-testid="biblio-panel" />,
}));
vi.mock('@/components/complements/RayonComplementsPanel', () => ({
  RayonComplementsPanel: () => <div data-testid="rayon-complements-panel" />,
}));
vi.mock('@/components/biologie/RayonBiologiePanel', () => ({
  RayonBiologiePanel: () => <div data-testid="rayon-biologie-panel" />,
}));
vi.mock('@/components/fiches-usage/RayonFichesUsagePanel', () => ({
  RayonFichesUsagePanel: () => <div data-testid="rayon-fiches-usage-panel" />,
}));
vi.mock('@/components/fiches-assiette/RayonFichesConseilsPanel', () => ({
  RayonFichesConseilsPanel: () => <div data-testid="rayon-fiches-conseils-panel" />,
}));
vi.mock('@/components/corpus/RechercheCorpusRayonPanel', () => ({
  RechercheCorpusRayonPanel: () => <div data-testid="recherche-corpus-panel" />,
}));
vi.mock('@/components/bibliotheque/AssignationsPacksPanel', () => ({
  AssignationsPacksPanel: () => <div data-testid="assignations-packs-panel" />,
}));
vi.mock('@/lib/bibliotheque', () => ({ listeBibliotheque: () => [] }));

import QuestionnairesPage from './questionnaires/page';
import FichesConseilsPage from './fiches-conseils/page';
import ComplementsPage from './complements/page';
import AnalysesBiologiquesPage from './biologie/page';
import ConnaissancesPage from './connaissances/page';

afterEach(() => {
  cleanup();
  delete process.env.WN_C4_ENABLED;
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
  delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
});

describe('Rayon Questionnaires — catalogue, puis assignations et packs (D-324 §4)', () => {
  // Les assignations et packs n'ont PAS de drapeau, et c'est précisément
  // pourquoi ils ont besoin d'un banc : rien d'autre ne dirait qu'ils ont
  // quitté la page. Ils vivent avec le catalogue depuis l'arbitrage du
  // 2026-10-18 (cinq entrées, pas six).
  it('monte le catalogue et les assignations, sans condition de drapeau', () => {
    render(<QuestionnairesPage />);

    expect(screen.getByRole('heading', { level: 2, name: 'Questionnaires' })).toBeTruthy();
    expect(screen.getByTestId('biblio-panel')).toBeTruthy();
    expect(screen.getByTestId('assignations-packs-panel')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Assignations et packs' })).toBeTruthy();
  });
});

describe('Rayon Fiches conseils — onglet devenu page (D-324 §4)', () => {
  it('monte le panneau de relecture des fiches conseils, qui porte son propre en-tête', () => {
    render(<FichesConseilsPage />);

    expect(screen.getByTestId('rayon-fiches-conseils-panel')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('Rayon compléments — garde-fou du drapeau', () => {
  it('drapeau éteint : rien n’est monté, une bannière d’indisponibilité SANS code de chantier', () => {
    render(<ComplementsPage />);

    expect(screen.queryByTestId('rayon-complements-panel')).toBeNull();
    expect(screen.getByText(/rayon compléments n['’]est pas encore ouvert/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bC4\b/);
    expect(document.body.textContent).not.toMatch(/diff[eé]r[eé]/i);
  });

  it('drapeau levé : le panneau du rayon est monté, pas de bannière d’indisponibilité', () => {
    process.env.WN_C4_ENABLED = 'true';
    render(<ComplementsPage />);

    expect(screen.getByTestId('rayon-complements-panel')).toBeTruthy();
    expect(screen.queryByText(/rayon compléments n['’]est pas encore ouvert/i)).toBeNull();
  });
});

describe('Rayon Analyses biologiques — la page unique de la biologie (D-324 §6)', () => {
  it('drapeau éteint : catalogue non monté, bannière SANS code de chantier', () => {
    render(<AnalysesBiologiquesPage />);

    expect(screen.queryByTestId('rayon-biologie-panel')).toBeNull();
    expect(screen.getByText(/rayon biologie fonctionnelle n['’]est pas encore ouvert/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bCB-08\b/);
  });

  it('drapeau levé : le catalogue est monté, pas de bannière d’indisponibilité', () => {
    process.env.WN_CB_ENABLED = 'true';
    render(<AnalysesBiologiquesPage />);

    expect(screen.getByTestId('rayon-biologie-panel')).toBeTruthy();
    expect(screen.queryByText(/rayon biologie fonctionnelle n['’]est pas encore ouvert/i)).toBeNull();
  });

  // L'écran des fiches d'usage vivait sur « Biologie fonctionnelle »
  // (arbitrage du 2026-10-16, « près du parcours biologique ») ; il vit ici
  // depuis D-324 §6. Sans drapeau : la relecture n'émet rien.
  it('monte l’écran des fiches d’usage, drapeau du rayon levé ou non', () => {
    render(<AnalysesBiologiquesPage />);
    expect(screen.getByTestId('rayon-fiches-usage-panel')).toBeTruthy();
    cleanup();
    process.env.WN_CB_ENABLED = 'true';
    render(<AnalysesBiologiquesPage />);
    expect(screen.getByTestId('rayon-fiches-usage-panel')).toBeTruthy();
  });

  // D-122 §2 : l'affirmation suit l'état réel de l'étage 2. « Rien n'est
  // stocké » serait faux drapeau levé.
  it('l’étage 2 se dit selon son drapeau, jamais « rien n’est stocké » quand il est ouvert', () => {
    render(<AnalysesBiologiquesPage />);
    expect(screen.getByText(/aucune valeur biologique patient n['’]est saisie ni stockée dans/i)).toBeTruthy();
    cleanup();
    process.env.WN_CB_ENABLED = 'true';
    process.env.WN_CB_RESULTS_ENABLED = 'true';
    render(<AnalysesBiologiquesPage />);
    expect(screen.getByText(/saisie de résultats biologiques réels est ouverte/i)).toBeTruthy();
    expect(screen.queryByText(/aucune valeur biologique patient n['’]est saisie ni stockée dans/i)).toBeNull();
  });
});

describe('Connaissances — lecture du corpus (D-310 §2), garde-fou du drapeau', () => {
  it('drapeau éteint : rien n’est monté, une bannière d’indisponibilité dédiée', () => {
    render(<ConnaissancesPage />);

    expect(screen.getByRole('heading', { level: 2, name: 'Connaissances' })).toBeTruthy();
    expect(screen.queryByTestId('recherche-corpus-panel')).toBeNull();
    expect(screen.getByText(/recherche corpus clinique n['’]est pas encore ouverte/i)).toBeTruthy();
  });

  it('drapeau levé : le panneau de recherche est monté, pas de bannière d’indisponibilité', () => {
    process.env.WN_RECHERCHE_CORPUS_ENABLED = 'true';
    render(<ConnaissancesPage />);

    expect(screen.getByTestId('recherche-corpus-panel')).toBeTruthy();
    expect(screen.queryByText(/recherche corpus clinique n['’]est pas encore ouverte/i)).toBeNull();
  });
});
