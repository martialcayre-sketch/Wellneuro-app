// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienFicheRenseignements } from './LienFicheRenseignements';

// « Ma fiche de renseignements » ([[D-335]]) : le lien n'existe que si la route
// répond « ouvert ». Banc ajouté par le lot L1 de l'audit « rails et menus »
// (EP-17).

function repondre(status: number, corps: unknown) {
  const json = vi.fn(async () => corps);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json })));
  return json;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LienFicheRenseignements', () => {
  it('route ouverte : le lien mène à la page', async () => {
    repondre(200, { ok: true, ouvert: true });
    render(<LienFicheRenseignements token="TOK" />);
    const lien = await screen.findByRole('link', { name: 'Ma fiche de renseignements' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/renseignements');
    expect(lien.className).toContain('min-h-12');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/portail/physio-traitements?interrupteur=1');
  });

  it.each([
    [404, { ok: false, reason: 'desactive', error: 'x' }],
    [409, { ok: false, reason: 'hors_majeur', error: 'x' }],
    [200, { ok: true }],
    [200, { ok: true, ouvert: false }],
    [500, { ok: false, reason: 'server_error', error: 'x' }],
  ])('réponse %s : aucun lien', async (status, corps) => {
    const json = repondre(status, corps);
    render(<LienFicheRenseignements token="TOK" />);
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
    const { container } = render(<LienFicheRenseignements token="TOK" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.innerHTML).toBe('');
  });
});
