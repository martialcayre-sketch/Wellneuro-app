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
  // ——— Suspendre une action (LOT-05) ———
  // La boucle arbitrage biologique → révision était livrée, testée à trois
  // étages, et INDÉCLENCHABLE : `ArbitrageBiologiquePanel` n'apparaît que sur une
  // action `conditionnelle_biologie`, et aucune surface n'en posait.

  it('suspend une action en attente d’un bilan, et demande V4 avec elle', () => {
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
    fireEvent.click(ui.getByRole('checkbox', { name: /En attente du bilan biologique/ }));
    fireEvent.change(ui.getByLabelText('Ce qu’on attend pour l’action 1'), { target: { value: 'Ferritine' } });
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));

    expect(onSaveVersion).toHaveBeenCalledTimes(1);
    const soumission = onSaveVersion.mock.calls[0][0] as RelectureProtocoleSoumission;
    // LE CONTRAT EST DEMANDÉ, JAMAIS DÉDUIT : sans lui la route retombe en V1,
    // où `interventionStatus` est INTERDIT.
    expect(soumission.version).toBe('c1-protocol-draft-v4');
    expect(soumission.actions[0].interventionStatus).toBe('conditionnelle_biologie');
    expect(soumission.actions[0].waitFor).toEqual({ type: 'biologie', cible: 'Ferritine' });
  });

  it('refuse une attente qui ne dit pas ce qu’elle attend', () => {
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
    fireEvent.click(ui.getByRole('checkbox', { name: /En attente du bilan biologique/ }));
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));
    expect(onSaveVersion).not.toHaveBeenCalled();
    expect(ui.getByRole('alert').textContent).toContain('attend un bilan sans dire lequel');
  });

  it('décocher retire l’attente AVEC le statut — le contrat refuse l’un sans l’autre', () => {
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
    const bascule = ui.getByRole('checkbox', { name: /En attente du bilan biologique/ });
    fireEvent.click(bascule);
    fireEvent.change(ui.getByLabelText('Ce qu’on attend pour l’action 1'), { target: { value: 'Ferritine' } });
    fireEvent.click(bascule);
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));

    const soumission = onSaveVersion.mock.calls[0][0] as RelectureProtocoleSoumission;
    expect(soumission.actions[0].interventionStatus).toBeUndefined();
    expect(soumission.actions[0].waitFor).toBeUndefined();
    // Aucune suspension : la soumission RESTE en V1. Demander V4 partout ferait
    // basculer des protocoles que rien n'oblige à changer de contrat.
    expect(soumission.version).toBeUndefined();
  });

  it('en V4, une action NON suspendue porte « active » — le contrat l’exige sur chacune', () => {
    const onSaveVersion = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={onSaveVersion} saveState="idle" />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fireEvent.click(ui.getByRole('button', { name: 'Ajouter une action' }));
    fillFirstAction(container);
    fireEvent.change(ui.getByLabelText('Type de l’action 2'), { target: { value: 'observation' } });
    fireEvent.change(ui.getByLabelText('Intitulé de l’action 2'), { target: { value: 'Observer' } });
    fireEvent.change(ui.getByLabelText('Plan idéal de l’action 2'), { target: { value: 'Idéal' } });
    fireEvent.change(ui.getByLabelText('Plan minimal de l’action 2'), { target: { value: 'Minimal' } });
    fireEvent.change(ui.getByLabelText('Plan de secours de l’action 2'), { target: { value: 'Secours' } });
    choisirCharge(container);
    fireEvent.click(ui.getAllByRole('checkbox', { name: /En attente du bilan biologique/ })[0]);
    fireEvent.change(ui.getByLabelText('Ce qu’on attend pour l’action 1'), { target: { value: 'TSH' } });
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer la version' }));

    const soumission = onSaveVersion.mock.calls[0][0] as RelectureProtocoleSoumission;
    expect(soumission.actions[0].interventionStatus).toBe('conditionnelle_biologie');
    expect(soumission.actions[1].interventionStatus).toBe('active');
    expect(soumission.actions[1].waitFor).toBeUndefined();
  });
  // ——— La garde de registre a sa commande d'écran (LOT-04) ———
  // Celle du booklet était confirmable « depuis toujours » et AUCUN écran
  // n'envoyait la confirmation : un bilan validé le 16 août n'est jamais parti.
  // Une garde confirmable sans bouton est une garde bloquante déguisée.

  it('rend le refus de registre et son bouton de confirmation', () => {
    const onConfirmerRegistre = vi.fn();
    const { container } = render(
      <ProtocolMiniBuilder
        decisionCard={card()}
        onSaveVersion={vi.fn()}
        saveState="idle"
        confirmationRegistre={{ message: 'La raison d’être emploie « urgente ».', jeton: 'abc' }}
        onConfirmerRegistre={onConfirmerRegistre}
      />,
    );
    const ui = within(container);
    expect(ui.getByRole('alert').textContent).toContain('emploie « urgente »');
    fireEvent.click(ui.getByRole('button', { name: 'Enregistrer ce texte tel quel' }));
    expect(onConfirmerRegistre).toHaveBeenCalledTimes(1);
  });

  it('sans refus en attente, aucun bouton de confirmation n’est proposé', () => {
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} onSaveVersion={vi.fn()} saveState="idle" />,
    );
    expect(within(container).queryByRole('button', { name: 'Enregistrer ce texte tel quel' })).toBeNull();
  });
});

// ── CITER LA RAISON D'ÊTRE ([[D-193]]) ─────────────────────────────────────
//
// Citer, c'est REPRENDRE un texte déjà écrit — jamais en composer un. Le bouton
// recopie la source telle quelle dans le champ ; la marque, elle, se constate au
// serveur et tombe au premier caractère réécrit. Rien n'est envoyé au serveur
// par ce clic : c'est le TEXTE qui fait foi, pas le geste.
describe('ProtocolMiniBuilder — citer la raison d’être', () => {
  const SOURCES = [
    {
      marque: 'axe_signe' as const,
      texte: 'Sommeil fragmenté, réveils nocturnes',
      idSource: 'sommeil-fragmente',
      libelle: 'L’axe de travail signé',
    },
    {
      marque: 'objectif_priorite' as const,
      texte: 'Retrouver des nuits entières.',
      idSource: 'obj_v1',
      libelle: 'La priorité de l’objectif négocié',
    },
  ];

  it('reprend le texte de la source TEL QUEL dans la raison d’être', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} sourcesCitables={SOURCES} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'L’axe de travail signé' }));
    expect((ui.getByLabelText('Raison d’être') as HTMLTextAreaElement).value)
      .toBe('Sommeil fragmenté, réveils nocturnes');
  });

  it('propose CHAQUE source citable, et rien d’autre', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} sourcesCitables={SOURCES} />);
    const ui = within(container);
    expect(ui.getByRole('button', { name: 'L’axe de travail signé' })).toBeTruthy();
    expect(ui.getByRole('button', { name: 'La priorité de l’objectif négocié' })).toBeTruthy();
    // Le motif praticien de sélection et le `rationale` du moteur ne sont PAS
    // citables : ils s'affichent ailleurs, ils ne partent pas au patient.
    expect(ui.queryByRole('button', { name: /Fixture\./ })).toBeNull();
  });

  it('n’offre aucune reprise quand rien n’est citable sur ce dossier', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} sourcesCitables={[]} />);
    expect(within(container).queryByText('Reprendre :')).toBeNull();
  });

  // LA MARQUE VIENT DU SERVEUR, jamais de cet écran : une marque que le
  // navigateur annoncerait serait une marque que rien n'a confrontée.
  it('affiche ce que la version active CITE, quand le serveur le constate', () => {
    const { container } = render(
      <ProtocolMiniBuilder
        decisionCard={card()}
        sourcesCitables={SOURCES}
        provenancePurpose={{ marque: 'axe_signe', idSource: 'sommeil-fragmente' }}
      />,
    );
    expect(within(container).getByText('Repris de l’axe de travail signé')).toBeTruthy();
  });

  it('n’affiche aucune marque quand le serveur n’en constate aucune', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} sourcesCitables={SOURCES} />);
    expect(within(container).queryByText(/^Repris de/)).toBeNull();
  });
});

// ── LA CHARGE : RELUE, ET SUGGÉRÉE ([[D-195]]) ─────────────────────────────
//
// Elle était écrite, obligatoire, hachée — et relue par AUCUN écran en usage
// normal : le seul qui l'affichait recevait `null` et sortait par un retour
// anticipé. Le praticien déclarait une charge qu'il ne revoyait jamais.
describe('ProtocolMiniBuilder — la charge de la version active, et le barème', () => {
  const LIGNE = {
    id: 'CHARGE-BANC',
    terme: 'nombreActionsFermes' as const,
    min: 1,
    max: null,
    niveau: 'loaded' as const,
    motif: 'Motif de banc — aucune valeur clinique.',
    statut: 'publiee' as const,
  };

  it('rend lisible la charge portée par la version active', () => {
    const { container } = render(
      <ProtocolMiniBuilder
        decisionCard={card()}
        chargeVersionActive={{ level: 'moderate', source: 'practitioner', justification: 'Deux axes engagés.' }}
      />,
    );
    const ui = within(container);
    // Scopé à la ligne : « Modéré » est aussi une option du sélecteur, et une
    // assertion globale confondrait la relecture avec le choix offert.
    const ligne = ui.getByText(/Version active :/).closest('p') as HTMLElement;
    expect(within(ligne).getByText('Modéré')).toBeTruthy();
    expect(ligne.textContent).toMatch(/Deux axes engagés\./);
  });

  it('n’affirme rien sur la version active quand il n’y en a pas', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} />);
    expect(within(container).queryByText(/Version active :/)).toBeNull();
  });

  // BARÈME NON SIGNÉ ⇒ LISTE VIDE ⇒ AUCUNE SUGGESTION. Le serveur est le seul
  // à tenir le verrou ; cet écran ne revérifie rien, il ne reçoit rien.
  it('n’affiche AUCUNE suggestion tant que le serveur ne vouche aucune ligne', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} baremeCharge={[]} />);
    const ui = within(container);
    fireEvent.click(ui.getByText('Ajouter une action'));
    fillFirstAction(container);
    expect(ui.queryByText(/Le barème suggère/)).toBeNull();
  });

  it('suggère un niveau et son motif dès qu’une ligne vouchée s’applique', () => {
    const { container } = render(<ProtocolMiniBuilder decisionCard={card()} baremeCharge={[LIGNE]} />);
    const ui = within(container);
    fireEvent.click(ui.getByText('Ajouter une action'));
    fillFirstAction(container);
    expect(ui.getByText(/Le barème suggère/)).toBeTruthy();
    expect(ui.getByText(/Motif de banc/)).toBeTruthy();
  });

  // LE BARÈME PROPOSE, LE PRATICIEN DISPOSE. Le bouton RECOPIE le niveau dans le
  // champ : `TherapeuticLoad.source` vaut la constante 'practitioner', et la
  // valeur enregistrée reste celle du champ.
  it('recopie le niveau suggéré dans le champ, et rien de plus', () => {
    const recues: RelectureProtocoleSoumission[] = [];
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} baremeCharge={[LIGNE]} onReviewed={s => recues.push(s)} />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByText('Ajouter une action'));
    fillFirstAction(container);
    fireEvent.click(ui.getByRole('button', { name: 'Reprendre cette charge' }));
    expect((ui.getByLabelText('Charge déclarée par le praticien') as HTMLSelectElement).value).toBe('loaded');
    // Rien n'est parti : la reprise est une saisie, pas un enregistrement.
    expect(recues).toHaveLength(0);

    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme relu' }));
    expect(recues).toHaveLength(1);
    expect(recues[0].therapeuticLoad).toEqual({ level: 'loaded', source: 'practitioner', justification: null });
  });

  // UNE SUGGESTION QU'ON N'A PAS REPRISE NE S'IMPOSE PAS. Le praticien garde sa
  // valeur, et c'est elle qui s'enregistre.
  it('n’écrase JAMAIS une charge que le praticien a déclarée autrement', () => {
    const recues: RelectureProtocoleSoumission[] = [];
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} baremeCharge={[LIGNE]} onReviewed={s => recues.push(s)} />,
    );
    const ui = within(container);
    fireEvent.change(ui.getByLabelText('Raison d’être'), { target: { value: 'Raison fixture' } });
    fireEvent.change(ui.getByLabelText('Critère observable à J21'), { target: { value: 'Critère fixture' } });
    fireEvent.click(ui.getByText('Ajouter une action'));
    fillFirstAction(container);
    fireEvent.change(ui.getByLabelText('Charge déclarée par le praticien'), { target: { value: 'light' } });
    fireEvent.click(ui.getByRole('button', { name: 'Marquer comme relu' }));
    expect(recues[0].therapeuticLoad.level).toBe('light');
    expect(recues[0].therapeuticLoad.source).toBe('practitioner');
  });
});

// UN NIVEAU « EXCESSIF » SE LIT EN AVERTISSEMENT ([[D-195]]) — les trois autres
// en note discrète. Le contrat exige déjà une justification écrite quand le
// praticien DÉCLARE ce niveau ; la suggestion le signale du même registre, sans
// rien bloquer.
describe('ProtocolMiniBuilder — le ton du niveau haut', () => {
  const LIGNE_EXCESSIVE = {
    id: 'CHARGE-HAUTE', terme: 'nombreActionsFermes' as const, min: 1, max: null,
    niveau: 'excessive' as const, motif: 'Motif de banc — aucune valeur clinique.',
    statut: 'publiee' as const,
  };

  function composerUneAction(container: HTMLElement) {
    const ui = within(container);
    fireEvent.click(ui.getByText('Ajouter une action'));
    fillFirstAction(container);
  }

  it('signale une suggestion « excessif » en avertissement', () => {
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} baremeCharge={[LIGNE_EXCESSIVE]} />,
    );
    composerUneAction(container);
    const alerte = within(container).getByRole('alert');
    expect(alerte.textContent).toMatch(/Le barème suggère/);
    expect(alerte.textContent).toMatch(/Excessif/);
  });

  it('laisse les autres niveaux en note discrète', () => {
    const { container } = render(
      <ProtocolMiniBuilder
        decisionCard={card()}
        baremeCharge={[{ ...LIGNE_EXCESSIVE, niveau: 'light' }]}
      />,
    );
    composerUneAction(container);
    const ui = within(container);
    expect(ui.getByText(/Le barème suggère/)).toBeTruthy();
    expect(ui.queryByRole('alert')).toBeNull();
  });

  // OUVRIR LE CHAMP DE JUSTIFICATION D'AVANCE pousserait vers un choix que le
  // praticien n'a pas fait : il ne s'ouvre que s'il déclare lui-même ce niveau.
  it('n’ouvre PAS le champ de justification sur une simple suggestion', () => {
    const { container } = render(
      <ProtocolMiniBuilder decisionCard={card()} baremeCharge={[LIGNE_EXCESSIVE]} />,
    );
    composerUneAction(container);
    const ui = within(container);
    expect(ui.queryByLabelText('Justification de la charge excessive')).toBeNull();
    fireEvent.click(ui.getByRole('button', { name: 'Reprendre cette charge' }));
    expect(ui.getByLabelText('Justification de la charge excessive')).toBeTruthy();
  });
});

