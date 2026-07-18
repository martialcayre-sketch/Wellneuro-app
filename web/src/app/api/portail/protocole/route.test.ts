import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, reconstructProtocolDraft, resolvePatientFoodCompassView } = vi.hoisted(() => ({
  prisma: {
    assignation: { findFirst: vi.fn() },
    patient: { findUnique: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
  },
  reconstructProtocolDraft: vi.fn(),
  resolvePatientFoodCompassView: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft,
  ProtocolPayloadIntegrityError: class ProtocolPayloadIntegrityError extends Error {},
}));
vi.mock('@/lib/food-compass/patientReference', () => ({ resolvePatientFoodCompassView }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const assignation = { idAssignation: 'ASS_1', idPatient: 'PAT_PROPRIO', emailPatient: 'proprio@example.test' };

function proprioCookie(): string {
  return signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient, accessToken: 'TOK_PROPRIO' });
}
function mockOwnerAuth(): void {
  prisma.assignation.findFirst.mockResolvedValue(assignation);
  prisma.patient.findUnique.mockResolvedValue({ actif: true, accessToken: 'TOK_PROPRIO', accessTokenRevoked: false, email: assignation.emailPatient });
}
function request(cookie?: string): Request {
  return new Request('http://localhost/api/portail/protocole', {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

const draftDerive = {
  purpose: 'Stabiliser vos matins.',
  followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21.',
  adviceSheetRef: 'Fiche sommeil',
  actions: [
    { actionId: 'a1', type: 'food', title: 'Petit-déjeuner protéiné', minimalPlan: 'Trois matins cette semaine', idealPlan: 'INTERNE', rescuePlan: 'INTERNE', limitations: ['INTERNE'] },
  ],
};

describe('GET /api/portail/protocole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.WN_C5_ENABLED = 'false';
  });

  it('refuse sans session portail (401)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.protocolDraft.findUnique).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404)', async () => {
    prisma.assignation.findFirst.mockResolvedValue(assignation);
    const cookie = signPatientSession({ idPatient: 'PAT_INTRUS', email: assignation.emailPatient, accessToken: 'TOK' });
    const res = await GET(request(cookie));
    expect(res.status).toBe(404);
  });

  it('renvoie protocoleDiffuse=false sans approbation active (200)', async () => {
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as { ok: boolean; protocoleDiffuse: boolean; vue: unknown };
    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(false);
    expect(json.vue).toBeNull();
  });

  it('dérive une vue patient-safe (title+minimalPlan uniquement) (200)', async () => {
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftId: 'proto_DEC#h', protocolDraftInputHash: 'h', decisionCardInputHash: 'decision-hash', approvedBy: 'practitioner', confirmation: 'content_approved_for_diffusion', supersedesApprovalId: null, createdAt: new Date(), approvedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    ]);
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'h', decisionCardId: 'DEC', decisionCardInputHash: 'decision-hash', status: 'practitioner_reviewed', reviewedAt: new Date(0) });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC#h', inputHash: 'h', supersedesDraftId: null, createdAt: new Date() }]);
    reconstructProtocolDraft.mockReturnValue(draftDerive);

    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as {
      ok: boolean; protocoleDiffuse: boolean; finDeCycle: boolean;
      vue: { purpose: string; actionPrincipale: Record<string, unknown> | null };
    };
    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(true);
    expect(json.finDeCycle).toBe(false);
    expect(json.vue.purpose).toBe('Stabiliser vos matins.');
    expect(json.vue.actionPrincipale).toEqual({ type: 'food', title: 'Petit-déjeuner protéiné', minimalPlan: 'Trois matins cette semaine' });
    // Aucune fuite de champ interne.
    expect(JSON.stringify(json)).not.toContain('INTERNE');
  });

  it('marque finDeCycle au-delà de J21+tolérance', async () => {
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftId: 'proto_DEC#h', protocolDraftInputHash: 'h', decisionCardInputHash: 'decision-hash', approvedBy: 'practitioner', confirmation: 'content_approved_for_diffusion', supersedesApprovalId: null, createdAt: new Date(), approvedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    ]);
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'h', decisionCardId: 'DEC', decisionCardInputHash: 'decision-hash', status: 'practitioner_reviewed', reviewedAt: new Date(0) });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC#h', inputHash: 'h', supersedesDraftId: null, createdAt: new Date() }]);
    reconstructProtocolDraft.mockReturnValue(draftDerive);

    const res = await GET(request(proprioCookie()));
    const json = (await res.json()) as { finDeCycle: boolean };
    expect(json.finDeCycle).toBe(true);
  });

  it('ajoute uniquement le résumé Boussole patient-safe du protocole approuvé', async () => {
    process.env.WN_C5_ENABLED = 'true';
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftId: 'proto_DEC#h', protocolDraftInputHash: 'h', decisionCardInputHash: 'decision-hash', approvedBy: 'practitioner', confirmation: 'content_approved_for_diffusion', supersedesApprovalId: null, createdAt: new Date(), approvedAt: new Date() },
    ]);
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'h', decisionCardId: 'DEC', decisionCardInputHash: 'decision-hash', status: 'practitioner_reviewed', reviewedAt: new Date(0) });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC#h', inputHash: 'h', supersedesDraftId: null, createdAt: new Date() }]);
    const foodCompassRef = { foodRef: 'ciqual-2025-v1:26034', refHash: 'ref-hash' };
    reconstructProtocolDraft.mockReturnValue({
      ...draftDerive,
      actions: [
        { ...draftDerive.actions[0], foodCompassRef },
        { ...draftDerive.actions[0], actionId: 'a2', foodCompassRef },
      ],
    });
    const safe = {
      foodRef: '26034', foodLabel: 'Sardine', qualitativeSummary: 'Lecture qualitative.',
      reasons: ['Raison qualitative.'], sourceLabel: 'Table Ciqual, Anses',
      limitations: ['Limite qualitative.'], alternative: null,
    };
    resolvePatientFoodCompassView.mockResolvedValue(safe);
    const response = await GET(request(proprioCookie()));
    const payload = await response.json();
    expect(payload.vue.boussoles).toEqual([safe]);
    expect(resolvePatientFoodCompassView).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(payload.vue.boussoles)).not.toMatch(/score|inputHash|refHash|%/i);
  });

  it('masque un protocole approuvé devenu caduc', async () => {
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftId: 'proto_DEC#h', protocolDraftInputHash: 'h', decisionCardInputHash: 'decision-hash', approvedBy: 'practitioner', confirmation: 'content_approved_for_diffusion', supersedesApprovalId: null, createdAt: new Date(), approvedAt: new Date() },
    ]);
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'h', decisionCardId: 'DEC', decisionCardInputHash: 'decision-hash', status: 'practitioner_reviewed', reviewedAt: new Date(0) });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'proto_DEC#h2', inputHash: 'h2', supersedesDraftId: 'proto_DEC#h', createdAt: new Date() },
      { id: 'proto_DEC#h', inputHash: 'h', supersedesDraftId: null, createdAt: new Date(0) },
    ]);
    const res = await GET(request(proprioCookie()));
    expect(await res.json()).toMatchObject({ ok: true, protocoleDiffuse: false, vue: null });
  });
});
