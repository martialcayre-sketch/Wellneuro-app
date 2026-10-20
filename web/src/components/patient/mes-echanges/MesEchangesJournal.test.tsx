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
import { BLOCS_MES_ECHANGES, BLOCS_MES_ECHANGES_DEPOT_OUVERT } from './textesMesEchanges';
import { TEXTE_LECTURE_DATEE, TITRE_LECTURE_DATEE } from '@/lib/portail/lectureDatee';

// « Mes échanges » ([[D-293]]) : l'encart d'urgence est là quoi qu'il arrive,
// chaque ligne ouvre la page de l'élément, et le bloc « Votre lecture est
// datée » est celui de [[D-297]] §4, qui remplace la phrase de [[D-293]] §4.

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

  it('une remise antérieure à l’ouverture de sa page le dit sous la ligne (t14)', async () => {
    repondre(200, {
      ok: true,
      ouvert: true,
      entrees: [
        {
          cle: 'fiche_assiette:rem_1',
          sens: 'remis',
          espece: 'fiche_assiette',
          objet: 'Votre fiche — Petit-déjeuner',
          date: '2026-09-20T08:00:00.000Z',
          chemin: 'fiches/rem_1',
          afficheDepuis: '2026-10-02',
        },
      ],
    });
    render(<MesEchangesJournal token="TOK" />);
    await screen.findByText('Affiché à partir du 2 octobre 2026');
    expect(screen.getByText('20 septembre 2026')).toBeTruthy();
  });

  it('les blocs validés sont servis, dont celui de D-297 §4 et non l’ancienne phrase de D-293 §4', async () => {
    repondre(200, { ok: true, ouvert: true, entrees: [] });
    render(<MesEchangesJournal token="TOK" />);
    await screen.findByText('Aucun élément pour le moment.');
    expect(BLOCS_MES_ECHANGES).toHaveLength(6);
    for (const bloc of BLOCS_MES_ECHANGES) {
      expect(screen.getByText(bloc.texte)).toBeTruthy();
    }
    expect(BLOCS_MES_ECHANGES[2]).toEqual({ titre: TITRE_LECTURE_DATEE, texte: TEXTE_LECTURE_DATEE });
    // L'ancienne phrase ne datait que l'ouverture depuis « Mes échanges ».
    expect(document.body.textContent).not.toMatch(/depuis « Mes échanges », la date de votre lecture/);
  });

  it('dépôt fermé (défaut) : « Ce que vous trouvez ici » ne nomme pas les documents déposés', async () => {
    repondre(200, { ok: true, ouvert: true, entrees: [] });
    render(<MesEchangesJournal token="TOK" />);
    await screen.findByText('Aucun élément pour le moment.');
    expect(screen.getByText(BLOCS_MES_ECHANGES[0].texte)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/documents que vous avez déposés/);
  });

  it('dépôt ouvert : le bloc validé le 2026-10-20 nomme les documents déposés, les cinq autres sont inchangés', async () => {
    repondre(200, { ok: true, ouvert: true, entrees: [] });
    render(<MesEchangesJournal token="TOK" depotOuvert />);
    await screen.findByText('Aucun élément pour le moment.');
    expect(BLOCS_MES_ECHANGES_DEPOT_OUVERT[0].texte).toBe(
      'La liste datée de ce que votre praticien vous a remis — votre bilan et sa note, vos fiches, le courrier pour votre médecin, votre protocole — et de ce que vous lui avez transmis — vos questionnaires, vos comptes rendus d’analyses, les documents que vous avez déposés, vos signalements, avec leur statut. Chaque ligne ouvre la page de votre espace qui le concerne.',
    );
    expect(BLOCS_MES_ECHANGES_DEPOT_OUVERT.slice(1)).toEqual(BLOCS_MES_ECHANGES.slice(1));
    for (const bloc of BLOCS_MES_ECHANGES_DEPOT_OUVERT) {
      expect(screen.getByText(bloc.texte)).toBeTruthy();
    }
    expect(screen.queryByText(BLOCS_MES_ECHANGES[0].texte)).toBeNull();
  });

  it('session expirée : retour au portail', async () => {
    repondre(401, { ok: false, reason: 'unauthenticated', error: 'x' });
    render(<MesEchangesJournal token="TOK" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK'));
  });
});
