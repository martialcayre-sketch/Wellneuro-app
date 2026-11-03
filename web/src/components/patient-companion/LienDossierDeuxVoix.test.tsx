// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienDossierDeuxVoix } from './LienDossierDeuxVoix';

// « Ouvrir mon dossier à deux voix » (LOT-06) : le lien n'existe que si la
// route répond « ouvert ». Il n'avait qu'un E2E ; banc ajouté par le lot L1 de
// l'audit « rails et menus » (EP-17).

function repondre(status: number, corps: unknown) {
  const json = vi.fn(async () => corps);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json })));
  return json;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LienDossierDeuxVoix', () => {
  it('route ouverte : le lien mène à la page', async () => {
    repondre(200, { ok: true, ouvert: true });
    render(<LienDossierDeuxVoix token="TOK" />);
    const lien = await screen.findByRole('link', { name: 'Ouvrir mon dossier à deux voix' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/dossier');
    expect(lien.className).toContain('min-h-12');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/portail/dossier?interrupteur=1');
  });

  it.each([
    [404, { ok: false, reason: 'desactive', error: 'x' }],
    [409, { ok: false, reason: 'hors_majeur', error: 'x' }],
    [200, { ok: true }],
    [200, { ok: true, ouvert: false }],
    [500, { ok: false, reason: 'server_error', error: 'x' }],
  ])('réponse %s : aucun lien', async (status, corps) => {
    const json = repondre(status, corps);
    render(<LienDossierDeuxVoix token="TOK" />);
    await waitFor(() => expect(json).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('réseau coupé : aucun lien, aucun message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('réseau');
    }));
    const { container } = render(<LienDossierDeuxVoix token="TOK" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.innerHTML).toBe('');
  });
});
