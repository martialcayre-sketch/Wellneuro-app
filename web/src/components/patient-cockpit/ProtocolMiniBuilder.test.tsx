// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolMiniBuilder } from './ProtocolMiniBuilder';
import type { DecisionCard } from '@/lib/clinical-engine/types';

function card(): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [] }],
    proposedMainPriorityId: 'p1', selectedMainPriority: { candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'hash',
  };
}

function fillFirstAction(container: HTMLElement) {
  const ui = within(container);
  fireEvent.change(ui.getByLabelText('Intitulé de l’action 1'), { target: { value: 'Action fixture' } });
  fireEvent.change(ui.getByLabelText('Plan idéal de l’action 1'), { target: { value: 'Idéal fixture' } });
  fireEvent.change(ui.getByLabelText('Plan minimal de l’action 1'), { target: { value: 'Minimal fixture' } });
  fireEvent.change(ui.getByLabelText('Plan de secours de l’action 1'), { target: { value: 'Secours fixture' } });
}

describe('ProtocolMiniBuilder', () => {
  it('reste désactivé sans priorité praticien sélectionnée', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={null} />);
    expect(container.textContent).toContain('Protocole indisponible — priorité praticien non sélectionnée');
    expect(screen.queryByRole('button', { name: 'Ajouter une action' })).toBeNull();
  });

  it('ajoute, modifie et supprime au plus trois actions', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} />);
    const ui = within(container);
    const add = ui.getByRole('button', { name: 'Ajouter une action' });
    expect(add.className).toContain('min-h-11');
    fireEvent.click(add); fireEvent.click(add); fireEvent.click(add);
    expect(ui.getByText('Actions (3/3)')).not.toBeNull();
    expect(add.hasAttribute('disabled')).toBe(true);
    fireEvent.change(ui.getByLabelText('Intitulé de l’action 1'), { target: { value: 'Action modifiée' } });
    expect((ui.getByLabelText('Intitulé de l’action 1') as HTMLInputElement).value).toBe('Action modifiée');
    fireEvent.click(ui.getAllByRole('button', { name: 'Supprimer l’action' })[0]);
    expect(ui.getByText('Actions (2/3)')).not.toBeNull();
  });

  it('affiche la justification excessive et marque un brouillon complet comme relu', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} />);
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fillFirstAction(container);
    fireEvent.change(ui.getByLabelText('Charge déclarée par le praticien'), { target: { value: 'excessive' } });
    expect(ui.getByLabelText('Justification de la charge excessive')).not.toBeNull();
    fireEvent.change(ui.getByLabelText('Justification de la charge excessive'), { target: { value: 'Justification fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme relu' }));
    expect(ui.getByRole('status').textContent).toContain('non activé et non transmis');
    expect(ui.getByText('Relu par le praticien')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('avertit avant de réinitialiser un brouillon local', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} />);
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'À conserver' } });
    fireEvent.click(ui.getByRole('button', { name: 'Réinitialiser' }));
    expect(confirm).toHaveBeenCalled();
    expect((ui.getByLabelText('Raison d’être') as HTMLTextAreaElement).value).toBe('À conserver');
    confirm.mockRestore();
  });

  it('rappelle le garde-fou lors d’une intention de complément', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fireEvent.change(ui.getByLabelText('Type de l’action 1'), { target: { value: 'supplement_exploration' } });
    expect(container.textContent).toContain('aucun produit, forme, marque ou dose');
  });
});
