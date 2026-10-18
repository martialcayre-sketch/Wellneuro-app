// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienMesEchanges } from './LienMesEchanges';

// Le lien de « Mes échanges » ([[D-293]]) n'existe que si la route répond
// « ouvert » : fail-closed sur un 404 (drapeau fermé), une panne ou une réponse
// partielle.

// Un faux contrat `ok`/`json` : le banc sait quand le corps a été lu, donc
// quand le composant a pris sa décision.
function repondre(status: number, corps: unknown) {
  const json = vi.fn(async () => corps);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json })));
  return json;
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
    const json = repondre(status, corps);
    render(<LienMesEchanges token="TOK" />);
    // Le corps a été LU, puis les mises à jour vidées : la décision est prise.
    await waitFor(() => expect(json).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('link')).toBeNull();
  });
});
