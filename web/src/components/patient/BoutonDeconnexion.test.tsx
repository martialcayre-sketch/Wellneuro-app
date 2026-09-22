// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BoutonDeconnexion } from './BoutonDeconnexion';

afterEach(() => {
  cleanup();
  // Hygiène : vitest isole par fichier, donc rien ne fuit aujourd'hui — mais un
  // `fetch` bouchonné qui survit à son banc est un faux vert en puissance.
  vi.unstubAllGlobals();
});

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
    window.localStorage.clear();
    Object.defineProperty(window, 'location', { value: { assign }, writable: true });
  });

  // Ce bloc tourne SANS brouillon (`localStorage` vidé) : le bouton part donc
  // directement, sans poser de question. Le chemin avec avertissement a son
  // propre bloc plus bas.
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

  // L'ALERTE NE DOIT PAS SURVIVRE AU RÉESSAI QUI RÉUSSIT. Rien ne gardait le
  // `setEchec(false)` d'entrée de geste : le retirer laissait les trois bancs
  // verts, et le patient aurait lu « vous êtes toujours connecté » sur l'écran
  // qu'il quitte, déconnecté. Relevé par la revue du delta (PR #1211).
  it('échec puis réessai réussi : l’alerte disparaît et la redirection a lieu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(await screen.findByRole('alert')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('réseau coupé : même refus de mentir', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});

// LA SECONDE MOITIÉ DE LA PROMESSE. Le bouton protège l'appareil partagé ; les
// brouillons de questionnaire sont des réponses de SANTÉ gardées 30 jours en
// `localStorage`. Les laisser derrière vidait le geste de la moitié de son sens
// — mais les effacer sans prévenir détruit du travail que personne d'autre ne
// détient. D'où : on avertit, et seulement quand il y a quelque chose à perdre.
describe('BoutonDeconnexion — brouillons locaux', () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window, 'location', { value: { assign }, writable: true });
  });

  function poserBrouillon(idAssignation = 'ASSIGN_1') {
    window.localStorage.setItem(
      `wellneuro:questionnaire-draft:v1:${idAssignation}`,
      JSON.stringify({ version: 1, answers: { q1: 'oui' }, currentPage: 0 }),
    );
  }

  it('sans brouillon : aucune question posée, on part directement', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('avec brouillon : avertit AVANT d’effacer, et n’a encore rien fait', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    poserBrouillon();

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    const dialogue = await screen.findByRole('alertdialog');
    // L'avertissement dit ce qui sera perdu, pas « êtes-vous sûr ? ».
    expect(dialogue.textContent).toMatch(/ne sont pas encore envoyées/i);
    // RIEN n'a bougé : ni la session, ni le brouillon.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('wellneuro:questionnaire-draft:v1:ASSIGN_1')).not.toBeNull();
  });

  it('annuler : le brouillon survit et la session reste ouverte', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    poserBrouillon();

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('wellneuro:questionnaire-draft:v1:ASSIGN_1')).not.toBeNull();
  });

  it('confirmer : purge TOUS les brouillons, y compris les clés héritées', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    poserBrouillon('ASSIGN_1');
    poserBrouillon('ASSIGN_2');
    window.localStorage.setItem('wellneuro:draft:VIEUX', '{"q":"a"}');
    window.localStorage.setItem('wellneuro:draft-meta:VIEUX', '2026-01-01');
    // Réglage d'appareil, PAS une donnée de santé : il doit survivre.
    window.localStorage.setItem('wellneuro:comfort', '{"texteAgrandi":true}');

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter et effacer' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    for (const cle of [
      'wellneuro:questionnaire-draft:v1:ASSIGN_1',
      'wellneuro:questionnaire-draft:v1:ASSIGN_2',
      'wellneuro:draft:VIEUX',
      'wellneuro:draft-meta:VIEUX',
    ]) {
      expect(window.localStorage.getItem(cle)).toBeNull();
    }
    expect(window.localStorage.getItem('wellneuro:comfort')).not.toBeNull();
  });

  // L'ORDRE EST LA PROTECTION. Purger avant d'avoir la confirmation du serveur
  // ferait perdre les brouillons à qui RESTE connecté parce que la déconnexion
  // a échoué : du travail détruit, et l'appareil toujours ouvert.
  it('échec serveur après confirmation : le brouillon N’EST PAS effacé', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    poserBrouillon();

    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter et effacer' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('wellneuro:questionnaire-draft:v1:ASSIGN_1')).not.toBeNull();
  });
});
