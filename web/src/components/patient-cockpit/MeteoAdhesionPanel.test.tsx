// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MeteoAdhesion } from '@/lib/protocol/adhesion';
import { MeteoAdhesionPanel } from './MeteoAdhesionPanel';

afterEach(cleanup);

const meteo = (partiel: Partial<MeteoAdhesion> = {}): MeteoAdhesion => ({
  etat: 'reguliere',
  faitsObserves: ['Action principale : « La plupart des jours »'],
  pointEtapeSource: 'J14',
  dateSource: '2026-01-15T10:00:00.000Z',
  pointsEtapeRenseignes: 2,
  ...partiel,
});

describe('MeteoAdhesionPanel (SP-MET)', () => {
  it('nomme l’état et cite sa source', () => {
    render(<MeteoAdhesionPanel meteo={meteo()} />);
    expect(screen.getByText('Régulière')).toBeTruthy();
    expect(screen.getByText(/Action principale : « La plupart des jours »/)).toBeTruthy();
    expect(screen.getByText(/point d’étape J14 du 15\/01\/2026/)).toBeTruthy();
  });

  it('affiche le signal comme réservé au praticien', () => {
    render(<MeteoAdhesionPanel meteo={meteo()} />);
    expect(screen.getByText(/jamais affiché au patient/i)).toBeTruthy();
  });

  it('n’affiche jamais de pourcentage ni de score', () => {
    const { container } = render(<MeteoAdhesionPanel meteo={meteo({ etat: 'fragile' })} />);
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).not.toMatch(/score/i);
  });

  it('« indéterminée » dit explicitement qu’une absence de réponse n’est pas une interruption', () => {
    render(
      <MeteoAdhesionPanel
        meteo={meteo({ etat: 'indeterminee', faitsObserves: [], pointEtapeSource: null, dateSource: null, pointsEtapeRenseignes: 0 })}
      />,
    );
    expect(screen.getByText('Indéterminée')).toBeTruthy();
    expect(screen.getByText(/n’est pas comptée comme une interruption/i)).toBeTruthy();
    // Aucune source inventée quand il n'y a rien à citer.
    expect(screen.queryByText(/Source :/)).toBeNull();
  });

  it('le statut n’est jamais porté par la seule couleur : le mot est toujours écrit', () => {
    for (const [etat, mot] of [
      ['reguliere', 'Régulière'],
      ['fragile', 'Fragile'],
      ['interrompue', 'Interrompue'],
      ['indeterminee', 'Indéterminée'],
    ] as const) {
      cleanup();
      render(<MeteoAdhesionPanel meteo={meteo({ etat })} />);
      expect(screen.getByText(mot)).toBeTruthy();
    }
  });

  it('accorde la couverture au singulier comme au pluriel', () => {
    render(<MeteoAdhesionPanel meteo={meteo({ pointsEtapeRenseignes: 1 })} />);
    expect(screen.getByText(/1 point d’étape renseigné sur 3/)).toBeTruthy();
    cleanup();
    render(<MeteoAdhesionPanel meteo={meteo({ pointsEtapeRenseignes: 3 })} />);
    expect(screen.getByText(/3 points d’étape renseignés sur 3/)).toBeTruthy();
  });

  // PRA-3b, PR 5 (T-61, [[D-488]]) : une lecture en échec n'est pas une
  // absence de réponse — aucun état, pas même « Indéterminée ».
  describe('lecture des points d’étape en échec', () => {
    it('dit T-61 et ne qualifie pas l’adhésion', () => {
      render(<MeteoAdhesionPanel meteo={meteo({ etat: 'indeterminee' })} echecLecture onRelire={() => {}} />);
      expect(
        screen.getByText('Les points d’étape n’ont pas pu être lus. Ce n’est pas une absence de réponse du patient.'),
      ).toBeTruthy();
      expect(screen.queryByText('Indéterminée')).toBeNull();
      expect(screen.queryByText(/Aucun point d’étape exploitable/)).toBeNull();
      expect(screen.queryByText(/points? d’étape renseignés? sur 3/)).toBeNull();
    });

    it('« Réessayer » relit, puis rend le focus au panneau', async () => {
      const onRelire = vi.fn(async () => {});
      render(<MeteoAdhesionPanel meteo={meteo()} echecLecture onRelire={onRelire} />);
      fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
      expect(onRelire).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Météo d’adhésion' }).closest('section')),
      );
    });

    it('titre du panneau en h4 sous la phase (Q2 a)', () => {
      render(<MeteoAdhesionPanel meteo={meteo()} />);
      expect(screen.getByRole('heading', { level: 4, name: 'Météo d’adhésion' })).toBeTruthy();
    });
  });
});
