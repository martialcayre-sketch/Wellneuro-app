// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignauxAdressesPanel } from './SignauxAdressesPanel';

afterEach(cleanup);

// [[D-257]], LOT-04b : un signal adressé reste lu, avec TOUTES ses lettres, et
// chaque lettre a sa propre révocation, motivée.

const ID_A = 'safety:anamnese:aaaaaaaaaaaaaaaa';
const ID_B = 'safety:anamnese:bbbbbbbbbbbbbbbb';
const CONSTATS = [
  { findingId: ID_A, rationale: 'Signal déclaré : « A ».' },
  { findingId: ID_B, rationale: 'Signal déclaré : « B ».' },
];
const COUVERTURES = [
  { idAdressage: 'adr_1', idCorrespondance: 'l_1', findingIds: [ID_A, ID_B], acteLe: '2026-10-01T08:00:00.000Z' },
  { idAdressage: 'adr_2', idCorrespondance: 'l_2', findingIds: [ID_A], acteLe: '2026-10-03T08:00:00.000Z' },
];

function rendre(props: Partial<Parameters<typeof SignauxAdressesPanel>[0]> = {}) {
  const onRevoquer = vi.fn();
  render(
    <SignauxAdressesPanel
      constats={CONSTATS}
      couvertures={COUVERTURES}
      revocation={null}
      onRevoquer={onRevoquer}
      {...props}
    />,
  );
  return { onRevoquer };
}

describe('SignauxAdressesPanel', () => {
  it('rien à dire, rien de rendu', () => {
    rendre({ constats: [] });
    expect(screen.queryByRole('region', { name: 'Signaux adressés' })).toBeNull();
  });

  it('chaque signal reste affiché, avec TOUTES les lettres qui le couvrent', () => {
    rendre();
    expect(screen.getByText('Signal déclaré : « A ».')).toBeTruthy();
    expect(screen.getByText('Signal déclaré : « B ».')).toBeTruthy();
    // A : deux lettres ; B : une seule.
    expect(screen.getAllByText(/Adressage engagé le/)).toHaveLength(3);
    expect(screen.getAllByText('Adressage engagé le 3 octobre 2026.')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Révoquer cet adressage' })).toHaveLength(3);
  });

  it('la révocation exige un motif, puis vise CETTE lettre', () => {
    const { onRevoquer } = rendre();
    fireEvent.click(screen.getAllByRole('button', { name: 'Révoquer cet adressage' })[1]);
    const confirmer = screen.getByRole('button', { name: 'Confirmer la révocation' });
    expect((confirmer as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Motif de la révocation/), { target: { value: '  Mauvais dossier.  ' } });
    fireEvent.click(confirmer);
    expect(onRevoquer).toHaveBeenCalledWith('adr_2', 'Mauvais dossier.');
  });

  it('une erreur de révocation se lit sous la lettre visée', () => {
    rendre({ revocation: { idAdressage: 'adr_1', enCours: false, erreur: 'Cet adressage est déjà révoqué.' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Révoquer cet adressage' })[0]);
    expect(screen.getByRole('alert').textContent).toBe('Cet adressage est déjà révoqué.');
  });

  it('dit que révoquer rebloque, sauf si une autre lettre couvre', () => {
    rendre();
    expect(screen.getByText(/sauf si une autre lettre les couvre/)).toBeTruthy();
  });
});
