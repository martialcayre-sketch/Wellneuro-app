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

// SUIVI NON RECONNU ([[D-488]] §7, Q-E2-5 (a)) : un refus 404 ne peut pas
// réussir en réessayant. L'écran le dit, sans « Réessayer » ; les autres
// erreurs le gardent (voir « une coupure réseau… » ci-dessus).
describe('ProtocolCheckinForm — suivi non reconnu (404)', () => {
  it('le message seul, sans « Réessayer »', async () => {
    fetchSuivi(() =>
      Promise.resolve({
        status: 404,
        json: () => Promise.resolve({ ok: false, reason: 'not_found', error: 'Suivi non reconnu.' }),
      } as Response),
    );
    render(<ProtocolCheckinForm token="TOK" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Suivi non reconnu.');
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Mon point de suivi' })).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

// T-30 ([[D-488]]) et refonte Lien PAT-3 (prototype validé le 2026-11-11).
describe('ProtocolCheckinForm — point ouvert', () => {
  const ouvert = json({ ok: true, protocoleDiffuse: true, pointEtapeOuvert: 'J14', points: [] });

  it('titre « Mon point de suivi — semaine N », réponses bordées en control-border', async () => {
    fetchSuivi(ouvert);
    render(<ProtocolCheckinForm token="TOK" />);
    expect(await screen.findByRole('heading', { name: 'Mon point de suivi — semaine 2' })).toBeTruthy();
    const groupe = within(screen.getByRole('group', { name: CHECKIN_QUESTIONS[0].libelle }));
    const choix = groupe.getByRole('button', { name: CHECKIN_QUESTIONS[0].options[0].libelle });
    expect(choix.className).toMatch(/\bborder-control-border\b/);
    expect(choix.className).toMatch(/\bmin-h-11\b/);
  });

  it('un envoi en échec garde la saisie et ne confirme rien', async () => {
    fetchSuivi(ouvert, () => Promise.reject(new Error('offline')));
    render(<ProtocolCheckinForm token="TOK" />);
    await screen.findByRole('button', { name: 'Envoyer' });
    for (const q of CHECKIN_QUESTIONS) {
      const groupe = within(screen.getByRole('group', { name: q.libelle }));
      fireEvent.click(groupe.getByRole('button', { name: q.options[0].libelle }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur réseau. Réessayez.');
    for (const q of CHECKIN_QUESTIONS) {
      const groupe = within(screen.getByRole('group', { name: q.libelle }));
      expect(groupe.getByRole('button', { name: q.options[0].libelle }).getAttribute('aria-pressed')).toBe('true');
    }
    expect(screen.queryByText(/votre point de cette semaine est enregistré/)).toBeNull();
  });
});
