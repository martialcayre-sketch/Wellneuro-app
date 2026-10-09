// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaSommeilPraticienPanel } from './AgendaSommeilPraticienPanel';
import { calculerAgregats } from '@/lib/agenda-sommeil/agregats';
import type { NuitReponses } from '@/lib/agenda-sommeil/types';

// LOT-06 : clôturer un agenda de moins de sept nuits ne calcule aucune moyenne
// et ferme la saisie du patient. Le geste reste possible ; il est dit avant
// d'être fait. Au-dessus du seuil, rien ne change : un clic, une clôture.

const NUIT: NuitReponses = {
  heureCoucher: '23:00',
  heureLever: '07:00',
  latence: 'lt15',
  qualite: 4,
  reveils: { dureeTotale: 'aucun' },
  aideSommeil: 'aucune',
  extinctionImmediate: true,
  leverImmediat: true,
};

function episode(nbNuits: number) {
  const nuits = Array.from({ length: nbNuits }, (_, i) => ({
    dateNuit: `2026-09-${String(i + 1).padStart(2, '0')}`,
    reponses: NUIT,
  }));
  return {
    idAssignation: 'ASSIGN_1',
    titre: 'Agenda du sommeil — 21 nuits',
    statut: 'en_cours' as const,
    dateAssignation: '2026-09-01',
    fenetre: {
      dateDebut: '2026-09-01',
      emplacements: [],
      nbRenseignees: nbNuits,
      jourCourant: nbNuits,
      cloturablePatient: false,
    },
    // Les nuits brutes ne servent qu'au chronogramme, qui ne se dessine pas en
    // jsdom : la liste vide suffit, les agrégats viennent du vrai calcul.
    nuits: [],
    agregats: calculerAgregats(nuits),
  };
}

const fetchMock = vi.fn();
const reponse = (payload: unknown) => Promise.resolve({ ok: true, json: async () => payload });
const appelsCloture = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes('/cloture')).length;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AgendaSommeilPraticienPanel — clôture d’un agenda trop court (LOT-06)', () => {
  it('moins de sept nuits : la clôture se confirme, et dit ce qu’elle ferme', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('/cloture') ? reponse({ ok: true }) : reponse({ ok: true, episodes: [episode(3)] }),
    );
    render(<AgendaSommeilPraticienPanel idPatient="PAT_1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clôturer et agréger' }));

    expect(appelsCloture()).toBe(0);
    expect(screen.getByRole('alert').textContent).toContain(
      'Moins de 7 nuits exploitables : la clôture ne calculera aucune moyenne, et le patient ne pourra plus noter de nuit.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clôturer quand même' }));
    await waitFor(() => expect(appelsCloture()).toBe(1));
  });

  it('« Laisser l’agenda ouvert » n’envoie rien et rend le bouton', async () => {
    fetchMock.mockImplementation(() => reponse({ ok: true, episodes: [episode(3)] }));
    render(<AgendaSommeilPraticienPanel idPatient="PAT_1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clôturer et agréger' }));
    fireEvent.click(screen.getByRole('button', { name: 'Laisser l’agenda ouvert' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Clôturer et agréger' })).toBeTruthy();
    expect(appelsCloture()).toBe(0);
  });

  it('sept nuits ou plus : un clic, une clôture, aucune confirmation', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('/cloture') ? reponse({ ok: true }) : reponse({ ok: true, episodes: [episode(7)] }),
    );
    render(<AgendaSommeilPraticienPanel idPatient="PAT_1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clôturer et agréger' }));
    await waitFor(() => expect(appelsCloture()).toBe(1));
    expect(screen.queryByText(/Clôturer quand même/)).toBeNull();
  });
});
