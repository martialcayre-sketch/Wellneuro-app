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
// tête d'un dossier mineur ouvert — ni à un majeur, ni à un dossier clos.
describe('QuestionnairesHubPage — texte des mineurs', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function stubAssignations(session: Record<string, unknown>) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const corps = url.startsWith('/api/portail/assignations')
        ? {
            ok: true,
            patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola' },
            assignations: [],
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

  it('★ un dossier mineur ouvert voit le texte des mineurs, numéros appelables', async () => {
    stubAssignations({ statutAge: 'mineur', dossierOuvert: true });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.getByText(TITRE)).not.toBeNull());
    for (const numero of ['15', '112', '119']) {
      expect(screen.getByRole('link', { name: numero }).getAttribute('href')).toBe(`tel:${numero}`);
    }
  });

  it('★ un dossier mineur clos ne voit pas le texte des mineurs', async () => {
    stubAssignations({ statutAge: 'mineur', dossierOuvert: false });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    expect(screen.queryByText(TITRE)).toBeNull();
  });

  it('★ un dossier majeur ne voit pas le texte des mineurs', async () => {
    stubAssignations({ statutAge: 'majeur', dossierOuvert: true });
    render(<QuestionnairesHubPage />);
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    expect(screen.queryByText(TITRE)).toBeNull();
  });
});
