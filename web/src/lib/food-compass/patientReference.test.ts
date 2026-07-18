import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    protocolDraft: { findUnique: vi.fn() },
    ciqualNutrientValue: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard, ProtocolDiffusionApproval } from '@/lib/clinical-engine/types';
import { buildFoodCompassProtocolV2FromSource } from './protocol';
import { buildPractitionerFoodCompassReference } from './practitionerReference';
import { resolvePatientFoodCompassView } from './patientReference';

const VALUES: Record<string, number> = {
  '25000': 23.3, '31000': 0.31, '32000': 0, '34100': 0,
  '40302': 3.06, '40303': 5.31, '40304': 5.1, '41833': 0.18,
  '42053': 0.67, '42263': 1, '10004': 0.88, '10110': 300,
  '10120': 38.5, '10150': 306, '10190': 368, '10200': 333,
};
const MG_CODES = new Set(['10110', '10120', '10150', '10190', '10200']);

function rows() {
  return Object.entries(VALUES).map(([nutrientCode, value]) => ({
    id: `row-${nutrientCode}`,
    ciqualCode: '26034', nutrientCode, value: value as number | null,
    valueStatus: 'exact' as 'exact' | 'missing',
    unit: (MG_CODES.has(nutrientCode) ? 'mg/100 g' : 'g/100 g') as 'mg/100 g' | 'g/100 g',
    datasetVersion: 'ciqual-2025-v1',
    sourceRef: 'doi:10.57745/RDMHWY#compo_2025_11_03.xml',
    sourceHash: '2da725585946434df320d8041631998b',
    createdAt: new Date('2026-07-18T00:00:00.000Z'),
  }));
}

const card = {
  decisionCardId: 'DEC_PATIENT_C5', inputHash: 'decision-hash', snapshotInputHash: 'snapshot-hash',
  reviewInputHash: 'review-hash', priorityCandidates: [{ candidateId: 'priority-c5' }],
  selectedMainPriority: { candidateId: 'priority-c5' }, safetyFindingIds: [],
  abstention: { status: 'not_required' },
} as unknown as DecisionCard;

function fixture(nutrientRows = rows()) {
  const source = buildProtocolDraft({
    protocolDraftId: 'proto_DEC_PATIENT_C5', decisionCard: card,
    createdAt: '2026-07-18T09:00:00.000Z', updatedAt: '2026-07-18T09:00:00.000Z',
    purpose: 'Essai alimentaire.', followUpCriterion: 'Retour avec le praticien.',
    actions: [{ actionId: 'food-1', type: 'food', title: 'Sardine', idealPlan: 'Plan idéal', minimalPlan: 'Plan simple', rescuePlan: 'Plan de secours', limitations: [] }],
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    review: { reviewedAt: '2026-07-18T09:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
  });
  const reference = buildPractitionerFoodCompassReference({
    ciqualCode: '26034', foodLabel: 'Sardine', rows: nutrientRows, activeProtocol: source,
  });
  if (!reference.actionRef) throw new Error('Référence fixture attendue.');
  const target = buildProtocolDraft({
    protocolDraftId: source.protocolDraftId, decisionCard: card,
    createdAt: source.createdAt, updatedAt: '2026-07-18T10:00:00.000Z',
    purpose: source.purpose, followUpCriterion: source.followUpCriterion,
    actions: source.actions, therapeuticLoad: source.therapeuticLoad,
    review: { reviewedAt: '2026-07-18T10:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
  });
  const approvedDraft = buildFoodCompassProtocolV2FromSource({
    sourceProtocolDraft: source,
    targetProtocolDraft: target,
    actions: [{ ...target.actions[0], foodCompassRef: reference.actionRef }],
    c5Enabled: true,
  });
  const approval: ProtocolDiffusionApproval = {
    decisionCardInputHash: approvedDraft.decisionCardInputHash,
    protocolDraftInputHash: approvedDraft.inputHash,
    approvedAt: '2026-07-18T11:00:00.000Z',
    approvedBy: 'practitioner', confirmation: 'content_approved_for_diffusion',
  };
  return { source, actionRef: reference.actionRef, approvedDraft, approval };
}

describe('projection patient C5 serveur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { source } = fixture();
    prisma.protocolDraft.findUnique.mockResolvedValue({ idPatient: 'PAT_1', payload: source, inputHash: source.inputHash });
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(rows());
  });

  it('ne projette que des champs qualitatifs patient-safe', async () => {
    const { actionRef, approvedDraft, approval } = fixture();
    const view = await resolvePatientFoodCompassView({ idPatient: 'PAT_1', approvedDraft, approval, actionRef });
    expect(view).toMatchObject({ foodRef: '26034', foodLabel: 'Sardine', alternative: null });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/aggregate|score|percentile|inputHash|refHash|61\.734453|100\s*%/i);
  });

  it('refuse une source appartenant à un autre patient', async () => {
    const { actionRef, approvedDraft, approval } = fixture();
    prisma.protocolDraft.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE', payload: {}, inputHash: 'hash' });
    expect(await resolvePatientFoodCompassView({ idPatient: 'PAT_1', approvedDraft, approval, actionRef })).toBeNull();
  });

  it('refuse une référence forgée ou un référentiel incomplet', async () => {
    const { actionRef, approvedDraft, approval } = fixture();
    expect(await resolvePatientFoodCompassView({
      idPatient: 'PAT_1', approvedDraft, approval,
      actionRef: { ...actionRef, intrinsicProfileHash: 'forgé' },
    })).toBeNull();
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(rows().slice(0, 15));
    expect(await resolvePatientFoodCompassView({ idPatient: 'PAT_1', approvedDraft, approval, actionRef })).toBeNull();
  });

  it('refuse une approbation qui ne correspond pas au protocole diffusé', async () => {
    const { actionRef, approvedDraft, approval } = fixture();
    expect(await resolvePatientFoodCompassView({
      idPatient: 'PAT_1', approvedDraft,
      approval: { ...approval, protocolDraftInputHash: 'ancienne-version' },
      actionRef,
    })).toBeNull();
  });

  it('ne diffuse jamais automatiquement un profil partiel', async () => {
    const partialRows = rows().map(row => row.nutrientCode === '42053'
      ? { ...row, value: null, valueStatus: 'missing' as const }
      : row);
    const { source, actionRef, approvedDraft, approval } = fixture(partialRows);
    prisma.protocolDraft.findUnique.mockResolvedValue({ idPatient: 'PAT_1', payload: source, inputHash: source.inputHash });
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(partialRows);
    expect(await resolvePatientFoodCompassView({ idPatient: 'PAT_1', approvedDraft, approval, actionRef })).toBeNull();
  });
});
