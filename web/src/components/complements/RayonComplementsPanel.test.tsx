// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
// catalogue.ts importe prisma au chargement (pour FACETTES/types) : on le
// neutralise, ce test ne touche jamais la base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { FACETTES, type CatalogueResult, type FicheComplement } from '@/lib/supplement-library/catalogue';
import { RayonComplementsPanel } from './RayonComplementsPanel';

// La fiche justificative est stubbée : on teste ici l'instrument (liste,
// facettes, tri, tiroir), pas le détail déjà couvert par FicheComplementPanel.test.
vi.mock('@/components/complements/FicheComplementPanel', () => ({
  FicheComplementPanel: ({ fiche }: { fiche: FicheComplement }) => (
    <div data-testid="fiche-stub">Détail de {fiche.nomCommercial}</div>
  ),
}));

const fetchMock = vi.fn();
const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

function fiche(over: Partial<FicheComplement> = {}): FicheComplement {
  return {
    produitId: over.produitId ?? 'prod_mag',
    nomCommercial: over.nomCommercial ?? 'Magnésium Plus',
    marque: over.marque ?? 'MarqueA',
    marche: 'FR',
    statutFiche: over.statutFiche ?? 'importee',
    statutLabel: 'Fiche importée — non vérifiée',
    composition: [],
    dimensions: {
      qualiteFormulation: { valeur: 'bien_documentee', justification: '' },
      biodisponibiliteForme: { valeurs: [], valeursPresentes: ['non_evaluee'], justification: '' },
      gradePreuveParIntention: { valeurs: [], justification: '' },
      compatibiliteProtocole: { valeur: 'non_evaluee', justification: '' },
      interactionsSignalees: { valeur: 'non_evaluee', signalements: [], mentionMedecin: '', justification: '' },
      cumulVsSeuils: { valeur: 'non_evaluee', signaux: [], justification: '' },
      donneesManquantes: { valeur: 'aucune', elements: [], justification: '' },
      fraicheurProvenance: {
        provenance: 'dgccrf', identifiantSource: 'DGCCRF-001', urlSource: null,
        dateDerniereVerification: null, versionFormulation: 1,
        statutFiche: 'importee', statutLabel: 'Fiche importée — non vérifiée', justification: '',
      },
    },
    reglesCorrespondantes: over.reglesCorrespondantes ?? 0,
    referencesScientifiques: [],
  };
}

function catalogue(over: Partial<CatalogueResult> = {}): CatalogueResult {
  return {
    contractVersion: 'c4-catalogue-v1',
    aucunScoreGlobal: true,
    intentionFiltre: over.intentionFiltre ?? null,
    codesInconnus: [],
    tri: over.tri ?? 'neutre',
    total: over.fiches?.length ?? 0,
    fiches: over.fiches ?? [],
    facettes: FACETTES,
  };
}

function routerFetch(cat: CatalogueResult) {
  return (url: string | URL) => {
    const u = String(url);
    if (u.includes('/complements/corpus')) {
      return Promise.resolve(json({ ok: true, corpusVide: true, claims: [], message: '' }));
    }
    if (u.includes('/api/praticien/complements')) {
      return Promise.resolve(json({ ok: true, ...cat }));
    }
    return Promise.resolve(json({}, false));
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonComplementsPanel (instrument à tiroir)', () => {
  it('charge et liste les fiches du catalogue', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche({ nomCommercial: 'Magnésium Plus' })] })));
    render(<RayonComplementsPanel />);
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());
    expect(screen.getByText('1 fiche')).toBeTruthy();
    // Le premier appel vise bien le service catalogue.
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/praticien/complements');
  });

  it('gère un catalogue vide : « en cours de constitution », jamais une erreur', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [] })));
    render(<RayonComplementsPanel />);
    await waitFor(() =>
      expect(screen.getByText(/Catalogue en cours de constitution/)).toBeTruthy(),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un échec de chargement propose de réessayer (jamais confondu avec un vide)', async () => {
    fetchMock.mockResolvedValue(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, false));
    render(<RayonComplementsPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });

  it('une facette filtre indépendamment : le rechargement porte le paramètre de facette', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());

    // Bascule la facette qualité « Bien documentée ».
    fireEvent.click(screen.getByRole('button', { name: 'Bien documentée' }));
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([u]) => String(u));
      expect(urls.some((u) => u.includes('qualite=bien_documentee'))).toBe(true);
    });
  });

  it('le tri mono-dimension est porté dans la requête', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Clé de tri (mono-dimension)'), { target: { value: 'marque' } });
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([u]) => String(u));
      expect(urls.some((u) => u.includes('tri=marque'))).toBe(true);
    });
  });

  it('ouvre la fiche justificative dans le tiroir au clic', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche({ nomCommercial: 'Magnésium Plus' })] })));
    render(<RayonComplementsPanel />);
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Magnésium Plus/ }));
    await waitFor(() => expect(screen.getByTestId('fiche-stub')).toBeTruthy());
    expect(screen.getByText('Détail de Magnésium Plus')).toBeTruthy();
  });
});
