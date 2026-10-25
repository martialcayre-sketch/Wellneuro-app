// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LienBibliotheque } from './LienBibliotheque';

// Le lien de l'accueil vers « Ma bibliothèque » ([[D-357]]) : il ne paraît que
// sur un double oui de la route — servie au dossier, et un rayon à montrer.

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

describe('LienBibliotheque', () => {
  it('servie ET une fiche remise : le lien paraît, vers la bibliothèque', async () => {
    const fetchMock = repondre(true, { ok: true, ouvert: true, fichesRemises: true });
    render(<LienBibliotheque token="TOK" />);
    await laisserPartir();
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/bibliotheque');
    expect(screen.getByRole('link', { name: 'Ma bibliothèque' }).getAttribute('href')).toBe('/portail/TOK/bibliotheque');
  });

  it.each([
    ['aucun rayon à montrer', true, { ok: true, ouvert: true, fichesRemises: false }],
    ['drapeau fermé (404)', false, { ok: false, reason: 'desactive' }],
    ['dossier mineur (409)', false, { ok: false, reason: 'hors_majeur' }],
    ['réponse sans le double oui', true, { ok: true, ouvert: true }],
  ])('%s : aucun lien', async (_cas, ok, corps) => {
    repondre(ok, corps);
    render(<LienBibliotheque token="TOK" />);
    await laisserPartir();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('réseau coupé : aucun lien, aucun message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('réseau');
    }));
    const { container } = render(<LienBibliotheque token="TOK" />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
  });
});
