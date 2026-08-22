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

  it('intègre le résumé Boussole qualitatif du protocole approuvé', async () => {
    mockFetch(
      {
        ok: true, protocoleDiffuse: true, finDeCycle: false,
        vue: {
          ...vue,
          boussoles: [{
            foodRef: '26034', foodLabel: 'Sardine',
            qualitativeSummary: 'Cet aliment fait partie de l’action relue avec votre praticien.',
            reasons: ['Raison qualitative.'], sourceLabel: 'Table Ciqual, Anses',
            limitations: ['Limite qualitative.'], alternative: null,
          }],
        },
      },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] },
    );
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByRole('heading', { name: 'Ma Boussole alimentaire' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Comprendre cette lecture' }).getAttribute('href'))
      .toBe('/portail/TOK/alimentation/boussole/26034');
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

  // ── Lien « Ce que mon praticien a compris de moi » (Alliance LOT-04) ───────
  //
  // Le composant est client : il ne peut pas lire `WN_COMPREHENSION`. C'est la
  // ROUTE qui décide, et la sonde doit être FAIL-CLOSED — un lien affiché sur
  // une surface fermée mènerait à un 404.

  const LIBELLE = 'Ce que mon praticien a compris de moi';

  function mockSondeComprehension(reponse: { statut: number; corps: unknown } | 'reseau') {
    global.fetch = vi.fn((url: string | URL | Request) => {
      const href = String(url);
      if (href.includes('/api/portail/comprehension')) {
        if (reponse === 'reseau') return Promise.reject(new Error('offline'));
        return Promise.resolve({
          ok: reponse.statut < 400,
          json: () => Promise.resolve(reponse.corps),
        } as Response);
      }
      const body = href.endsWith('/checkin')
        ? { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] }
        : { ok: true, protocoleDiffuse: true, finDeCycle: false, vue };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
    }) as unknown as typeof fetch;
  }

  it('affiche le lien quand l’interrupteur dit « ouvert »', async () => {
    mockSondeComprehension({ statut: 200, corps: { ok: true, ouvert: true } });
    render(<PatientCompanionHome token="TOK" />);
    const lien = (await screen.findByText(LIBELLE)) as HTMLAnchorElement;
    expect(lien.getAttribute('href')).toBe('/portail/TOK/comprehension');
  });

  it('SONDE par l’interrupteur, jamais par la route de service', async () => {
    // Sans `?interrupteur=1`, chaque visite de l'accueil servirait la synthèse
    // complète et émettrait « registre anxiogène servi » pour une page jamais
    // ouverte (revue LOT-04, M3).
    mockSondeComprehension({ statut: 200, corps: { ok: true, ouvert: true } });
    render(<PatientCompanionHome token="TOK" />);
    await screen.findByText(LIBELLE);

    const appels = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/api/portail/comprehension'));
    expect(appels).toHaveLength(1);
    expect(appels[0]).toContain('interrupteur=1');
  });

  it('n’affiche AUCUN lien sur surface fermée (503)', async () => {
    mockSondeComprehension({ statut: 503, corps: { ok: false, reason: 'feature_disabled' } });
    render(<PatientCompanionHome token="TOK" />);
    await screen.findByText('Ma fiche conseils');
    expect(screen.queryByText(LIBELLE)).toBeNull();
  });

  it('n’affiche AUCUN lien sur erreur réseau — fail-closed', async () => {
    mockSondeComprehension('reseau');
    render(<PatientCompanionHome token="TOK" />);
    await screen.findByText('Ma fiche conseils');
    expect(screen.queryByText(LIBELLE)).toBeNull();
  });

  it('n’affiche AUCUN lien si la route répond sans « ouvert »', async () => {
    // Un 200 qui ne DIT pas « ouvert » n'ouvre rien : la sonde exige le mot.
    mockSondeComprehension({ statut: 200, corps: { ok: true } });
    render(<PatientCompanionHome token="TOK" />);
    await screen.findByText('Ma fiche conseils');
    expect(screen.queryByText(LIBELLE)).toBeNull();
  });
});
