// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CATALOGUE_DEFINITIONS, IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { ChiffresMasquesProvider } from '@/components/patient-cockpit/ChiffresMasques';
import { BESOINS } from '@/lib/equilibre/constants';
import { MENTION_RADAR_NON_INDICE } from '@/lib/equilibre/natureIndiceGlobal';
import { DetailBesoinsPanel } from './DetailBesoinsPanel';

// Le radar (recharts) n'est pas l'objet de ce banc : seul le tableau voisin
// est jugé. Le mock garde les propriétés reçues, pour juger ce qu'on lui donne
// à tracer (ordre des axes, trou nommé, masque du contour).
type ProprietesRadar = { data: { axe: string; value: number | null }[]; valeursMasquees?: boolean };
const radar = vi.hoisted(() => ({ dernier: null as null | ProprietesRadar }));
vi.mock('@/components/ui/ScoreRadar', () => ({
  ScoreRadar: (props: ProprietesRadar) => {
    radar.dernier = props;
    return null;
  },
}));

const provenance = (id: string, date: string) => ({
  sources: [{ idQuestionnaire: id, dateReponse: date }],
  versionCalcul: 'equilibre-v3',
});

// Reçus hors de l'ordre fixe, comme d'un ancien conteneur qui triait encore.
const reponse = {
  patient: { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' },
  besoins: [
    { id: 3, libellePraticien: 'Énergie stable', strate: 'CORPS', couverture: 70, niveauPreuve: 'D', sources: [], provenance: provenance('Q_INF_03', '2026-10-12T08:00:00.000Z') },
    { id: 2, libellePraticien: 'Ancrage du matin', strate: 'ANCRAGE', couverture: null, niveauPreuve: 'NON_MESURE', sources: [], provenance: null },
    { id: 1, libellePraticien: 'Sommeil réparateur', strate: 'CORPS', couverture: 40, niveauPreuve: 'A', sources: [], provenance: provenance('Q_SOM_01', '2026-10-10T08:00:00.000Z') },
  ],
};

describe('DetailBesoinsPanel — niveau de preuve masqué ([[D-332]])', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('affiche la couverture, jamais la lettre A–D ni sa légende, même si la réponse la porte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const tableau = await screen.findByRole('table');
    expect(tableau.textContent).toContain('40%');
    expect(tableau.textContent).toContain('70%');
    expect(screen.getAllByRole('cell', { name: 'non mesuré' })).toHaveLength(1);
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecMotif })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const titres = screen.getAllByRole('row').filter(r => r.querySelector('td')).map(r => r.getAttribute('title'));
    expect(titres).toEqual([null, null, null]);
    expect(document.body.innerHTML).not.toContain('Aucun questionnaire source');
    expect(document.body.innerHTML).not.toContain('Aucune réponse de questionnaire exploitable');

    const geste = screen.getByText('Motif', { selector: 'summary' });
    expect(geste.getAttribute('aria-label')).toBe('Motif — B2 · Ancrage du matin');
    expect(document.body.textContent).toContain('Non mesuré · aucune passation exploitable (Q_STR_01)');
  });

  it('un ancien conteneur sans motif garde le tiret seul, sans geste vide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const cellule = screen.getByRole('cell', { name: 'non mesuré' });
    expect(cellule.querySelector('[aria-hidden="true"]')?.textContent).toBe('—');
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecEcart })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const geste = screen.getByText('Écart avec la décision', { selector: 'summary' });
    expect(geste.getAttribute('aria-label')).toBe('Écart avec la décision — B3 · Énergie stable');
    const ligne = within(geste.closest('details')!).getByRole('listitem');
    expect(ligne.textContent).toBe(
      'N’entre pas dans la décision · passation incomplète hors des items lus, du 12/10/2026 (Q_INF_03)'
    );
    // La valeur reste servie à côté : l'écart ne la retire pas.
    expect(geste.closest('td')!.textContent).toContain('70%');
  });

  it('un ancien conteneur sans le champ d’écart n’affiche aucun geste', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    expect(screen.queryByText('Écart avec la décision', { selector: 'summary' })).toBeNull();
  });

  it('un échec de lecture parle au praticien, et « Réessayer » relance la lecture', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ unavailable: true, reason: 'exception' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => reponse });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Le détail des besoins n’a pas pu être lu.');
    expect(document.body.textContent).not.toMatch(/terminal|Next\.js/);

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // PRA-6h2 (P2 de la revue de #2251) : un 500 `{error}` venu d'un autre
  // émetteur n'est pas au contrat — sans garde, `data.patient` indéfini
  // faisait tomber la page. Il tombe dans l'état d'échec du panneau.
  it('une réponse hors contrat (500 `{error}`) tombe dans l’état d’échec, sans faire tomber la page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Erreur interne' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => reponse });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Le détail des besoins n’a pas pu être lu.');
    expect(document.body.textContent).not.toContain('Erreur interne');

    fireEvent.click(within(alerte).getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
  });

  it('une réponse 200 sans la forme promise tombe aussi dans l’état d’échec', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ besoins: [] }) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Le détail des besoins n’a pas pu être lu.');
  });
});

// Q1 de l'audit des instruments (r3_09) : ordre fixe, B1 à B12 groupé par
// strate, clé « Bn · libellé » ; provenance du tableau et du radar
// ([[D-333]] §2 règle 1).
describe('DetailBesoinsPanel — ordre fixe et provenance (r3_09)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('l’ordre reçu n’est pas cru : B1 à B12, groupés sous le nom de leur strate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const lignes = screen.getAllByRole('row').slice(1).map(r => r.querySelector('th, td')?.textContent);
    expect(lignes).toEqual(['Corps', 'B1 · Sommeil réparateur', 'B3 · Énergie stable', 'Ancrage', 'B2 · Ancrage du matin']);
    expect(screen.getAllByRole('rowheader').map(h => h.getAttribute('scope'))).toEqual(['rowgroup', 'rowgroup']);
  });

  it('chaque valeur ouvre sa source d’un geste, au nom de sa clé', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const geste = screen.getByLabelText('Source — B1 · Sommeil réparateur');
    expect(geste.closest('td')!.textContent).toContain('40%');
    expect(geste.closest('details')!.textContent).toContain('Questionnaire : Q_SOM_01 (réponse du 10/10/2026)');
    expect(geste.closest('details')!.textContent).toContain('Version du calcul : equilibre-v3');
  });

  it('sans provenance établie, pas de chiffre : « Source non enregistrée »', async () => {
    const sansProvenance = {
      ...reponse,
      besoins: reponse.besoins.map(b => (b.id === 1 ? { ...b, provenance: undefined } : b)),
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => sansProvenance })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const tableau = await screen.findByRole('table');
    const ligne = within(tableau).getByText('B1 · Sommeil réparateur').closest('tr')!;
    expect(ligne.textContent).toContain('Source non enregistrée');
    expect(ligne.textContent).not.toContain('40');
    expect(screen.queryByLabelText('Source — B1 · Sommeil réparateur')).toBeNull();
  });

  it('le radar ouvre la provenance de ses valeurs tracées, une fois chacune', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    const details = screen.getByLabelText('Source — ensemble des valeurs du tableau').closest('details')!;
    expect(details.textContent).toContain(
      'Questionnaires : Q_SOM_01 (réponse du 10/10/2026), Q_INF_03 (réponse du 12/10/2026)'
    );
    expect(details.textContent).toContain('Version du calcul : equilibre-v3');
  });

  it('aucune valeur tracée : le radar n’a pas de geste « Source »', async () => {
    const sansProvenance = { ...reponse, besoins: reponse.besoins.map(b => ({ ...b, provenance: null })) };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => sansProvenance })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    await screen.findByRole('table');
    expect(screen.queryByLabelText('Source — ensemble des valeurs du tableau')).toBeNull();
  });
});

// Le radar est décoratif (H64, F9a) : le tableau se nomme et dit ce que
// disaient les axes ; le chargement s'annonce.
describe('DetailBesoinsPanel — accessibilité sans le radar (F9a)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('le tableau porte sa légende, au mot près', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    expect(await screen.findByRole('table', { name: 'Couverture des 12 besoins, de B1 à B12, par strate' })).toBeTruthy();
  });

  it('le chargement s’annonce au lecteur d’écran, texte inchangé', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    expect(screen.getByRole('status').textContent).toBe('Chargement du détail des besoins...');
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee />);
    expect(await screen.findByText('Calculé sur 2 besoins mesurés sur 12')).toBeTruthy();
  });

  it('aucun besoin mesuré : la tête le dit, sans affirmer un calcul (D-352 §4)', async () => {
    const aucun = { ...avecMotif('aucune_passation', ['Q_STR_01']), besoinsMesures: 0 };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => aucun })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee />);
    expect(await screen.findByText('Non calculé : aucun besoin mesuré')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Calculé sur 0');
  });

  it('un ancien conteneur sans le compte : rien plutôt qu’un compte deviné', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee />);
    await screen.findByRole('table');
    expect(document.body.textContent).not.toContain('Calculé sur');
  });

  it('« aucune passation exploitable » : le geste se lit dans le motif déplié, et rien ne part au rendu', async () => {
    expect(IDS_ASSIGNABLES.has('Q_STR_01')).toBe(true);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_STR_01']) }));
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
      .mockResolvedValueOnce({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })
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
      .mockResolvedValueOnce({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })
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
      .mockResolvedValueOnce({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: 'Dossier clos.' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter à la file d’envoi' }));
    expect((await screen.findByRole('status')).textContent).toBe('Dossier clos.');
    expect(screen.getByRole('button', { name: 'Réessayer l’ajout' })).toBeTruthy();
  });

  it('sans e-mail du patient affiché (route pleine page) : le motif seul', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_STR_01']) })));
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecMotif(motif, ids) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);
    await screen.findByRole('table');
    expect(screen.getByText('Motif', { selector: 'summary' })).toBeTruthy();
    expect(screen.queryByText('Compléter la mesure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeNull();
  });

  it('un questionnaire non assignable n’a ni bouton ni texte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecMotif('aucune_passation', ['Q_INEXISTANT']) })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" enteteMasquee emailPatient={EMAIL} />);
    await screen.findByRole('table');
    expect(screen.queryByText('Compléter la mesure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeNull();
  });
});

// LE RADAR DE LA FICHE ([[D-550]], J3-12f) : douze axes, un par besoin, dans
// l'ordre fixe du guide ; un besoin non mesuré garde son axe, sans valeur ; le
// compte « n besoins mesurés sur 12 » reste dit ; une mention rappelle que la
// surface n'est pas l'indice global. Les conditions déjà servies (§2.1, §2.2) sont
// CONSTATÉES ici, pas supposées (§5).
describe('DetailBesoinsPanel — radar descriptif (D-550)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    radar.dernier = null;
  });

  const avecCompte = { ...reponse, besoinsMesures: 2, besoinsTotal: 12 };

  it('§2.1 et §2.2 : un axe par besoin dans l’ordre fixe, et le non mesuré garde son axe, sans valeur', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecCompte })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    await screen.findByRole('table');
    // Reçu dans l'ordre 3, 2, 1 : le radar suit l'ordre fixe, groupé par strate (Corps puis Ancrage).
    expect(radar.dernier?.data.map(d => d.axe)).toEqual(['B1', 'B3', 'B2']);
    // B2 n'est pas mesuré : son axe reste, avec `null` — jamais un zéro (D-301).
    expect(radar.dernier?.data.find(d => d.axe === 'B2')?.value).toBeNull();
    expect(radar.dernier?.data.find(d => d.axe === 'B1')?.value).toBe(40);
  });

  // D-550 §3.1 se lit comme SATISFAIT par le tableau voisin (arbitrage 1004-b) : les
  // axes du radar sont « Bn » parce que les libellés praticien, trop longs, sont coupés
  // à 390 px. Sans ce lien axe par axe, la lecture ne tient plus.
  it('§3.1 : chaque axe « Bn » du radar a sa ligne « Bn · libellé » dans le tableau voisin, pour les douze besoins', async () => {
    const douze = {
      ...reponse,
      besoinsMesures: 12,
      besoinsTotal: 12,
      besoins: BESOINS.map(b => ({
        id: b.id, libellePraticien: b.libellePraticien, strate: b.strate, couverture: 50, niveauPreuve: 'A', sources: [],
        provenance: provenance('Q_TEST', '2026-10-10T08:00:00.000Z'),
      })),
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => douze })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    const tableau = await screen.findByRole('table');
    const axes = radar.dernier?.data.map(d => d.axe) ?? [];
    expect(axes).toHaveLength(12);
    const lignes = within(tableau).getAllByRole('row').map(r => r.querySelector('td')?.textContent ?? '');
    for (const b of BESOINS) {
      expect(axes).toContain(`B${b.id}`);
      expect(lignes).toContain(`B${b.id} · ${b.libellePraticien}`);
    }
  });

  it('§2.4 : sans aucun besoin mesuré, aucun contour n’est tracé et la mention ne s’affiche pas', async () => {
    const aucun = {
      ...reponse,
      besoinsMesures: 0,
      besoinsTotal: 12,
      besoins: reponse.besoins.map(b => ({ ...b, couverture: null, provenance: null })),
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => aucun })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    await screen.findByRole('table');
    expect(screen.queryByText(MENTION_RADAR_NON_INDICE)).toBeNull();
  });

  it('§2.3 : le compte des besoins mesurés est dit, au mot près', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecCompte })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    expect(await screen.findByText('Calculé sur 2 besoins mesurés sur 12')).toBeTruthy();
  });

  it('§2.4 : la mention dit que la surface n’est pas l’indice global, au mot près', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecCompte })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    expect(await screen.findByText('La surface du radar n’est pas l’indice global.')).toBeTruthy();
    expect(MENTION_RADAR_NON_INDICE).toBe('La surface du radar n’est pas l’indice global.');
  });

  it('en mode consultation : le contour est masqué, la mention n’a rien à qualifier, les axes et le non mesuré restent', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecCompte })));
    render(
      <ChiffresMasquesProvider masques>
        <DetailBesoinsPanel idPatient="PAT_SEED_01" />
      </ChiffresMasquesProvider>,
    );
    await screen.findByRole('table');
    expect(radar.dernier?.valeursMasquees).toBe(true);
    expect(screen.queryByText(MENTION_RADAR_NON_INDICE)).toBeNull();
    expect(radar.dernier?.data.map(d => d.axe)).toEqual(['B1', 'B3', 'B2']);
    expect(screen.getAllByRole('cell', { name: 'non mesuré' })).toHaveLength(1);
  });

  it('aucune surface par strate : un en-tête de strate ne porte que son nom, ni moyenne ni chiffre (D-550 §3.2)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => avecCompte })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    const tableau = await screen.findByRole('table');
    for (const g of within(tableau).getAllByRole('rowheader')) expect(g.textContent).not.toMatch(/\d/);
  });
});

// LA VIGNETTE DU CONSTAT SUR UN BESOIN SANS SCORE ([[D-551]], J3-12f) : sous le
// « non mesuré » ou le « hors score » du besoin, le verdict du praticien en mots.
// Derrière `WN_CONSTAT_BESOIN` — le drapeau est forcé allumé ICI, en test seulement
// ([[D-551]] §2). Hors du total et du compte ; masquée en consultation ([[D-553]]).
describe('DetailBesoinsPanel — vignette du constat du praticien (D-551)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const avecCompte = { ...reponse, besoinsMesures: 2, besoinsTotal: 12 };
  const ROUTE_VIGNETTES = '/api/praticien/besoins/vignettes';
  type Reponse = { ok: boolean; status?: number; json: () => Promise<unknown> };

  /** Le routeur de requêtes : les besoins, et la route de la vignette. */
  function routeur(vignettes: Reponse) {
    return vi.fn(async (url: string): Promise<Reponse> =>
      String(url).includes(ROUTE_VIGNETTES) ? vignettes : { ok: true, json: async () => avecCompte });
  }
  const serveur = (vignettes: Record<number, { verdict: string; aRelire: boolean }>): Reponse => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, vignettes }),
  });

  it('drapeau éteint (défaut) : aucune vignette, et la route n’est même pas appelée', async () => {
    const fetchMock = routeur(serveur({ 2: { verdict: 'a_soutenir', aRelire: false } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);
    await screen.findByRole('table');
    expect(screen.queryByText(/constat du praticien/)).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes(ROUTE_VIGNETTES))).toBe(false);
  });

  it('drapeau allumé : le verdict du besoin 2 se lit en mots, sous son « non mesuré », sans nombre', async () => {
    vi.stubGlobal('fetch', routeur(serveur({ 2: { verdict: 'a_soutenir', aRelire: false } })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />);
    const vignette = await screen.findByText('constat du praticien : à soutenir');
    expect(vignette.textContent).not.toMatch(/\d/);
    // Dans la ligne du besoin 2, et pas ailleurs ; le besoin reste « non mesuré ».
    expect(vignette.closest('tr')?.textContent).toContain('B2 · Ancrage du matin');
    expect(screen.getAllByRole('cell', { name: /non mesuré/ })).toHaveLength(1);
    expect(screen.getAllByText(/constat du praticien/)).toHaveLength(1);
  });

  it('hors du total et du compte : le compte et le radar sont ceux de la route, inchangés', async () => {
    vi.stubGlobal('fetch', routeur(serveur({ 2: { verdict: 'non_retenu', aRelire: false } })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />);
    await screen.findByText('constat du praticien : non retenu');
    expect(screen.getByText('Calculé sur 2 besoins mesurés sur 12')).toBeTruthy();
    expect(radar.dernier?.data.find(d => d.axe === 'B2')?.value).toBeNull();
  });

  it('une vignette servie pour un besoin MESURÉ (conteneur fautif) ne s’affiche pas : seule la branche « non mesuré » la porte', async () => {
    vi.stubGlobal('fetch', routeur(serveur({ 1: { verdict: 'a_soutenir', aRelire: false }, 3: { verdict: 'non_retenu', aRelire: false } })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />);
    await screen.findByRole('table');
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/constat du praticien/)).toBeNull();
  });

  it('un geste sur un constat relance la lecture : le nouveau verdict remplace l’ancien, un retrait fait disparaître la vignette', async () => {
    const lecteur = vi.fn()
      .mockResolvedValueOnce(serveur({ 2: { verdict: 'a_soutenir', aRelire: false } }))
      .mockResolvedValueOnce(serveur({ 2: { verdict: 'non_retenu', aRelire: false } }))
      .mockResolvedValue(serveur({}));
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes(ROUTE_VIGNETTES) ? lecteur() : { ok: true, json: async () => avecCompte }));
    const { rerender } = render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives relectureVignettes={0} />);
    expect(await screen.findByText('constat du praticien : à soutenir')).toBeTruthy();
    rerender(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives relectureVignettes={1} />);
    expect(await screen.findByText('constat du praticien : non retenu')).toBeTruthy();
    rerender(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives relectureVignettes={2} />);
    await waitFor(() => expect(screen.queryByText(/constat du praticien/)).toBeNull());
  });

  it('une relecture garde l’ancienne vignette jusqu’à la réponse : le tableau ne saute pas', async () => {
    let rendreSecond!: (v: Reponse) => void;
    const second = new Promise<Reponse>(r => { rendreSecond = r; });
    const lecteur = vi.fn()
      .mockResolvedValueOnce(serveur({ 2: { verdict: 'a_soutenir', aRelire: false } }))
      .mockReturnValueOnce(second);
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes(ROUTE_VIGNETTES) ? lecteur() : { ok: true, json: async () => avecCompte }));
    const { rerender } = render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives relectureVignettes={0} />);
    expect(await screen.findByText('constat du praticien : à soutenir')).toBeTruthy();
    rerender(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives relectureVignettes={1} />);
    await waitFor(() => expect(lecteur).toHaveBeenCalledTimes(2));
    // La relecture est en vol : l'ancien verdict est encore là.
    expect(screen.getByText('constat du praticien : à soutenir')).toBeTruthy();
    rendreSecond(serveur({ 2: { verdict: 'non_retenu', aRelire: false } }));
    expect(await screen.findByText('constat du praticien : non retenu')).toBeTruthy();
  });

  it('des vignettes déjà lues par la fiche s’affichent sans nouvelle lecture (un seul accès journalisé)', async () => {
    const fetchMock = routeur(serveur({ 2: { verdict: 'sans_objet', aRelire: false } }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives vignettesLues={{ 2: { verdict: 'a_soutenir', aRelire: true } }} />,
    );
    expect(await screen.findByText('constat du praticien : à soutenir — à relire')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes(ROUTE_VIGNETTES))).toBe(false);
  });

  it('un autre dossier ne garde pas la vignette du précédent : l’état est vidé, la réponse tardive du premier est écartée', async () => {
    let rendreSecond!: (v: Reponse) => void;
    const second = new Promise<Reponse>(r => { rendreSecond = r; });
    const fetchMock = vi.fn(async (url: string): Promise<Reponse> => {
      if (!String(url).includes(ROUTE_VIGNETTES)) return { ok: true, json: async () => avecCompte };
      return String(url).includes('PAT_B') ? second : serveur({ 2: { verdict: 'a_soutenir', aRelire: false } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(<DetailBesoinsPanel idPatient="PAT_A" vignettesActives />);
    expect(await screen.findByText('constat du praticien : à soutenir')).toBeTruthy();
    rerender(<DetailBesoinsPanel idPatient="PAT_B" vignettesActives />);
    await waitFor(() => expect(screen.queryByText(/constat du praticien/)).toBeNull());
    rendreSecond(serveur({ 2: { verdict: 'sans_objet', aRelire: false } }));
    expect(await screen.findByText('constat du praticien : sans objet')).toBeTruthy();
  });

  it('un constat à relire garde sa vignette, avec la mention', async () => {
    vi.stubGlobal('fetch', routeur(serveur({ 2: { verdict: 'sans_objet', aRelire: true } })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />);
    expect(await screen.findByText('constat du praticien : sans objet — à relire')).toBeTruthy();
  });

  it('en mode consultation : la mention neutre à la place du verdict', async () => {
    vi.stubGlobal('fetch', routeur(serveur({ 2: { verdict: 'a_soutenir', aRelire: false } })));
    render(
      <ChiffresMasquesProvider masques>
        <DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />
      </ChiffresMasquesProvider>,
    );
    await screen.findByRole('table');
    await waitFor(() => expect(document.querySelector('[data-vignette-constat-besoin="2"]')).not.toBeNull());
    const ligne = document.querySelector('[data-vignette-constat-besoin="2"]') as HTMLElement;
    expect(ligne.textContent).toBe('masqué en mode consultation');
    expect(document.body.textContent).not.toContain('à soutenir');
    expect(document.body.textContent).not.toContain('constat du praticien');
  });

  it('une lecture en échec : aucune vignette, aucun message d’erreur, le tableau intact', async () => {
    const fetchMock = routeur({ ok: false, status: 503, json: async () => ({ ok: false, reason: 'constat_besoin_desactive' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />);
    await screen.findByRole('table');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/constat du praticien/)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByRole('cell', { name: /non mesuré/ })).toHaveLength(1);
  });

  it('aucun mot de jugement sur l’état du patient, aucune couleur d’état dans la vignette (D-551 §5)', async () => {
    for (const verdict of ['a_soutenir', 'non_retenu', 'non_evaluable', 'sans_objet']) {
      vi.stubGlobal('fetch', routeur(serveur({ 2: { verdict, aRelire: true } })));
      const { unmount } = render(<DetailBesoinsPanel idPatient="PAT_SEED_01" vignettesActives />);
      const vignette = await waitFor(() => {
        const el = document.querySelector('[data-vignette-constat-besoin="2"]');
        if (!el) throw new Error('vignette absente');
        return el as HTMLElement;
      });
      expect(vignette.textContent).not.toMatch(/satisfait|couvert|déficit|carence|normal|anormal/i);
      expect(vignette.className).not.toMatch(/status-|danger|warning|success|green|red|amber/);
      unmount();
    }
  });
});
