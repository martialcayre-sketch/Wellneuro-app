// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EnvoiConditionsPanel } from './EnvoiConditionsPanel';

// [[D-292]] §3 — la liste, l'aperçu, puis l'envoi confirmé en une fois : rien
// ne part avant le second clic ; l'envoi se découpe en lots que la route
// accepte, et la liste se relit après.

const APERCU = { sujet: 'Wellneuro — les conditions d’utilisation de votre espace', corps: 'Bonjour,\n\n…' };

type Eligible = { idPatient: string; prenom: string; nom: string };

function serveur(
  eligibles: Eligible[],
  { ouvert = true, parEnvoi = 10, tronque = false, postKo = false } = {},
) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const lot = (JSON.parse(String(init.body)) as { idsPatient: string[] }).idsPatient;
      if (postKo) return { ok: false, status: 504, json: async () => { throw new Error('html'); } } as unknown as Response;
      return { ok: true, status: 200, json: async () => ({ ok: true, envoyes: lot.length, echoues: 0, ignores: 0 }) } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, ouvert, eligibles, tronque, parEnvoi, apercu: APERCU }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const posts = (fetchMock: ReturnType<typeof serveur>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([, init]) => (JSON.parse(String(init?.body)) as { idsPatient: string[] }).idsPatient);

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
    expect(posts(fetchMock)).toEqual([['PAT_1', 'PAT_2']]);
    // La liste se relit après l'envoi.
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST')).toHaveLength(2);
  });

  it('un geste, plusieurs lots : chaque appel reste sous la taille que la route accepte', async () => {
    const eligibles = ['PAT_1', 'PAT_2', 'PAT_3', 'PAT_4', 'PAT_5'].map(idPatient => ({
      idPatient,
      prenom: 'Sophie',
      nom: idPatient,
    }));
    const fetchMock = serveur(eligibles, { parEnvoi: 2 });
    render(<EnvoiConditionsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer l’e-mail…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('5 envoyés.'));
    expect(posts(fetchMock)).toEqual([['PAT_1', 'PAT_2'], ['PAT_3', 'PAT_4'], ['PAT_5']]);
  });

  it('un lot en échec arrête l’envoi et dit que des e-mails ont pu partir, sans inviter à recommencer', async () => {
    serveur([{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' }], { postKo: true });
    render(<EnvoiConditionsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer l’e-mail…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('Des e-mails ont pu partir');
  });

  it('« Annuler » revient sans rien envoyer', async () => {
    const fetchMock = serveur([{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' }]);
    render(<EnvoiConditionsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer l’e-mail…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('button', { name: 'Envoyer l’e-mail…' })).toBeTruthy();
    expect(posts(fetchMock)).toEqual([]);
  });

  it('liste tronquée : le panneau le dit', async () => {
    serveur([{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' }], { tronque: true });
    render(<EnvoiConditionsPanel />);
    expect(await screen.findByText(/Liste limitée/)).toBeTruthy();
  });

  it('aucun dossier éligible : pas de bouton d’envoi', async () => {
    serveur([]);
    render(<EnvoiConditionsPanel />);
    expect(await screen.findByText('Aucun patient suivi n’attend l’e-mail des conditions d’utilisation.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Envoyer l’e-mail…' })).toBeNull();
  });

  it('envoi fermé : ni liste ni bouton', async () => {
    serveur([], { ouvert: false });
    render(<EnvoiConditionsPanel />);
    expect(await screen.findByText(/n’est pas ouvert/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Envoyer l’e-mail…' })).toBeNull();
  });
});
