// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PatientFoodObservationPanel } from './PatientFoodObservationPanel';

describe('PatientFoodObservationPanel', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it('demande une friction pour une trace partielle/empêchee', () => {
    render(<PatientFoodObservationPanel token="TOK_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-issue'), {
      target: { value: 'partiel_empeche' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText(/précise la friction/i)).toBeTruthy();
  });

  it('affiche le silence utile quand le budget hebdomadaire est atteint', () => {
    render(<PatientFoodObservationPanel token="TOK_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-budget'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText('Rien à noter aujourd’hui, nous en savons assez.')).toBeTruthy();
  });

  it('ajoute une solution intra-épisode', () => {
    render(<PatientFoodObservationPanel token="TOK_TEST" />);

    fireEvent.change(screen.getByTestId('ja-patient-solution-input'), {
      target: { value: 'Préparer la veille' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-ajouter-solution'));

    expect(screen.getByText('• Préparer la veille')).toBeTruthy();
  });

  it('restaure le brouillon local après remount', () => {
    const { unmount } = render(<PatientFoodObservationPanel token="TOK_TEST" />);

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
    render(<PatientFoodObservationPanel token="TOK_TEST" />);

    expect(screen.getByText('Brouillon local restauré sur cet appareil.')).toBeTruthy();
    expect(screen.getByText('Rien à noter aujourd’hui, nous en savons assez.')).toBeTruthy();
    expect(screen.getByText('• Batch cuisine dimanche')).toBeTruthy();
  });

  it('réinitialise le brouillon local', () => {
    render(<PatientFoodObservationPanel token="TOK_TEST" />);

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('ja-patient-reset-local'));
    expect(screen.queryByText('Brouillon local restauré sur cet appareil.')).toBeNull();
    expect(screen.getByText('Pas encore d’élément enregistré.')).toBeTruthy();
  });
});
