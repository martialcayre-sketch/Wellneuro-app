// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LienCourrierComplement } from './LienCourrierComplement';

// Le lien de l'accueil vers « Courrier à remettre à votre médecin » ([[D-345]],
// J3-12h lot 4 ; patron `LienCourrierMedecin`) : il ne paraît que sur un double
// oui de la route.

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

describe('LienCourrierComplement', () => {
  it('surface ouverte ET un courrier remis : le lien paraît, vers l’écran', async () => {
    const fetchMock = repondre(true, { ok: true, ouvert: true, courrierRemis: true });
    render(<LienCourrierComplement token="TOK" />);
    await laisserPartir();
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/courrier-complement?interrupteur=1');
    expect(screen.getByRole('link', { name: 'Courrier à remettre à votre médecin' }).getAttribute('href'))
      .toBe('/portail/TOK/courrier-complement');
  });

  it.each([
    ['aucun courrier remis', true, { ok: true, ouvert: true, courrierRemis: false }],
    ['espace fermé (503)', false, { ok: false, reason: 'feature_disabled' }],
    ['réponse sans le double oui', true, { ok: true, ouvert: true }],
  ])('%s : aucun lien', async (_cas, ok, corps) => {
    repondre(ok, corps);
    render(<LienCourrierComplement token="TOK" />);
    await laisserPartir();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('réseau coupé : aucun lien, aucun message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('réseau');
    }));
    const { container } = render(<LienCourrierComplement token="TOK" />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
  });
});
