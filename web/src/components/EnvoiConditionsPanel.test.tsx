// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EnvoiConditionsPanel } from './EnvoiConditionsPanel';

// [[D-292]] §3 — la liste, l'aperçu, puis l'envoi confirmé en une fois : rien
// ne part avant le second clic, et la liste se relit après l'envoi.

const APERCU = { sujet: 'Wellneuro — les conditions d’utilisation de votre espace', corps: 'Bonjour,\n\n…' };

function serveur(eligibles: { idPatient: string; prenom: string; nom: string }[], ouvert = true) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return { ok: true, status: 200, json: async () => ({ ok: true, envoyes: 2, echoues: 0, ignores: 0 }) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, ouvert, eligibles, apercu: APERCU }) } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EnvoiConditionsPanel', () => {
  it('liste les dossiers, montre l’aperçu, et n’envoie qu’après confirmation', async () => {
    const fetchMock = serveur([
      { idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' },
      { idPatient: 'PAT_2', prenom: 'Jennifer', nom: 'Martin' },
    ]);
    render(<EnvoiConditionsPanel />);
    expect(await screen.findByText('Sophie Nicola')).toBeTruthy();
    expect(screen.getByText('Jennifer Martin')).toBeTruthy();
    expect(screen.getByText(`Objet : ${APERCU.sujet}`)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’e-mail…' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Envoyer l’e-mail à ces 2 patients, en une fois ?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('2 envoyés.'));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ idsPatient: ['PAT_1', 'PAT_2'] });
    // La liste se relit après l'envoi.
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST')).toHaveLength(2);
  });

  it('« Annuler » revient sans rien envoyer', async () => {
    const fetchMock = serveur([{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' }]);
    render(<EnvoiConditionsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer l’e-mail…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('button', { name: 'Envoyer l’e-mail…' })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('aucun dossier éligible : pas de bouton d’envoi', async () => {
    serveur([]);
    render(<EnvoiConditionsPanel />);
    expect(await screen.findByText('Aucun patient suivi n’attend l’e-mail des conditions d’utilisation.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Envoyer l’e-mail…' })).toBeNull();
  });

  it('envoi fermé : ni liste ni bouton', async () => {
    serveur([], false);
    render(<EnvoiConditionsPanel />);
    expect(await screen.findByText(/n’est pas ouvert/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Envoyer l’e-mail…' })).toBeNull();
  });
});
