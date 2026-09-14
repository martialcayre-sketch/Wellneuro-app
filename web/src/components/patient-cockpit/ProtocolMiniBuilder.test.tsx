// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolMiniBuilder, type RelectureProtocoleSoumission } from './ProtocolMiniBuilder';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import type { FoodCompassActionRef } from '@/lib/food-compass';

function card(): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitations: [] }],
    proposedMainPriorityId: 'p1', selectedMainPriority: { candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'hash',
  };
}

// Un brouillon COMPLET pose désormais aussi le type de l'action et la charge :
// l'un et l'autre n'ont plus de valeur par défaut, et `collectSubmission` les
// refuse. L'aide les pose donc, comme un praticien le ferait.
function fillFirstAction(container: HTMLElement) {
  const ui = within(container);
  fireEvent.change(ui.getByLabelText('Type de l’action 1'), { target: { value: 'food' } });
  fireEvent.change(ui.getByLabelText('Intitulé de l’action 1'), { target: { value: 'Action fixture' } });
  fireEvent.change(ui.getByLabelText('Plan idéal de l’action 1'), { target: { value: 'Idéal fixture' } });
  fireEvent.change(ui.getByLabelText('Plan minimal de l’action 1'), { target: { value: 'Minimal fixture' } });
  fireEvent.change(ui.getByLabelText('Plan de secours de l’action 1'), { target: { value: 'Secours fixture' } });
}

function choisirCharge(container: HTMLElement, niveau = 'light') {
  fireEvent.change(within(container).getByLabelText('Charge déclarée par le praticien'), { target: { value: niveau } });
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

  it('émet le contenu du brouillon relu au parent via onReviewed', () => {
    const onReviewed = vi.fn();
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} onReviewed={onReviewed} />);
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fillFirstAction(container);
    choisirCharge(container);
    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme relu' }));
    expect(onReviewed).toHaveBeenCalledTimes(1);
    const soumission = onReviewed.mock.calls[0][0] as RelectureProtocoleSoumission;
    expect(soumission.purpose).toBe('Raison fixture');
    expect(soumission.followUpCriterion).toBe('Critère fixture');
    expect(soumission.actions).toHaveLength(1);
    expect(soumission.actions[0].title).toBe('Action fixture');
    expect(soumission.therapeuticLoad).toEqual({ level: 'light', source: 'practitioner', justification: null });
    expect(ui.getByText('Relu par le praticien')).not.toBeNull();
  });

  it('n’émet rien via onReviewed quand le brouillon est incomplet', () => {
    const onReviewed = vi.fn();
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} onReviewed={onReviewed} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme relu' }));
    expect(onReviewed).not.toHaveBeenCalled();
    expect(ui.getByRole('alert').textContent).toContain('Brouillon incomplet');
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

  it('n’insère une référence Boussole qu’après une action manuelle explicite', () => {
    const actionRef = { foodRef: '26034', refHash: 'ref-hash' } as FoodCompassActionRef;
    const onClear = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder
        decisionCard={card()}
        foodCompassSelection={{ foodLabel: 'Sardine', actionRef }}
        onClearFoodCompassSelection={onClear}
      />,
    );
    const ui = within(container);
    expect(ui.getByText('Actions (0/3)')).not.toBeNull();
    expect(ui.getByText(/Sélection Boussole prête : Sardine/)).not.toBeNull();
    fireEvent.click(ui.getByRole('button', { name: 'Insérer manuellement' }));
    expect(ui.getByText('Actions (1/3)')).not.toBeNull();
    expect((ui.getByLabelText('Intitulé de l’action 1') as HTMLInputElement).value).toBe('Sardine');
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('ProtocolMiniBuilder — sauvegarde explicite (LOT-03)', () => {
  it('n’affiche jamais « enregistrée » tant que le serveur n’a pas confirmé', () => {
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={vi.fn()} saveState="idle" />,
    );
    const ui = within(container);
    expect(ui.getByRole('button', { name: 'Enregistrer la version' })).not.toBeNull();
    expect(ui.getByText(/Brouillon local — non enregistré/)).not.toBeNull();
    expect(ui.queryByText(/Version enregistrée/)).toBeNull();
  });

  it('transmet la soumission validée à onSaveVersion', () => {
    const onSaveVersion = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={onSaveVersion} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fillFirstAction(container);
    choisirCharge(container);
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(onSaveVersion).toHaveBeenCalledTimes(1);
    const soumission = onSaveVersion.mock.calls[0][0] as RelectureProtocoleSoumission;
    expect(soumission.purpose).toBe('Raison fixture');
    expect(soumission.actions).toHaveLength(1);
  });

  it('signale les modifications locales après un enregistrement confirmé', () => {
    const { container, rerender } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={vi.fn()} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fillFirstAction(container);
    choisirCharge(container);
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    rerender(<ProtocolMiniBuilder decisionCard={card()} onSaveVersion={vi.fn()} saveState="saved" />);
    expect(ui.getByText(/Version enregistrée sur le serveur/)).not.toBeNull();
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Objectif révisé' } });
    expect(ui.getByText(/Modifications locales non enregistrées/)).not.toBeNull();
  });
  // ——— Ce que le silence faisait passer (LOT-02) ———
  // Aucun banc ne couvrait le TYPE d'une action de bout en bout : `fillFirstAction`
  // ne touchait pas le sélecteur, et le seul test qui le changeait vérifiait
  // l'avertissement « complément », pas la persistance. Une orientation médicale
  // enregistrée sans toucher au sélecteur partait donc « Alimentation ».

  it('refuse une action dont le type n’a pas été choisi, et dit LAQUELLE', () => {
    const onSaveVersion = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={onSaveVersion} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    // Tous les plans, mais PAS le type.
    fireEvent.change(ui.getByLabelText('Intitulé de l’action 1'), { target: { value: 'Orienter vers le médecin traitant' } });
    fireEvent.change(ui.getByLabelText('Plan idéal de l’action 1'), { target: { value: 'Idéal' } });
    fireEvent.change(ui.getByLabelText('Plan minimal de l’action 1'), { target: { value: 'Minimal' } });
    fireEvent.change(ui.getByLabelText('Plan de secours de l’action 1'), { target: { value: 'Secours' } });
    choisirCharge(container);
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(onSaveVersion).not.toHaveBeenCalled();
    expect(ui.getByRole('alert').textContent).toContain('L’action 1 n’a pas de type');
    expect(ui.getByLabelText('Type de l’action 1').getAttribute('aria-invalid')).toBe('true');
  });

  it('le sélecteur de type s’ouvre SANS valeur, et propose de la choisir', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    expect((ui.getByLabelText('Type de l’action 1') as HTMLSelectElement).value).toBe('');
    expect(ui.getByText('Choisir un type…')).not.toBeNull();
  });

  it('refuse une charge non déclarée, et ne l’affirme pas « légère » entre-temps', () => {
    const onSaveVersion = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={onSaveVersion} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fillFirstAction(container);
    expect(container.textContent).toContain('Charge : non déclarée');
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(onSaveVersion).not.toHaveBeenCalled();
    expect(ui.getByRole('alert').textContent).toContain('La charge n’est pas déclarée');
  });

  it('le refus ne s’efface PAS à la première frappe', () => {
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={vi.fn()} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(ui.getByRole('alert')).not.toBeNull();
    // Une frappe quelconque : le motif du refus doit rester lisible pendant la
    // correction — il vivait dans `message`, que `markDirty` vidait.
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'R' } });
    expect(ui.getByRole('alert').textContent).toContain('Brouillon incomplet');
  });

  it('un brouillon complet lève le refus et transmet le type choisi', () => {
    const onSaveVersion = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={onSaveVersion} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(ui.getByRole('alert')).not.toBeNull();
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fireEvent.change(ui.getByLabelText('Type de l’action 1'), { target: { value: 'medical_referral' } });
    fireEvent.change(ui.getByLabelText('Intitulé de l’action 1'), { target: { value: 'Orienter' } });
    fireEvent.change(ui.getByLabelText('Plan idéal de l’action 1'), { target: { value: 'Idéal' } });
    fireEvent.change(ui.getByLabelText('Plan minimal de l’action 1'), { target: { value: 'Minimal' } });
    fireEvent.change(ui.getByLabelText('Plan de secours de l’action 1'), { target: { value: 'Secours' } });
    choisirCharge(container, 'moderate');
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(onSaveVersion).toHaveBeenCalledTimes(1);
    const soumission = onSaveVersion.mock.calls[0][0] as RelectureProtocoleSoumission;
    expect(soumission.actions[0].type).toBe('medical_referral');
    expect(soumission.therapeuticLoad.level).toBe('moderate');
    expect(ui.queryByRole('alert')).toBeNull();
  });
});
