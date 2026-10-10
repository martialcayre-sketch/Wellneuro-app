// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'jeton-de-test' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import PortailPage from './page';

// [[D-277]] §1 sur l'anamnèse : la case « Idées noires ou suicidaires »
// cochée fait apparaître le message signé sous la liste des signaux, tant
// qu'elle reste cochée. Identité de fixture uniquement.

const TITRE = 'Vous venez d’indiquer des idées de mort ou de suicide.';

function repondre(corps: unknown): Response {
  return new Response(JSON.stringify(corps), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/portail/session') {
      return repondre({
        ok: true,
        patient: { idPatient: 'PAT_SEED_02', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@example.test' },
        consultation: {
          idConsultation: 'CONS_TEST', statut: 'en_cours', motif: null,
          consentementDonne: true, ficheRemplie: true, anamneseRemplie: false,
        },
        premiereAssignation: null,
      });
    }
    if (url.startsWith('/api/portail/trust/etat')) return repondre({ ok: true, avantDeCommencerRequis: false });
    return repondre({ ok: false });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function allerAuxSignaux(): Promise<void> {
  render(<PortailPage />);
  await screen.findByText('Anamnèse');
  for (let i = 0; i < 20 && !screen.queryByText('Signaux à signaler'); i += 1) {
    for (const champ of document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>('textarea[required], input[required]')) {
      if (!champ.value) fireEvent.change(champ, { target: { value: 'Fatigue persistante depuis six mois.' } });
    }
    fireEvent.click(screen.getByRole('button', { name: /Suivant/ }));
  }
  expect(screen.getByText('Signaux à signaler')).not.toBeNull();
}

// UN SEUL RENDU de la page : deux rendus complets du portail dans un même
// processus de test épuisent sa mémoire (constaté le 2026-10-10, chacun passe
// seul). Les trois états se jouent donc à la suite, sur le même écran.
describe('anamnèse — message sur la case « Idées noires ou suicidaires » ([[D-277]] §1)', () => {
  it('un autre signal ne le montre pas ; la case cochée le montre, décochée le retire ; l’encart reste', async () => {
    await allerAuxSignaux();
    expect(screen.queryByText(TITRE)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fièvre prolongée / sueurs nocturnes' }));
    expect(screen.queryByText(TITRE)).toBeNull();
    const caseSuicide = screen.getByRole('checkbox', { name: 'Idées noires ou suicidaires' });
    fireEvent.click(caseSuicide);
    expect(screen.getByRole('alert').textContent).toContain(TITRE);
    fireEvent.click(caseSuicide);
    expect(screen.queryByText(TITRE)).toBeNull();
    expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).not.toBeNull();
  });
});
