// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { FournisseurFriseNavigable } from '@/components/patient/frise/FriseEtapesNavigable';

/*
 * FRISE DU HUB, DRAPEAU FERMÉ ET OUVERT ([[D-423]] §7 et §8, lot L2b).
 *
 * Fermé : la frise d'avant, repère non navigable, sans `nav`. Ouvert : la frise
 * navigable, branchée sur les signaux que le hub lit déjà — l'état dérivé des
 * étapes 5 et 6, `bilanConsultable` et la liste des questionnaires rendue —
 * pour le seul dossier majeur ([[D-283]] §5).
 */

const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn(), push: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_TEST' }),
  useRouter: () => routeur,
}));

import QuestionnairesHubPage from './page';

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

async function rendre(ouverte: boolean, session: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const corps = url.startsWith('/api/portail/assignations')
      ? {
          ok: true,
          patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola' },
          assignations: [EN_ATTENTE],
          agendas: [],
          agendasAlimentaires: [],
          derniereReponseLe: null,
          statutAge: 'majeur',
          dossierOuvert: true,
          parcours: { consultationStatut: null, bookletEnvoye: false, bilanConsultable: false },
          ...session,
        }
      : url.startsWith('/api/portail/trust/etat')
        ? { ok: true, avantDeCommencerRequis: false }
        : { ok: false, error: 'indisponible' };
    return { ok: true, status: 200, json: async () => corps };
  }));
  render(
    <FournisseurFriseNavigable ouverte={ouverte}>
      <QuestionnairesHubPage />
    </FournisseurFriseNavigable>,
  );
  await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
}

const frise = () => screen.getByRole('navigation', { name: 'Étapes de votre parcours' });

describe('frise du hub — drapeau fermé', () => {
  it('la frise d’avant : une liste nommée, sans nav, sans lien ni bouton', async () => {
    await rendre(false, {});
    expect(screen.queryByRole('navigation', { name: 'Étapes de votre parcours' })).toBeNull();
    const liste = screen.getByRole('list', { name: 'Étapes de votre parcours' });
    expect(within(liste).queryAllByRole('link')).toHaveLength(0);
    expect(within(liste).queryAllByRole('button')).toHaveLength(0);
  });

  it('sans le layout, le contexte reste fermé', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: false }) })));
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    expect(screen.queryByRole('navigation', { name: 'Étapes de votre parcours' })).toBeNull();
  });
});

describe('frise du hub — drapeau ouvert', () => {
  it('majeur, la liste rendue : « Questionnaires » mène à la liste, qui porte l’ancre', async () => {
    await rendre(true, { assignations: [EN_ATTENTE, TRANSMIS] });
    const lien = within(frise()).getByRole('link', { name: /Questionnaires/ });
    expect(lien.getAttribute('href')).toBe('#mes-questionnaires');
    expect(lien.getAttribute('aria-current')).toBe('step');
    expect(document.getElementById('mes-questionnaires')?.textContent).toContain('Questionnaire transmis');
  });

  it('majeur, le seul questionnaire remonté dans le fil : la liste n’est pas rendue, cible « Mon parcours »', async () => {
    await rendre(true, {});
    expect(document.getElementById('mes-questionnaires')).toBeNull();
    expect(document.getElementById('mon-parcours')?.textContent).toContain('Questionnaire en attente');
    expect(within(frise()).getByRole('link', { name: /Questionnaires/ }).getAttribute('href')).toBe('#mon-parcours');
  });

  // [[D-283]] §5 : aucune surface neuve à un mineur, âge inconnu traité comme
  // mineur. La garde suit l'âge, pas la clôture (Q36).
  for (const [cas, session] of [
    ['mineur ouvert', { statutAge: 'mineur' }],
    ['mineur clos, servi « majeur » par le hub', { statutAge: 'mineur', dossierOuvert: false }],
    ['âge absent de la réponse', { statutAge: undefined }],
  ] as const) {
    it(`${cas} : la frise d’avant, sans nav`, async () => {
      await rendre(true, session);
      expect(screen.queryByRole('navigation', { name: 'Étapes de votre parcours' })).toBeNull();
      expect(screen.getByRole('list', { name: 'Étapes de votre parcours' })).toBeTruthy();
    });
  }

  it('majeur clos, rien à transmettre : même règle, le transmis reste dans la liste', async () => {
    await rendre(true, { dossierOuvert: false, assignations: [EN_ATTENTE, TRANSMIS] });
    expect(document.getElementById('mes-questionnaires')?.textContent).toContain('Questionnaire transmis');
    expect(within(frise()).getAllByRole('link')).toHaveLength(1);
  });

  it('analyse en cours : « Analyse du praticien » ouvre le texte d’attente, « Questionnaires » reste un lien', async () => {
    await rendre(true, {
      assignations: [TRANSMIS],
      parcours: { consultationStatut: 'en_cours', bookletEnvoye: false, bilanConsultable: false },
    });
    const bouton = within(frise()).getByRole('button', { name: /Analyse du praticien/ });
    expect(bouton.getAttribute('aria-current')).toBe('step');
    expect(document.getElementById(bouton.getAttribute('aria-controls')!)?.textContent).toBe(
      'Votre praticien prépare votre restitution à partir des éléments transmis. Vous la retrouverez ici dès qu’elle sera prête.',
    );
    expect(within(frise()).getByRole('link', { name: /Questionnaires/ }).getAttribute('href')).toBe('#mes-questionnaires');
  });

  it('éléments transmis, analyse non commencée : la phrase déjà servie', async () => {
    await rendre(true, { assignations: [TRANSMIS] });
    const bouton = within(frise()).getByRole('button', { name: /Analyse du praticien/ });
    expect(document.getElementById(bouton.getAttribute('aria-controls')!)?.textContent).toBe(
      'Vos éléments ont été transmis.',
    );
  });

  it('restitution, bilan consultable : « Restitution » mène au bilan', async () => {
    await rendre(true, {
      assignations: [TRANSMIS],
      parcours: { consultationStatut: 'validee', bookletEnvoye: true, bilanConsultable: true },
    });
    const lien = within(frise()).getByRole('link', { name: /Restitution/ });
    expect(lien.getAttribute('href')).toBe('/portail/PAT_TEST/bilan');
    expect(lien.getAttribute('aria-current')).toBe('step');
    expect(within(frise()).queryByRole('button')).toBeNull();
  });

  it('restitution, bilan rejeté après coup : la frise ne recule pas, « Restitution » n’est plus cliquable', async () => {
    await rendre(true, {
      assignations: [TRANSMIS],
      parcours: { consultationStatut: 'validee', bookletEnvoye: true, bilanConsultable: false },
    });
    expect(within(frise()).queryByRole('link', { name: /Restitution/ })).toBeNull();
    expect(within(frise()).getByText('Restitution').closest('[aria-current]')?.getAttribute('aria-current')).toBe('step');
  });
});
