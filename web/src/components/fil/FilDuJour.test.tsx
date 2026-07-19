// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarteFil } from '@/lib/fil/cartes';
import { FilDuJour } from './FilDuJour';

// Le Fil est l'accueil praticien depuis SP-FIL LOT-01 et n'avait aucun test :
// ses quatre états de rendu (chargement, indisponible, vide, liste) partagent
// le même `data-testid`, si bien que l'E2E existant passait aussi sur une
// erreur. On les distingue ici par leur contenu, jamais par leur testid.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const carte = (partiel: Partial<CarteFil> = {}): CarteFil => ({
  type: 'reponse_recente',
  idPatient: 'PAT_SEED_01',
  patient: 'Sophie Nicola',
  titre: 'Réponses reçues',
  pourquoi: 'Reçu il y a 2 jours',
  date: '2026-07-17T10:00:00.000Z',
  href: '/dashboard/patients/PAT_SEED_01',
  actionLabel: 'Ouvrir la fiche',
  ...partiel,
});

function stubFetch(implementation: () => Promise<unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: implementation }) as unknown as Response),
  );
}

describe('FilDuJour — les quatre états de rendu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche un squelette tant que la lecture est en vol, sans rien affirmer', () => {
    // Promesse jamais résolue : l'état de chargement reste observable.
    stubFetch(() => new Promise(() => {}));
    render(<FilDuJour />);
    expect(screen.getByTestId('fil-du-jour')).toBeTruthy();
    // Ni « rien à signaler », ni « indisponible » : on n'affirme rien en vol.
    expect(screen.queryByText(/Rien n.appelle votre attention/i)).toBeNull();
    expect(screen.queryByText(/momentanément indisponible/i)).toBeNull();
  });

  it('un échec réseau est annoncé comme une indisponibilité, jamais comme un fil vide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('réseau');
      }),
    );
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/momentanément indisponible/i)).toBeTruthy());
    // La confusion à éviter : « rien à traiter » alors qu'on n'a rien pu lire.
    expect(screen.queryByText(/Rien n.appelle votre attention/i)).toBeNull();
  });

  it('une réponse `unavailable` est traitée comme une indisponibilité', async () => {
    stubFetch(async () => ({ cartes: [], unavailable: true }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/momentanément indisponible/i)).toBeTruthy());
  });

  it('un fil réellement vide dit pourquoi il l’est', async () => {
    stubFetch(async () => ({ cartes: [] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/Rien n.appelle votre attention/i)).toBeTruthy());
    expect(screen.queryByText(/momentanément indisponible/i)).toBeNull();
  });

  it('chaque carte porte son type, son « pourquoi maintenant » et une action', async () => {
    stubFetch(async () => ({ cartes: [carte()] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText('Reçu')).toBeTruthy();
    expect(screen.getByText('Reçu il y a 2 jours')).toBeTruthy();
    const lien = screen.getByRole('link', { name: /Ouvrir la fiche/ });
    expect(lien.getAttribute('href')).toBe('/dashboard/patients/PAT_SEED_01');
  });

  it('le type est écrit en toutes lettres à côté de l’icône, jamais porté par elle seule', async () => {
    stubFetch(async () => ({
      cartes: [
        carte({ type: 'signalement_trust', titre: 'Signalement à traiter' }),
        carte({ type: 'assignation_en_retard', titre: 'Questionnaire en retard' }),
      ],
    }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Signalement')).toBeTruthy());
    expect(screen.getByText('En retard')).toBeTruthy();
  });
});
