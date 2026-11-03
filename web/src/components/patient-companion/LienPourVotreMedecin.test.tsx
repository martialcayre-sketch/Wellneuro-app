// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienPourVotreMedecin } from './LienPourVotreMedecin';

// « Pour votre médecin » ([[D-307]] §3) : le lien n'existe que sur un « ouvert »
// ET un document disponible, partage avec le médecin traitant accordé. Banc
// ajouté par le lot L1 de l'audit « rails et menus » (EP-17).

function repondre(status: number, corps: unknown) {
  const json = vi.fn(async () => corps);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json })));
  return json;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LienPourVotreMedecin', () => {
  it('route ouverte : le lien mène à la page', async () => {
    repondre(200, { ok: true, ouvert: true, disponible: true });
    render(<LienPourVotreMedecin token="TOK" />);
    const lien = await screen.findByRole('link', { name: 'Pour votre médecin' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/pour-votre-medecin');
    expect(lien.className).toContain('min-h-12');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/portail/document-medecin?interrupteur=1');
  });

  it.each([
    [404, { ok: false, reason: 'desactive', error: 'x' }],
    [409, { ok: false, reason: 'hors_majeur', error: 'x' }],
    [200, { ok: true, ouvert: true }],
    [200, { ok: true, ouvert: true, disponible: false }],
    [500, { ok: false, reason: 'server_error', error: 'x' }],
  ])('réponse %s : aucun lien', async (status, corps) => {
    const json = repondre(status, corps);
    render(<LienPourVotreMedecin token="TOK" />);
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
    const { container } = render(<LienPourVotreMedecin token="TOK" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.innerHTML).toBe('');
  });
});
