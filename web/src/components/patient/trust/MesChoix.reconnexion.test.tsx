// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MesChoix } from './MesChoix';

// U39, Q3 a du prototype PAT-6 ([[D-481]] complément DOC-11 ; [[D-488]]
// amendement DOC-11) : un choix refusé en 401 montre, dans l'accordéon du
// choix (Q5 a), « Session expirée. Reconnectez-vous. » puis T-36 dans un
// nouvel onglet. Rien n'est relu ni renvoyé seul ; les autres refus ne
// proposent pas T-36.

const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function cliquerLePremierChoix(reponses: { status: number; corps: unknown }[]) {
  const fetchMock = vi.fn(async () => {
    const r = reponses.shift()!;
    return { status: r.status, json: async () => r.corps } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  const onChange = vi.fn();
  render(<MesChoix token="PAT_SEED_01" choixCourants={[]} historiqueChoix={[]} onChange={onChange} />);
  const accordeon = screen.getByText('Partage avec le médecin traitant').closest('details')!;
  accordeon.open = true;
  fireEvent.click(accordeon.querySelector('button')!);
  return { accordeon, onChange, fetchMock };
}

describe('MesChoix — choix refusé en 401 (Q3 a)', () => {
  it('message puis T-36 dans l’accordéon du choix, nouvel onglet, sans relecture', async () => {
    const { accordeon, onChange, fetchMock } = cliquerLePremierChoix([
      { status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } },
    ]);
    const message = await screen.findByText(SESSION_EXPIREE);
    const lien = screen.getByRole('link', { name: 'Me reconnecter' });
    expect(accordeon.contains(message) && accordeon.contains(lien)).toBe(true);
    expect(message.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBe('_blank');
    // Un seul lien : pas de doublon sur les autres choix.
    expect(screen.getAllByRole('link', { name: 'Me reconnecter' })).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('le geste refait après reconnexion part et efface le message', async () => {
    const { accordeon, onChange } = cliquerLePremierChoix([
      { status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } },
      { status: 200, corps: { ok: true } },
    ]);
    await screen.findByText(SESSION_EXPIREE);
    fireEvent.click(accordeon.querySelector('button')!);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(SESSION_EXPIREE)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('un autre refus ne propose pas T-36', async () => {
    cliquerLePremierChoix([{ status: 403, corps: { ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' } }]);
    await screen.findByText('Accès non reconnu ou révoqué.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });
});
