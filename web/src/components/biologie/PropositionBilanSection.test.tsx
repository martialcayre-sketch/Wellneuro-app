// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LignePanelProposition } from '@/lib/biology-library/statuts';
import { CbFeatureProvider } from '@/components/patient-cockpit/CbFeatureProvider';
import { PropositionBilanSection } from './PropositionBilanSection';

// LA PROPOSITION DE BILAN DANS L'ONGLET « BIOLOGIE » ([[D-319]], F57 PR 2) :
// ses lectures et ses gestes, repris de la section clinique, partent ICI — et
// seulement là où le panneau s'affiche (`G-TRUST-04`).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const LIGNE: LignePanelProposition = {
  panelCode: 'PANEL_A',
  libelle: 'Bilan martial',
  niveau: 'socle',
  objectif: null,
  statut: 'recommande',
  declencheurRempli: null,
  condition: null,
  motifs: [],
  justificationClaims: [],
  analytes: [],
  ratios: [],
};

type Reponse = { status?: number; corps: unknown };

function stubFetch(routes: Record<string, Reponse>) {
  const fetchMock = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entree);
    const cle = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
    const r = routes[cle];
    if (!r) throw new Error(`route non simulée : ${cle}`);
    return new Response(JSON.stringify(r.corps), { status: r.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const appels = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.map(([entree, init]) => `${init?.method ?? 'GET'} ${String(entree)}`);

function rendre(enabled = true) {
  return render(
    <CbFeatureProvider enabled={enabled}>
      <PropositionBilanSection idPatient="PAT_JENNIFER" />
    </CbFeatureProvider>,
  );
}

const PROPOSITION = 'GET /api/praticien/biologie/proposition';
const REMISES = 'GET /api/praticien/biologie/proposition/document-patient';

describe('PropositionBilanSection — la proposition dans l’onglet « Biologie » (D-319)', () => {
  it('biologie fermée : aucune lecture, rien d’affiché', () => {
    const fetchMock = stubFetch({});
    const { container } = rendre(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });

  it('au montage : la proposition, puis la liste des remises, une fois chacune', async () => {
    const fetchMock = stubFetch({
      [PROPOSITION]: { corps: { ok: true, lignes: [LIGNE], limites: [], documentes: [], partageMedecinTraitant: 'accorde' } },
      [REMISES]: { corps: { ok: true, documents: [] } },
    });
    rendre();
    expect(await screen.findByRole('region', { name: 'Biologie — proposition de bilan' })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(appels(fetchMock)).toEqual([
      'GET /api/praticien/biologie/proposition?idPatient=PAT_JENNIFER',
      'GET /api/praticien/biologie/proposition/document-patient?idPatient=PAT_JENNIFER',
    ]);
  });

  it('une proposition fermée (503) : panneau absent, et la liste des remises n’est pas lue', async () => {
    const fetchMock = stubFetch({ [PROPOSITION]: { status: 503, corps: { ok: false } } });
    const { container } = rendre();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(container.textContent).toBe('');
  });

  it('le moteur qui s’abstient (409) : son motif s’affiche, et les remises sont lues', async () => {
    const fetchMock = stubFetch({
      [PROPOSITION]: { status: 409, corps: { ok: false, error: 'Motif d’abstention de banc.' } },
      [REMISES]: { corps: { ok: true, documents: [] } },
    });
    rendre();
    expect(await screen.findByText(/Motif d’abstention de banc\./)).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('le courrier : le destinataire seul part, le texte consigné revient', async () => {
    const fetchMock = stubFetch({
      [PROPOSITION]: { corps: { ok: true, lignes: [LIGNE], limites: [], documentes: [], partageMedecinTraitant: 'accorde' } },
      [REMISES]: { corps: { ok: true, documents: [] } },
      'POST /api/praticien/biologie/proposition/courrier': {
        corps: { ok: true, texte: 'Courrier de banc consigné.', html: '', ancrageSha256: 'a', ancrageVersion: 'v1' },
      },
    });
    rendre();
    fireEvent.change(await screen.findByLabelText('Nom du médecin destinataire'), { target: { value: 'Dr Nicola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Établir et consigner le courrier' }));
    await waitFor(() =>
      expect(appels(fetchMock)).toContain('POST /api/praticien/biologie/proposition/courrier'),
    );
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ idPatient: 'PAT_JENNIFER', medecinLibelle: 'Dr Nicola' });
    expect(await screen.findByDisplayValue('Courrier de banc consigné.')).toBeTruthy();
  });
});
