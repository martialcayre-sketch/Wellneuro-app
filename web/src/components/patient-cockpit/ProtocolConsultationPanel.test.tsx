// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolConsultationPanel } from './ProtocolConsultationPanel';
import type { DecisionCard, ProtocolDraft } from '@/lib/clinical-engine/types';

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash', reviewId: 'review-1', reviewInputHash: 'review-hash',
    createdAt: '2026-01-01T00:00:00.000Z', version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Raisonnement interne confidentiel', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [] }],
    proposedMainPriorityId: 'priority-1', selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Sélection interne confidentielle' },
    counterfactuals: [], missingDataFindingIds: ['manque-interne'], discordanceFindingIds: ['discordance-interne'], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'card-hash', ...overrides,
  };
}

function protocol(overrides: Partial<ProtocolDraft> = {}): ProtocolDraft {
  return {
    protocolDraftId: 'protocol-1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash', selectedPriorityId: 'priority-1',
    createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', version: 'c1-protocol-draft-v1',
    status: 'practitioner_reviewed', purpose: 'Raison patient.', followUpCriterion: 'Critère patient.', adviceSheetRef: 'Fiche patient',
    actions: [{ actionId: 'action-1', type: 'food', title: 'Action patient', idealPlan: 'Idéal interne', minimalPlan: 'Minimal patient', rescuePlan: 'Secours interne', limitations: ['Limite interne'] }],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: 'Justification interne' },
    review: { reviewedAt: '2026-01-03T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    limitations: ['Limite protocole interne'], inputHash: 'protocol-hash', ...overrides,
  };
}

describe('ProtocolConsultationPanel', () => {
  it('affiche l’état prudent sans objets runtime', () => {
    render(<ProtocolConsultationPanel decisionCard={null} protocolDraft={null} />);
    expect(screen.getByText(/Aperçu du protocole indisponible/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Valider pour diffusion' })).toBeNull();
    // Sur fixture, il n'y a pas de sous-vue « Diffusion » : aucun renvoi.
    expect(screen.queryByText(/sous-vue « Diffusion »/)).toBeNull();
  });

  // HORS FIXTURE, CE PANNEAU N'A JAMAIS DE PROTOCOLE. Sans renvoi, il promettait
  // un aperçu que ni la relecture ni la validation ne feraient apparaître ici.
  it('renvoie vers la sous-vue où l’aperçu vit réellement', () => {
    render(<ProtocolConsultationPanel decisionCard={null} protocolDraft={null} apercuEnDiffusion />);
    expect(screen.getByText(/sous-vue « Diffusion »/)).not.toBeNull();
  });

  it('distingue revue, validation et transmission sans requête réseau', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ProtocolConsultationPanel decisionCard={card()} protocolDraft={protocol()} />);
    expect(screen.getByText('Relu par le praticien')).not.toBeNull();
    expect(screen.getByText('Non validé pour diffusion')).not.toBeNull();
    expect(screen.getByText('Non transmis')).not.toBeNull();
    expect(screen.getByText(/Aperçu verrouillé/)).not.toBeNull();
    const approval = screen.getByRole('button', { name: 'Valider pour diffusion' });
    expect(approval.className).toContain('min-h-11');
    fireEvent.click(approval);
    expect(screen.getByText('Validé pour diffusion')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ouvrir l’aperçu patient' }).className).toContain('min-h-11');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('filtre strictement la lecture patient', () => {
    const { container } = render(<ProtocolConsultationPanel decisionCard={card()} protocolDraft={protocol()} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Valider pour diffusion' }));
    fireEvent.click(ui.getByRole('button', { name: 'Ouvrir l’aperçu patient' }));
    const preview = within(container.querySelector('#patient-protocol-preview-content') as HTMLElement);
    expect(preview.getByText(/Priorité fixture/)).not.toBeNull();
    expect(preview.getByText(/Minimal patient/)).not.toBeNull();
    expect(preview.queryByText(/Idéal interne|Secours interne|Justification interne|manque-interne|discordance-interne|confidentiel/)).toBeNull();
  });

  // LE DÉFAUT DE [[D-200]] DETTE 1, TENU PAR UN BANC. L'aperçu était recomposé à
  // la main depuis `ProtocolDraft` et ne lisait jamais `interventionStatus` :
  // une intervention suspendue s'y affichait comme un conseil ferme.
  it('dit qu’une intervention suspendue n’est pas un conseil ferme', () => {
    const { container } = render(
      <ProtocolConsultationPanel
        decisionCard={card()}
        protocolDraft={protocol({
          actions: [{ actionId: 'action-1', type: 'biological_exploration', title: 'Action patient', idealPlan: 'Idéal interne', minimalPlan: 'Minimal patient', rescuePlan: 'Secours interne', limitations: [], interventionStatus: 'conditionnelle_biologie' }],
        })}
      />,
    );
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Valider pour diffusion' }));
    fireEvent.click(ui.getByRole('button', { name: 'Ouvrir l’aperçu patient' }));
    // Requêtes portées par le CONTENEUR : les rendus précédents restent montés
    // dans ce fichier, et `querySelector('#id')` rendrait alors le nœud de
    // l'un d'eux.
    expect(ui.getByText('En attente de confirmation par votre bilan.')).not.toBeNull();
    // Le vocabulaire praticien ne traverse pas : la phrase vient du contrat.
    expect(ui.queryByText(/conditionnelle_biologie/)).toBeNull();
  });

  // Le verdict d'éligibilité EST celui du contrat : la liste de conditions
  // recopiée à la main ne comptait pas les actions, et déverrouillait un aperçu
  // vide sur un protocole sans action.
  it('refuse la validation quand le contrat refuse, et affiche son motif', () => {
    const { container } = render(
      <ProtocolConsultationPanel decisionCard={card()} protocolDraft={protocol({ actions: [] })} />,
    );
    const ui = within(container);
    expect(ui.getByRole('button', { name: 'Valider pour diffusion' }).hasAttribute('disabled')).toBe(true);
    expect(ui.getByText(/entre une et trois actions/)).not.toBeNull();
  });

  it('reverrouille l’aperçu lorsque le hash du protocole change', () => {
    const { container, rerender } = render(<ProtocolConsultationPanel decisionCard={card()} protocolDraft={protocol()} />);
    const ui = within(container);
    fireEvent.click(ui.getByRole('button', { name: 'Valider pour diffusion' }));
    rerender(<ProtocolConsultationPanel decisionCard={card()} protocolDraft={protocol({ inputHash: 'protocol-revise' })} />);
    expect(ui.getByText('Non validé pour diffusion')).not.toBeNull();
    expect(ui.getByText(/Aperçu verrouillé/)).not.toBeNull();
  });

  it('désactive la validation si un bloqueur reste présent', () => {
    const { container } = render(<ProtocolConsultationPanel decisionCard={card({ safetyFindingIds: ['safety-1'] })} protocolDraft={protocol()} />);
    expect(within(container).getByRole('button', { name: 'Valider pour diffusion' }).hasAttribute('disabled')).toBe(true);
  });
});
