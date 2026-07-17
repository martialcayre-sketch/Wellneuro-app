// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PractitionerFoodObservationPanel } from './PractitionerFoodObservationPanel';

describe('PractitionerFoodObservationPanel', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
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
    expect(screen.getByText(/Pas le temps, journée trop chargée/i)).toBeTruthy();
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
});
