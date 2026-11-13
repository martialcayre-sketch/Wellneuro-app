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
    // Le corps du garde de drapeau (`gardeProposition`) : le client lit le
    // MOTIF, jamais le code seul (Q12 a de PRA-3b).
    const fetchMock = stubFetch({
      [PROPOSITION]: {
        status: 503,
        corps: { ok: false, reason: 'cb_proposition_desactivee', error: 'Proposition de bilan désactivée.' },
      },
    });
    const { container } = rendre();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(container.textContent).toBe('');
  });

  // T-65 ([[D-488]]) : toute autre réponse est un échec de lecture, jamais
  // une absence de proposition.
  const T65 = 'La proposition de bilan n’a pas pu être lue. Ce n’est pas une absence de proposition.';
  for (const [cas, reponse] of [
    ['503 sans le motif de l’étage fermé (plateforme)', { status: 503, corps: { ok: false } }],
    ['500', { status: 500, corps: { ok: false, error: 'Erreur serveur.' } }],
    ['403', { status: 403, corps: { ok: false, reason: 'forbidden', error: 'Accès refusé.' } }],
  ] as const) {
    it(`${cas} : T-65 et « Réessayer », pas un panneau absent`, async () => {
      const fetchMock = stubFetch({ [PROPOSITION]: reponse });
      rendre();
      expect((await screen.findByRole('alert')).textContent).toContain(T65);
      expect(screen.getByRole('region', { name: 'Biologie — proposition de bilan' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
      // Aucun geste de déclaration ni de courrier sur une lecture en échec.
      expect(screen.queryByRole('button', { name: /Consigner|Établir/ })).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  }

  it('réseau coupé : T-65 aussi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    rendre();
    expect((await screen.findByRole('alert')).textContent).toContain(T65);
  });

  it('échec persistant : le focus revient sur « Réessayer », réactivé', async () => {
    stubFetch({ [PROPOSITION]: { status: 500, corps: { ok: false } } });
    rendre();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => {
      const bouton = screen.getByRole('button', { name: 'Réessayer' }) as HTMLButtonElement;
      expect(bouton.disabled).toBe(false);
      expect(document.activeElement).toBe(bouton);
    });
  });

  it('« Réessayer » relit la seule proposition ; réussie, le panneau revient et prend le focus', async () => {
    let panne = true;
    vi.stubGlobal('fetch', vi.fn(async (entree: RequestInfo | URL) => {
      const url = String(entree);
      if (url.includes('/proposition/document-patient')) {
        return new Response(JSON.stringify({ ok: true, documents: [] }), { status: 200 });
      }
      return panne
        ? new Response(JSON.stringify({ ok: false }), { status: 500 })
        : new Response(JSON.stringify({ ok: true, lignes: [LIGNE], limites: [], documentes: [], partageMedecinTraitant: 'accorde' }), { status: 200 });
    }));
    rendre();
    await screen.findByRole('alert');
    panne = false;
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(screen.queryByText(T65)).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Biologie — proposition de bilan' })),
    );
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
