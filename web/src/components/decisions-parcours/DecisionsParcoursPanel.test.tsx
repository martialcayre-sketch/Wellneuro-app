// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DecisionsParcoursPanel } from './DecisionsParcoursPanel';

// [[D-343]] §5 — un fil retiré reste LISIBLE : un refus que le patient lève
// se retire, et le refus comme son retrait restent à l'historique (relecture
// `wn-reviewer` de la PR 2, P1). Identifiants synthétiques.

const V = 'proto_a#h1';
const pose = {
  id: 'l1',
  ordre: '1',
  acte: 'pose',
  idVersion: V,
  idAction: 'act_1',
  nature: 'refus',
  issue: null,
  motif: 'choix_du_patient',
  note: null,
  evenementLe: null,
  evenementInconnu: null,
  source: 'rapporte_par_patient',
  idVersionSuivante: null,
  idLigneRemplacee: null,
  praticienEmail: 'praticien@example.test',
  acteLe: '2026-10-20T09:00:00.000Z',
};
const retrait = {
  ...pose,
  id: 'l2',
  ordre: '2',
  acte: 'retrait',
  idAction: null,
  nature: null,
  motif: null,
  source: null,
  idLigneRemplacee: 'l1',
  acteLe: '2026-10-21T09:00:00.000Z',
};
const LUES = {
  ok: true,
  versions: [
    {
      id: V,
      creeLe: '2026-10-01T08:00:00.000Z',
      diffuseeLe: '2026-10-02T08:00:00.000Z',
      actions: [{ actionId: 'act_1', titre: 'Action de fixture' }],
    },
  ],
  decisions: [pose, retrait],
  mineur: false,
  aujourdhui: '2026-10-22',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DecisionsParcoursPanel — un fil retiré', () => {
  it('reste lisible, avec la décision et son retrait', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => LUES } as Response));
    render(<DecisionsParcoursPanel idPatient="PAT1" />);

    expect(await screen.findByText('Décisions retirées (1)')).toBeTruthy();
    expect(screen.getByText('refus du patient — Action de fixture — retirée')).toBeTruthy();
    expect(screen.getByText(/retrait de la ligne en vigueur/)).toBeTruthy();
    expect(screen.getByText(/refus du patient — Action de fixture \(choix du patient\)/)).toBeTruthy();
    // Aucune décision en vigueur : le bloc le dit, sans effacer l'historique.
    expect(screen.getByText('Aucune décision posée.')).toBeTruthy();
  });
});

describe('DecisionsParcoursPanel — formulaire', () => {
  it('« Enregistrer » reste grisé tant qu’un champ obligatoire est vide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => LUES } as Response));
    render(<DecisionsParcoursPanel idPatient="PAT1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter une décision' }));
    const enregistrer = screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;
    // Préférence : source, motif et note manquent.
    expect(enregistrer.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('refus du patient'));
    fireEvent.click(screen.getByLabelText('rapporté par le patient'));
    expect(enregistrer.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motif'), { target: { value: 'choix_du_patient' } });
    expect(enregistrer.disabled).toBe(false);
  });
});

describe('DecisionsParcoursPanel — retrait confirmé (arbitrage du 2026-10-23)', () => {
  const vivante = { ...pose, nature: 'debut', motif: null, idAction: null, evenementLe: '2026-10-05' };
  const AVEC_DEBUT = { ...LUES, decisions: [vivante] };
  const envois = (f: ReturnType<typeof vi.fn>) =>
    f.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

  it('« Retirer » demande une confirmation ; « Annuler » n’envoie rien, « Confirmer » envoie le retrait', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => AVEC_DEBUT } as Response);
    vi.stubGlobal('fetch', fetchMock);
    render(<DecisionsParcoursPanel idPatient="PAT1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Retirer' }));
    expect(screen.getByText('Retirer cette décision ? Elle restera lisible dans l’historique.')).toBeTruthy();
    // Le focus suit au clavier : « Annuler » à l'ouverture, « Retirer » après.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Annuler' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(envois(fetchMock)).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retirer' }));

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    await waitFor(() => expect(envois(fetchMock)).toHaveLength(1));
    expect(JSON.parse(String((envois(fetchMock)[0][1] as RequestInit).body))).toEqual({
      idPatient: 'PAT1',
      acte: 'retrait',
      idVersion: V,
      remplace: 'l1',
    });
  });
});
