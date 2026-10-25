// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'écran « Courrier à remettre à votre médecin » ([[D-345]], J3-12h lot 4).
// Seuls `fetch`, le routeur et la trace de lecture sont simulés. Données
// synthétiques.

const { router, consigner } = vi.hoisted(() => ({ router: { replace: vi.fn() }, consigner: vi.fn(() => null) }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/patient/ConsignerLecturePortail', () => ({ ConsignerLecturePortail: consigner }));

import { CourrierComplementLecture } from './CourrierComplementLecture';
import {
  AUCUN_COURRIER_COMPLEMENT,
  MENTION_INDISPONIBLE_COMPLEMENT,
  PHRASE_COURRIER_COMPLEMENT,
  TITRE_COURRIER_COMPLEMENT,
} from './textesCourrierComplement';
import { TITRE_LECTURE_DATEE } from '@/lib/portail/lectureDatee';

const tracesPosees = () => consigner.mock.calls.map(appel => (appel as unknown[])[0]);
const SERVI = {
  idRemise: 'ccr_1',
  remiseLe: '2026-10-25T08:00:00.000Z',
  etat: 'servie',
  texte: 'Docteur,\n<b>pas du HTML</b>',
  destinataire: '<i>Médecin traitant</i>',
};
const INDISPONIBLE = { ...SERVI, etat: 'indisponible', texte: null, destinataire: null };

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, ok: status < 400, json: async () => corps })));
}

async function afficher() {
  render(<CourrierComplementLecture token="TOK" />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Courrier à remettre à votre médecin (D-345, J3-12h lot 4)', () => {
  it('servi : la phrase arbitrée, le destinataire et le texte comme TEXTE (jamais HTML), et la lecture consignée', async () => {
    repondre(200, { ok: true, courrier: SERVI });
    await afficher();
    expect(screen.getByRole('heading', { name: TITRE_COURRIER_COMPLEMENT })).toBeTruthy();
    expect(screen.getByText(PHRASE_COURRIER_COMPLEMENT)).toBeTruthy();
    expect(screen.getByText('À remettre à : <i>Médecin traitant</i>')).toBeTruthy();
    expect(screen.getByLabelText('Texte du courrier').textContent).toContain('<b>pas du HTML</b>');
    expect(screen.getByRole('link', { name: 'Ouvrir la version à imprimer' }).getAttribute('href'))
      .toBe('/api/portail/courrier-complement/impression');
    expect(tracesPosees()).toEqual([{ espece: 'courrier_complement', idObjet: 'ccr_1' }]);
  });

  it('indisponible : la mention, ni texte, ni phrase, ni destinataire, ni lecture consignée', async () => {
    repondre(200, { ok: true, courrier: INDISPONIBLE });
    await afficher();
    expect(screen.getByText(MENTION_INDISPONIBLE_COMPLEMENT)).toBeTruthy();
    expect(screen.queryByText(PHRASE_COURRIER_COMPLEMENT)).toBeNull();
    expect(screen.queryByText(/À remettre à/)).toBeNull();
    expect(screen.queryByLabelText('Texte du courrier')).toBeNull();
    expect(tracesPosees()).toEqual([]);
  });

  it('à l’impression, seul le courrier reste : en-tête, phrase et boutons sont masqués', async () => {
    repondre(200, { ok: true, courrier: SERVI });
    await afficher();
    expect(screen.getByText(PHRASE_COURRIER_COMPLEMENT).closest('header')?.className).toContain('print:hidden');
    expect(screen.getByRole('link', { name: 'Ouvrir la version à imprimer' }).closest('div.print\\:hidden')).toBeTruthy();
    expect(screen.getByLabelText('Texte du courrier').closest('.print\\:hidden')).toBeNull();
  });

  it('« Votre lecture est datée » en tête, AVANT le courrier, seulement quand la lecture se consigne (D-297 §4)', async () => {
    repondre(200, { ok: true, courrier: SERVI });
    await afficher();
    const avis = screen.getByRole('region', { name: TITRE_LECTURE_DATEE });
    const titre = screen.getByRole('heading', { name: TITRE_COURRIER_COMPLEMENT });
    expect(avis.compareDocumentPosition(titre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(avis.className).toContain('print:hidden');
    cleanup();

    repondre(200, { ok: true, courrier: INDISPONIBLE });
    await afficher();
    expect(screen.queryByRole('region', { name: TITRE_LECTURE_DATEE })).toBeNull();
  });

  it('aucun courrier remis : le dit, sans rien consigner', async () => {
    repondre(200, { ok: true, courrier: null });
    await afficher();
    expect(screen.getByText(AUCUN_COURRIER_COMPLEMENT)).toBeTruthy();
    expect(tracesPosees()).toEqual([]);
  });

  it('session expirée : retour au portail', async () => {
    repondre(401, { ok: false, reason: 'unauthenticated', error: 'Session expirée.' });
    await afficher();
    expect(router.replace).toHaveBeenCalledWith('/portail/TOK');
  });

  it('espace fermé : le message, sans bouton qui ne mènerait nulle part', async () => {
    repondre(503, { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' });
    await afficher();
    expect(screen.getByText('Cet espace n’est pas encore ouvert.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /réessayer/i })).toBeNull();
  });
});
