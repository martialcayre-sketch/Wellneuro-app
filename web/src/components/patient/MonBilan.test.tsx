// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// « Mon bilan » et la lecture datée ([[D-297]]) : l'avis et la consignation ne
// vivent que sur le bilan AFFICHÉ — une page en erreur ou sans bilan ne date
// rien (revue CodeRabbit de #1552). La trace a son propre banc : ici, on
// vérifie QUAND elle est montée. Données synthétiques.

const { router, consigner } = vi.hoisted(() => ({ router: { replace: vi.fn() }, consigner: vi.fn(() => null) }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/patient/ConsignerLecturePortail', () => ({ ConsignerLecturePortail: consigner }));

import { MonBilan } from './MonBilan';
import { TITRE_LECTURE_DATEE } from '@/lib/portail/lectureDatee';

const BILAN = {
  narratif: 'Un narratif synthétique.',
  notePraticien: null,
  mentionPreparation: 'Préparé par votre praticien.',
  transmisLe: '2026-10-01T08:00:00.000Z',
};

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, ok: status < 400, json: async () => corps })));
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MonBilan — la lecture datée (D-297)', () => {
  it('bilan affiché : « Votre lecture est datée » en tête, puis la lecture consignée', async () => {
    repondre(200, { ok: true, bilan: BILAN });
    render(<MonBilan token="TOK" />);
    const avis = await screen.findByRole('region', { name: TITRE_LECTURE_DATEE });
    const titre = screen.getByRole('heading', { level: 1, name: 'Bilan neuronutritionnel' });
    expect(avis.compareDocumentPosition(titre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(consigner.mock.calls.map(appel => (appel as unknown[])[0])).toContainEqual({ espece: 'bilan' });
  });

  it('aucun bilan transmis : ni avis, ni lecture consignée', async () => {
    repondre(200, { ok: true, bilan: null });
    render(<MonBilan token="TOK" />);
    await screen.findByText(/ne vous a pas encore transmis de bilan/);
    expect(screen.queryByRole('region', { name: TITRE_LECTURE_DATEE })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('panne passagère : ni avis, ni lecture consignée — rien n’a été lu', async () => {
    repondre(500, { ok: false, error: 'Le bilan n’a pas pu être chargé.' });
    render(<MonBilan token="TOK" />);
    await screen.findByText('Le bilan n’a pas pu être chargé.');
    expect(screen.queryByRole('region', { name: TITRE_LECTURE_DATEE })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });
});
