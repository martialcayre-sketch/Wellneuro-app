// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalerProbleme } from './SignalerProbleme';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U40 sous la garde du dossier de la page ([[D-481]] DOC-12, Q10 a et Q11 a ;
// [[D-488]] DOC-12) : l'envoi porte le segment de la page ; refusé en 409, la
// page dit T-51 SOUS le bouton d'envoi, puis la mention de sécurité existante,
// inchangée — le signalement n'a été ni orienté ni transmis.

const MENTION =
  'Ces signalements ne sont pas surveillés en continu. En cas de symptôme grave ou inquiétant, contactez le 15 ou le 112 sans attendre.';

let init: RequestInit | undefined;
let reponse: { status: number; corps: Record<string, unknown> };

beforeEach(() => {
  init = undefined;
  reponse = { status: 409, corps: { ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER } };
  global.fetch = vi.fn((_url: string | URL | Request, i?: RequestInit) => {
    init = i;
    return Promise.resolve({ status: reponse.status, json: () => Promise.resolve(reponse.corps) } as Response);
  }) as unknown as typeof fetch;
});
afterEach(cleanup);

function envoyerUnIncident(onEnvoye = vi.fn()) {
  render(<SignalerProbleme token="PAT_SEED_01" onEnvoye={onEnvoye} associationDisponible={false} />);
  fireEvent.click(screen.getByText(/confidentialité/));
  const form = screen.getByText('Signaler').closest('form')!;
  fireEvent.change(form.querySelector('select')!, { target: { value: 'autre' } });
  fireEvent.change(form.querySelector('textarea')!, { target: { value: 'Un courrier mal adressé.' } });
  fireEvent.submit(form);
  return { form, onEnvoye };
}

describe('SignalerProbleme — garde du dossier de la page', () => {
  it('l’envoi porte le segment de la page', async () => {
    reponse = { status: 200, corps: { ok: true, messagePatient: 'Reçu.' } };
    envoyerUnIncident();
    await waitFor(() => expect(init).toBeDefined());
    expect((init!.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_01');
  });

  it('409 : T-51 sous le bouton, puis la mention de sécurité ; rien de confirmé', async () => {
    const { form, onEnvoye } = envoyerUnIncident();
    const refus = await screen.findByText(MESSAGE_AUTRE_DOSSIER);
    const bouton = screen.getByRole('button', { name: 'Signaler' });
    // Sous le geste refusé : après le bouton dans l'ordre du document.
    expect(bouton.compareDocumentPosition(refus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const mention = screen.getByText(MENTION);
    expect(refus.compareDocumentPosition(mention) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.contains(mention)).toBe(true);
    expect(onEnvoye).not.toHaveBeenCalled();
    // La saisie reste là.
    expect((form.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Un courrier mal adressé.');
  });

  it('un autre refus garde son message au-dessus du bouton, sans la mention répétée', async () => {
    reponse = { status: 400, corps: { ok: false, reason: 'invalid_payload', error: 'Description requise.' } };
    envoyerUnIncident();
    await screen.findByText('Description requise.');
    expect(screen.queryByText(MESSAGE_AUTRE_DOSSIER)).toBeNull();
    expect(screen.queryByText(MENTION)).toBeNull();
  });
});
