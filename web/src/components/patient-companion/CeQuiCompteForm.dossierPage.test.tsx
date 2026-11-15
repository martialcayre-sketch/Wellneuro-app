// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le segment de la page `/portail/[token]` : lu par `useSegmentPage`.
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_01' }) }));

import { CeQuiCompteForm } from './CeQuiCompteForm';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U23 sous la garde du dossier de la page ([[D-481]] DOC-14) : le dépôt porte
// le segment de la page ; refusé en 409, T-51 paraît dans le message d'erreur
// existant ([[D-488]] DOC-14), et la parole écrite n'est pas effacée.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('CeQuiCompteForm — garde du dossier de la page', () => {
  it('409 : T-51, segment envoyé, le texte reste', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? ({ ok: false, status: 409, json: async () => ({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }) } as Response)
        : ({ ok: true, status: 200, json: async () => ({ ok: true, entrees: [], fenetre: { ouverte: true } }) } as Response),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<CeQuiCompteForm idPatient="PAT_SEED_01" />);
    const champ = (await screen.findByLabelText('Ce que je veux dire')) as HTMLTextAreaElement;
    fireEvent.change(champ, { target: { value: 'Tenir debout jusqu’au soir.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(await screen.findByText(MESSAGE_AUTRE_DOSSIER)).toBeTruthy();
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(((post[1] as RequestInit).headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_01');
    expect(champ.value).toBe('Tenir debout jusqu’au soir.');
  });
});
