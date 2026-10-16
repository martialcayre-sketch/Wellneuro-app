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

  // Arrivée par le lien de l'e-mail : le cookie peut se propager un instant
  // après la redirection (WebKit). Un 401 transitoire ne renvoie pas ailleurs.
  it('un 401 transitoire, puis la session : le texte, sans renvoi', async () => {
    let appels = 0;
    const fetchMock = vi.fn(async () => {
      appels += 1;
      return appels === 1
        ? ({ ok: false, status: 401, json: async () => ({ ok: false }) } as Response)
        : ({ ok: true, status: 200, json: async () => ETAT } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ConditionsPage />);
    expect(await screen.findByRole('button', { name: 'J’en ai pris connaissance' })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sans session après les réessais : renvoi à l’accueil de l’espace', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ ok: false }) }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    render(<ConditionsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK'), { timeout: 4000 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('le retour mène à l’accueil de l’espace, qui choisit l’étape', async () => {
    serveur(ETAT);
    render(<ConditionsPage />);
    expect((await screen.findByRole('link', { name: '← Mon espace' })).getAttribute('href')).toBe('/portail/TOK');
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
