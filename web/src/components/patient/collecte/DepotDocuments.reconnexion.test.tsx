// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Routeur STABLE : `charger` en dépend.
const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { DepotDocuments } from './DepotDocuments';

// U33, Q2 a du prototype PAT-6 ([[D-481]] complément DOC-11 ; [[D-488]]
// amendement DOC-11) : un DÉPÔT refusé en 401 ne renvoie plus à l'entrée. La
// page reste ouverte, garde le fichier et la catégorie, affiche le message de
// la route SOUS le bouton, puis T-36 vers la connexion dans un nouvel onglet.
// Aucun renvoi automatique : le patient renvoie lui-même. Les autres refus ne
// proposent pas T-36.

const PRET = { ok: true, documents: [], dossierOuvert: true, statutAge: 'majeur', plafond: null };
const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';

let appels: { url: string; init?: RequestInit }[];
let reponsesPost: { status: number; corps: unknown }[];

beforeEach(() => {
  appels = [];
  reponsesPost = [];
  routeur.replace.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      if (init?.method === 'POST') {
        const r = reponsesPost.shift()!;
        return new Response(JSON.stringify(r.corps), { status: r.status });
      }
      return new Response(JSON.stringify(PRET), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function choisirEtDeposer() {
  render(<DepotDocuments token="PAT_SEED_01" />);
  fireEvent.click(await screen.findByLabelText('Liste de traitements ou de compléments'));
  const fichier = new File(['%PDF-1.7'], 'document.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText(/Le document : un PDF/), { target: { files: [fichier] } });
  fireEvent.click(screen.getByRole('button', { name: 'Déposer le document' }));
}

describe('DepotDocuments — dépôt refusé en 401 (Q2 a)', () => {
  it('la page reste : message de la route sous le bouton, T-36 dans un nouvel onglet, saisie gardée', async () => {
    reponsesPost.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
    await choisirEtDeposer();

    const message = await screen.findByText(SESSION_EXPIREE);
    const bouton = screen.getByRole('button', { name: 'Déposer le document' }) as HTMLButtonElement;
    expect(bouton.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const lien = screen.getByRole('link', { name: 'Me reconnecter' });
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(message.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(routeur.replace).not.toHaveBeenCalled();
    // Aucune relecture : elle renverrait à l'entrée.
    expect(appels.filter(a => a.init?.method !== 'POST')).toHaveLength(1);
    // Fichier et catégorie restent choisis.
    expect(bouton.disabled).toBe(false);
    expect((screen.getByLabelText('Liste de traitements ou de compléments') as HTMLInputElement).checked).toBe(true);
  });

  it('rien n’est renvoyé seul ; le renvoi manuel après reconnexion part et réussit', async () => {
    reponsesPost.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
    reponsesPost.push({ status: 200, corps: { ok: true } });
    await choisirEtDeposer();
    await screen.findByText(SESSION_EXPIREE);
    expect(appels.filter(a => a.init?.method === 'POST')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Déposer le document' }));
    await waitFor(() => expect(screen.queryByText(SESSION_EXPIREE)).toBeNull());
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
    const posts = appels.filter(a => a.init?.method === 'POST');
    expect(posts).toHaveLength(2);
    const corps = posts[1].init!.body as FormData;
    expect(corps.get('categorie')).toBe('traitements_complements');
  });

  it('401 au corps illisible : le message de D-488, puis T-36, jamais une autre phrase', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'POST' ? new Response('', { status: 401 }) : new Response(JSON.stringify(PRET), { status: 200 }),
      ),
    );
    await choisirEtDeposer();
    const message = await screen.findByText(SESSION_EXPIREE);
    const lien = screen.getByRole('link', { name: 'Me reconnecter' });
    expect(message.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('un autre refus ne propose pas T-36', async () => {
    reponsesPost.push({ status: 413, corps: { ok: false, reason: 'trop_lourd', error: 'Fichier trop lourd.' } });
    await choisirEtDeposer();
    await screen.findByText('Fichier trop lourd.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('le chargement refusé en 401 garde son renvoi silencieux à l’entrée', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    render(<DepotDocuments token="PAT_SEED_01" />);
    await waitFor(() => expect(routeur.replace).toHaveBeenCalledWith('/portail/PAT_SEED_01'));
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });
});
