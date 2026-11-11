// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECKIN_QUESTIONS } from '@/lib/protocol/checkinDomain';

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { ProtocolCheckinForm } from './ProtocolCheckinForm';

// UNE LECTURE EN ÉCHEC N'EST PAS UNE ATTENTE (étape 1 de la refonte Lien,
// constat C2, 2026-11-11) : une coupure réseau ou un refus du serveur
// prenaient la phrase « Votre suivi commencera… », sans reprise possible.

const ATTENTE = /Votre suivi commencera/;

function fetchSuivi(...reponses: Array<() => Promise<unknown>>) {
  let i = 0;
  global.fetch = vi.fn(() => reponses[Math.min(i++, reponses.length - 1)]()) as unknown as typeof fetch;
}
const json = (corps: unknown) => () => Promise.resolve({ json: () => Promise.resolve(corps) } as Response);

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const sessionExpiree = () =>
  Promise.resolve({
    status: 401,
    json: () => Promise.resolve({ ok: false, reason: 'unauthenticated', error: 'Connexion au portail requise.' }),
  } as Response);

describe('ProtocolCheckinForm — chargement', () => {
  it('sans protocole diffusé, la phrase d’attente', async () => {
    fetchSuivi(json({ ok: true, protocoleDiffuse: false, pointEtapeOuvert: null, points: [] }));
    render(<ProtocolCheckinForm token="TOK" />);
    expect(await screen.findByText(ATTENTE)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('une coupure réseau est une erreur, avec reprise', async () => {
    fetchSuivi(
      () => Promise.reject(new Error('offline')),
      json({ ok: true, protocoleDiffuse: false, pointEtapeOuvert: null, points: [] }),
    );
    render(<ProtocolCheckinForm token="TOK" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur réseau. Réessayez.');
    expect(screen.queryByText(ATTENTE)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText(ATTENTE)).toBeTruthy();
  });

  it('un refus du serveur montre son message, pas la phrase d’attente', async () => {
    fetchSuivi(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }));
    render(<ProtocolCheckinForm token="TOK" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur technique.');
    expect(screen.queryByText(ATTENTE)).toBeNull();
  });
});

// SESSION EXPIRÉE : « Réessayer » ne pouvait pas réussir. Retour au gate du
// portail, comme les autres écrans (réponse 7 (b) du responsable, 2026-11-11).
describe('ProtocolCheckinForm — session expirée', () => {
  it('au chargement, renvoie au gate du portail sans erreur affichée', async () => {
    fetchSuivi(sessionExpiree);
    render(<ProtocolCheckinForm token="TOK" />);
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith('/portail/TOK'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(ATTENTE)).toBeNull();
  });

  it('à l’envoi, renvoie au gate du portail', async () => {
    fetchSuivi(
      json({ ok: true, protocoleDiffuse: true, pointEtapeOuvert: 'J7', points: [] }),
      sessionExpiree,
    );
    render(<ProtocolCheckinForm token="TOK" />);
    await screen.findByRole('button', { name: 'Envoyer' });
    for (const q of CHECKIN_QUESTIONS) {
      const groupe = within(screen.getByRole('group', { name: q.libelle }));
      fireEvent.click(groupe.getByRole('button', { name: q.options[0].libelle }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith('/portail/TOK'));
  });
});
