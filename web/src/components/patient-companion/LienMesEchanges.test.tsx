// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LienMesEchanges } from './LienMesEchanges';

// Le lien de « Mes échanges » ([[D-293]]) n'existe que si la route répond
// « ouvert » : fail-closed sur un 404 (drapeau fermé), une panne ou une réponse
// partielle.

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corps), { status })));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LienMesEchanges', () => {
  it('route ouverte : le lien mène à la page', async () => {
    repondre(200, { ok: true, ouvert: true });
    render(<LienMesEchanges token="TOK" />);
    const lien = await screen.findByRole('link', { name: 'Ouvrir mes échanges' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/echanges');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/portail/echanges?interrupteur=1');
  });

  it.each([
    [404, { ok: false, reason: 'desactive', error: 'x' }],
    [200, { ok: true }],
    [500, { ok: false, reason: 'exception', error: 'x' }],
  ])('réponse %s : aucun lien', async (status, corps) => {
    repondre(status, corps);
    render(<LienMesEchanges token="TOK" />);
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('link')).toBeNull();
  });
});
