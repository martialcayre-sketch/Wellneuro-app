// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'écran « Courrier pour votre médecin » ([[D-262]], LOT-03a). Seuls `fetch`,
// le routeur et la trace de lecture sont simulés. Données synthétiques.

const { router, consigner } = vi.hoisted(() => ({ router: { replace: vi.fn() }, consigner: vi.fn(() => null) }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/patient/ConsignerLecturePortail', () => ({ ConsignerLecturePortail: consigner }));

import { CourrierMedecinLecture } from './CourrierMedecinLecture';
import { AUCUN_COURRIER, MENTION_INDISPONIBLE, MENTION_RETIREE, PHRASE_ACCOMPAGNEMENT, TITRE_LETTRE } from './textesLettre';

const tracesPosees = () => consigner.mock.calls.map(appel => (appel as unknown[])[0]);
const SERVIE = { idRemise: 'lar_1', remiseLe: '2026-10-04T08:00:00.000Z', etat: 'servie', texte: 'Docteur,\n<b>pas du HTML</b>' };

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, ok: status < 400, json: async () => corps })));
}

async function afficher() {
  render(<CourrierMedecinLecture token="TOK" />);
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

describe('Courrier pour votre médecin (D-262, LOT-03a)', () => {
  it('servi : la phrase signée, le texte comme TEXTE (jamais HTML), et la lecture consignée', async () => {
    repondre(200, { ok: true, lettre: SERVIE });
    await afficher();
    expect(screen.getByRole('heading', { name: TITRE_LETTRE })).toBeTruthy();
    expect(screen.getByText(PHRASE_ACCOMPAGNEMENT)).toBeTruthy();
    expect(screen.getByLabelText('Texte du courrier').textContent).toContain('<b>pas du HTML</b>');
    expect(screen.getByRole('button', { name: 'Imprimer ou enregistrer en PDF' })).toBeTruthy();
    expect(tracesPosees()).toEqual([{ espece: 'lettre_adressage', idObjet: 'lar_1' }]);
  });

  it('retiré : la mention, ni texte, ni phrase, ni lecture consignée', async () => {
    repondre(200, { ok: true, lettre: { ...SERVIE, etat: 'retiree', texte: null } });
    await afficher();
    expect(screen.getByText(MENTION_RETIREE)).toBeTruthy();
    expect(screen.queryByText(PHRASE_ACCOMPAGNEMENT)).toBeNull();
    expect(screen.queryByLabelText('Texte du courrier')).toBeNull();
    expect(tracesPosees()).toEqual([]);
  });

  it('indisponible : la mention, ni texte, ni lecture consignée', async () => {
    repondre(200, { ok: true, lettre: { ...SERVIE, etat: 'indisponible', texte: null } });
    await afficher();
    expect(screen.getByText(MENTION_INDISPONIBLE)).toBeTruthy();
    expect(screen.queryByLabelText('Texte du courrier')).toBeNull();
    expect(tracesPosees()).toEqual([]);
  });

  it('à l’impression, seule la lettre reste : en-tête, phrase et boutons sont masqués', async () => {
    repondre(200, { ok: true, lettre: SERVIE });
    await afficher();
    expect(screen.getByText(PHRASE_ACCOMPAGNEMENT).closest('header')?.className).toContain('print:hidden');
    expect(screen.getByRole('button', { name: 'Imprimer ou enregistrer en PDF' }).closest('div.print\\:hidden')).toBeTruthy();
    expect(screen.getByLabelText('Texte du courrier').closest('.print\\:hidden')).toBeNull();
  });

  it('aucun courrier remis : le dit, sans rien consigner', async () => {
    repondre(200, { ok: true, lettre: null });
    await afficher();
    expect(screen.getByText(AUCUN_COURRIER)).toBeTruthy();
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
