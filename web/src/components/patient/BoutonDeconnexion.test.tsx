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

const assign = vi.fn();
const reponse = (status: number) => new Response('{}', { status });

function preparer() {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  Object.defineProperty(window, 'location', { value: { assign }, writable: true });
}

/** Un brouillon de questionnaire tel que `questionnaire-draft` l'écrit. */
function poserBrouillon(idAssignation = 'ASSIGN_1') {
  window.localStorage.setItem(
    `wellneuro:questionnaire-draft:v1:${idAssignation}`,
    JSON.stringify({ version: 1, answers: { q1: 'oui' }, currentPage: 0 }),
  );
  window.localStorage.setItem(
    `wellneuro:questionnaire-draft-meta:v1:${idAssignation}`,
    new Date().toISOString(),
  );
}

const clic = (nom: string) => fireEvent.click(screen.getByRole('button', { name: nom }));

// CE BANC GARDE UNE PROMESSE, PAS UN APPEL. Le bouton dit « Se déconnecter » ;
// ce qu'il ne doit JAMAIS faire, c'est conduire le patient à le croire quand
// c'est faux. Une première version partait vers la page de connexion sans
// regarder la réponse du serveur : sur une erreur, le patient lisait
// « déconnecté » en gardant son cookie, et cessait d'essayer — sur l'appareil
// partagé que ce bouton existe pour protéger (revue Copilot, PR #1211).
describe('BoutonDeconnexion', () => {
  beforeEach(preparer);

  // Ce bloc tourne SANS rien à perdre : le bouton part donc directement, sans
  // poser de question. Le chemin avec avertissement a son propre bloc.
  it('succès serveur : appelle la route puis renvoie vers la connexion', async () => {
    const fetchMock = vi.fn(async () => reponse(200));
    vi.stubGlobal('fetch', fetchMock);

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/deconnexion', { method: 'POST' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('échec serveur : NE redirige PAS, et dit que la session est toujours ouverte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse(500)));

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/toujours connecté/i);
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeTruthy();
  });

  // L'ALERTE NE DOIT PAS SURVIVRE AU RÉESSAI QUI RÉUSSIT. Rien ne gardait le
  // `setEchec(false)` d'entrée de geste : le retirer laissait tout vert, et le
  // patient aurait lu « vous êtes toujours connecté » sur l'écran qu'il quitte,
  // déconnecté. Relevé par la revue du delta (PR #1211).
  it('échec puis réessai réussi : l’alerte disparaît et la redirection a lieu', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(reponse(500))
      .mockResolvedValueOnce(reponse(200)));

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');
    expect(await screen.findByRole('alert')).toBeTruthy();

    clic('Se déconnecter');
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('réseau coupé : même refus de mentir', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});

// LA SECONDE MOITIÉ DE LA PROMESSE. Le bouton protège l'appareil partagé ; le
// portail laisse derrière lui des réponses de SANTÉ — brouillons de
// questionnaire (`localStorage`, 30 jours), fiche/anamnèse et agenda
// alimentaire (`sessionStorage`, qui survit à la redirection dans le même
// onglet). Les laisser vidait le geste de la moitié de son sens ; les effacer
// sans prévenir détruit du travail que personne d'autre ne détient.
describe('BoutonDeconnexion — ce qui reste sur l’appareil', () => {
  beforeEach(preparer);

  it('rien à perdre : aucune question posée', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse(200)));

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // LES TROIS ÉTATS QUI OUVRAIENT LE DIALOGUE SUR DU VIDE. Relevés par la revue
  // de la PR #1212 : une métadonnée orpheline, un brouillon sans réponses, et
  // un brouillon périmé que l'application ne restituera JAMAIS — alors que le
  // texte promettait de pouvoir le ressaisir. Une clé morte rendait
  // l'avertissement systématique pendant 30 jours, ce qui détruit sa raison
  // d'être : un dialogue qu'on voit toujours ne se lit plus.
  it.each([
    ['métadonnée orpheline', () => {
      window.localStorage.setItem('wellneuro:questionnaire-draft-meta:v1:ASSIGN_1', new Date().toISOString());
    }],
    ['brouillon sans réponses', () => {
      window.localStorage.setItem(
        'wellneuro:questionnaire-draft:v1:ASSIGN_1',
        JSON.stringify({ version: 1, answers: {}, currentPage: 0 }),
      );
    }],
    ['brouillon périmé (> 30 j)', () => {
      poserBrouillon();
      window.localStorage.setItem(
        'wellneuro:questionnaire-draft-meta:v1:ASSIGN_1',
        new Date(Date.now() - 31 * 24 * 3600_000).toISOString(),
      );
    }],
  ])('%s : pas de dialogue, on part directement', async (_nom, semer) => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse(200)));
    semer();

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('travail en cours : avertit AVANT d’effacer, et n’a encore rien fait', async () => {
    const fetchMock = vi.fn(async () => reponse(200));
    vi.stubGlobal('fetch', fetchMock);
    poserBrouillon();

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');

    const dialogue = await screen.findByRole('dialog');
    expect(dialogue.textContent).toMatch(/ne sont pas encore envoyées/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('wellneuro:questionnaire-draft:v1:ASSIGN_1')).not.toBeNull();
  });

  it('annuler : le travail survit et la session reste ouverte', async () => {
    const fetchMock = vi.fn(async () => reponse(200));
    vi.stubGlobal('fetch', fetchMock);
    poserBrouillon();

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');
    await screen.findByRole('dialog');
    clic('Annuler');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('wellneuro:questionnaire-draft:v1:ASSIGN_1')).not.toBeNull();
  });

  // LES DEUX STOCKAGES, ET LA FRONTIÈRE. `sessionStorage` est la moitié que la
  // première version avait manquée — elle survit à `location.assign` dans le
  // même onglet, donc au scénario familial exact.
  it('confirmer : purge localStorage ET sessionStorage, sans toucher au confort de lecture', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse(200)));
    poserBrouillon('ASSIGN_1');
    poserBrouillon('ASSIGN_2');
    window.localStorage.setItem('wellneuro:draft:VIEUX', JSON.stringify({ q: 'a' }));
    window.localStorage.setItem('wellneuro:draft-meta:VIEUX', new Date().toISOString());
    window.sessionStorage.setItem('wellneuro:wizard-draft:anamnese:PAT_1', JSON.stringify({ valeurs: { a: 1 } }));
    window.sessionStorage.setItem('wellneuro:wizard-draft-meta:anamnese:PAT_1', new Date().toISOString());
    window.sessionStorage.setItem('wellneuro:ja5-02:patient:PAT_1', JSON.stringify({ traces: [1] }));
    // Réglage d'APPAREIL — la vraie clé, celle qu'écrit `ReadingComfortControl`.
    window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: true }));

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');
    await screen.findByRole('dialog');
    clic('Se déconnecter et effacer');

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/portail/connexion'));
    for (const cle of [
      'wellneuro:questionnaire-draft:v1:ASSIGN_1',
      'wellneuro:questionnaire-draft:v1:ASSIGN_2',
      'wellneuro:questionnaire-draft-meta:v1:ASSIGN_1',
      'wellneuro:draft:VIEUX',
      'wellneuro:draft-meta:VIEUX',
    ]) {
      expect(window.localStorage.getItem(cle), `non purgé : ${cle}`).toBeNull();
    }
    for (const cle of [
      'wellneuro:wizard-draft:anamnese:PAT_1',
      'wellneuro:wizard-draft-meta:anamnese:PAT_1',
      'wellneuro:ja5-02:patient:PAT_1',
    ]) {
      expect(window.sessionStorage.getItem(cle), `non purgé : ${cle}`).toBeNull();
    }
    expect(window.localStorage.getItem('wellneuro:portail:confort')).not.toBeNull();
  });

  // L'ORDRE EST LA PROTECTION. Purger avant d'avoir la confirmation du serveur
  // ferait perdre le travail de qui RESTE connecté parce que la déconnexion a
  // échoué : des réponses détruites, et l'appareil toujours ouvert.
  it('échec serveur après confirmation : rien n’est effacé', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse(500)));
    poserBrouillon();
    window.sessionStorage.setItem('wellneuro:ja5-02:patient:PAT_1', JSON.stringify({ traces: [1] }));

    render(<BoutonDeconnexion />);
    clic('Se déconnecter');
    await screen.findByRole('dialog');
    clic('Se déconnecter et effacer');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('wellneuro:questionnaire-draft:v1:ASSIGN_1')).not.toBeNull();
    expect(window.sessionStorage.getItem('wellneuro:ja5-02:patient:PAT_1')).not.toBeNull();
  });
});
