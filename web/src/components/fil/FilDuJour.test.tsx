// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  cle: 'reponse_recente:REP_1',
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

// G1 : le geste de refus. « Refusable », pas « supprimable » — l'annulation
// fait partie du garde-fou, pas du confort.
describe('FilDuJour — écarter une carte (G1)', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Le GET rend le Fil, le POST accepte le refus. */
  function stubFilEtRefus(refusOk = true) {
    const appels: { url: string; body?: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options?: { method?: string; body?: string }) => {
        appels.push({ url, body: options?.body ? JSON.parse(options.body) : undefined });
        if (options?.method === 'POST') {
          return {
            ok: refusOk,
            json: async () =>
              refusOk
                ? { ok: true, carteCle: 'reponse_recente:REP_1', refusee: true, inchange: false }
                : { ok: false, reason: 'exception', error: 'Erreur technique.' },
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({ cartes: [carte({ cle: 'reponse_recente:REP_1' })] }),
        } as unknown as Response;
      }),
    );
    return appels;
  }

  it('écarter envoie le refus au serveur, avec la clé de la carte', async () => {
    const appels = stubFilEtRefus();
    render(<FilDuJour />);

    const bouton = await screen.findByRole('button', { name: /Écarter cette carte/ });
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.getByText(/Carte écartée/)).toBeTruthy());
    const refus = appels.find(a => a.url === '/api/praticien/fil/refus');
    expect(refus?.body).toMatchObject({
      idPatient: 'PAT_SEED_01',
      carteCle: 'reponse_recente:REP_1',
      refusee: true,
    });
  });

  it('une carte écartée reste annulable sans quitter l’écran', async () => {
    const appels = stubFilEtRefus();
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Écarter cette carte/ }));
    const annuler = await screen.findByRole('button', { name: 'Annuler' });
    fireEvent.click(annuler);

    await waitFor(() => expect(screen.getByRole('button', { name: /Écarter cette carte/ })).toBeTruthy());
    expect(screen.queryByText(/Carte écartée/)).toBeNull();
    // L'annulation passe par le serveur : elle ne se contente pas de réafficher.
    const decisions = appels.filter(a => a.url === '/api/praticien/fil/refus');
    expect(decisions.map(a => (a.body as { refusee: boolean }).refusee)).toEqual([true, false]);
  });

  it('si le serveur refuse l’écriture, la carte reste affichée et l’échec est dit', async () => {
    stubFilEtRefus(false);
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Écarter cette carte/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Erreur technique/));
    // Le praticien ne doit pas croire avoir écarté une carte qui reviendra.
    expect(screen.getByRole('button', { name: /Écarter cette carte/ })).toBeTruthy();
    expect(screen.queryByText(/Carte écartée/)).toBeNull();
  });
});
