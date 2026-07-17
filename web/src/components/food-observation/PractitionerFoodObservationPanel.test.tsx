// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PractitionerFoodObservationPanel } from './PractitionerFoodObservationPanel';

describe('PractitionerFoodObservationPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
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
