import { describe, expect, it } from 'vitest';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard, ProtocolAction } from '@/lib/clinical-engine/types';
import { ProtocolPayloadIntegrityError, reconstructProtocolDraft } from './fromPrisma';

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

const draft = buildProtocolDraft({
  protocolDraftId: 'proto_DEC_1',
  decisionCard,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  purpose: 'Stabiliser le matin',
  followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21',
  therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
  actions: [action],
  review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
});

describe('reconstructProtocolDraft', () => {
  it('reconstitue un draft dont l’empreinte concorde avec la colonne', () => {
    const restored = reconstructProtocolDraft(draft, draft.inputHash);
    expect(restored.protocolDraftId).toBe('proto_DEC_1');
    expect(restored.purpose).toBe('Stabiliser le matin');
  });

  it('rejette un payload dont le contenu a été altéré', () => {
    const tampered = { ...draft, purpose: 'Contenu falsifié' };
    expect(() => reconstructProtocolDraft(tampered, draft.inputHash)).toThrow(
      ProtocolPayloadIntegrityError,
    );
  });

  it('rejette un input_hash de colonne discordant', () => {
    expect(() => reconstructProtocolDraft(draft, 'AUTRE_HASH')).toThrow(
      ProtocolPayloadIntegrityError,
    );
  });

  it('rejette un payload illisible', () => {
    expect(() => reconstructProtocolDraft(null, 'x')).toThrow(ProtocolPayloadIntegrityError);
  });

  // Propriété de sécurité porteuse du contrat V3 (LOT-04) : la lecture refuse
  // un payload V3 tant qu'il n'est pas ouvert délibérément. Ce test garde le
  // verrou — quiconque ajoutera V3 à la garde de version de fromPrisma.ts sans
  // brancher aussi la validation de la référence catalogue verra ce test
  // échouer, et non ouvrir en silence la lecture de références non validées.
  it('rejette un payload de version V3 (contrat non ouvert en lecture)', () => {
    const v3 = { ...draft, version: 'c1-protocol-draft-v3' };
    expect(() => reconstructProtocolDraft(v3, draft.inputHash)).toThrow(
      ProtocolPayloadIntegrityError,
    );
  });
});
