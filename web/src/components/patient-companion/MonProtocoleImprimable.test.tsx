// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

import { MonProtocoleImprimable } from './MonProtocoleImprimable';
import { PatientCompanionHome } from './PatientCompanionHome';
import { TEXTE_PAUSE_ELEMENT } from '@/lib/trust/pauseEffetIndesirable';
import { PARAGRAPHES_ENCART_CONDUITE, TITRE_ENCART_CONDUITE } from '@/lib/portail/texteEncartConduite';
import { CHAPEAU_TROIS_PLANS } from '@/lib/portail/texteTroisPlans';
import { PREFIXE_MENTION_VALIDATION } from '@/lib/portail/texteMentionValidation';
import { PREFIXE_MENTION_IMPRESSION } from '@/lib/portail/texteProtocoleImprimable';

// L'IMPRIMABLE DU PROTOCOLE ([[D-392]], lettre bh). Fixture : trois actions —
// une avec ses trois plans, une en pause, une en attente de bilan — pour que la
// concordance porte sur chaque régime du détail.
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
const servi = {
  ok: true, protocoleDiffuse: true, finDeCycle: false, vue, imprimable: true, encartConduite: true,
  valideLe: '2026-10-24T09:00:00.000Z',
  troisPlans: [{ actionId: 'a1', idealPlan: 'Chaque matin', rescuePlan: 'Un fruit et un yaourt' }],
  pauses: [{ actionId: 'a2', texte: 'element' }],
};
const checkinVide = { ok: true, protocoleDiffuse: true, pointEtapeOuvert: null, points: [] };

function mockFetch(proto: unknown) {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const body = String(url).endsWith('/checkin') ? checkinVide : proto;
    return Promise.resolve({ json: () => Promise.resolve(body) } as Response);
  }) as unknown as typeof fetch;
}

afterEach(cleanup);

describe('MonProtocoleImprimable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('imprime le détail servi : actions sous leur régime, critère, encart', async () => {
    mockFetch(servi);
    render(<MonProtocoleImprimable token="TOK" />);
    expect(await screen.findByText('Petit-déjeuner protéiné')).toBeTruthy();
    expect(screen.getByText(CHAPEAU_TROIS_PLANS)).toBeTruthy();
    expect(screen.getByText('Un fruit et un yaourt')).toBeTruthy();
    expect(screen.getByText(TEXTE_PAUSE_ELEMENT)).toBeTruthy();
    expect(screen.getByText('En attente de confirmation par votre bilan.')).toBeTruthy();
    expect(screen.getByText('Réveils nocturnes < 2 par nuit à J21.')).toBeTruthy();
    expect(screen.getByText(/Sommeil fragmenté, réveils nocturnes/)).toBeTruthy();
    expect(screen.getByText(TITRE_ENCART_CONDUITE)).toBeTruthy();
    for (const paragraphe of PARAGRAPHES_ENCART_CONDUITE) expect(screen.getByText(paragraphe)).toBeTruthy();
  });

  it('pied daté : validation de la version, puis impression', async () => {
    mockFetch(servi);
    const { container } = render(<MonProtocoleImprimable token="TOK" />);
    await screen.findByText('Petit-déjeuner protéiné');
    const pied = [...container.querySelectorAll('footer p')].map((p) => p.textContent ?? '');
    expect(pied).toHaveLength(2);
    expect(pied[0]).toBe(`${PREFIXE_MENTION_VALIDATION} 24 octobre 2026`);
    expect(pied[1].startsWith(`${PREFIXE_MENTION_IMPRESSION} `)).toBe(true);
  });

  it('ni « Jour difficile ? », ni liens, ni suivi ; un bouton d’impression masqué à l’impression', async () => {
    mockFetch(servi);
    const { container } = render(<MonProtocoleImprimable token="TOK" />);
    await screen.findByText('Petit-déjeuner protéiné');
    expect(screen.queryByText(/Jour difficile/)).toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(0);
    const bouton = screen.getByText('Imprimer ou enregistrer en PDF');
    expect(bouton.closest('.print\\:hidden')).not.toBeNull();
  });

  it('n’écrit rien : chaque appel est une lecture de la route du protocole', async () => {
    mockFetch(servi);
    render(<MonProtocoleImprimable token="TOK" />);
    await screen.findByText('Petit-déjeuner protéiné');
    const appels = vi.mocked(global.fetch).mock.calls;
    expect(appels.length).toBeGreaterThan(0);
    for (const [url, options] of appels) {
      expect(url).toBe('/api/portail/protocole');
      expect(options).toEqual({ cache: 'no-store' });
    }
  });

  it.each([
    ['non annoncé par la route (drapeau fermé, dossier non majeur)', { ...servi, imprimable: undefined }],
    ['sans protocole servi', { ok: true, protocoleDiffuse: false, finDeCycle: false, vue: null }],
    ['protocole indisponible', { ok: true, protocoleDiffuse: true, finDeCycle: false, vue: null, indisponible: true }],
    ['fin de cycle', { ...servi, finDeCycle: true }],
    ['réponse en échec', { ok: false }],
  ])('%s : renvoie à l’accueil, sans rien imprimer', async (_cas, reponse) => {
    mockFetch(reponse);
    render(<MonProtocoleImprimable token="TOK" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK/questionnaires'));
    expect(screen.queryByText('Petit-déjeuner protéiné')).toBeNull();
  });
});

// LE BANC DE CONCORDANCE (critère de fin de H69, [[D-392]] §5) : pour la même
// réponse de la route, l'imprimable porte, bloc pour bloc, le détail que
// l'accueil sert déplié.
describe('concordance : l’imprimé est la page servie', () => {
  beforeEach(() => vi.clearAllMocks());

  it('les blocs du détail sont identiques à ceux de l’accueil', async () => {
    mockFetch(servi);
    const accueil = render(<PatientCompanionHome token="TOK" />);
    await accueil.findByText('Petit-déjeuner protéiné');
    const blocsAccueil = [...accueil.container.querySelectorAll('[data-detail-protocole]')].map((n) => n.outerHTML);
    cleanup();

    mockFetch(servi);
    const imprime = render(<MonProtocoleImprimable token="TOK" />);
    await imprime.findByText('Petit-déjeuner protéiné');
    const blocsImprime = [...imprime.container.querySelectorAll('[data-detail-protocole]')].map((n) => n.outerHTML);

    expect(blocsAccueil).toHaveLength(2);
    expect(blocsImprime).toEqual(blocsAccueil);
  });
});
