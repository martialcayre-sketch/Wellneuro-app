// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalerProbleme } from './SignalerProbleme';

// U40, Q3 a du prototype PAT-6 ([[D-481]] complément DOC-11 ; [[D-488]]
// amendement DOC-11) : un signalement refusé en 401 montre « Session expirée.
// Reconnectez-vous. » puis T-36 dans un nouvel onglet ; le formulaire reste
// rempli, rien ne repart seul. Les autres refus ne proposent pas T-36.

const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';

let reponses: { status: number; corps: Record<string, unknown> }[];
let appels: number;

beforeEach(() => {
  reponses = [];
  appels = 0;
  global.fetch = vi.fn(() => {
    appels += 1;
    const r = reponses.shift()!;
    return Promise.resolve({ status: r.status, json: () => Promise.resolve(r.corps) } as Response);
  }) as unknown as typeof fetch;
});
afterEach(cleanup);

function remplirUneDemandeDeDroit(onEnvoye = vi.fn()) {
  render(<SignalerProbleme token="PAT_SEED_01" onEnvoye={onEnvoye} associationDisponible={false} />);
  fireEvent.click(screen.getByText(/exercer un droit/));
  const form = screen.getByText('Envoyer la demande').closest('form')!;
  fireEvent.change(form.querySelector('select')!, { target: { value: 'acces' } });
  fireEvent.change(form.querySelector('textarea')!, { target: { value: 'Copie de mon dossier.' } });
  fireEvent.submit(form);
  return { form, onEnvoye };
}

describe('SignalerProbleme — envoi refusé en 401 (Q3 a)', () => {
  it('message puis T-36 dans un nouvel onglet ; saisie gardée, rien de confirmé', async () => {
    reponses.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
    const { form, onEnvoye } = remplirUneDemandeDeDroit();
    const message = await screen.findByText(SESSION_EXPIREE);
    const lien = screen.getByRole('link', { name: 'Me reconnecter' });
    expect(message.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.contains(lien)).toBe(true);
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(onEnvoye).not.toHaveBeenCalled();
    expect((form.querySelector('select') as HTMLSelectElement).value).toBe('acces');
    expect((form.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Copie de mon dossier.');
    expect(appels).toBe(1);
  });

  it('le renvoi manuel après reconnexion part et réussit', async () => {
    reponses.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
    reponses.push({ status: 201, corps: { ok: true, messagePatient: 'Reçu.' } });
    const { form, onEnvoye } = remplirUneDemandeDeDroit();
    await screen.findByText(SESSION_EXPIREE);
    fireEvent.submit(form);
    await waitFor(() => expect(onEnvoye).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Reçu.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
    expect(appels).toBe(2);
  });

  it('un autre refus ne propose pas T-36', async () => {
    reponses.push({ status: 400, corps: { ok: false, reason: 'invalid_payload', error: 'Description requise.' } });
    remplirUneDemandeDeDroit();
    await screen.findByText('Description requise.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('sur l’effet indésirable et l’incident aussi', async () => {
    for (const [choix, bouton] of [
      [/mal toléré/, 'Envoyer le signalement'],
      [/confidentialité/, 'Signaler'],
    ] as const) {
      reponses.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
      const { unmount } = render(<SignalerProbleme token="PAT_SEED_01" onEnvoye={vi.fn()} associationDisponible={false} />);
      fireEvent.click(screen.getByText(choix));
      fireEvent.submit(screen.getByRole('button', { name: bouton }).closest('form')!);
      expect(await screen.findByRole('link', { name: 'Me reconnecter' })).toBeTruthy();
      unmount();
    }
  });
});
