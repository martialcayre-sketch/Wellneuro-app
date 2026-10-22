// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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
