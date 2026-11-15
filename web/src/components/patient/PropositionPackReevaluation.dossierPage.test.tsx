// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le segment de la page `/portail/[token]` : lu par `useSegmentPage`.
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_03' }) }));

import { PropositionPackReevaluation } from './PropositionPackReevaluation';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U41 sous la garde du dossier de la page ([[D-481]] DOC-14) : la réponse porte
// le segment de la page ; refusée en 409, T-51 remplace le texte fixe de
// l'échec ([[D-488]] DOC-14), et la proposition reste affichée.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PropositionPackReevaluation — garde du dossier de la page', () => {
  it('409 : T-51 à la place du texte d’échec, segment envoyé', async () => {
    const appels: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init });
        if (init?.method === 'POST') {
          return {
            ok: false,
            status: 409,
            json: async () => ({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, proposition: { idPack: 'PACK_BASE', titre: 'Refaire le point', corps: 'Vous pouvez répondre non.' } }),
        } as Response;
      }),
    );
    render(<PropositionPackReevaluation />);
    fireEvent.click(await screen.findByRole('button', { name: /Non, pas maintenant/i }));

    expect((await screen.findByRole('alert')).textContent).toBe(MESSAGE_AUTRE_DOSSIER);
    expect(screen.queryByText(/n’a pas pu être enregistrée/)).toBeNull();
    const post = appels.find(a => a.init?.method === 'POST')!;
    expect((post.init!.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_03');
    expect(screen.getByRole('heading', { name: 'Refaire le point' })).toBeTruthy();
  });
});
