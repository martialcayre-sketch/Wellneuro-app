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

  it('affiche le constat direct initial sans trace', () => {
    render(<PractitionerFoodObservationPanel idPatient="PAT_TEST" />);
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
