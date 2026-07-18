// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientCompanionHome } from './PatientCompanionHome';

const vue = {
  purpose: 'Stabiliser vos matins.',
  followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21.',
  adviceSheetRef: 'Fiche sommeil',
  actionPrincipale: { type: 'food', title: 'Petit-déjeuner protéiné', minimalPlan: 'Trois matins cette semaine' },
};

function mockFetch(proto: unknown, checkin: unknown) {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const href = String(url);
    const body = href.endsWith('/checkin') ? checkin : proto;
    return Promise.resolve({ json: () => Promise.resolve(body) } as Response);
  }) as unknown as typeof fetch;
}

afterEach(cleanup);

describe('PatientCompanionHome', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche un accueil calme sans protocole diffusé', async () => {
    mockFetch({ ok: true, protocoleDiffuse: false, finDeCycle: false, vue: null }, { ok: true, protocoleDiffuse: false, pointEtapeOuvert: null, points: [] });
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByText(/arrivera bientôt/i)).toBeTruthy();
  });

  it('affiche l’action du jour et les accès quand un protocole est diffusé', async () => {
    mockFetch(
      { ok: true, protocoleDiffuse: true, finDeCycle: false, vue },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: 'J7', points: [{ pointEtape: 'J7', renseigne: false, reponses: null }] },
    );
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByText('Petit-déjeuner protéiné')).toBeTruthy();
    expect(screen.getByText('Trois matins cette semaine')).toBeTruthy();
    // Point ouvert non renseigné → CTA de suivi au singulier, mis en avant.
    const cta = screen.getByText('Mon rendez-vous de suivi') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/portail/TOK/suivi');
    expect(screen.getByText('Ma fiche conseils')).toBeTruthy();
  });

  it('révèle un message rassurant en mode « jour difficile »', async () => {
    mockFetch(
      { ok: true, protocoleDiffuse: true, finDeCycle: false, vue },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] },
    );
    render(<PatientCompanionHome token="TOK" />);
    fireEvent.click(await screen.findByText(/Jour difficile/i));
    expect(screen.getByText(/Un petit pas compte/i)).toBeTruthy();
  });

  it('affiche un message de clôture en fin de cycle', async () => {
    mockFetch(
      { ok: true, protocoleDiffuse: true, finDeCycle: true, vue },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] },
    );
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByText(/terme de ce cycle/i)).toBeTruthy();
  });
});
