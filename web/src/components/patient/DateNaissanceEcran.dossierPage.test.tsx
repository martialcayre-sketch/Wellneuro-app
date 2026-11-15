// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le segment de la page `/portail/[token]` : lu par `useSegmentPage`.
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_01' }) }));

import { DateNaissanceEcran } from './DateNaissanceEcran';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U04 sous la garde du dossier de la page ([[D-481]] DOC-14) : l'envoi porte le
// segment de la page ; refusé en 409, T-51 paraît dans le message d'erreur
// existant ([[D-488]] DOC-14), et rien n'est déclaré enregistré.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DateNaissanceEcran — garde du dossier de la page', () => {
  it('409 : T-51 dans le message d’erreur, segment envoyé, la date reste saisie', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }),
    }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const onEnregistree = vi.fn();
    render(<DateNaissanceEcran onEnregistree={onEnregistree} />);
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1985-03-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'C’est exact, enregistrer' }));

    expect(await screen.findByText(MESSAGE_AUTRE_DOSSIER)).toBeTruthy();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_01');
    expect(onEnregistree).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Date de naissance') as HTMLInputElement).value).toBe('1985-03-12');
  });
});
