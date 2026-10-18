// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignatureNabmLotPanel } from './SignatureNabmLotPanel';

function acte(codeActe: string, libelle: string) {
  return {
    codeActe,
    libelle,
    coefficientB: 10,
    inactif: false,
    ententePrealable: null,
    acteReserve: null,
    remboursementTotal: null,
  };
}

const LIGNES = [
  {
    analyteCode: 'BIO_ALAT',
    analyteLibelle: 'ALAT',
    situation: 'libelle_explicite',
    codeActe: '0516',
    nature: 'isole',
    motif: 'Le libellé nomme l’ALAT seule.',
    acte: acte('0516', 'ALAT'),
    precochee: true,
  },
  {
    analyteCode: 'BIO_HDL',
    analyteLibelle: 'HDL',
    situation: 'a_juger',
    codeActe: '0996',
    nature: 'groupe_et',
    motif: 'Pas d’acte de HDL isolé.',
    acte: acte('0996', 'EXPLORATION D’UNE ANOMALIE LIPIDIQUE'),
    precochee: false,
  },
];

function mockFetch(lectures: unknown[], reponsePost: unknown = { ok: true, signees: 1 }) {
  let lecture = 0;
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? { ok: true, status: 200, json: async () => reponsePost }
      : { ok: true, status: 200, json: async () => lectures[Math.min(lecture++, lectures.length - 1)] },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const posts = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SignatureNabmLotPanel (D-326 §2)', () => {
  it('coche d’office ce que le serveur dit, jamais un « à juger » ; signe après confirmation, la nature changée part', async () => {
    const onSignees = vi.fn();
    const fetchMock = mockFetch([{ ok: true, millesime: 'V105', lignes: LIGNES }, { ok: true, millesime: 'V105', lignes: [] }]);
    render(<SignatureNabmLotPanel onSignees={onSignees} />);
    const alat = (await screen.findByLabelText('Signer ALAT → acte 0516')) as HTMLInputElement;
    expect(alat.checked).toBe(true);
    expect((screen.getByLabelText('Signer HDL → acte 0996') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('À juger')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Signer HDL → acte 0996'));
    // Nature de la ligne HDL changée en « Groupe au choix ».
    const radios = screen.getAllByRole('radio', { name: /Groupe au choix/ });
    fireEvent.click(radios[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Signer la sélection (2)' }));
    // Rien ne part avant la confirmation.
    expect(posts(fetchMock)).toHaveLength(0);
    expect(screen.getByText('Signer à votre nom 2 correspondances ?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la signature' }));

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(JSON.parse(String(posts(fetchMock)[0][1].body))).toEqual({
      lignes: [
        { analyteCode: 'BIO_ALAT', codeActe: '0516', nature: 'isole' },
        { analyteCode: 'BIO_HDL', codeActe: '0996', nature: 'groupe_ou' },
      ],
    });
    expect(await screen.findByText('Une correspondance signée.')).toBeTruthy();
    expect(await screen.findByText('Aucune correspondance préparée ne reste à signer.')).toBeTruthy();
    expect(onSignees).toHaveBeenCalledTimes(1);
  });

  it('décocher tout désactive la signature ; annuler la confirmation n’envoie rien', async () => {
    const fetchMock = mockFetch([{ ok: true, millesime: 'V105', lignes: LIGNES }]);
    render(<SignatureNabmLotPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Signer la sélection (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    fireEvent.click(screen.getByLabelText('Signer ALAT → acte 0516'));
    expect((screen.getByRole('button', { name: 'Signer la sélection (0)' }) as HTMLButtonElement).disabled).toBe(true);
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it('un refus du serveur se dit tel quel, et rien n’est annoncé signé', async () => {
    mockFetch([{ ok: true, millesime: 'V105', lignes: LIGNES }], {
      ok: false,
      reason: 'acte_introuvable',
      error: 'Rien n’a été signé (BIO_ALAT → 0516) : acte introuvable.',
      ligne: { analyteCode: 'BIO_ALAT', codeActe: '0516' },
    });
    const onSignees = vi.fn();
    render(<SignatureNabmLotPanel onSignees={onSignees} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Signer la sélection (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la signature' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Rien n’a été signé (BIO_ALAT → 0516)');
    expect(onSignees).not.toHaveBeenCalled();
  });

  it('une réponse perdue se dit « résultat inconnu », et la liste est relue', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, millesime: 'V105', lignes: LIGNES }) })
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, millesime: 'V105', lignes: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<SignatureNabmLotPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Signer la sélection (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la signature' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Résultat inconnu');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it('rien à signer : le dit, sans bouton', async () => {
    mockFetch([{ ok: true, millesime: 'V105', lignes: [] }]);
    render(<SignatureNabmLotPanel />);
    expect(await screen.findByText('Aucune correspondance préparée ne reste à signer.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Signer la sélection/ })).toBeNull();
  });
});
