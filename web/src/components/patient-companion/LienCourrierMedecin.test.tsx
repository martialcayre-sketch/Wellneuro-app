// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LienCourrierMedecin } from './LienCourrierMedecin';

// Le lien de l'accueil vers « Courrier pour votre médecin » ([[D-262]], LOT-03a ; patron [[D-251]]
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

describe('LienCourrierMedecin', () => {
  it('surface ouverte ET un courrier remis : le lien paraît, vers l’écran', async () => {
    const fetchMock = repondre(true, { ok: true, ouvert: true, lettreRemise: true });
    render(<LienCourrierMedecin token="TOK" />);
    await laisserPartir();
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/lettre-adressage?interrupteur=1');
    expect(screen.getByRole('link', { name: 'Courrier pour votre médecin' }).getAttribute('href')).toBe('/portail/TOK/courrier-medecin');
  });

  it.each([
    ['aucun courrier remis', true, { ok: true, ouvert: true, lettreRemise: false }],
    ['espace fermé (503)', false, { ok: false, reason: 'feature_disabled' }],
    ['réponse sans le double oui', true, { ok: true, ouvert: true }],
  ])('%s : aucun lien', async (_cas, ok, corps) => {
    repondre(ok, corps);
    render(<LienCourrierMedecin token="TOK" />);
    await laisserPartir();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('réseau coupé : aucun lien, aucun message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('réseau');
    }));
    const { container } = render(<LienCourrierMedecin token="TOK" />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
  });
});
