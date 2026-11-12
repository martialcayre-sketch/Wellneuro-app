// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// Routeur STABLE, comme celui de Next : un objet neuf à chaque rendu relance
// l'effet de session à chaque rendu (voir `page.test.tsx`).
const { routeur } = vi.hoisted(() => ({ routeur: { replace: () => {}, push: () => {} } }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_SEED_01' }),
  useRouter: () => routeur,
}));

import PortailPage from './page';

// Refonte Lien, PAT-2 ([[D-481]], complément DOC-4 ; [[D-488]], DOC-5) :
// - Q5a : « Me reconnecter » (T-36) sous « Session expirée. Reconnectez-vous. »,
//   vers la page de connexion, dans le même onglet ;
// - Q6b : la mention de conservation (T-37 à T-39) ne paraît qu'après une
//   écriture du brouillon réussie, avec l'heure de cette écriture ;
// - T-31b : « Continuer vers votre situation ».
// Identité de fixture uniquement.

const T37 = /^Brouillon gardé dans cet onglet — dernière sauvegarde à \d{2}:\d{2}\. Il ne sera transmis à votre praticien qu’après validation\.$/;
const T38 = 'Connexion interrompue — vos réponses restent conservées dans cet onglet.';
const T39 = 'Transmission non terminée — vos réponses restent conservées dans cet onglet.';
const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';
const META = 'wellneuro:wizard-draft-meta:fiche:PAT_SEED_01';

function repondre(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } });
}

function session(consentementDonne: boolean) {
  return {
    ok: true,
    patient: { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
    consultation: {
      idConsultation: 'CONS_TEST', statut: 'en_cours', motif: null,
      consentementDonne, ficheRemplie: false, anamneseRemplie: false,
    },
    premiereAssignation: null,
  };
}

/** `envoi` : réponse des routes d'écriture (consentement, fiche). */
function servir(consentementDonne: boolean, envoi: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/portail/session') return repondre(session(consentementDonne));
    if (url.startsWith('/api/portail/trust/etat')) return repondre({ ok: true, avantDeCommencerRequis: false });
    return envoi();
  }));
}

async function ouvrirFiche(): Promise<HTMLSelectElement> {
  render(<PortailPage />);
  await screen.findByText('Fiche de renseignements');
  return document.querySelector('select') as HTMLSelectElement;
}

/** Sections 1 → 3, puis certification ; rend le bouton d'envoi. */
function allerAuBoutonFinal(select: HTMLSelectElement): HTMLElement {
  fireEvent.change(select, { target: { value: 'En couple' } });
  fireEvent.click(screen.getByRole('button', { name: /Suivant/ }));
  const profession = document.querySelector('input[required]') as HTMLInputElement;
  fireEvent.change(profession, { target: { value: 'Retraitée' } });
  fireEvent.click(screen.getByRole('button', { name: /Suivant/ }));
  fireEvent.click(screen.getByRole('checkbox'));
  return screen.getByRole('button', { name: 'Continuer vers votre situation' });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('entrée — brouillon de la fiche (Q6b, T-37 à T-39)', () => {
  it('écriture réussie : T-37 avec l’heure de cette écriture ; refus 401 : T-39, « Me reconnecter » vers la connexion', async () => {
    servir(true, async () => repondre({ ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE }, 401));
    const select = await ouvrirFiche();

    fireEvent.change(select, { target: { value: 'Célibataire' } });
    expect(screen.getByText(T37)).not.toBeNull();
    expect(screen.queryByText(/sur cet appareil/)).toBeNull();

    fireEvent.click(allerAuBoutonFinal(select));

    expect((await screen.findByRole('alert')).textContent).toBe(SESSION_EXPIREE);
    const lien = screen.getByRole('link', { name: 'Me reconnecter' });
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBeNull();
    expect(screen.getByText(T39)).not.toBeNull();
  });

  it('écriture échouée : ni confirmation, ni heure antérieure, ni « restent conservées » sur coupure réseau', async () => {
    servir(true, async () => { throw new TypeError('Failed to fetch'); });
    const select = await ouvrirFiche();

    fireEvent.change(select, { target: { value: 'Célibataire' } });
    expect(screen.getByText(T37)).not.toBeNull();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    fireEvent.change(select, { target: { value: 'Veuf·ve' } });
    expect(screen.queryByText(/Brouillon gardé/)).toBeNull();
    expect(sessionStorage.getItem(META)).toBeNull();

    fireEvent.click(allerAuBoutonFinal(select));

    expect((await screen.findByRole('alert')).textContent).toBe('Erreur réseau. Réessayez.');
    expect(screen.queryByText(T38)).toBeNull();
    expect(screen.queryByText(/restent conservées/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('coupure réseau après une écriture réussie : T-38', async () => {
    servir(true, async () => { throw new TypeError('Failed to fetch'); });
    const select = await ouvrirFiche();
    fireEvent.click(allerAuBoutonFinal(select));
    expect(await screen.findByText(T38)).not.toBeNull();
  });
});

describe('entrée — consentement, session expirée (Q5a, T-36)', () => {
  it('le 401 de /api/portail/consentement montre « Me reconnecter » sous le message', async () => {
    servir(false, async () => repondre({ ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE }, 401));
    render(<PortailPage />);
    await screen.findByText('Votre consentement au suivi');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Donner mon consentement' }));

    expect((await screen.findByRole('alert')).textContent).toBe(SESSION_EXPIREE);
    expect(screen.getByRole('link', { name: 'Me reconnecter' }).getAttribute('href')).toBe('/portail/connexion');
  });

  it('un autre refus ne propose pas de reconnexion', async () => {
    servir(false, async () => repondre({ ok: false, error: 'Accès non reconnu ou révoqué.' }, 403));
    render(<PortailPage />);
    await screen.findByText('Votre consentement au suivi');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Donner mon consentement' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Accès non reconnu ou révoqué.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });
});
