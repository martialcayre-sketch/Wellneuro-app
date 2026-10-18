// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CompositionAnalyteSection } from './CompositionAnalyteSection';

const LECTURE_PREPAREE = {
  ok: true,
  active: null,
  retirees: [],
  preparee: {
    type: 'groupe',
    motif: 'Ionogramme (1609).',
    composants: [
      { code: 'BIO_SODIUM', libelle: 'Sodium', actif: true },
      { code: 'BIO_POTASSIUM', libelle: 'Potassium', actif: true },
      { code: 'BIO_CHLORE', libelle: 'Chlore', actif: true },
    ],
  },
  operandesAbsents: null,
  membreDe: [],
};

const SIGNEE = {
  type: 'groupe',
  composants: [{ code: 'BIO_SODIUM', libelle: 'Sodium', actif: true }],
  verifiePar: 'praticien@wellneuro.fr',
  verifieLe: '2026-10-18T10:00:00.000Z',
  retireePar: null,
  retireeLe: null,
};

function mockFetch(lecture: unknown) {
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? { ok: true, status: 200, json: async () => ({ ok: true, active: null }) }
      : { ok: true, status: 200, json: async () => lecture },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CompositionAnalyteSection (F80, D-323 §1)', () => {
  it('la liste préparée s’affiche cochée ; signer envoie les seuls composants cochés, dans l’ordre de la liste', async () => {
    const fetchMock = mockFetch(LECTURE_PREPAREE);
    render(<CompositionAnalyteSection analyteCode="BIO_IONOGRAMME" />);
    await screen.findByText(/Composition préparée, à signer/);
    fireEvent.click(screen.getByLabelText('Potassium'));
    fireEvent.click(screen.getByRole('button', { name: 'Signer la composition' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(JSON.parse(String(init.body))).toEqual({
      analyteCode: 'BIO_IONOGRAMME',
      decision: 'signer',
      composants: ['BIO_SODIUM', 'BIO_CHLORE'],
    });
  });

  it('un composant inactif au catalogue se dit, ne se coche pas et ne s’envoie pas', async () => {
    const fetchMock = mockFetch({
      ...LECTURE_PREPAREE,
      preparee: {
        ...LECTURE_PREPAREE.preparee,
        composants: [
          { code: 'BIO_SODIUM', libelle: 'Sodium', actif: true },
          { code: 'BIO_CHLORE', libelle: 'Chlore', actif: false },
        ],
      },
    });
    render(<CompositionAnalyteSection analyteCode="BIO_IONOGRAMME" />);
    await screen.findByText(/inactif au catalogue/);
    expect((screen.getByLabelText(/Chlore/) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Signer la composition' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(JSON.parse(String(init.body)).composants).toEqual(['BIO_SODIUM']);
  });

  it('une composition retirée reste lisible, même sans liste ni appartenance', async () => {
    mockFetch({ ...LECTURE_PREPAREE, preparee: null, retirees: [{ ...SIGNEE, retireePar: 'praticien@wellneuro.fr', retireeLe: '2026-10-19T10:00:00.000Z' }] });
    render(<CompositionAnalyteSection analyteCode="BIO_IONOGRAMME" />);
    expect(await screen.findByText(/Compositions retirées \(1\)/)).toBeTruthy();
  });

  it('rien de coché : le bouton de signature est désactivé', async () => {
    mockFetch(LECTURE_PREPAREE);
    render(<CompositionAnalyteSection analyteCode="BIO_IONOGRAMME" />);
    await screen.findByText(/Composition préparée, à signer/);
    for (const libelle of ['Sodium', 'Potassium', 'Chlore']) fireEvent.click(screen.getByLabelText(libelle));
    expect((screen.getByRole('button', { name: 'Signer la composition' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('une composition signée se retire après confirmation, en désignant sa date', async () => {
    const fetchMock = mockFetch({ ...LECTURE_PREPAREE, active: SIGNEE, preparee: null });
    render(<CompositionAnalyteSection analyteCode="BIO_IONOGRAMME" />);
    await screen.findByText(/Signée par praticien@wellneuro.fr/);
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la composition' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(JSON.parse(String(init.body))).toEqual({
      analyteCode: 'BIO_IONOGRAMME',
      decision: 'retirer',
      verifieLeVu: '2026-10-18T10:00:00.000Z',
    });
  });

  it('un calculé sans opérandes le dit ; un constituant dit ses groupes', async () => {
    mockFetch({
      ...LECTURE_PREPAREE,
      preparee: null,
      operandesAbsents: 'La DHEA n’est pas au catalogue.',
      membreDe: [{ code: 'BIO_NFS', libelle: 'Numération formule sanguine', type: 'groupe' }],
    });
    render(<CompositionAnalyteSection analyteCode="BIO_RATIO_CORTISOL_DHEA" />);
    expect(await screen.findByText(/Son remboursement reste non évalué/)).toBeTruthy();
    expect(screen.getByText('Fait partie de : Numération formule sanguine.')).toBeTruthy();
  });

  it('un analyte sans composition ni appartenance n’affiche rien', async () => {
    const fetchMock = mockFetch({ ...LECTURE_PREPAREE, preparee: null });
    const { container } = render(<CompositionAnalyteSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toBe(''));
  });
});
