// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AgendaAlimentairePraticienPanel } from './AgendaAlimentairePraticienPanel';
import { AgendaAliFeatureProvider } from './AgendaAliFeatureProvider';
import type { EpisodeAgendaAli } from '@/app/api/praticien/agenda-alimentaire/route';
import type { JourRow } from '@/lib/agenda-alimentaire/types';
import type { AgregatsAgendaAli } from '@/lib/agenda-alimentaire/agregats';
import type { RythmeDeclare } from '@/lib/equilibre/discordanceRythme';
import { MIN_JOURS_AGREGATS, NB_JOURS_AGENDA_ALI } from '@/lib/agenda-alimentaire/types';

// La lecture de discordance (D-040) n'existe qu'en forme SIIN (drapeau allumé) :
// `MAX_RYTHME_CHRONO` vaut 0 en forme courte et `discordanceRythme` s'effondre
// alors en « non mesurable ». Ces rendus-là ne s'exercent donc qu'en position
// allumée, comme le banc de la fonction pure. Voir `discordanceRythme.test.ts`.
const SIIN57_ACTIF = process.env.WN_ALI_01_SIIN57 === 'true';

const BANNIERE_RECUEIL_FERME =
  'Recueil fermé — le patient ne peut plus noter de journée. Les journées déjà notées restent lisibles ici.';

// Les tests de cette suite portent sur le panneau lui-même, pas sur le
// drapeau : les rendus qui n'ont rien à voir avec `WN_AGENDA_ALI` passent par
// ce helper, drapeau ALLUMÉ, pour ne pas polluer leurs assertions avec la
// bannière « recueil fermé ». Le troisième état du contexte — position
// inconnue, hors provider — a son propre test dédié, plus bas.
function renderPret(ui: ReactElement, enabled = true) {
  return render(<AgendaAliFeatureProvider enabled={enabled}>{ui}</AgendaAliFeatureProvider>);
}

afterEach(cleanup);

function emplacements(nbRenseignees: number, dateDebut = '2026-08-01') {
  return Array.from({ length: NB_JOURS_AGENDA_ALI }, (_, i) => ({
    dateJour: `2026-08-${String(i + 1).padStart(2, '0')}`,
    index: i + 1,
    renseignee: i < nbRenseignees,
    illisible: false,
    estAujourdHui: i === nbRenseignees - 1,
  }));
}

function jour(over: Partial<JourRow> = {}): JourRow {
  return {
    id: 'JOUR_1',
    idPatient: 'PAT_1',
    idAssignation: 'ASS_ALI',
    dateJour: '2026-08-01',
    reponses: {
      prises: [
        { heure: '07:30', nature: 'repas' },
        { heure: '12:30', nature: 'repas' },
        { heure: '19:30', nature: 'repas' },
      ],
      premierePriseProteines: true,
      soirPlusCopieux: false,
      legumesDeuxPrises: null,
      fruitsOuOleagineux: false,
      ultraTransformes: true,
    },
    canal: 'portail',
    supersedesJourId: null,
    soumisLe: '2026-08-01T09:00:00.000Z',
    ...over,
  };
}

function episode(over: Partial<EpisodeAgendaAli> = {}): EpisodeAgendaAli {
  const jours = over.jours ?? [jour()];
  return {
    idAssignation: 'ASS_ALI',
    titre: 'Agenda alimentaire — 21 jours',
    statut: 'en_cours',
    dateAssignation: '2026-08-01T09:00:00.000Z',
    fenetre: {
      dateDebut: '2026-08-01',
      emplacements: emplacements(jours.length),
      nbRenseignees: jours.length,
      jourCourant: jours.length,
      cloturablePatient: false,
    },
    jours,
    agregats: null,
    illisibles: 0,
    ...over,
  };
}

// Agrégats complets, « favorable partout » par défaut ; on déforme un axe pour
// lever un drapeau de discordance. Couverture ≥ MIN_JOURS pour que la carte des
// moyennes rende — la lecture, elle, ne dépend que des champs, pas de la carte.
function agregats(over: Partial<AgregatsAgendaAli> = {}): AgregatsAgendaAli {
  return {
    nbJours: 10,
    nbJoursWeekEnd: 3,
    nbJoursSansPrise: 0,
    nbJoursAvecPrises: 10,
    nbJoursFenetreConnue: 10,
    nbPairesJeune: 9,
    nbJoursProteinesConnu: 10,
    nbJoursContenuConnu: 10,
    nbJoursSoirConnu: 10,
    jeuneMedian: 720,
    fenetreAliMoyenne: 600,
    regularitePremiereEcartType: 20,
    regulariteDerniereEcartType: 25,
    nbPrisesMoyen: 3,
    nbRepasMoyen: 3,
    nbHorsRepasMoyen: 0,
    freqHorsRepasSem: 0,
    freqMoinsDeuxRepasSem: 0,
    freqProteinesMatinSem: 6,
    freqLegumesSem: 5,
    freqFruitsSem: 5,
    freqUltraTransformesSem: 1,
    freqSoirCopieuxSem: 1,
    ...over,
  };
}

const DECLARE_FAVORABLE: RythmeDeclare = { SIIN54: 12, SIIN53: 1, SIIN55: 1 };
const ENTETE_DISCORDANCE = 'Rythme déclaré à confronter à l’observé';

function mockFetch(episodes: EpisodeAgendaAli[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, episodes }),
    }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AgendaAlimentairePraticienPanel', () => {
  it('affiche un état vide DESCRIPTIF, sans geste impossible (D-027), et aucune bannière', async () => {
    mockFetch([]);
    render(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    // Sans impératif : drapeau éteint, IDS_SUSPENDUS retire Q_ALI_09 de la
    // bibliothèque ET de la route d'assignation — « Assignez l'instrument »
    // nommerait un geste qui n'existe alors nulle part.
    await waitFor(() => screen.getByText('Aucun agenda alimentaire n’est assigné à ce patient.'));
    // Zéro épisode : la bannière n'a pas lieu d'être, même drapeau éteint —
    // D-027 a rendu cet état vide descriptif exprès, une bannière par-dessus
    // n'y ajouterait rien.
    expect(screen.queryByText(BANNIERE_RECUEIL_FERME)).toBeNull();
  });

  it('rend une journée avec ses horaires de prises', async () => {
    mockFetch([episode()]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText('07:30')).toBeTruthy();
    expect(screen.getByText('12:30')).toBeTruthy();
    expect(screen.getByText('19:30')).toBeTruthy();
  });

  it('affiche « couverture insuffisante » sous 7 journées, jamais une zone vide', async () => {
    const jours = Array.from({ length: 3 }, (_, i) =>
      jour({ id: `J${i}`, dateJour: `2026-08-0${i + 1}` }),
    );
    mockFetch([episode({ jours, agregats: null })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() =>
      screen.getByText(new RegExp(`Couverture insuffisante.*3/${MIN_JOURS_AGREGATS}`)),
    );
  });

  it('distingue les trois états de `boolean | null` (Oui / Non / Sans réponse)', async () => {
    mockFetch([episode()]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    // premierePriseProteines = true, ultraTransformes = true (deux « Oui »
    // distincts), soirPlusCopieux = false, fruitsOuOleagineux = false
    // (deux « Non »), legumesDeuxPrises = null (abstention explicite).
    expect(screen.getAllByText('Oui').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Non').length).toBeGreaterThan(0);
    expect(screen.getByText('Sans réponse (abstention)')).toBeTruthy();
  });

  it('rend le quatrième état « Non renseigné » quand une clé est absente du contrat (undefined)', async () => {
    // `soirPlusCopieux` absent : ligne écrite sous un contrat antérieur qui ne
    // portait pas encore cette clé — distinct de `false` (observé absent) et
    // de `null` (abstention explicite), les deux autres états déjà couverts
    // par le test ci-dessus.
    const j = jour({
      reponses: {
        prises: [],
        premierePriseProteines: true,
        legumesDeuxPrises: false,
        fruitsOuOleagineux: false,
        ultraTransformes: false,
      },
    });
    mockFetch([episode({ jours: [j] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText('Non renseigné')).toBeTruthy();
  });

  it('associe chaque libellé à SA propre valeur, pas à une valeur d’un autre champ (correspondance par ligne)', async () => {
    // `getAllByText('Oui').length > 0` passerait même si deux libellés
    // étaient intervertis : l'assertion doit porter sur la PAIRE
    // libellé → valeur, pas sur la seule présence du texte quelque part dans
    // le DOM. Valeurs choisies pour que deux champs ADJACENTS dans le rendu
    // ne partagent jamais le même texte — sans quoi un échange accidentel de
    // deux lignes voisines resterait indétectable par construction.
    const j = jour({
      reponses: {
        prises: [],
        premierePriseProteines: true, // Oui
        soirPlusCopieux: false, // Non
        legumesDeuxPrises: null, // Sans réponse (abstention)
        fruitsOuOleagineux: true, // Oui
        ultraTransformes: false, // Non
      },
    });
    mockFetch([episode({ jours: [j] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));

    const ligneDe = (libelle: string) => screen.getByText(libelle).closest('div') as HTMLElement;

    expect(within(ligneDe('Première prise riche en protéines')).getByText('Oui')).toBeTruthy();
    expect(within(ligneDe('Repas du soir plus copieux')).getByText('Non')).toBeTruthy();
    expect(within(ligneDe('Légumes à deux prises')).getByText('Sans réponse (abstention)')).toBeTruthy();
    expect(within(ligneDe('Fruits ou oléagineux')).getByText('Oui')).toBeTruthy();
    expect(within(ligneDe('Aliments ultra-transformés')).getByText('Non')).toBeTruthy();
  });

  it("affiche 'Annulée' pour une assignation au statut 'annulee' rendu par la route", async () => {
    mockFetch([episode({ statut: 'annulee' })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText(/Annulée/));
  });

  it('rend la bordure d’alerte sur un emplacement en quarantaine et le bandeau « illisibles »', async () => {
    const emp = emplacements(3);
    // Marquer un emplacement NON aujourd'hui comme illisible, distinct de
    // « renseignée » — les deux drapeaux ne sont pas exclusifs (append-only),
    // mais ce cas isole la branche de bordure d'alerte.
    emp[1] = { ...emp[1], illisible: true, renseignee: false, estAujourdHui: false };
    mockFetch([
      episode({
        illisibles: 1,
        fenetre: { dateDebut: '2026-08-01', emplacements: emp, nbRenseignees: 1, jourCourant: 1, cloturablePatient: false },
      }),
    ]);
    const { container } = renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText(/1 ligne en quarantaine, illisible/)).toBeTruthy();
    const cellules = container.querySelectorAll('[title]');
    expect(cellules[1]?.className).toContain('border-status-danger');
  });

  it('efface un message d’erreur précédent après un rechargement réussi', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ ok: false, error: 'Chargement impossible.' }) })
      .mockResolvedValueOnce({ json: async () => ({ ok: true, episodes: [episode()] }) });
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('Chargement impossible.'));
    // Un changement de patient redéclenche `charger` (dépendance `idPatient`
    // du `useCallback`) : c'est le second chargement, celui qui réussit.
    rerender(
      <AgendaAliFeatureProvider enabled>
        <AgendaAlimentairePraticienPanel idPatient="PAT_2" />
      </AgendaAliFeatureProvider>,
    );
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByText('Chargement impossible.')).toBeNull();
  });

  it('ne rend aucune clé de score, indice, gramme ou kcal dans le DOM', async () => {
    mockFetch([
      episode({
        jours: Array.from({ length: 8 }, (_, i) => jour({ id: `J${i}`, dateJour: `2026-08-0${i + 1}` })),
        agregats: {
          nbJours: 8,
          nbJoursWeekEnd: 2,
          nbJoursSansPrise: 0,
          nbJoursAvecPrises: 8,
          nbJoursFenetreConnue: 8,
          nbPairesJeune: 7,
          nbJoursProteinesConnu: 8,
          nbJoursContenuConnu: 8,
          nbJoursSoirConnu: 8,
          jeuneMedian: 660,
          fenetreAliMoyenne: 600,
          regularitePremiereEcartType: 20,
          regulariteDerniereEcartType: 25,
          nbPrisesMoyen: 3,
          nbRepasMoyen: 3,
          nbHorsRepasMoyen: 0,
          freqHorsRepasSem: 0,
          freqMoinsDeuxRepasSem: 0,
          freqProteinesMatinSem: 7,
          freqLegumesSem: 5,
          freqFruitsSem: 5,
          freqUltraTransformesSem: 1,
          freqSoirCopieuxSem: 2,
        },
      }),
    ]);
    const { container } = renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    const texte = container.textContent?.toLowerCase() ?? '';
    for (const motif of ['score', 'indice', 'gramme', 'kcal', 'quantite', 'quantité']) {
      expect(texte).not.toContain(motif);
    }
  });

  it('drapeau éteint + au moins un épisode → bannière « recueil fermé » présente', async () => {
    mockFetch([episode()]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />, false);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText(BANNIERE_RECUEIL_FERME)).toBeTruthy();
  });

  it('drapeau allumé + au moins un épisode → bannière absente', async () => {
    mockFetch([episode()]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />, true);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByText(BANNIERE_RECUEIL_FERME)).toBeNull();
  });

  it('panneau monté HORS provider → AUCUNE bannière (position inconnue, on n’affirme rien)', async () => {
    // Le contexte est à trois états : `null` = position inconnue. Se taire
    // est le seul défaut qui ne ment jamais — un défaut `false` affirmerait
    // « recueil fermé » sur un recueil ouvert, et le drapeau est ALLUMÉ en
    // production (D-025/D-028). Le câblage réel, lui, est épinglé par
    // `src/app/dashboard/patients/[idPatient]/page.test.tsx`.
    mockFetch([episode()]);
    render(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByText(BANNIERE_RECUEIL_FERME)).toBeNull();
  });

  it('drapeau éteint : la bannière passe aussi la garde de frontière de campagne', async () => {
    // La garde des mots interdits plus haut tourne drapeau ALLUMÉ, donc sans
    // bannière : sans ce cas, le texte ajouté par ce lot n'est jamais passé au
    // crible dont les Interdits du lot se réclament.
    mockFetch([episode()]);
    const { container } = renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />, false);
    await waitFor(() => screen.getByText(BANNIERE_RECUEIL_FERME));
    const texte = container.textContent?.toLowerCase() ?? '';
    for (const motif of ['score', 'indice', 'gramme', 'kcal', 'quantite', 'quantité']) {
      expect(texte).not.toContain(motif);
    }
  });

  it('rend `soumisLe` formaté en date et heure de Paris', async () => {
    // Attendu LITTÉRAL, jamais recalculé avec le même `Intl.DateTimeFormat`
    // que le composant : un attendu dérivé de la même formule reste vert si
    // `timeZone: 'Europe/Paris'` disparaît du composant, sur une machine déjà
    // réglée sur Paris — c'est-à-dire sur le Mac de développement. 09:00 UTC
    // en août = 11:00 à Paris ; en UTC la valeur serait « 09:00 ».
    mockFetch([episode({ jours: [jour({ soumisLe: '2026-08-01T09:00:00.000Z' })] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText('Noté le 01/08/2026 11:00')).toBeTruthy();
  });

  it('`supersedesJourId` non nul → mention « corrigée » présente ; nul → absente', async () => {
    mockFetch([episode({ jours: [jour({ supersedesJourId: 'JOUR_0' })] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText('Journée corrigée — remplace une version antérieure.')).toBeTruthy();
  });

  it('`supersedesJourId` nul → aucune mention « corrigée »', async () => {
    mockFetch([episode({ jours: [jour({ supersedesJourId: null })] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByText('Journée corrigée — remplace une version antérieure.')).toBeNull();
  });

  it('`canal` « portail » → aucune mention de canal', async () => {
    mockFetch([episode({ jours: [jour({ canal: 'portail' })] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByText(/Saisie hors portail/)).toBeNull();
  });

  it('`canal` autre que « portail » → mention affichée', async () => {
    mockFetch([episode({ jours: [jour({ canal: 'praticien' })] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByText('Saisie hors portail : praticien')).toBeTruthy();
  });

  // ── Bouton « Clôturer et verser au dossier » (résidu du LOT-00, D-039) ────

  const LIBELLE_CLOTURE = 'Clôturer et verser au dossier';

  it('le bouton de clôture n’apparaît que pour un épisode en cours avec au moins une journée', async () => {
    mockFetch([episode()]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.getByRole('button', { name: LIBELLE_CLOTURE })).toBeTruthy();
    cleanup();

    mockFetch([episode({ statut: 'cloture' })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByRole('button', { name: LIBELLE_CLOTURE })).toBeNull();
    cleanup();

    mockFetch([episode({ statut: 'annulee' })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByRole('button', { name: LIBELLE_CLOTURE })).toBeNull();
    cleanup();

    // Zéro journée : rien à verser — le serveur refuserait, le bouton se tait.
    mockFetch([episode({ jours: [] })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('Agenda alimentaire — 21 jours'));
    expect(screen.queryByRole('button', { name: LIBELLE_CLOTURE })).toBeNull();
  });

  it('clic → POST vers la route de clôture avec les bons identifiants, puis rechargement (statut « Clôturé »)', async () => {
    const appels: Array<{ url: string; init?: RequestInit }> = [];
    let lecture = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        appels.push({ url, init });
        if (init?.method === 'POST') return { json: async () => ({ ok: true, idReponse: 'REP_X', nbJours: 1, dejaCloture: false }) };
        lecture += 1;
        return {
          json: async () => ({
            ok: true,
            episodes: [lecture === 1 ? episode() : episode({ statut: 'cloture' })],
          }),
        };
      }),
    );
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByRole('button', { name: LIBELLE_CLOTURE }));
    fireEvent.click(screen.getByRole('button', { name: LIBELLE_CLOTURE }));

    await waitFor(() => screen.getByText(/Clôturé/));
    const post = appels.find((a) => a.init?.method === 'POST');
    expect(post?.url).toBe('/api/praticien/agenda-alimentaire/cloture');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ idPatient: 'PAT_1', idAssignation: 'ASS_ALI' });
    // Rechargé après succès : deux GET, et le bouton a disparu avec le statut.
    expect(lecture).toBe(2);
    expect(screen.queryByRole('button', { name: LIBELLE_CLOTURE })).toBeNull();
  });

  it('refus nommé du serveur (quarantaine) → le message s’affiche, pas de rechargement', async () => {
    const REFUS =
      'Recueil non clôturable : 1 ligne(s) illisible(s) en quarantaine (2026-08-05). Régler l’incident d’intégrité avant de clôturer.';
    let lecture = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return { json: async () => ({ ok: false, reason: 'invalid', error: REFUS }) };
        lecture += 1;
        return { json: async () => ({ ok: true, episodes: [episode()] }) };
      }),
    );
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByRole('button', { name: LIBELLE_CLOTURE }));
    fireEvent.click(screen.getByRole('button', { name: LIBELLE_CLOTURE }));

    await waitFor(() => screen.getByText(REFUS));
    // Le message du serveur EST la restitution : aucun re-GET, l'épisode reste
    // en cours et le bouton reste disponible pour un nouvel essai après remède.
    expect(lecture).toBe(1);
    expect(screen.getByRole('button', { name: LIBELLE_CLOTURE })).toBeTruthy();
  });

  // ── Lecture de discordance rythme déclaré vs observé (LOT-01, D-040) ──────

  // La lecture n'est rendue que sur un épisode CLÔTURÉ (D-040, contrat
  // « clôturé »). Ce helper donne un épisode clôturé et couvert.
  function episodeCloture(over: Partial<EpisodeAgendaAli> = {}): EpisodeAgendaAli {
    return episode({ statut: 'cloture', agregats: agregats(), ...over });
  }

  it('sans `rythmeDeclare`, le panneau ne rend aucune lecture de discordance (additif)', async () => {
    // Vrai dans les deux positions du drapeau : le prop absent (comportement
    // d'avant ce lot) ⇒ pas d'entête, même sur un clôturé couvert défavorable.
    mockFetch([episodeCloture({ agregats: agregats({ jeuneMedian: 480 }) })]);
    renderPret(<AgendaAlimentairePraticienPanel idPatient="PAT_1" />);
    await waitFor(() => screen.getByText('2026-08-01'));
    expect(screen.queryByText(ENTETE_DISCORDANCE)).toBeNull();
  });

  it.runIf(SIIN57_ACTIF)(
    'épisode EN COURS (non clôturé), même couvert et sur-déclarant → aucune lecture (contrat « clôturé »)',
    async () => {
      // La garde de statut : `ResumeAgregats` montre les médianes d'un en_cours
      // couvert, mais la lecture DIRECTIONNELLE attend la clôture. Même agrégats
      // défavorables + déclaré favorable, rien tant que statut ≠ 'cloture'.
      mockFetch([episode({ statut: 'en_cours', agregats: agregats({ jeuneMedian: 480 }) })]);
      renderPret(
        <AgendaAlimentairePraticienPanel idPatient="PAT_1" rythmeDeclare={DECLARE_FAVORABLE} />,
      );
      await waitFor(() => screen.getByText('2026-08-01'));
      expect(screen.queryByText(ENTETE_DISCORDANCE)).toBeNull();
    },
  );

  it.runIf(SIIN57_ACTIF)(
    'clôturé + déclaré favorable + observé défavorable → la lecture paraît sur l’axe en sur-déclaration, avec rappel déclaré/observé',
    async () => {
      mockFetch([episodeCloture({ agregats: agregats({ jeuneMedian: 480 }) })]);
      renderPret(
        <AgendaAlimentairePraticienPanel idPatient="PAT_1" rythmeDeclare={DECLARE_FAVORABLE} />,
      );
      await waitFor(() => screen.getByText(ENTETE_DISCORDANCE));
      const ligne = screen.getByText('Jeûne nocturne').closest('li') as HTMLElement;
      expect(within(ligne).getByText(/déclaré ≥ 10 h/)).toBeTruthy();
      expect(within(ligne).getByText(/observé médian 8 h/)).toBeTruthy();
      // Les axes concordants ne paraissent pas : seule l'asymétrie actionnable.
      expect(screen.queryByText('Protéines au petit-déjeuner')).toBeNull();
      expect(screen.queryByText('Repas du soir léger')).toBeNull();
    },
  );

  it.runIf(SIIN57_ACTIF)(
    'clôturé + déclaré favorable + observé concordant → aucune lecture (rien à explorer)',
    async () => {
      mockFetch([episodeCloture()]);
      renderPret(
        <AgendaAlimentairePraticienPanel idPatient="PAT_1" rythmeDeclare={DECLARE_FAVORABLE} />,
      );
      await waitFor(() => screen.getByText('2026-08-01'));
      expect(screen.queryByText(ENTETE_DISCORDANCE)).toBeNull();
    },
  );

  it.runIf(SIIN57_ACTIF)(
    'clôturé + observé non couvert (agrégats null) → aucune lecture, jamais un drapeau sur une mesure absente',
    async () => {
      mockFetch([episodeCloture({ agregats: null })]);
      renderPret(
        <AgendaAlimentairePraticienPanel idPatient="PAT_1" rythmeDeclare={DECLARE_FAVORABLE} />,
      );
      await waitFor(() => screen.getByText('2026-08-01'));
      expect(screen.queryByText(ENTETE_DISCORDANCE)).toBeNull();
    },
  );

  it.runIf(SIIN57_ACTIF)(
    'la lecture rendue passe la garde de frontière de campagne (aucun score/indice/gramme/kcal)',
    async () => {
      mockFetch([
        episodeCloture({ agregats: agregats({ jeuneMedian: 480, freqProteinesMatinSem: 2, freqSoirCopieuxSem: 5 }) }),
      ]);
      const { container } = renderPret(
        <AgendaAlimentairePraticienPanel idPatient="PAT_1" rythmeDeclare={DECLARE_FAVORABLE} />,
      );
      await waitFor(() => screen.getByText(ENTETE_DISCORDANCE));
      const texte = container.textContent?.toLowerCase() ?? '';
      for (const motif of ['score', 'indice', 'gramme', 'kcal', 'quantite', 'quantité']) {
        expect(texte).not.toContain(motif);
      }
    },
  );
});
