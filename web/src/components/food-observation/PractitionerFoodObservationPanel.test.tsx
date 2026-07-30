// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PractitionerFoodObservationPanel } from './PractitionerFoodObservationPanel';

// Cycle diffusé servi par `/api/praticien/ja/cycle` : depuis le lot 2, l'épisode
// en est dérivé et n'existe plus sans lui.
const CYCLE_DIFFUSE = {
  ok: true,
  protocoleDiffuse: true,
  vue: {
    purpose: 'Rendre l’action alimentaire praticable les jours chargés.',
    actionPrincipale: {
      type: 'alimentation',
      title: 'Ajouter une source de protéines au petit-déjeuner',
      minimalPlan: 'Le faire trois fois cette semaine.',
    },
    cycleRef: 'abcdef0123456789',
    debutCycle: '2026-07-20T08:00:00.000Z',
  },
};

describe('PractitionerFoodObservationPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/praticien/ja/cycle')) {
        return new Response(JSON.stringify(CYCLE_DIFFUSE), { status: 200 });
      }
      if (url.includes('/api/praticien/ja/activation') && (init?.method ?? 'GET') === 'GET') {
        return new Response(JSON.stringify({ ok: true, activation: null }), { status: 200 });
      }
      if (url.includes('/api/praticien/ja/observations')) {
        return new Response(JSON.stringify({ ok: true, snapshot: { draftId: 'JA_DRAFT_1' } }), { status: 201 });
      }
      if (url.includes('/api/praticien/ja/activation') && init?.method === 'POST') {
        return new Response(JSON.stringify({ ok: true, activation: { draftId: 'JA_ACT_1' } }), { status: 201 });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Route test non mockée' }), { status: 404 });
    }));
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  // Lot 3 — le constat porte sur une période RÉELLE. Le décompte de jours sans
  // trace était un 7 en dur : il affirmait « 7 jours » dès que la liste était
  // vide, sans qu'aucun jour ne soit compté. Sans épisode, il n'y a pas de
  // période — donc pas de constat.
  it('affiche le constat direct sans trace, une fois la période connue', async () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    expect(screen.queryByText(/Aucune trace sur la période/i)).toBeNull();

    await screen.findByTestId('ja-praticien-cycle');
    expect(screen.getByText(/Aucune trace sur la période/i)).toBeTruthy();
  });

  it('bloque une issue partielle sans friction puis enregistre après correction', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.change(screen.getByTestId('ja-praticien-issue'), {
      target: { value: 'partiel_empeche' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-enregistrer'));
    expect(screen.getByText(/précise la friction/i)).toBeTruthy();

    fireEvent.change(screen.getByTestId('ja-praticien-friction'), {
      target: { value: 'F1' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-enregistrer'));

    expect(screen.queryByText(/précise la friction/i)).toBeNull();
    expect(screen.getAllByText(/Pas le temps, journée trop chargée/i).length).toBeGreaterThan(0);
  });

  it('restaure l’historique local après remount', () => {
    const { unmount } = render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.click(screen.getByTestId('ja-praticien-enregistrer'));
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();

    unmount();
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);

    expect(screen.getByText('Brouillon local restauré sur cet appareil.')).toBeTruthy();
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();
  });

  it('réinitialise le brouillon local praticien', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    fireEvent.click(screen.getByTestId('ja-praticien-enregistrer'));

    fireEvent.click(screen.getByTestId('ja-praticien-reset-local'));
    expect(screen.queryByText('Brouillon local restauré sur cet appareil.')).toBeNull();
    expect(screen.getByText('Aucune trace praticien enregistrée.')).toBeTruthy();
  });

  it('pré-remplit la revue en mode Accepter avec assiette recommandée', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.change(screen.getByTestId('ja-praticien-assiette'), {
      target: { value: 'ASSIETTE_SOIR_LEGER' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-valider-revue'));

    expect(screen.getByTestId('ja-praticien-review-summary').textContent).toMatch(/Accepté/i);
    expect(screen.getByTestId('ja-praticien-review-summary').textContent).toMatch(/soir léger/i);
  });

  it('permet explicitement de ne proposer aucune assiette', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    expect((screen.getByTestId('ja-praticien-assiette') as HTMLSelectElement).value).toBe('');
    fireEvent.click(screen.getByTestId('ja-praticien-valider-revue'));
    expect(screen.getByTestId('ja-praticien-review-summary').textContent)
      .toMatch(/Aucune assiette proposée/i);
  });

  it('ne diffuse rien après une simple revue locale', async () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('ja-praticien-assiette'), {
      target: { value: 'ASSIETTE_SOIR_LEGER' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-valider-revue'));
    const postCalls = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(postCalls).toHaveLength(0);
  });

  // Lot 2, item 4 — sans ce lecteur, « Transmettre à mon praticien » promettait
  // un partage sans destinataire : la donnée arrivait en base et n'était lue
  // nulle part.
  it('affiche les transmissions du patient, et elles seules', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/praticien/ja/cycle')) {
        return new Response(JSON.stringify(CYCLE_DIFFUSE), { status: 200 });
      }
      if (url.includes('/api/praticien/ja/observations')) {
        return new Response(JSON.stringify({
          ok: true,
          snapshots: [
            { draftId: 'JA_1', createdAt: '2026-07-27T09:00:00.000Z', actor: 'patient', tracesCount: 3, pausesCount: 1, solutionsCount: 2 },
            { draftId: 'JA_2', createdAt: '2026-07-26T09:00:00.000Z', actor: 'praticien', tracesCount: 9, pausesCount: 0, solutionsCount: 0 },
          ],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, activation: null }), { status: 200 });
    });

    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    const bloc = await screen.findByTestId('ja-praticien-transmissions');

    await waitFor(() => expect(bloc.textContent).toMatch(/2026-07-27 — 3 trace\(s\)/));
    // L'instantané rédigé par le praticien n'est pas une transmission patient.
    expect(bloc.textContent).not.toMatch(/9 trace\(s\)/);
  });

  it('dérive l’épisode du protocole diffusé et refuse d’activer sans lui', async () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    const cycle = await screen.findByTestId('ja-praticien-cycle');
    expect(cycle.textContent).toMatch(/Ajouter une source de protéines au petit-déjeuner/);
    // Fenêtre de 21 jours à partir de la diffusion, plus les 7 jours en dur.
    expect(cycle.textContent).toMatch(/2026-07-20/);
    expect(cycle.textContent).toMatch(/2026-08-09/);

    cleanup();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/praticien/ja/cycle')) {
        return new Response(JSON.stringify({ ok: true, protocoleDiffuse: false, vue: null }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, activation: null }), { status: 200 });
    });

    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    await screen.findByTestId('ja-praticien-sans-cycle');
    fireEvent.change(screen.getByTestId('ja-praticien-feedback-patient'), {
      target: { value: 'Cette version est plus simple les jours chargés.' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-activer-decision'));

    expect(screen.getByText(/diffusez un protocole avant d’activer/i)).toBeTruthy();
    const postCalls = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(postCalls).toHaveLength(0);
  });

  it('joint la référence C5B seulement lors de l’activation praticien explicite', async () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    await screen.findByTestId('ja-praticien-cycle');
    fireEvent.change(screen.getByTestId('ja-praticien-assiette'), {
      target: { value: 'ASSIETTE_SOIR_LEGER' },
    });
    fireEvent.change(screen.getByTestId('ja-praticien-feedback-patient'), {
      target: { value: 'Cette version est plus simple les jours chargés.' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-activer-decision'));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      expect(calls.some(([url, init]) => String(url).includes('/api/praticien/ja/observations')
        && init?.method === 'POST')).toBe(true);
    });
    const observationCall = vi.mocked(fetch).mock.calls.find(([url, init]) =>
      String(url).includes('/api/praticien/ja/observations') && init?.method === 'POST');
    const body = JSON.parse(String(observationCall?.[1]?.body));
    expect(body.episode.content.action.recommendedPlateRef).toMatchObject({
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_SOIR_LEGER',
      catalogVersion: 'c5b-plate-catalog-v1',
    });
  });

  it('demande une note explicite en mode Modifier', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.click(screen.getByLabelText('Modifier'));
    fireEvent.change(screen.getByTestId('ja-praticien-decision-note'), {
      target: { value: 'Court' },
    });
    fireEvent.click(screen.getByTestId('ja-praticien-valider-revue'));

    expect(screen.getByText(/note de décision plus précise/i)).toBeTruthy();
  });
});

// Lot 4 — le bloc de calibrage affichait trois phrases écrites en dur, servies à
// l'identique quel que soit le patient. L'assertion NÉGATIVE est le cœur de ce
// test : sans elle, réintroduire la phrase passerait au vert.
describe('PractitionerFoodObservationPanel — le calibrage ne s’invente plus', () => {
  beforeEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it('n’affiche aucune structure tant qu’aucune journée n’est ouverte', async () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    const bloc = await screen.findByTestId('ja-praticien-calibrage');

    expect(bloc.textContent).toContain('Aucune journée décrite à ce jour');
    expect(bloc.textContent).not.toContain('Structure observée');
    expect(bloc.textContent).not.toContain('3 prises principales');
    expect(bloc.textContent).not.toMatch(/variabilité surtout le soir/i);
    expect(bloc.textContent).not.toMatch(/petit-déjeuner sauté/i);
  });

  it('ne promet plus une validation que le bouton ne fait pas', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
    expect(screen.queryByText('Valider la revue locale')).toBeNull();
    expect(screen.getByText('Préparer la décision')).toBeTruthy();
  });
});

// ─── Constats de la revue adversariale du 2026-07-30 ────────────────────────
// Le bloc de calibrage dépendait du dépliant : il annonçait « Aucune journée
// décrite » au-dessus d'une liste affichant douze journées, et sous-estimait la
// couverture dès qu'une transmission ancienne était ouverte.

const JOURNEE = (localDate: string, typeJournee: string) => ({
  journeeId: `j_${localDate}`,
  episodeId: 'ja_PAT_TEST_abcdef0123456789',
  localDate,
  typeJournee,
  momentsObserves: ['matin'],
  marqueursPresents: [],
  schemaVersion: 'ja-domaine-v2',
  marqueursVersion: 'marqueurs-ja-v1',
});

const TRACE_MOT = {
  traceId: 't1',
  episodeId: 'ja_PAT_TEST_abcdef0123456789',
  localDate: '2026-07-28',
  occasionPresentee: true,
  faisable: true,
  issue: 'fait',
  motLibre: 'plus simple quand je prépare la veille',
  frictionsVersion: 'frictions-v1',
};

function monterAvecTransmissions(options: {
  liste: Record<string, unknown>[];
  details: Record<string, Record<string, unknown>>;
  tronquee?: boolean;
  retard?: Record<string, number>;
}) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/praticien/ja/cycle')) {
      return new Response(JSON.stringify(CYCLE_DIFFUSE), { status: 200 });
    }
    if (url.includes('/api/praticien/ja/activation')) {
      return new Response(JSON.stringify({ ok: true, activation: null }), { status: 200 });
    }
    if (url.includes('/api/praticien/ja/observations') && (init?.method ?? 'GET') === 'GET') {
      const draftId = new URL(url, 'http://localhost').searchParams.get('draftId');
      if (draftId) {
        const attente = options.retard?.[draftId] ?? 0;
        if (attente > 0) await new Promise((r) => setTimeout(r, attente));
        const snapshot = options.details[draftId];
        if (!snapshot) {
          return new Response(JSON.stringify({ ok: false, reason: 'snapshot_introuvable' }), { status: 404 });
        }
        return new Response(JSON.stringify({ ok: true, snapshot }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ ok: true, snapshots: options.liste, tronquee: options.tronquee === true }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  }));
  render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
}

function instantane(over: Record<string, unknown>): Record<string, unknown> {
  return {
    draftId: 'JA_1',
    idPatient: 'PAT_TEST',
    episodeId: 'ja_PAT_TEST_abcdef0123456789',
    createdAt: '2026-07-28T10:00:00.000Z',
    supersedesDraftId: null,
    actor: 'patient',
    tracesCount: 0,
    pausesCount: 0,
    plansCount: 0,
    solutionsCount: 0,
    careersCount: 0,
    journeesCount: 0,
    traces: [],
    pauses: [],
    plans: [],
    solutions: [],
    journees: [],
    elementsEcartes: 0,
    ...over,
  };
}

describe('le bilan de calibrage porte l’état du recueil', () => {
  beforeEach(() => cleanup());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ne dit pas « aucune journée » quand des journées ont été transmises', async () => {
    monterAvecTransmissions({
      liste: [{ draftId: 'JA_2', createdAt: '2026-07-30T10:00:00.000Z', actor: 'patient', journeesCount: 3, tracesCount: 0, pausesCount: 0, solutionsCount: 0 }],
      details: {
        JA_2: instantane({
          draftId: 'JA_2',
          createdAt: '2026-07-30T10:00:00.000Z',
          journeesCount: 3,
          journees: [
            JOURNEE('2026-07-28', 'travail_matin'),
            JOURNEE('2026-07-29', 'travail_matin'),
            JOURNEE('2026-07-30', 'repos'),
          ],
        }),
      },
    });

    await waitFor(() => {
      const bloc = screen.getByTestId('ja-praticien-calibrage');
      expect(bloc.textContent).toContain('3 journée(s) décrite(s)');
    });
    const bloc = screen.getByTestId('ja-praticien-calibrage');
    expect(bloc.textContent).not.toContain('Aucune journée décrite');
    expect(bloc.textContent).toContain('2 type(s) de journée sur 4');
    // Il nomme sa source, pour qu'on ne le prenne pas pour l'état d'un dépliant.
    expect(bloc.textContent).toMatch(/D’après la transmission du 2026-07-30/);
  });

  it('ne suit PAS la transmission ouverte : ouvrir une ancienne ne change pas le bilan', async () => {
    monterAvecTransmissions({
      liste: [
        { draftId: 'JA_2', createdAt: '2026-07-30T10:00:00.000Z', actor: 'patient', journeesCount: 3, tracesCount: 0, pausesCount: 0, solutionsCount: 0 },
        { draftId: 'JA_1', createdAt: '2026-07-01T10:00:00.000Z', actor: 'patient', journeesCount: 1, tracesCount: 0, pausesCount: 0, solutionsCount: 0 },
      ],
      details: {
        JA_2: instantane({
          draftId: 'JA_2',
          createdAt: '2026-07-30T10:00:00.000Z',
          journeesCount: 3,
          journees: [
            JOURNEE('2026-07-28', 'travail_matin'),
            JOURNEE('2026-07-29', 'travail_matin'),
            JOURNEE('2026-07-30', 'repos'),
          ],
        }),
        JA_1: instantane({
          draftId: 'JA_1',
          createdAt: '2026-07-01T10:00:00.000Z',
          journeesCount: 1,
          journees: [JOURNEE('2026-07-01', 'travail_matin')],
        }),
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('ja-praticien-calibrage').textContent).toContain('3 journée(s)');
    });

    fireEvent.click(screen.getByTestId('ja-praticien-transmission-JA_1'));
    await screen.findByTestId('ja-praticien-transmission-detail');

    // Les transmissions sont cumulatives : une ancienne est un sous-ensemble.
    // Faire piloter le bilan par le dépliant le ferait sous-estimer.
    expect(screen.getByTestId('ja-praticien-calibrage').textContent).toContain('3 journée(s)');
  });
});

describe('le dépliant rend ce que le patient a écrit', () => {
  beforeEach(() => cleanup());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const listeUne = [{ draftId: 'JA_1', createdAt: '2026-07-28T10:00:00.000Z', actor: 'patient', journeesCount: 0, tracesCount: 1, pausesCount: 0, solutionsCount: 0 }];

  it('affiche le mot libre, la friction et le plan minimal', async () => {
    monterAvecTransmissions({
      liste: listeUne,
      details: {
        JA_1: instantane({
          tracesCount: 1,
          plansCount: 1,
          traces: [{ ...TRACE_MOT, frictionCode: 'F1' }],
          plans: [{ eventId: 'p1', episodeId: 'e', from: '2026-07-29', dureeJours: 3, activatedBy: 'patient', rationaleRequired: false }],
        }),
      },
    });

    await screen.findByTestId('ja-praticien-transmission-JA_1');
    fireEvent.click(screen.getByTestId('ja-praticien-transmission-JA_1'));
    const detail = await screen.findByTestId('ja-praticien-transmission-detail');

    await waitFor(() => {
      expect(detail.textContent).toContain('plus simple quand je prépare la veille');
    });
    // Un plan minimal activé est le signal de friction le plus fort du carnet :
    // le charger sans le rendre revenait à nier sa présence.
    expect(detail.textContent).toContain('plan minimal de 3 jour(s)');
    expect(detail.textContent).not.toContain('aucun élément lisible');
  });

  it('dit combien d’éléments ont été écartés', async () => {
    monterAvecTransmissions({
      liste: listeUne,
      details: { JA_1: instantane({ tracesCount: 3, traces: [TRACE_MOT], elementsEcartes: 2 }) },
    });

    await screen.findByTestId('ja-praticien-transmission-JA_1');
    fireEvent.click(screen.getByTestId('ja-praticien-transmission-JA_1'));
    const detail = await screen.findByTestId('ja-praticien-transmission-detail');

    await waitFor(() => {
      expect(detail.textContent).toContain('2 élément(s) illisible(s)');
    });
  });

  // Sans contrôle de correspondance, le mot libre d'une transmission
  // s'affichait sous la date d'une autre.
  it('n’affiche pas le contenu d’une transmission sous l’en-tête d’une autre', async () => {
    monterAvecTransmissions({
      liste: [
        { draftId: 'JA_2', createdAt: '2026-07-30T10:00:00.000Z', actor: 'patient', journeesCount: 0, tracesCount: 1, pausesCount: 0, solutionsCount: 0 },
        { draftId: 'JA_1', createdAt: '2026-07-01T10:00:00.000Z', actor: 'patient', journeesCount: 0, tracesCount: 1, pausesCount: 0, solutionsCount: 0 },
      ],
      details: {
        JA_2: instantane({ draftId: 'JA_2', createdAt: '2026-07-30T10:00:00.000Z', traces: [{ ...TRACE_MOT, motLibre: 'mot de JA_2' }] }),
        JA_1: instantane({ draftId: 'JA_1', createdAt: '2026-07-01T10:00:00.000Z', traces: [{ ...TRACE_MOT, motLibre: 'mot de JA_1' }] }),
      },
      retard: { JA_1: 60 },
    });

    await screen.findByTestId('ja-praticien-transmission-JA_1');
    fireEvent.click(screen.getByTestId('ja-praticien-transmission-JA_1'));
    fireEvent.click(screen.getByTestId('ja-praticien-transmission-JA_2'));

    const detail = await screen.findByTestId('ja-praticien-transmission-detail');
    await new Promise((r) => setTimeout(r, 150));
    expect(detail.textContent).not.toContain('mot de JA_1');
  });
});

describe('la troncature de la liste', () => {
  beforeEach(() => cleanup());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const dix = Array.from({ length: 10 }, (_, i) => ({
    draftId: `JA_${i}`,
    createdAt: '2026-07-28T10:00:00.000Z',
    actor: 'patient',
    journeesCount: 0,
    tracesCount: 0,
    pausesCount: 0,
    solutionsCount: 0,
  }));

  it('est annoncée quand la fenêtre est saturée', async () => {
    monterAvecTransmissions({ liste: dix, details: { JA_0: instantane({ draftId: 'JA_0' }) }, tronquee: true });
    const bloc = await screen.findByTestId('ja-praticien-transmissions');
    await waitFor(() => {
      expect(bloc.textContent).toContain('Il peut en exister d’autres');
    });
  });

  it('reste muette quand elle ne l’est pas', async () => {
    monterAvecTransmissions({ liste: dix.slice(0, 2), details: { JA_0: instantane({ draftId: 'JA_0' }) } });
    const bloc = await screen.findByTestId('ja-praticien-transmissions');
    expect(bloc.textContent).not.toContain('Il peut en exister d’autres');
  });
});
