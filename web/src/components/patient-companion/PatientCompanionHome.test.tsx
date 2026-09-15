// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientCompanionHome } from './PatientCompanionHome';

// TROIS ACTIONS, dont une RETENUE : la fixture n'en portait qu'une, et le
// portail n'en servait qu'une — le banc ne pouvait donc rien constater de ce que
// le patient ne recevait pas ([[D-191]]).
const vue = {
  priorityLabel: 'Sommeil fragmenté, réveils nocturnes',
  purpose: 'Stabiliser vos matins.',
  followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21.',
  adviceSheetRef: 'Fiche sommeil',
  limitations: [],
  actions: [
    { actionId: 'a1', type: 'food', title: 'Petit-déjeuner protéiné', minimalPlan: 'Trois matins cette semaine' },
    { actionId: 'a2', type: 'chronobiology', title: 'Avancer le coucher', minimalPlan: 'Vingt minutes plus tôt' },
    {
      actionId: 'a3', type: 'supplement_exploration', title: 'Piste fer',
      minimalPlan: 'Rien à faire pour l’instant',
      interventionStatus: 'conditionnelle_biologie',
      attente: 'En attente de confirmation par votre bilan.',
    },
  ],
};

const LIBELLE_INFOS = 'Mes informations et mes droits';

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

  it('affiche LES TROIS actions, l’axe et le critère quand un protocole est diffusé', async () => {
    mockFetch(
      { ok: true, protocoleDiffuse: true, finDeCycle: false, vue },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: 'J7', points: [{ pointEtape: 'J7', renseigne: false, reponses: null }] },
    );
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByText('Petit-déjeuner protéiné')).toBeTruthy();
    expect(screen.getByText('Trois matins cette semaine')).toBeTruthy();
    // Les deux autres n'atteignaient le patient sous AUCUNE forme.
    expect(screen.getByText('Avancer le coucher')).toBeTruthy();
    expect(screen.getByText('Piste fer')).toBeTruthy();
    // Le libellé d'axe : le patient ne savait pas sur quoi on travaillait.
    expect(screen.getByText(/Sommeil fragmenté, réveils nocturnes/)).toBeTruthy();
    // Le critère J21, servi dans le JSON depuis toujours et rendu nulle part.
    expect(screen.getByText('Réveils nocturnes < 2 par nuit à J21.')).toBeTruthy();
    // Point ouvert non renseigné → CTA de suivi au singulier, mis en avant.
    const cta = screen.getByText('Mon rendez-vous de suivi') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/portail/TOK/suivi');
    // LE BOUTON DIT CE QU'IL FAIT : il mène au centre TRUST, pas à une fiche
    // conseils — `adviceSheetRef` est écrit `null` par la route depuis toujours.
    const infos = screen.getByText(LIBELLE_INFOS) as HTMLAnchorElement;
    expect(infos.getAttribute('href')).toBe('/portail/TOK/informations');
    expect(screen.queryByText('Ma fiche conseils')).toBeNull();
  });

  // UNE INTERVENTION NON FERME NE SE LIT JAMAIS COMME UN CONSEIL.
  it('accompagne l’action retenue de sa phrase d’attente, et elle seule', async () => {
    mockFetch(
      { ok: true, protocoleDiffuse: true, finDeCycle: false, vue },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] },
    );
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByText('En attente de confirmation par votre bilan.')).toBeTruthy();
    expect(screen.queryAllByText(/En attente de confirmation/)).toHaveLength(1);
  });

  // UN PROTOCOLE EXISTE ET N'EST PAS SERVI : le dire. Le faire passer pour une
  // attente laisserait sans recours le patient qui l'a lu hier.
  it('annonce l’indisponibilité au lieu de la faire passer pour une attente', async () => {
    mockFetch(
      { ok: true, protocoleDiffuse: true, finDeCycle: false, vue: null, indisponible: true },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] },
    );
    render(<PatientCompanionHome token="TOK" />);
    expect(await screen.findByText(/n’est pas consultable pour le moment/i)).toBeTruthy();
    expect(screen.queryByText(/arrivera bientôt/i)).toBeNull();
  });

  // LE JOUR DIFFICILE NE PROPOSE JAMAIS UN PAS SUSPENDU : « si vous le pouvez
  // aujourd'hui » sur une action en attente de bilan dirait au patient le
  // contraire de ce que son praticien a posé.
  it('ne propose jamais une action retenue comme pas du jour difficile', async () => {
    mockFetch(
      {
        ok: true, protocoleDiffuse: true, finDeCycle: false,
        vue: { ...vue, actions: [vue.actions[2], vue.actions[0]] },
      },
      { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] },
    );
    render(<PatientCompanionHome token="TOK" />);
    fireEvent.click(await screen.findByText(/Jour difficile/i));
    // La PREMIÈRE action est la retenue ; c'est la suivante, ferme, qui est
    // proposée.
    expect(screen.getByText(/Si vous le pouvez aujourd’hui : Trois matins cette semaine/)).toBeTruthy();
    expect(screen.queryByText(/Si vous le pouvez aujourd’hui : Rien à faire/)).toBeNull();
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
    await screen.findByText(LIBELLE_INFOS);
    expect(screen.queryByText(LIBELLE)).toBeNull();
  });

  it('n’affiche AUCUN lien sur erreur réseau — fail-closed', async () => {
    mockSondeComprehension('reseau');
    render(<PatientCompanionHome token="TOK" />);
    await screen.findByText(LIBELLE_INFOS);
    expect(screen.queryByText(LIBELLE)).toBeNull();
  });

  it('n’affiche AUCUN lien si la route répond sans « ouvert »', async () => {
    // Un 200 qui ne DIT pas « ouvert » n'ouvre rien : la sonde exige le mot.
    mockSondeComprehension({ statut: 200, corps: { ok: true } });
    render(<PatientCompanionHome token="TOK" />);
    await screen.findByText(LIBELLE_INFOS);
    expect(screen.queryByText(LIBELLE)).toBeNull();
  });
});
