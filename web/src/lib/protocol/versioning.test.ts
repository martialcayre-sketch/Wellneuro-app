import { describe, expect, it } from 'vitest';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard, ProtocolAction, ProtocolReview } from '@/lib/clinical-engine/types';
import {
  clinicalContentHash,
  deriveProtocolDraftId,
  deriveVersionId,
  isClinicalChange,
  resolveActiveVersion,
  type PersistedVersionRow,
} from './versioning';

// DecisionCard minimale valide pour buildProtocolDraft (seuls quelques champs
// sont lus : abstention, safetyFindingIds, selectedMainPriority, priorityCandidates,
// decisionCardId, inputHash).
const decisionCard = {
  decisionCardId: 'DEC_1',
  inputHash: 'HASH_DEC',
  snapshotInputHash: 'HASH_SNAP',
  reviewInputHash: 'HASH_REV',
  priorityCandidates: [{ candidateId: 'PRIO_1' }],
  selectedMainPriority: { candidateId: 'PRIO_1' },
  safetyFindingIds: [],
  abstention: { status: 'not_required' },
} as unknown as DecisionCard;

const action: ProtocolAction = {
  actionId: 'A1',
  type: 'food',
  title: 'Petit-déjeuner protéiné',
  idealPlan: 'Chaque matin',
  minimalPlan: 'Trois matins',
  rescuePlan: 'Un fruit',
  limitations: [],
};

function draftAt(updatedAt: string, purpose = 'Stabiliser le matin'): ReturnType<typeof buildProtocolDraft> {
  const review: ProtocolReview = {
    reviewedAt: updatedAt,
    reviewerRole: 'practitioner',
    confirmation: 'content_reviewed',
  };
  return buildProtocolDraft({
    protocolDraftId: deriveProtocolDraftId('DEC_1'),
    decisionCard,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    purpose,
    followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21',
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    actions: [action],
    review,
  });
}

describe('deriveVersionId / deriveProtocolDraftId', () => {
  it('encode le protocolDraftId en préfixe recouvrable', () => {
    expect(deriveProtocolDraftId('DEC_1')).toBe('proto_DEC_1');
    expect(deriveVersionId('proto_DEC_1', 'HASH')).toBe('proto_DEC_1#HASH');
  });
});

describe('resolveActiveVersion', () => {
  const row = (id: string, supersedes: string | null, iso: string): PersistedVersionRow => ({
    id,
    inputHash: `h_${id}`,
    supersedesDraftId: supersedes,
    createdAt: new Date(iso),
  });

  it('retourne null sur un fil vide', () => {
    expect(resolveActiveVersion([])).toBeNull();
  });

  it('retourne l’unique version d’un fil à un élément', () => {
    const only = row('v1', null, '2026-01-01T00:00:00.000Z');
    expect(resolveActiveVersion([only])?.id).toBe('v1');
  });

  it('retourne la tête de chaîne (non supplantée) d’une chaîne', () => {
    const rows = [
      row('v1', null, '2026-01-01T00:00:00.000Z'),
      row('v2', 'v1', '2026-01-02T00:00:00.000Z'),
      row('v3', 'v2', '2026-01-03T00:00:00.000Z'),
    ];
    expect(resolveActiveVersion(rows)?.id).toBe('v3');
  });
});

describe('isClinicalChange / clinicalContentHash', () => {
  it('ignore les horodatages : même contenu clinique → pas de changement', () => {
    const a = draftAt('2026-01-02T00:00:00.000Z');
    const b = draftAt('2026-01-05T00:00:00.000Z'); // updatedAt/reviewedAt différents
    expect(a.inputHash).not.toBe(b.inputHash); // le hash contrat diffère (timestamps)
    expect(clinicalContentHash(a)).toBe(clinicalContentHash(b));
    expect(isClinicalChange(a, b)).toBe(false);
  });

  it('détecte un changement de contenu clinique', () => {
    const a = draftAt('2026-01-02T00:00:00.000Z', 'Stabiliser le matin');
    const b = draftAt('2026-01-02T00:00:00.000Z', 'Objectif révisé');
    expect(isClinicalChange(a, b)).toBe(true);
  });

  it('considère toujours une première version comme un changement', () => {
    const a = draftAt('2026-01-02T00:00:00.000Z');
    expect(isClinicalChange(null, a)).toBe(true);
  });
});
