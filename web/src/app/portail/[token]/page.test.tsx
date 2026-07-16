// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'TOK_SESSION_TEST' }) }));

import PortailPage from './page';

describe('PortailPage — restauration de session', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('restaure une session valide sans afficher le gate email', async () => {
    // `ok: true` : le code vérifie res.ok (Response réel) avant de parser —
    // sans lui, le fetch trust/etat partirait en réessais bornés (lenteur).
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        patient: { prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
        consultation: null,
        premiereAssignation: 'ASS_TEST',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PortailPage />);

    expect(screen.getByText('Vérification de votre session…')).not.toBeNull();
    await waitFor(() => expect(screen.getByText('Merci !')).not.toBeNull());
    expect(screen.queryByPlaceholderText('votre@email.fr')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/portail/session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'TOK_SESSION_TEST' }),
    }));
  });

  it('affiche le gate lorsque la restauration est refusée', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ ok: false, reason: 'forbidden', error: 'Accès refusé.' }),
    }));

    render(<PortailPage />);

    await waitFor(() => expect(screen.getByPlaceholderText('votre@email.fr')).not.toBeNull());
  });
});
