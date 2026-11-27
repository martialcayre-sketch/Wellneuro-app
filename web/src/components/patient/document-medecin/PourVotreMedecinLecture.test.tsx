// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// « Pour votre médecin » (U30) : l'ornement de l'état vide réel ([[D-481]]
// §1 bis, PAT-5 décor, Q2a-Q3a). Seuls `fetch` et le routeur sont simulés.

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { PourVotreMedecinLecture } from './PourVotreMedecinLecture';
import { AUCUN_DOCUMENT_MEDECIN } from './textesDocumentMedecin';

const germes = () => document.querySelectorAll('[data-lien-decor="etat-vide"]');

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, ok: status < 400, json: async () => corps })));
}

async function afficher() {
  render(<PourVotreMedecinLecture token="TOK" />);
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

describe('Pour votre médecin — décor de l’état vide (PAT-5 décor)', () => {
  it('aucun document : un germe décoratif avant la phrase, phrase inchangée', async () => {
    repondre(200, { ok: true, document: null });
    await afficher();
    const phrase = screen.getByText(AUCUN_DOCUMENT_MEDECIN);
    expect(germes()).toHaveLength(1);
    const germe = germes()[0];
    expect(germe.getAttribute('aria-hidden')).toBe('true');
    expect(germe.getAttribute('data-element')).toBe('nutrition-sprout');
    expect(germe.className).toContain('print:!hidden');
    expect(germe.compareDocumentPosition(phrase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('espace fermé : le message, sans ornement — une erreur garde son traitement', async () => {
    repondre(503, { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' });
    await afficher();
    expect(screen.getByText('Cet espace n’est pas encore ouvert.')).toBeTruthy();
    expect(germes()).toHaveLength(0);
  });
});
