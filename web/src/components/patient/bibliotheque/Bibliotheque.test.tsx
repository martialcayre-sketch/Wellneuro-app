// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// « Ma bibliothèque » ([[D-357]]) : le contenant seul. Seuls `fetch` et le
// routeur sont simulés. Données synthétiques seulement.

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { Bibliotheque } from './Bibliotheque';
import { TITRE_BIBLIOTHEQUE, TITRE_RAYON_REMIS, TITRE_RAYON_SOCLE } from './textesBibliotheque';

const SERVIE = {
  idRemise: 'rem_servie',
  libelle: 'Assiette A',
  numero: 2,
  remiseLe: '2026-09-28T10:00:00.000Z',
  etat: 'servie',
  protocole: 'actuel',
  contenu: { titre: 'Titre synthétique', precautions: [], sections: [] },
};

type Reponse = { status: number; corps: unknown };

/** Une réponse par route : la bibliothèque, puis les fiches. */
function repondre(bibliotheque: Reponse, fiches: Reponse = { status: 200, corps: { ok: true, fiches: [SERVIE] } }) {
  const fetchMock = vi.fn(async (url: string) => {
    const r = url.startsWith('/api/portail/bibliotheque') ? bibliotheque : fiches;
    return { status: r.status, ok: r.status < 400, json: async () => r.corps };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function laisserCharger() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  router.replace.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Bibliotheque', () => {
  it('une fiche remise : le titre, le rayon « Remis par mon praticien » et la carte, vers la page de la fiche', async () => {
    repondre({ status: 200, corps: { ok: true, ouvert: true, fichesRemises: true } });
    render(<Bibliotheque token="TOK" />);
    await laisserCharger();
    expect(screen.getByRole('heading', { level: 1, name: TITRE_BIBLIOTHEQUE })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: TITRE_RAYON_REMIS })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Titre synthétique' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Lire la fiche' }).getAttribute('href')).toBe('/portail/TOK/fiches/rem_servie');
  });

  it('le socle commun, vide, ne se rend jamais (D-357 §2)', async () => {
    repondre({ status: 200, corps: { ok: true, ouvert: true, fichesRemises: true } });
    render(<Bibliotheque token="TOK" />);
    await laisserCharger();
    expect(screen.queryByText(TITRE_RAYON_SOCLE)).toBeNull();
  });

  it('aucune fiche remise : aucun rayon, et la route des fiches n’est pas lue', async () => {
    const fetchMock = repondre({ status: 200, corps: { ok: true, ouvert: true, fichesRemises: false } });
    render(<Bibliotheque token="TOK" />);
    await laisserCharger();
    expect(screen.queryByText(TITRE_RAYON_REMIS)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dossier mineur (409) : le message de la route, sans bouton pour réessayer, aucun rayon', async () => {
    repondre({ status: 409, corps: { ok: false, reason: 'hors_majeur', error: 'Cette page n’est pas disponible pour votre dossier.' } });
    render(<Bibliotheque token="TOK" />);
    await laisserCharger();
    expect(screen.getByText('Cette page n’est pas disponible pour votre dossier.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(TITRE_RAYON_REMIS)).toBeNull();
  });

  it('sans session (401) : retour au portail', async () => {
    repondre({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: 'x' } });
    render(<Bibliotheque token="TOK" />);
    await laisserCharger();
    expect(router.replace).toHaveBeenCalledWith('/portail/TOK');
  });

  it('les fiches répondent vides malgré l’annonce : le rayon ne se rend pas', async () => {
    repondre({ status: 200, corps: { ok: true, ouvert: true, fichesRemises: true } }, { status: 200, corps: { ok: true, fiches: [] } });
    render(<Bibliotheque token="TOK" />);
    await laisserCharger();
    expect(screen.queryByText(TITRE_RAYON_REMIS)).toBeNull();
  });
});
