// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientFoodObservationPanel } from './PatientFoodObservationPanel';

describe('PatientFoodObservationPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/portail/ja/decision')) {
        return new Response(JSON.stringify({ ok: true, hasDecision: false, decision: null }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Route test non mockée' }), { status: 404 });
    }));
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('demande une friction pour une trace partielle/empêchee', () => {
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-issue'), {
      target: { value: 'partiel_empeche' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText(/précise la friction/i)).toBeTruthy();
  });

  it('affiche le silence utile quand le budget hebdomadaire est atteint', () => {
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-budget'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText('Rien à noter aujourd’hui, nous en savons assez.')).toBeTruthy();
  });

  it('ajoute une solution intra-épisode', () => {
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-solution-input'), {
      target: { value: 'Préparer la veille' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-ajouter-solution'));

    expect(screen.getByText('• Préparer la veille')).toBeTruthy();
  });

  it('restaure le brouillon local après remount', () => {
    const { unmount } = render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-budget'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.change(screen.getByTestId('ja-patient-solution-input'), {
      target: { value: 'Batch cuisine dimanche' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-ajouter-solution'));

    unmount();
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    expect(screen.getByText('Brouillon local restauré sur cet appareil.')).toBeTruthy();
    expect(screen.getByText('Rien à noter aujourd’hui, nous en savons assez.')).toBeTruthy();
    expect(screen.getByText('• Batch cuisine dimanche')).toBeTruthy();
  });

  // Préalable G4 : le brouillon suit la personne, pas le lien. Une clé portant
  // le jeton d'URL deviendrait introuvable au lien suivant — et écrirait un
  // secret d'accès dans le stockage du navigateur.
  it('nomme le brouillon d’après le patient, jamais d’après un jeton de lien', () => {
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    const cles = Object.keys(window.sessionStorage);
    expect(cles).toContain('wellneuro:ja5-02:patient:PAT_TEST');
    expect(cles.some(cle => cle.includes('TOK'))).toBe(false);
  });

  it('sans session, ne conserve rien et le dit plutôt que de le taire', () => {
    render(<PatientFoodObservationPanel idPatient={null} />);

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText(/ne sera pas conservé sur cet appareil/)).toBeTruthy();
    expect(Object.keys(window.sessionStorage)).toEqual([]);
  });

  it('réinitialise le brouillon local', () => {
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('ja-patient-reset-local'));
    expect(screen.queryByText('Brouillon local restauré sur cet appareil.')).toBeNull();
    expect(screen.getByText('Pas encore d’élément enregistré.')).toBeTruthy();
  });
});
