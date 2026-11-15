// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Routeur STABLE : `charger` en dépend.
const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { TransmissionCompteRendu } from './TransmissionCompteRendu';

// U34, Q2 a du prototype PAT-6 ([[D-481]] complément DOC-11 ; [[D-488]]
// amendement DOC-11) : un DÉPÔT refusé en 401 ne renvoie plus à l'entrée ; la
// page garde le fichier, affiche le message de la route SOUS le bouton, puis
// T-36 dans un nouvel onglet. Le chargement et l'accusé gardent leur renvoi
// silencieux à l'entrée.

const PRET = { ok: true, documents: [], accuseRequis: false, dossierOuvert: true, plafond: null };
const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';

type Reponse = { status: number; corps: unknown };
let appels: { url: string; init?: RequestInit }[];
let etats: Reponse[];
let depots: Reponse[];
let lecture: Reponse;

beforeEach(() => {
  appels = [];
  etats = [];
  depots = [];
  lecture = { status: 200, corps: { ok: true } };
  routeur.replace.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      const r = url.includes('/trust/lecture')
        ? lecture
        : init?.method === 'POST'
          ? depots.shift()!
          : (etats.length > 1 ? etats.shift()! : etats[0] ?? { status: 200, corps: PRET });
      return { ok: r.status < 300, status: r.status, json: async () => r.corps } as Response;
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function choisirEtEnvoyer() {
  const { container } = render(<TransmissionCompteRendu token="PAT_SEED_02" />);
  const bouton = (await screen.findByRole('button', { name: 'Envoyer à mon praticien' })) as HTMLButtonElement;
  const champ = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(champ, { target: { files: [new File(['%PDF-1.7'], 'cr.pdf', { type: 'application/pdf' })] } });
  fireEvent.click(bouton);
  return bouton;
}

describe('TransmissionCompteRendu — dépôt refusé en 401 (Q2 a)', () => {
  it('la page reste : message sous le bouton, T-36 dans un nouvel onglet, fichier gardé, aucune relecture', async () => {
    depots.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
    const bouton = await choisirEtEnvoyer();

    const message = await screen.findByText(SESSION_EXPIREE);
    expect(bouton.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const lien = screen.getByRole('link', { name: 'Me reconnecter' });
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(message.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(routeur.replace).not.toHaveBeenCalled();
    expect(appels.filter(a => a.init?.method !== 'POST')).toHaveLength(1);
    expect(bouton.disabled).toBe(false);
  });

  it('rien ne repart seul ; le renvoi manuel part et réussit', async () => {
    depots.push({ status: 401, corps: { ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE } });
    depots.push({ status: 201, corps: { ok: true } });
    const bouton = await choisirEtEnvoyer();
    await screen.findByText(SESSION_EXPIREE);
    expect(appels.filter(a => a.init?.method === 'POST')).toHaveLength(1);

    fireEvent.click(bouton);
    expect(await screen.findByText('Votre compte rendu a été transmis à votre praticien.')).toBeTruthy();
    expect(screen.queryByText(SESSION_EXPIREE)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
    expect(appels.filter(a => a.init?.method === 'POST')).toHaveLength(2);
  });

  it('un autre refus ne propose pas T-36', async () => {
    depots.push({ status: 422, corps: { ok: false, error: 'Ce fichier n’est pas accepté.' } });
    await choisirEtEnvoyer();
    await screen.findByText('Ce fichier n’est pas accepté.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('le chargement refusé en 401 garde son renvoi silencieux', async () => {
    etats = [{ status: 401, corps: { ok: false, error: SESSION_EXPIREE } }];
    render(<TransmissionCompteRendu token="PAT_SEED_02" />);
    await waitFor(() => expect(routeur.replace).toHaveBeenCalledWith('/portail/PAT_SEED_02'));
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('l’accusé refusé en 401 garde son renvoi silencieux', async () => {
    etats = [{ status: 200, corps: { ...PRET, accuseRequis: true } }];
    lecture = { status: 401, corps: { ok: false, error: SESSION_EXPIREE } };
    render(<TransmissionCompteRendu token="PAT_SEED_02" />);
    fireEvent.click(await screen.findByRole('button', { name: 'J’en ai pris connaissance' }));
    await waitFor(() => expect(routeur.replace).toHaveBeenCalledWith('/portail/PAT_SEED_02'));
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });
});
