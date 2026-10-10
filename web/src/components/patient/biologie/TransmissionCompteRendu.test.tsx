// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Un routeur STABLE, comme celui de Next : un objet neuf à chaque rendu
// relancerait le chargement en boucle.
const { replace, routeur } = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, routeur: { replace } };
});
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { TransmissionCompteRendu } from './TransmissionCompteRendu';

// L'écran de transmission ([[D-269]], LOT-04) : il ne fait que dire ce que la
// route répond — accusé d'abord, puis le dépôt ; la liste ne montre que date et
// statut.

type Corps = Record<string, unknown>;

function serveur(etats: Corps[], depot: { status: number; body: Corps } = { status: 201, body: { ok: true } }) {
  let i = 0;
  const fetchMock = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entree);
    const methode = init?.method ?? 'GET';
    let status = 200;
    let body: Corps;
    if (url.includes('/api/portail/trust/lecture')) body = { ok: true };
    else if (methode === 'POST') ({ status, body } = depot);
    else body = etats[Math.min(i++, etats.length - 1)];
    return { ok: status < 300, status, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const PRET = { ok: true, documents: [], accuseRequis: false, dossierOuvert: true, plafond: null };

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TransmissionCompteRendu', () => {
  it('sans accusé : présente « L’intelligence artificielle dans Wellneuro », l’accuse, puis ouvre le dépôt', async () => {
    const fetchMock = serveur([{ ...PRET, accuseRequis: true }, PRET]);
    render(<TransmissionCompteRendu token="TOK" />);
    expect(await screen.findByText('Avant votre premier envoi')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Envoyer à mon praticien' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'J’en ai pris connaissance' }));
    expect(await screen.findByRole('button', { name: 'Envoyer à mon praticien' })).toBeTruthy();
    const accuse = fetchMock.mock.calls.find(([u]) => String(u).includes('/trust/lecture'));
    expect(JSON.parse(String(accuse?.[1]?.body))).toEqual({ documentKey: 'usage_ia', type: 'pris_connaissance' });
  });

  it('envoie le fichier choisi, et relit la liste', async () => {
    const fetchMock = serveur([PRET, { ...PRET, documents: [{ deposeLe: '2026-10-07T09:00:00.000Z', statut: 'en_attente' }] }]);
    const { container } = render(<TransmissionCompteRendu token="TOK" />);
    const bouton = (await screen.findByRole('button', { name: 'Envoyer à mon praticien' })) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    // La région qui annonce le succès existe AVANT lui, vide (LOT-11).
    const annonce = screen.getByRole('status');
    expect(annonce.textContent).toBe('');
    const champ = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(champ, { target: { files: [new File(['%PDF-1.7'], 'cr.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(bouton);
    expect(await screen.findByText('Votre compte rendu a été transmis à votre praticien.')).toBeTruthy();
    expect(screen.getByRole('status')).toBe(annonce);
    expect(annonce.textContent).toBe('Votre compte rendu a été transmis à votre praticien.');
    expect(await screen.findByText('En attente')).toBeTruthy();
    const envoi = fetchMock.mock.calls.find(([u, init]) => String(u) === '/api/portail/comptes-rendus' && init?.method === 'POST');
    expect(envoi?.[1]?.body).toBeInstanceOf(FormData);
  });

  it('la liste dit date et statut, et rien d’autre ; un plafond ou un suivi clos remplace le dépôt', async () => {
    serveur([{
      ...PRET,
      plafond: 'plafond_en_attente',
      documents: [
        { deposeLe: '2026-10-07T09:00:00.000Z', statut: 'illisible' },
        { deposeLe: '2026-10-06T09:00:00.000Z', statut: 'valide' },
      ],
    }]);
    render(<TransmissionCompteRendu token="TOK" />);
    expect(await screen.findByText('Illisible')).toBeTruthy();
    expect(screen.getByText('Validé')).toBeTruthy();
    expect(screen.getByText(/Trois documents attendent déjà/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Envoyer à mon praticien' })).toBeNull();

    cleanup();
    serveur([{ ...PRET, dossierOuvert: false }]);
    render(<TransmissionCompteRendu token="TOK" />);
    expect(await screen.findByText(/Votre suivi est clôturé/)).toBeTruthy();
  });

  it('session expirée : retour au portail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }) as Response));
    render(<TransmissionCompteRendu token="TOK" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK'));
  });
});
