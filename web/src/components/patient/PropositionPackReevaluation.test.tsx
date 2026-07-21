// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PropositionPackReevaluation } from './PropositionPackReevaluation';

/*
 * Garde-fous SP-SPI / LOT-01. Ce qui est protégé ici n'est pas la mise en page,
 * mais des décisions actées : la proposition est refusable au même titre
 * qu'acceptable, elle ne réapparaît pas après réponse, et rien n'y presse le
 * patient.
 */
afterEach(cleanup);

const PROPOSITION = {
  idPack: 'PACK_BASE',
  titre: 'Refaire le point, si vous le souhaitez',
  corps: 'Rien ne vous est assigné pour l’instant, et vous pouvez répondre non.',
};

function fetchMock(sequence: Array<{ ok?: boolean; corps: unknown }>) {
  const appels: Array<{ url: string; init?: RequestInit }> = [];
  const impl = vi.fn(async (url: string, init?: RequestInit) => {
    appels.push({ url, init });
    const prochain = sequence.shift() ?? { corps: { ok: true, proposition: null } };
    return { ok: prochain.ok ?? true, json: async () => prochain.corps } as Response;
  });
  vi.stubGlobal('fetch', impl);
  return appels;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('PropositionPackReevaluation', () => {
  it('ne rend rien quand il n’y a pas de proposition', async () => {
    fetchMock([{ corps: { ok: true, proposition: null } }]);
    const { container } = render(<PropositionPackReevaluation />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('affiche la proposition, et les deux réponses au même niveau', async () => {
    fetchMock([{ corps: { ok: true, proposition: PROPOSITION } }]);
    render(<PropositionPackReevaluation />);

    expect(await screen.findByRole('heading', { name: PROPOSITION.titre })).toBeTruthy();
    // Refuser n'est pas relégué à un lien discret : c'est un bouton, comme
    // accepter.
    expect(screen.getByRole('button', { name: /Oui, je veux bien/i }).tagName).toBe('BUTTON');
    expect(screen.getByRole('button', { name: /Non, pas maintenant/i }).tagName).toBe('BUTTON');
  });

  it('un refus est enregistré, et l’accusé promet que la question ne reviendra pas', async () => {
    const appels = fetchMock([
      { corps: { ok: true, proposition: PROPOSITION } },
      { corps: { ok: true, accuse: 'C’est noté, la question ne vous sera pas reposée.' } },
    ]);
    render(<PropositionPackReevaluation />);

    fireEvent.click(await screen.findByRole('button', { name: /Non, pas maintenant/i }));

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    expect(screen.getByRole('status').textContent).toMatch(/ne vous sera pas reposée/i);

    const envoi = appels.find((a) => a.init?.method === 'POST');
    expect(JSON.parse(String(envoi?.init?.body))).toEqual({
      idPack: 'PACK_BASE',
      reponse: 'declinee',
    });
    // La proposition a disparu : elle ne se repose pas dans la même visite.
    expect(screen.queryByRole('button', { name: /Non, pas maintenant/i })).toBeNull();
  });

  it('un échec d’enregistrement le dit, sans faire croire que c’est enregistré', async () => {
    fetchMock([
      { corps: { ok: true, proposition: PROPOSITION } },
      { ok: false, corps: { ok: false, reason: 'exception', error: 'Erreur technique.' } },
    ]);
    render(<PropositionPackReevaluation />);

    fireEvent.click(await screen.findByRole('button', { name: /Oui, je veux bien/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    // Les boutons restent : la réponse n'a pas été prise, le patient doit
    // pouvoir réessayer.
    expect(screen.getByRole('button', { name: /Non, pas maintenant/i })).toBeTruthy();
  });

  it('aucun chiffre de score ni pression dans ce qui est rendu', async () => {
    fetchMock([{ corps: { ok: true, proposition: PROPOSITION } }]);
    render(<PropositionPackReevaluation />);
    await screen.findByRole('heading', { name: PROPOSITION.titre });

    expect(document.body.textContent).not.toMatch(/score|%|jours manqués|vous devez|dernière chance/i);
  });
});
