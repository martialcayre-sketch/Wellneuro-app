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

  it('chaque signal reste affiché, avec le nombre de lettres qui le couvrent', () => {
    rendre();
    expect(screen.getByText('Signal déclaré : « A ».')).toBeTruthy();
    expect(screen.getByText('Signal déclaré : « B ».')).toBeTruthy();
    expect(screen.getByText('Couvert par 2 lettres d’adressage.')).toBeTruthy();
    expect(screen.getByText('Couvert par une lettre d’adressage.')).toBeTruthy();
  });

  it('un bouton par LETTRE, qui dit combien de signaux elle couvre — distinguable au lecteur d’écran', () => {
    rendre();
    const boutons = screen.getAllByRole('button', { name: /^Révoquer la lettre du/ });
    expect(boutons.map(b => b.getAttribute('aria-label'))).toEqual([
      'Révoquer la lettre du 1 octobre 2026, qui couvre 2 signaux',
      'Révoquer la lettre du 3 octobre 2026, qui couvre un signal',
    ]);
    expect(screen.getByText('Adressage engagé le 1 octobre 2026 — la lettre couvre 2 signaux.')).toBeTruthy();
  });

  it('la révocation exige un motif, puis vise CETTE lettre', () => {
    const { onRevoquer } = rendre();
    fireEvent.click(screen.getByRole('button', { name: /Révoquer la lettre du 3 octobre 2026/ }));
    const confirmer = screen.getByRole('button', { name: 'Confirmer la révocation' });
    expect((confirmer as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Motif de la révocation/), { target: { value: '  Mauvais dossier.  ' } });
    fireEvent.click(confirmer);
    expect(onRevoquer).toHaveBeenCalledWith('adr_2', 'Mauvais dossier.');
  });

  it('une erreur de révocation se lit sous la lettre visée', () => {
    rendre({ revocation: { idAdressage: 'adr_1', enCours: false, erreur: 'Cet adressage est déjà révoqué.' } });
    fireEvent.click(screen.getByRole('button', { name: /Révoquer la lettre du 1 octobre 2026/ }));
    expect(screen.getByRole('alert').textContent).toBe('Cet adressage est déjà révoqué.');
  });

  it('dit que révoquer rebloque, sauf si une autre lettre couvre', () => {
    rendre();
    expect(screen.getByText(/à tous les signaux qu’elle couvre, sauf si une autre lettre les couvre/)).toBeTruthy();
  });
});
