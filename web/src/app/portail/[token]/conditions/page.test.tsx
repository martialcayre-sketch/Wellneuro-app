// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { replace, routeur } = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, routeur: { replace } };
});
vi.mock('next/navigation', () => ({ useRouter: () => routeur, useParams: () => ({ token: 'TOK' }) }));

import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import ConditionsPage from './page';

// La page des conditions ([[D-292]] §3) : fermée, elle renvoie au centre
// d'information ; ouverte, elle montre le texte sans rien écrire au chargement.

function serveur(etat: Record<string, unknown>) {
  const fetchMock = vi.fn(async (_url: RequestInfo | URL) => ({ ok: true, status: 200, json: async () => etat }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ETAT = { ok: true, conditionsOuvertes: true, accuses: [] };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ConditionsPage', () => {
  it('drapeau fermé (ou dossier hors majeur) : renvoi au centre d’information', async () => {
    serveur({ ...ETAT, conditionsOuvertes: false });
    render(<ConditionsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK/informations'));
  });

  it('sans accusé : le texte et le bouton, et rien d’écrit au chargement', async () => {
    const fetchMock = serveur(ETAT);
    render(<ConditionsPage />);
    expect(await screen.findByRole('button', { name: 'J’en ai pris connaissance' })).toBeTruthy();
    expect(fetchMock.mock.calls.every(([u]) => !String(u).includes('/trust/lecture'))).toBe(true);
  });

  it('version en vigueur accusée : la date, sans bouton', async () => {
    const { version } = getDocumentCourant('conditions_utilisation');
    serveur({
      ...ETAT,
      accuses: [
        { documentKey: 'conditions_utilisation', documentVersion: version, type: 'pris_connaissance', date: '2026-10-20T08:00:00.000Z' },
      ],
    });
    render(<ConditionsPage />);
    expect(await screen.findByText('Pris connaissance le 20 octobre 2026')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'J’en ai pris connaissance' })).toBeNull();
  });
});
