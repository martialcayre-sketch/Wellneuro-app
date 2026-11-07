// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

// Routeur stable, comme celui de Next (voir `[token]/page.test.tsx`).
const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn(), push: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_TEST' }),
  useRouter: () => routeur,
}));

import QuestionnairesHubPage from './page';

// ACT-5 (D-341 §5) : la page des questionnaires sert le texte des mineurs en
// tête d'un dossier mineur ouvert — ni à un majeur, ni à un dossier clos, à qui
// reste le seul encart d'urgence (amendement du 2026-11-07).
describe('QuestionnairesHubPage — texte des mineurs', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // Une assignation EN ATTENTE est servie par la route : la page doit la taire
  // pendant la pause d'un mineur. Fixture neutre.
  const ASSIGNATION = {
    idAssignation: 'ASS_TEST',
    idQuestionnaire: 'Q_TEST',
    titre: 'Questionnaire de test',
    statut: 'En attente',
    statutReponses: '',
    dateLimite: null,
    estEnAttenteSaisie: true,
    duree: '5 min',
  };

  function stubAssignations(session: Record<string, unknown>) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const corps = url.startsWith('/api/portail/assignations')
        ? {
            ok: true,
            patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola' },
            assignations: [ASSIGNATION],
            agendas: [],
            agendasAlimentaires: [],
            derniereReponseLe: null,
            parcours: { consultationStatut: null, bookletEnvoye: false, bilanConsultable: false },
            ...session,
          }
        : url.startsWith('/api/portail/trust/etat')
          ? { ok: true, avantDeCommencerRequis: false }
          : { ok: false, error: 'indisponible' };
      return { ok: true, status: 200, json: async () => corps };
    }));
  }

  const TITRE = 'Avant 18 ans, un parent donne d’abord son accord';
  const lienVersTest = () =>
    screen.queryAllByRole('link').filter(l => l.getAttribute('href') === '/portail/PAT_TEST/questionnaires/ASS_TEST');

  it('★ un dossier mineur ouvert voit le texte des mineurs, numéros appelables', async () => {
    stubAssignations({ statutAge: 'mineur', dossierOuvert: true });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.getByText(TITRE)).not.toBeNull());
    expect(lienVersTest()).toHaveLength(0);
    expect(screen.queryByText('Questionnaire de test')).toBeNull();
    for (const numero of ['15', '112', '119']) {
      expect(screen.getByRole('link', { name: numero }).getAttribute('href')).toBe(`tel:${numero}`);
    }
  });

  it('★ un dossier mineur clos ne voit pas le texte des mineurs, mais garde l’encart d’urgence', async () => {
    stubAssignations({ statutAge: 'mineur', dossierOuvert: false });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    expect(screen.queryByText(TITRE)).toBeNull();
    expect(screen.queryByText('Ton avis compte')).toBeNull();
    expect(screen.getByRole('heading', { name: 'En cas d’urgence' })).not.toBeNull();
    for (const numero of ['15', '112', '119']) {
      expect(screen.getByRole('link', { name: numero }).getAttribute('href')).toBe(`tel:${numero}`);
    }
  });

  it('★ un dossier majeur clos n’a pas l’encart d’urgence des mineurs', async () => {
    stubAssignations({ statutAge: 'majeur', dossierOuvert: false });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    expect(screen.queryByRole('heading', { name: 'En cas d’urgence' })).toBeNull();
  });

  it('★ un dossier majeur ne voit pas le texte des mineurs, et voit son questionnaire', async () => {
    stubAssignations({ statutAge: 'majeur', dossierOuvert: true });
    render(<QuestionnairesHubPage />);
    // Contre-épreuve de la fixture : servie à un majeur, l'assignation est
    // proposée (par « Mon parcours » ou par la liste).
    await waitFor(() => expect(lienVersTest().length).toBeGreaterThan(0));
    expect(screen.queryByText(TITRE)).toBeNull();
  });

  // [[D-423]] §6 (Q18) : le compteur « N questionnaires à compléter · ≈ N min »
  // est retiré ; aucune famille d'exceptions de D-333 ne l'admet.
  it('★ le compteur des questionnaires à compléter n’est plus rendu', async () => {
    stubAssignations({ statutAge: 'majeur', dossierOuvert: true });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(lienVersTest().length).toBeGreaterThan(0));
    expect(screen.queryByText(/questionnaires? à compléter/)).toBeNull();
    expect(document.body.textContent).not.toContain('≈');
  });
});

// Arbitrage du 2026-11-04 : un dossier clos ne recueille plus rien. Le hub
// retire ce qui reste à compléter, et garde ce qui a été transmis (lecture des
// archives). Quatre cas : majeur, mineur, clos majeur, clos mineur.
describe('QuestionnairesHubPage — parcours d’un dossier clos', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const EN_ATTENTE = {
    idAssignation: 'ASS_ATTENTE',
    idQuestionnaire: 'Q_ATTENTE',
    titre: 'Questionnaire en attente',
    statut: 'En attente',
    statutReponses: '',
    dateLimite: null,
    estEnAttenteSaisie: true,
    duree: '5 min',
  };
  const TRANSMIS = {
    idAssignation: 'ASS_TRANSMIS',
    idQuestionnaire: 'Q_TRANSMIS',
    titre: 'Questionnaire transmis',
    statut: 'Complété',
    statutReponses: 'verrouille',
    dateLimite: null,
    estEnAttenteSaisie: false,
    duree: '5 min',
  };

  function stub(session: Record<string, unknown>) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const corps = url.startsWith('/api/portail/assignations')
        ? {
            ok: true,
            patient: { idPatient: 'PAT_TEST', prenom: 'Michel', nom: 'Dogné' },
            assignations: [EN_ATTENTE, TRANSMIS],
            agendas: [],
            agendasAlimentaires: [],
            derniereReponseLe: null,
            parcours: { consultationStatut: null, bookletEnvoye: false, bilanConsultable: false },
            ...session,
          }
        : url.startsWith('/api/portail/trust/etat')
          ? { ok: true, avantDeCommencerRequis: false }
          : { ok: false, error: 'indisponible' };
      return { ok: true, status: 200, json: async () => corps };
    }));
  }

  async function rendre(session: Record<string, unknown>) {
    stub(session);
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
  }

  const lienVers = (id: string) =>
    screen.queryAllByRole('link').filter(l => l.getAttribute('href') === `/portail/PAT_TEST/questionnaires/${id}`);

  it('majeur ouvert : le questionnaire en attente est proposé', async () => {
    await rendre({ statutAge: 'majeur', dossierOuvert: true });
    expect(lienVers('ASS_ATTENTE').length).toBeGreaterThan(0);
  });

  it('mineur ouvert : rien n’est proposé (pause du mineur, inchangée)', async () => {
    await rendre({ statutAge: 'mineur', dossierOuvert: true });
    expect(lienVers('ASS_ATTENTE')).toHaveLength(0);
    expect(screen.queryByText('Questionnaire en attente')).toBeNull();
  });

  it('★ clos majeur : le questionnaire en attente n’est plus proposé, le transmis reste consultable', async () => {
    await rendre({ statutAge: 'majeur', dossierOuvert: false });
    expect(lienVers('ASS_ATTENTE')).toHaveLength(0);
    expect(screen.queryByText('Questionnaire en attente')).toBeNull();
    expect(screen.queryByText(/Commencer/)).toBeNull();
    expect(screen.getByText('Questionnaire transmis')).not.toBeNull();
    expect(lienVers('ASS_TRANSMIS')).toHaveLength(1);
  });

  it('★ clos mineur : le questionnaire en attente n’est plus proposé, le transmis reste consultable', async () => {
    await rendre({ statutAge: 'mineur', dossierOuvert: false });
    expect(lienVers('ASS_ATTENTE')).toHaveLength(0);
    expect(screen.queryByText('Questionnaire en attente')).toBeNull();
    expect(screen.queryByText(/Commencer/)).toBeNull();
    expect(screen.getByText('Questionnaire transmis')).not.toBeNull();
    expect(lienVers('ASS_TRANSMIS')).toHaveLength(1);
  });
});
