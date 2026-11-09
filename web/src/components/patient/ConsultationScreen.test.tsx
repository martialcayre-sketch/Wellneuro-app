// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ConsultationScreen } from './ConsultationScreen';

// Le chargement initial de l'écran : une réponse verrouillée, lisible. Toutes
// les tentatives ci-dessous portent sur le SECOND appel, celui du geste
// « Demander une correction ».
const CHARGEMENT_OK = {
  ok: true,
  titre: 'Questionnaire de sommeil',
  dateReponse: '2026-09-01T09:00:00.000Z',
};

function monter(secondAppel: () => Promise<unknown>) {
  let rang = 0;
  const fetchMock = vi.fn().mockImplementation(() => {
    rang += 1;
    if (rang === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve(CHARGEMENT_OK) });
    return secondAppel();
  });
  vi.stubGlobal('fetch', fetchMock);
  render(
    <ConsultationScreen
      idAssignation="ASS_TEST"
      statutReponses="repondu"
      onVoirEquilibre={vi.fn()}
    />,
  );
  return fetchMock;
}

describe('ConsultationScreen — « Demander une correction »', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // Le geste ne traitait QUE `data.ok`. Un refus rendu par la route laissait
  // l'écran strictement inchangé : ni confirmation, ni message, le bouton
  // simplement rendu à son état de repos. Le patient recliquait.
  it('affiche le motif du refus rendu par la route', async () => {
    monter(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: false, reason: 'invalid_state', error: 'Demande non applicable dans l’état actuel.' }),
    }));

    await screen.findByText(/verrouillées en lecture seule/);
    fireEvent.click(screen.getByRole('button', { name: 'Demander une correction' }));

    await waitFor(() => expect(screen.getByText('Demande non applicable dans l’état actuel.')).not.toBeNull());
    // Et surtout : le refus n'est pas présenté comme un succès.
    expect(screen.queryByText(/a été transmise à votre praticien/)).toBeNull();
  });

  // Dette t07 : la session portail authentifie seule, aucune adresse ne doit
  // plus transiter — ni dans l'URL du chargement, ni dans le corps du geste.
  it('n’envoie aucune adresse, ni dans l’URL ni dans le corps', async () => {
    const fetchMock = monter(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
    await screen.findByText(/verrouillées en lecture seule/);
    fireEvent.click(screen.getByRole('button', { name: 'Demander une correction' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('email');
    expect(String(fetchMock.mock.calls[1][1]?.body)).not.toContain('email');
  });

  it('affiche un message quand l’appel lui-même échoue', async () => {
    monter(() => Promise.reject(new Error('offline')));

    await screen.findByText(/verrouillées en lecture seule/);
    fireEvent.click(screen.getByRole('button', { name: 'Demander une correction' }));

    await waitFor(() => expect(screen.getByText('Erreur réseau. Réessayez.')).not.toBeNull());
    expect(screen.queryByText(/a été transmise à votre praticien/)).toBeNull();
  });

  // Garde de non-régression du chemin nominal : la branche d'erreur neuve ne
  // doit pas se déclencher sur un succès, et le bouton disparaît au profit de
  // l'accusé de transmission.
  it('confirme la transmission quand la route accepte', async () => {
    monter(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));

    await screen.findByText(/verrouillées en lecture seule/);
    fireEvent.click(screen.getByRole('button', { name: 'Demander une correction' }));

    await waitFor(() => expect(screen.getByText(/a été transmise à votre praticien/)).not.toBeNull());
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).toBeNull();
  });

  // Le bouton disparaît au profit de l'accusé : sans région déjà présente ni
  // transfert, le focus retombe sur `body` et un lecteur d'écran n'entend rien.
  it('la transmission s’annonce dans une région déjà présente, et le focus s’y pose', async () => {
    monter(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));

    await screen.findByText(/verrouillées en lecture seule/);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Demander une correction' }));

    await waitFor(() => expect(region.textContent).toMatch(/a été transmise à votre praticien/));
    expect(screen.getByRole('status')).toBe(region);
    expect(document.activeElement).toBe(region);
  });

  // L'écran peut s'ouvrir sur une demande transmise lors d'une visite d'avant :
  // l'accusé s'y lit, mais il ne répond à aucun geste et ne prend pas le focus.
  it('une demande déjà transmise au chargement : l’accusé est là, le focus ne bouge pas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(CHARGEMENT_OK) }));
    render(
      <ConsultationScreen
        idAssignation="ASS_TEST"
        statutReponses="modification_demandee"
        onVoirEquilibre={vi.fn()}
      />,
    );

    await screen.findByText(/verrouillées en lecture seule/);
    expect(screen.getByRole('status').textContent).toMatch(/a été transmise à votre praticien/);
    expect(document.activeElement).toBe(document.body);
  });

  // L'aperçu praticien ne porte aucun geste, donc aucun accusé.
  it('l’aperçu praticien n’a pas de région d’accusé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(CHARGEMENT_OK) }));
    render(
      <ConsultationScreen
        idAssignation="ASS_TEST"
        statutReponses="repondu"
        onVoirEquilibre={vi.fn()}
        readOnlyPreview
      />,
    );

    await screen.findByText(/verrouillées en lecture seule/);
    expect(screen.queryByRole('status')).toBeNull();
  });

  // `setError('')` à l'entrée : un échec de CHARGEMENT ne doit pas rester
  // affiché sous une demande qui, elle, a réussi — le message porte sur la
  // tentative en cours, pas sur celle d'avant.
  it('efface le message de chargement avant d’afficher le sort de la demande', async () => {
    let rang = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      rang += 1;
      if (rang === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: false, error: 'Réponses introuvables.' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    }));
    render(
      <ConsultationScreen
        idAssignation="ASS_TEST"
        statutReponses="repondu"
        onVoirEquilibre={vi.fn()}
      />,
    );

    await screen.findByText('Réponses introuvables.');
    fireEvent.click(screen.getByRole('button', { name: 'Demander une correction' }));

    await waitFor(() => expect(screen.getByText(/a été transmise à votre praticien/)).not.toBeNull());
    expect(screen.queryByText('Réponses introuvables.')).toBeNull();
  });
});
