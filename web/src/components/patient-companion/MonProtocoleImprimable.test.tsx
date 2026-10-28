// @vitest-environment jsdom
import type { ReactElement } from 'react';
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
import { PIED_URGENCE_PORTAIL } from '@/lib/securite/urgenceSuicide';

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
    const pied = [...container.querySelectorAll('footer > p')].map((p) => p.textContent ?? '');
    expect(pied).toHaveLength(2);
    expect(pied[0]).toBe(`${PREFIXE_MENTION_VALIDATION} 24 octobre 2026`);
    expect(pied[1].startsWith(`${PREFIXE_MENTION_IMPRESSION} `)).toBe(true);
  });

  it('les numéros d’urgence du portail, tels quels, visibles à l’impression seulement', async () => {
    mockFetch(servi);
    const { container } = render(<MonProtocoleImprimable token="TOK" />);
    await screen.findByText('Petit-déjeuner protéiné');
    const urgence = container.querySelector('footer [data-urgence-imprimee]');
    expect(urgence).not.toBeNull();
    expect(urgence?.className).toContain('hidden');
    expect(urgence?.className).toContain('print:block');
    expect(urgence?.textContent).toContain(PIED_URGENCE_PORTAIL.titre);
    for (const ligne of PIED_URGENCE_PORTAIL.lignes) {
      for (const numero of ligne.numeros) expect(urgence?.querySelector(`a[href="tel:${numero}"]`)).not.toBeNull();
    }
  });

  it('ni « Jour difficile ? », ni liens de navigation, ni suivi ; un bouton d’impression masqué à l’impression', async () => {
    mockFetch(servi);
    const { container } = render(<MonProtocoleImprimable token="TOK" />);
    await screen.findByText('Petit-déjeuner protéiné');
    expect(screen.queryByText(/Jour difficile/)).toBeNull();
    // Les seuls liens sont les numéros d'urgence (tel:).
    const liens = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    expect(liens.every((href) => href.startsWith('tel:'))).toBe(true);
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
    // Le détail n'a pas encore été ouvert (D-315) : l'accueil le replie, la
    // page ne le fait pas lire à sa place (D-392 §1).
    ['détail jamais ouvert, sans pause', { ...servi, pauses: [], lectureDuDetail: { dejaOuvert: false } }],
  ])('%s : renvoie à l’accueil, sans rien imprimer', async (_cas, reponse) => {
    mockFetch(reponse);
    render(<MonProtocoleImprimable token="TOK" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK/questionnaires'));
    expect(screen.queryByText('Petit-déjeuner protéiné')).toBeNull();
  });
});

describe('MonProtocoleImprimable — détail déjà ouvert ou déplié d’office', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['détail déjà ouvert', { ...servi, lectureDuDetail: { dejaOuvert: true } }],
    ['détail jamais ouvert mais une action en pause (déplié d’office)', { ...servi, lectureDuDetail: { dejaOuvert: false } }],
  ])('%s : imprimé', async (_cas, reponse) => {
    mockFetch(reponse);
    render(<MonProtocoleImprimable token="TOK" />);
    expect(await screen.findByText('Petit-déjeuner protéiné')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});

// LE BANC DE CONCORDANCE (critère de fin de H69, [[D-392]] §5) : pour la même
// réponse de la route, l'imprimable porte, bloc pour bloc, le détail que
// l'accueil sert déplié — sur chaque régime de pause.
describe('concordance : l’imprimé est la page servie', () => {
  beforeEach(() => vi.clearAllMocks());

  async function blocs(element: ReactElement): Promise<string[]> {
    const rendu = render(element);
    await rendu.findByText('Petit-déjeuner protéiné');
    const html = [...rendu.container.querySelectorAll('[data-detail-protocole]')].map((n) => n.outerHTML);
    cleanup();
    return html;
  }

  it.each([
    ['trois plans, pause d’un élément, attente de bilan', servi],
    ['pause des compléments et avis rendu', {
      ...servi,
      pauses: [{ actionId: 'a1', texte: 'complements' }, { actionId: 'a2', texte: 'avis_rendu' }],
    }],
  ])('%s : les blocs du détail sont identiques à ceux de l’accueil', async (_cas, reponse) => {
    mockFetch(reponse);
    const blocsAccueil = await blocs(<PatientCompanionHome token="TOK" />);
    mockFetch(reponse);
    const blocsImprime = await blocs(<MonProtocoleImprimable token="TOK" />);
    expect(blocsAccueil).toHaveLength(2);
    expect(blocsImprime).toEqual(blocsAccueil);
  });
});
