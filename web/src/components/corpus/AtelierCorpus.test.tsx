// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// La file, l'étiquetage et l'exclusion en lot ont leurs propres bancs : ici,
// la vue d'ensemble seule (PRA-4, PR 4 ; Q1, Q8, Q11 de D-481, DOC-13).
vi.mock('./AtelierCorpusPanel', () => ({ AtelierCorpusPanel: () => null }));
vi.mock('./EtiquetageLotPanel', () => ({ EtiquetageLotPanel: () => null }));
vi.mock('./ExclusionRechercheLotPanel', () => ({ ExclusionRechercheLotPanel: () => null }));

import { AtelierCorpus } from './AtelierCorpus';

const SOURCE = {
  sourceId: 'WN-SRC-0001',
  titre: 'Cours de démonstration',
  enAttente: 4,
  voieRapide: 3,
  voieLente: 1,
  valides: 2,
  tirageOuvert: false,
};

function json(corps: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(corps) } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/praticien/corpus/claims/sources') {
      return Promise.resolve(json({ ok: true, notebooks: [{ notebook: 'Notebook A', sources: [SOURCE] }] }));
    }
    if (url.startsWith('/api/praticien/corpus/claims/lot/tirage?')) {
      return Promise.resolve(json({ ok: true, tirage: null }));
    }
    return Promise.resolve(json({}, false));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function appelsSources() {
  return fetchMock.mock.calls.filter(([url]) => url === '/api/praticien/corpus/claims/sources');
}

describe('AtelierCorpus — vue d’ensemble des sources', () => {
  it('« Sources en revue » est un h2 sous le h1 de la page (Q1)', async () => {
    render(<AtelierCorpus />);
    expect(screen.getByRole('heading', { level: 2, name: 'Sources en revue' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('WN-SRC-0001')).toBeTruthy());
  });

  it('la table garde ses lignes ; chaque cellule porte sa clé pour les blocs empilés au téléphone (Q8)', async () => {
    render(<AtelierCorpus />);
    await waitFor(() => expect(screen.getByText('WN-SRC-0001')).toBeTruthy());
    const ligne = screen.getByText('WN-SRC-0001').closest('tr');
    expect(ligne).toBeTruthy();
    expect(ligne?.className).toContain('md:table-row');
    for (const cle of ['En attente', 'Voie rapide', 'Individuelle', 'Validés']) {
      const cles = Array.from(ligne?.querySelectorAll('span') ?? []).filter((n) => n.textContent === cle);
      expect(cles).toHaveLength(1);
      expect(cles[0].className).toContain('md:hidden');
    }
  });

  it('« Voie rapide » ouvre un dialogue ; Échap le ferme sans conclure et rend le focus au déclencheur (Q11)', async () => {
    render(<AtelierCorpus />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Voie rapide' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Voie rapide' }));
    const dialogue = await screen.findByRole('dialog');
    expect(dialogue.getAttribute('data-theme')).toBe('praticien');
    expect(screen.getByRole('heading', { level: 2, name: 'Cours de démonstration' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fermer Cours de démonstration' })).toBeTruthy();
    const avant = appelsSources().length;

    fireEvent.keyDown(dialogue, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Fermer relit la table, sans aucune écriture : le tirage n'est pas clos.
    await waitFor(() => expect(appelsSources().length).toBe(avant + 1));
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Voie rapide' })),
    );
  });

  it('un clic hors du dialogue ne le ferme pas : la saisie en cours est gardée', async () => {
    render(<AtelierCorpus />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Voie rapide' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Voie rapide' }));
    await screen.findByRole('dialog');

    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.click(document.body);
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer Cours de démonstration' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });
});
