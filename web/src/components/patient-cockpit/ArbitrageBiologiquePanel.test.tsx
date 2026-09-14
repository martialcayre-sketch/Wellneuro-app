// @vitest-environment jsdom
//
// Le panneau d'arbitrage était le SEUL composant de `patient-cockpit` sans banc
// de composant — vingt de ses voisins en ont un. L'oubli s'explique : il était
// INATTEIGNABLE, faute d'une surface posant `conditionnelle_biologie`. Le geste
// de suspension livré avec ce lot le rend joignable ; il gagne son banc avec.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArbitrageBiologiquePanel } from './ArbitrageBiologiquePanel';

function intention(over: Partial<{ actionId: string; title: string; cible: string | null }> = {}) {
  return {
    actionId: over.actionId ?? 'act-1',
    title: over.title ?? 'Exploration martiale avant supplémentation',
    cible: over.cible === undefined ? 'Ferritine' : over.cible,
  };
}

describe('ArbitrageBiologiquePanel', () => {
  it('ne se rend pas du tout quand il n’y a ni intention ni arbitrage', () => {
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
      />,
    );
    // Un panneau vide affirmerait qu'il n'y a rien à arbitrer ; il se tait.
    expect(container.innerHTML).toBe('');
  });

  it('rend l’intention avec ce qu’elle attend, et consigne le verdict choisi', () => {
    const onArbitrer = vi.fn();
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={onArbitrer}
      />,
    );
    const ui = within(container);
    expect(ui.getByText('Exploration martiale avant supplémentation')).not.toBeNull();
    expect(ui.getByText(/En attente de biologie : Ferritine/)).not.toBeNull();

    fireEvent.click(ui.getByRole('radio', { name: 'Confirmée par le bilan' }));
    fireEvent.click(ui.getByRole('button', { name: 'Consigner l’arbitrage' }));
    expect(onArbitrer).toHaveBeenCalledWith('act-1', 'confirme', '');
  });

  it('exige une note pour un verdict INFIRMÉ, et le dit dans l’étiquette', () => {
    const onArbitrer = vi.fn();
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={onArbitrer}
      />,
    );
    const ui = within(container);
    fireEvent.click(ui.getByRole('radio', { name: 'Infirmée par le bilan' }));
    // Le motif d'un retrait se relit six semaines plus tard : la note n'est pas
    // facultative, et l'étiquette le dit avant que le bouton ne refuse.
    expect(ui.getByText(/obligatoire pour un verdict infirmé/)).not.toBeNull();
    const consigner = ui.getByRole('button', { name: 'Consigner l’arbitrage' });
    expect(consigner.hasAttribute('disabled')).toBe(true);

    fireEvent.change(ui.getByLabelText(/Note courte/), {
      target: { value: 'Ferritine dans les bornes du laboratoire.' },
    });
    fireEvent.click(consigner);
    expect(onArbitrer).toHaveBeenCalledWith('act-1', 'infirme', 'Ferritine dans les bornes du laboratoire.');
  });

  it('un arbitrage déjà consigné remplace le formulaire par sa relecture', () => {
    const { container } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[{
          intentionId: 'act-1',
          verdict: 'infirme',
          noteCourte: 'Bornes du laboratoire respectées.',
          arbitreLe: '2026-09-15T08:00:00.000Z',
        }]}
        revisionPossible
        onArbitrer={vi.fn()}
        onReviser={vi.fn()}
      />,
    );
    const ui = within(container);
    expect(ui.queryByRole('button', { name: 'Consigner l’arbitrage' })).toBeNull();
    expect(ui.getByText(/Bornes du laboratoire respectées/)).not.toBeNull();
  });

  it('le badge suit l’état réel de l’étage 2, et la phrase reste vraie dans les deux cas', () => {
    const { container, rerender } = render(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
      />,
    );
    expect(within(container).getByText('Aucune valeur d’analyse conservée')).not.toBeNull();
    rerender(
      <ArbitrageBiologiquePanel
        intentions={[intention()]}
        arbitrages={[]}
        revisionPossible={false}
        onArbitrer={vi.fn()}
        resultatsActifs
      />,
    );
    expect(within(container).getByText('L’arbitrage ne consigne jamais une valeur')).not.toBeNull();
    // Dans les deux cas : jamais de champ de VALEUR. La table d'arbitrage n'a
    // aucune colonne de résultat, et un contrat SQL négatif le garde en CI.
    expect(screen.queryByLabelText(/valeur|résultat|taux/i)).toBeNull();
  });
});
