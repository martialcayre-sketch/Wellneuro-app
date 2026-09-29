// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LienFichesRemises } from './LienFichesRemises';

// Le lien de l'accueil vers « Fiches remises par mon praticien » ([[D-251]]
// §8, lot 10) : il ne paraît que sur un double oui de la route.

async function laisserPartir() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function repondre(ok: boolean, corps: unknown) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => corps }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LienFichesRemises', () => {
  it('surface ouverte ET une fiche remise : le lien paraît, vers l’espace', async () => {
    const fetchMock = repondre(true, { ok: true, ouvert: true, fichesRemises: true });
    render(<LienFichesRemises token="TOK" />);
    await laisserPartir();
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/fiches-assiette?interrupteur=1');
    expect(screen.getByRole('link', { name: 'Fiches remises par mon praticien' }).getAttribute('href')).toBe('/portail/TOK/fiches');
  });

  it.each([
    ['aucune fiche remise', true, { ok: true, ouvert: true, fichesRemises: false }],
    ['espace fermé (503)', false, { ok: false, reason: 'feature_disabled' }],
    ['réponse sans le double oui', true, { ok: true, ouvert: true }],
  ])('%s : aucun lien', async (_cas, ok, corps) => {
    repondre(ok, corps);
    render(<LienFichesRemises token="TOK" />);
    await laisserPartir();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('réseau coupé : aucun lien, aucun message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('réseau');
    }));
    const { container } = render(<LienFichesRemises token="TOK" />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
  });
});
