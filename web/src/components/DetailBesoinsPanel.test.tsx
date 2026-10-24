// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DetailBesoinsPanel } from './DetailBesoinsPanel';

// Le radar (recharts) n'est pas l'objet de ce banc : seul le tableau voisin
// est jugé.
vi.mock('@/components/ui/ScoreRadar', () => ({ ScoreRadar: () => null }));

const reponse = {
  patient: { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' },
  besoins: [
    { id: 1, libellePraticien: 'Sommeil réparateur', strate: 'CORPS', couverture: 40, niveauPreuve: 'A', sources: [] },
    { id: 2, libellePraticien: 'Ancrage du matin', strate: 'ANCRAGE', couverture: null, niveauPreuve: 'NON_MESURE', sources: [] },
    { id: 3, libellePraticien: 'Énergie stable', strate: 'CORPS', couverture: 70, niveauPreuve: 'D', sources: [] },
  ],
};

describe('DetailBesoinsPanel — niveau de preuve masqué ([[D-332]])', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('affiche la couverture, jamais la lettre A–D ni sa légende, même si la réponse la porte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const tableau = await screen.findByRole('table');
    expect(tableau.textContent).toContain('40%');
    expect(tableau.textContent).toContain('70%');
    expect(screen.getAllByRole('cell', { name: '—' })).toHaveLength(1);
    expect(screen.getAllByRole('columnheader').map(c => c.textContent)).toEqual(['Besoin', 'Couverture']);

    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/Niveau [ABCD]\b/);
    expect(page).not.toMatch(/questionnaire clinique validé|hypothèse WellNeuro/);
  });
});

// Textes faux des instruments (F9b, N1).
describe('DetailBesoinsPanel — textes exacts', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('un besoin sans source lue n’a plus d’infobulle de repli : son motif se déplie sous le tiret (r3_08)', async () => {
    // L'API ne liste que les sources EXPLOITABLES : une liste vide peut
    // cacher un questionnaire prévu mais pas encore rempli. Le pourquoi d'un
    // non mesuré n'est plus une infobulle, invisible au clavier et au toucher.
    const avecMotif = {
      ...reponse,
      besoins: reponse.besoins.map(b =>
        b.couverture === null
          ? { ...b, motifNonMesure: [{ motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_01'], dateDernierePassation: null }] }
          : { ...b, motifNonMesure: null }
      ),
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => avecMotif })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const titres = screen.getAllByRole('row').slice(1).map(r => r.getAttribute('title'));
    expect(titres).toEqual([null, null, null]);
    expect(document.body.innerHTML).not.toContain('Aucun questionnaire source');
    expect(document.body.innerHTML).not.toContain('Aucune réponse de questionnaire exploitable');

    const geste = screen.getByText('Motif', { selector: 'summary' });
    expect(geste.getAttribute('aria-label')).toBe('Motif — Ancrage du matin');
    expect(document.body.textContent).toContain('Non mesuré · aucune passation exploitable (Q_STR_01)');
  });

  it('un ancien conteneur sans motif garde le tiret seul, sans geste vide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    expect(screen.getAllByRole('cell', { name: '—' })).toHaveLength(1);
    expect(screen.queryByText('Motif', { selector: 'summary' })).toBeNull();
  });

  it('un échec de lecture parle au praticien, et « Réessayer » relance la lecture', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ unavailable: true, reason: 'exception' }) })
      .mockResolvedValueOnce({ json: async () => reponse });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Le détail des besoins n’a pas pu être lu.');
    expect(document.body.textContent).not.toMatch(/terminal|Next\.js/);

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
