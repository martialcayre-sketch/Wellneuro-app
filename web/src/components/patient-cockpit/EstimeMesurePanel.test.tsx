// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CbFeatureProvider } from './CbFeatureProvider';
import { EstimeMesurePanel } from './EstimeMesurePanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('EstimeMesurePanel — drapeau éteint (fail-closed)', () => {
  it('documente l’instrument sans aucune donnée ni promesse fausse, et ne lit RIEN', () => {
    // Le stub est posé AVANT le rendu : la preuve du fail-closed est un
    // mock jamais appelé, pas une ternaire qui compare [] à [].
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // Hors provider (ou provider sans resultsEnabled) : éteint par défaut.
    render(<EstimeMesurePanel idPatient="PAT1" />);
    expect(screen.getByRole('region', { name: 'Estimé et mesuré' })).toBeTruthy();
    // Le badge ne parle plus d'un « HDS requis » : l'hébergement est en place
    // (D-081 requalifié) — c'est l'ACTIVATION de l'étage 2 qui manque.
    expect(screen.getByText('Second temps — à activer')).toBeTruthy();
    expect(screen.queryByText(/HDS requis/)).toBeNull();
    expect(screen.getByText(/jamais fusionnés en un chiffre unique/)).toBeTruthy();
    // Aucune valeur fabriquée : pas de nombre isolé dans le panneau.
    expect(screen.queryByText(/\d+ ?(ng\/mL|:1)/)).toBeNull();
    // Éteint, le panneau ne lit RIEN : aucune requête ne part.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sans idPatient, le panneau reste au second temps même drapeau levé', () => {
    render(
      <CbFeatureProvider enabled resultsEnabled>
        <EstimeMesurePanel />
      </CbFeatureProvider>,
    );
    expect(screen.getByText('Second temps — à activer')).toBeTruthy();
  });
});

describe('EstimeMesurePanel — drapeau levé (étage 2, D-122 §2)', () => {
  function mockFetch() {
    const fetchMock = vi.fn(async (entree: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(entree);
      if (url.includes('/api/praticien/biologie/resultats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            resultats: [
              {
                id: 'r1',
                analyteCode: 'BIO_FERRITINE',
                analyteLibelle: 'Ferritine',
                valeur: 42.5,
                unite: 'µg/L',
                preleveLe: '2026-09-01T08:00:00.000Z',
                source: 'saisie_praticien',
              },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/praticien/biologie/catalogue')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            analytes: [{ code: 'BIO_FERRITINE', libelle: 'Ferritine', unite: 'µg/L' }],
          }),
        } as Response;
      }
      return { ok: false, status: 500, json: async () => ({ ok: false }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('lit la série, l’affiche par analyte avec unité et horodatage, et offre la saisie', async () => {
    mockFetch();
    render(
      <CbFeatureProvider enabled resultsEnabled>
        <EstimeMesurePanel idPatient="PAT1" />
      </CbFeatureProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Ferritine')).toBeTruthy();
    });
    expect(screen.getByText(/42\.5 µg\/L/)).toBeTruthy();
    // La confrontation reste dite, jamais fusionnée (A6-R2).
    expect(screen.getByText(/jamais fusionnés en un chiffre unique/)).toBeTruthy();
    // La saisie porte l'heure (frontière PR #838) et l'unité vient du
    // catalogue : aucun champ unité à saisir.
    expect(screen.getByLabelText(/Prélevé le \(avec l’heure\)/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Unité$/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Consigner la mesure' })).toBeTruthy();
  });

  it('le GET de la série vise la route résultats avec l’idPatient', async () => {
    const fetchMock = mockFetch();
    render(
      <CbFeatureProvider enabled resultsEnabled>
        <EstimeMesurePanel idPatient="PAT1" />
      </CbFeatureProvider>,
    );
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([u]) =>
          String(u).startsWith('/api/praticien/biologie/resultats?idPatient=PAT1'),
        ),
      ).toBe(true);
    });
  });

  it('échec de lecture : le panneau le DIT, jamais « aucune mesure » (DC-24)', async () => {
    // L'absence de donnée ne se fabrique pas : une panne de lecture n'est ni
    // zéro ni « rien à voir » — même règle que le runtime clinique.
    const fetchMock = vi.fn(async (entree: RequestInfo | URL) => {
      const url = String(entree);
      if (url.includes('/api/praticien/biologie/resultats')) {
        return { ok: false, status: 500, json: async () => ({ ok: false }) } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, analytes: [] }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CbFeatureProvider enabled resultsEnabled>
        <EstimeMesurePanel idPatient="PAT1" />
      </CbFeatureProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(screen.getByText(/n’a pas pu être lue/)).toBeTruthy();
    expect(screen.queryByText(/Aucune mesure consignée/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Relire la série' })).toBeTruthy();
  });

  it('deux mesures du même analyte à deux heures du même jour coexistent à l’écran', async () => {
    // Le cœur de la frontière PR #838 : l'heure distingue, l'écran montre les deux.
    const fetchMock = vi.fn(async (entree: RequestInfo | URL) => {
      const url = String(entree);
      if (url.includes('/api/praticien/biologie/resultats')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            resultats: [
              {
                id: 'r1', analyteCode: 'BIO_CORTISOL', analyteLibelle: 'Cortisol salivaire',
                valeur: 12.1, unite: 'nmol/L', preleveLe: '2026-09-01T06:30:00.000Z',
                source: 'saisie_praticien',
              },
              {
                id: 'r2', analyteCode: 'BIO_CORTISOL', analyteLibelle: 'Cortisol salivaire',
                valeur: 3.4, unite: 'nmol/L', preleveLe: '2026-09-01T15:30:00.000Z',
                source: 'saisie_praticien',
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, analytes: [] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CbFeatureProvider enabled resultsEnabled>
        <EstimeMesurePanel idPatient="PAT1" />
      </CbFeatureProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Cortisol salivaire')).toBeTruthy();
    });
    // UN groupe d'analyte, DEUX lignes horodatées.
    expect(screen.getAllByText('Cortisol salivaire')).toHaveLength(1);
    expect(screen.getByText(/12\.1 nmol\/L/)).toBeTruthy();
    expect(screen.getByText(/3\.4 nmol\/L/)).toBeTruthy();
  });

  it('le POST de saisie ne porte ni unité, ni source, ni auteur — le serveur les pose', async () => {
    const fetchMock = mockFetch();
    render(
      <CbFeatureProvider enabled resultsEnabled>
        <EstimeMesurePanel idPatient="PAT1" />
      </CbFeatureProvider>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Analyte (unité du catalogue)')).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText('Analyte (unité du catalogue)'), {
      target: { value: 'BIO_FERRITINE' },
    });
    fireEvent.change(screen.getByLabelText(/^Valeur/), { target: { value: '51,2' } });
    fireEvent.change(screen.getByLabelText(/Prélevé le/), {
      target: { value: '2026-09-02T08:15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consigner la mesure' }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
      expect(post).toBeTruthy();
      const corps = JSON.parse(String((post?.[1] as RequestInit).body));
      expect(corps).toEqual({
        idPatient: 'PAT1',
        analyteCode: 'BIO_FERRITINE',
        valeur: 51.2,
        preleveLe: new Date('2026-09-02T08:15').toISOString(),
      });
    });
  });
});
