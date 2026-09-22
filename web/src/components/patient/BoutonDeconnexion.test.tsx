// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BoutonDeconnexion } from './BoutonDeconnexion';

afterEach(cleanup);

// CE BANC GARDE UNE PROMESSE, PAS UN APPEL. Le bouton dit « Se déconnecter » ;
// ce qu'il ne doit JAMAIS faire, c'est conduire le patient à le croire quand
// c'est faux. La première version partait vers la page de connexion sans
// regarder la réponse du serveur : sur une erreur, le patient lisait
// « déconnecté » en gardant son cookie, et cessait d'essayer — sur l'appareil
// partagé que ce bouton existe pour protéger. Relevé par la revue Copilot de la
// PR #1211.
describe('BoutonDeconnexion', () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', { value: { assign }, writable: true });
  });

  it('succès serveur : appelle la route puis renvoie vers la connexion', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/deconnexion', { method: 'POST' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('échec serveur : NE redirige PAS, et dit que la session est toujours ouverte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/toujours connecté/i);
    expect(assign).not.toHaveBeenCalled();
    // Le bouton redevient actionnable : réessayer est la suite offerte.
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeTruthy();
  });

  it('réseau coupé : même refus de mentir', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});
