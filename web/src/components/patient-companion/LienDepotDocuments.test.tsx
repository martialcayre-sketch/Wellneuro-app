// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienDepotDocuments } from './LienDepotDocuments';

// Le lien du dépôt ([[D-330]]) n'existe que si la route répond « ouvert » :
// fail-closed sur un 404 (drapeau fermé), un 409 (dossier hors majeur), une
// panne ou une réponse partielle.

function repondre(status: number, corps: unknown) {
  const json = vi.fn(async () => corps);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json })));
  return json;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LienDepotDocuments', () => {
  it('route ouverte : le lien mène à la page', async () => {
    repondre(200, { ok: true, ouvert: true });
    render(<LienDepotDocuments token="TOK" />);
    const lien = await screen.findByRole('link', { name: 'Déposer un document' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/documents');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/portail/documents?interrupteur=1');
  });

  it.each([
    [404, { ok: false, reason: 'desactive', error: 'x' }],
    [409, { ok: false, reason: 'hors_majeur', error: 'x' }],
    [200, { ok: true }],
    [500, { ok: false, reason: 'server_error', error: 'x' }],
  ])('réponse %s : aucun lien', async (status, corps) => {
    const json = repondre(status, corps);
    render(<LienDepotDocuments token="TOK" />);
    await waitFor(() => expect(json).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('link')).toBeNull();
  });
});
