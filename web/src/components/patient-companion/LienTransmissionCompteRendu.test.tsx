// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienTransmissionCompteRendu } from './LienTransmissionCompteRendu';

// Fail-closed ([[D-269]]) : le lien n'existe que si la route répond `ok`.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function repond(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => ({ ok: status < 300, status, json: async () => body }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('LienTransmissionCompteRendu', () => {
  it('route ouverte : le lien paraît', async () => {
    repond(200, { ok: true });
    render(<LienTransmissionCompteRendu token="TOK" />);
    const lien = await screen.findByRole('link', { name: 'Transmettre un compte rendu d’analyses' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/comptes-rendus');
  });

  it.each([
    [503, { ok: false, reason: 'bio_portail_desactive' }],
    [401, { ok: false, reason: 'unauthenticated' }],
  ])('route en %i : aucun lien', async (status, body) => {
    const fetchMock = repond(status, body);
    render(<LienTransmissionCompteRendu token="TOK" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('réseau en échec : aucun lien', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('réseau');
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<LienTransmissionCompteRendu token="TOK" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('link')).toBeNull();
  });
});
