// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

// Un routeur STABLE, comme celui de Next : un objet neuf à chaque rendu
// relancerait l'effet de chargement sans fin.
const { replace, routeur } = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, routeur: { replace } };
});
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { MesEchangesJournal } from './MesEchangesJournal';
import { BLOCS_MES_ECHANGES } from './textesMesEchanges';

// « Mes échanges » ([[D-293]]) : l'encart d'urgence est là quoi qu'il arrive,
// chaque ligne ouvre la page de l'élément, et rien ne parle encore de lecture
// datée (elle vient avec ai, [[D-297]]).

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corps), { status })));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  replace.mockReset();
});

const PHRASE_ENCART =
  'Ce que vous transmettez est transmis à votre praticien, mais il ne le lit pas en temps réel : n’attendez pas sa réponse.';

describe('MesEchangesJournal', () => {
  it('l’encart d’urgence de « Mes échanges » est rendu dès le chargement', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    render(<MesEchangesJournal token="TOK" />);
    expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).toBeTruthy();
    expect(screen.getByText(PHRASE_ENCART)).toBeTruthy();
  });

  it('l’encart reste quand la route échoue', async () => {
    repondre(500, { ok: false, reason: 'exception', error: 'Lecture impossible pour le moment.' });
    render(<MesEchangesJournal token="TOK" />);
    await waitFor(() => expect(screen.getByText('Lecture impossible pour le moment.')).toBeTruthy());
    expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).toBeTruthy();
  });

  it('chaque ligne dit qui a agi et ouvre la page de l’élément', async () => {
    repondre(200, {
      ok: true,
      ouvert: true,
      entrees: [
        {
          cle: 'questionnaire:ASS_1',
          sens: 'transmis',
          espece: 'questionnaire',
          objet: 'Questionnaire « Enquête alimentaire »',
          date: '2026-10-12T09:00:00.000Z',
          chemin: 'questionnaires/ASS_1',
        },
        {
          cle: 'bilan:env_1',
          sens: 'remis',
          espece: 'bilan',
          objet: 'Votre bilan',
          date: '2026-10-12T08:00:00.000Z',
          chemin: 'bilan',
        },
      ],
    });
    render(<MesEchangesJournal token="TOK" />);
    const bilan = await screen.findByRole('link', { name: /Remis · Votre bilan/ });
    expect(bilan.getAttribute('href')).toBe('/portail/TOK/bilan');
    expect(
      screen.getByRole('link', { name: /Transmis · Questionnaire « Enquête alimentaire »/ }).getAttribute('href'),
    ).toBe('/portail/TOK/questionnaires/ASS_1');
    expect(screen.getByText('12 octobre 2026')).toBeTruthy();
  });

  it('les cinq blocs validés sont servis, et pas encore celui de la lecture datée', async () => {
    repondre(200, { ok: true, ouvert: true, entrees: [] });
    render(<MesEchangesJournal token="TOK" />);
    await screen.findByText('Aucun élément pour le moment.');
    for (const bloc of BLOCS_MES_ECHANGES) {
      expect(screen.getByText(bloc.texte)).toBeTruthy();
    }
    expect(document.body.textContent).not.toMatch(/lecture est datée|date de votre lecture/i);
  });

  it('session expirée : retour au portail', async () => {
    repondre(401, { ok: false, reason: 'unauthenticated', error: 'x' });
    render(<MesEchangesJournal token="TOK" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK'));
  });
});
