// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CATALOGUE_DEFINITIONS, IDS_ASSIGNABLES } from '@/lib/bibliotheque';
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

  it('l’écart avec la décision se déplie sous la valeur d’un besoin mesuré, au mot près (r3_10)', async () => {
    const avecEcart = {
      ...reponse,
      besoins: reponse.besoins.map(b =>
        b.id === 3
          ? { ...b, ecartDecision: [{ idQuestionnaire: 'Q_INF_03', dateDernierePassation: '2026-10-12T08:00:00.000Z' }] }
          : { ...b, ecartDecision: null }
      ),
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => avecEcart })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const geste = screen.getByText('Écart avec la décision', { selector: 'summary' });
    expect(geste.getAttribute('aria-label')).toBe('Écart avec la décision — Énergie stable');
    const ligne = within(geste.closest('details')!).getByRole('listitem');
    expect(ligne.textContent).toBe(
      'N’entre pas dans la décision · passation incomplète hors des items lus, du 12/10/2026 (Q_INF_03)'
    );
    // La valeur reste servie à côté : l'écart ne la retire pas.
    expect(geste.closest('td')!.textContent).toContain('70%');
  });

  it('un ancien conteneur sans le champ d’écart n’affiche aucun geste', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    expect(screen.queryByText('Écart avec la décision', { selector: 'summary' })).toBeNull();
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

// Le compte en tête de l'onglet et « Compléter la mesure » ([[D-352]]).
describe('DetailBesoinsPanel — compte et « Compléter la mesure » (D-352)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const EMAIL = 'sophie.nicola@example.test';
  const avecMotif = (motif: string, ids: string[]) => ({
    ...reponse,
    besoinsMesures: 2,
    besoinsTotal: 12,
    besoins: reponse.besoins.map(b =>
      b.couverture === null
        ? { ...b, motifNonMesure: [{ motif, idsQuestionnaire: ids, dateDernierePassation: null }] }
        : { ...b, motifNonMesure: null }
    ),
  });

  it('le compte servi par la route s’affiche en tête, au mot près', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee />);
    expect(await screen.findByText('Calculé sur 2 besoins mesurés sur 12')).toBeTruthy();
  });

  it('aucun besoin mesuré : la tête le dit, sans affirmer un calcul (D-352 §4)', async () => {
    const aucun = { ...avecMotif('aucune_passation', ['Q_STR_01']), besoinsMesures: 0 };
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => aucun })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee />);
    expect(await screen.findByText('Non calculé : aucun besoin mesuré')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Calculé sur 0');
  });

  it('un ancien conteneur sans le compte : rien plutôt qu’un compte deviné', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee />);
    await screen.findByRole('table');
    expect(document.body.textContent).not.toContain('Calculé sur');
  });

  it('« aucune passation exploitable » : le geste se lit dans le motif déplié, et rien ne part au rendu', async () => {
    expect(IDS_ASSIGNABLES.has('Q_STR_01')).toBe(true);
    const fetchMock = vi.fn(async () => ({ json: async () => avecMotif('aucune_passation', ['Q_STR_01']) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);

    await screen.findByRole('table');
    const details = screen.getByText('Motif', { selector: 'summary' }).closest('details');
    expect(details?.open).toBe(false);
    expect(within(details as HTMLElement).getByText('Compléter la mesure')).toBeTruthy();
    expect(details?.textContent).toContain(CATALOGUE_DEFINITIONS.Q_STR_01?.titre ?? "titre absent du catalogue");
    expect(details?.textContent).toContain(
      'L’ajout pose l’instrument dans la file d’envoi ; rien n’est envoyé au patient depuis cet écran.'
    );
    // Aucune relance automatique : la lecture seule a eu lieu.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('le bouton pose l’instrument dans la file d’envoi, et lui seul', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter à la file d’envoi' }));
    expect(await screen.findByText('Dans la file d’envoi')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('/api/praticien/file-envoi');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ emailPatient: EMAIL, qids: ['Q_STR_01'] });
  });

  it('l’état d’un ajout vaut pour un patient : un autre dossier repart du bouton', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter à la file d’envoi' }));
    expect(await screen.findByText('Dans la file d’envoi')).toBeTruthy();
    rerender(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient="jennifer.martin@example.test" />);
    expect(screen.queryByText('Dans la file d’envoi')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeTruthy();
  });

  it('un refus de la route se lit sous le bouton', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: 'Dossier clos.' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter à la file d’envoi' }));
    expect((await screen.findByRole('status')).textContent).toBe('Dossier clos.');
    expect(screen.getByRole('button', { name: 'Réessayer l’ajout' })).toBeTruthy();
  });

  it('sans e-mail du patient affiché (route pleine page) : le motif seul', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    await screen.findByRole('table');
    expect(document.body.textContent).toContain('Non mesuré · aucune passation exploitable (Q_STR_01)');
    expect(screen.queryByText('Compléter la mesure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeNull();
  });

  it.each([
    ['passation_ecartee', ['Q_STR_01']],
    ['recueil_incomplet', ['Q_STR_01']],
    ['source_suspendue', ['Q_STR_01']],
    ['sans_instrument', []],
    ['hors_score', []],
  ])('motif « %s » : aucun geste', async (motif, ids) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => avecMotif(motif, ids) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);
    await screen.findByRole('table');
    expect(screen.getByText('Motif', { selector: 'summary' })).toBeTruthy();
    expect(screen.queryByText('Compléter la mesure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeNull();
  });

  it('un questionnaire non assignable n’a ni bouton ni texte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => avecMotif('aucune_passation', ['Q_INEXISTANT']) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);
    await screen.findByRole('table');
    expect(screen.queryByText('Compléter la mesure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeNull();
  });
});
