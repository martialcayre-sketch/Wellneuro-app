import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { deriveProtocolDraftId, deriveVersionId } from '@/lib/protocol/versioning';
import { GET, POST } from './route';

const versionId = deriveVersionId(deriveProtocolDraftId('DEC_1'), 'HASH_V1');

const versionRow = {
  idPatient: 'PAT_1',
  inputHash: 'HASH_V1',
  decisionCardInputHash: 'HASH_DEC',
  status: 'practitioner_reviewed',
  reviewedAt: new Date('2026-01-02T00:00:00.000Z'),
};

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/protocoles/diffusion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const body = { idPatient: 'PAT_1', decisionCardId: 'DEC_1', protocolDraftInputHash: 'HASH_V1' };

describe('POST /api/praticien/protocoles/diffusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
  });

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest(body));
    expect(res.status).toBe(401);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('rejette une version introuvable (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest(body));
    expect(res.status).toBe(404);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('refuse le patient d’un autre praticien (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await POST(postRequest(body));
    expect(res.status).toBe(403);
    expect(prisma.protocolDraft.findUnique).not.toHaveBeenCalled();
  });

  it('rejette l’accès inter-patient (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue({ ...versionRow, idPatient: 'AUTRE' });
    const res = await POST(postRequest(body));
    expect(res.status).toBe(404);
  });

  it('persiste une première approbation (supersedes null)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.create.mockResolvedValue({ id: 'appr_1' });
    const res = await POST(postRequest(body));
    const json = (await res.json()) as { ok: boolean; unchanged: boolean; approvalId: string };
    expect(res.status).toBe(200);
    expect(json.unchanged).toBe(false);
    expect(json.approvalId).toBe('appr_1');
    expect(prisma.protocolDiffusionApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idPatient: 'PAT_1',
          protocolDraftId: versionId,
          protocolDraftInputHash: 'HASH_V1',
          supersedesApprovalId: null,
          confirmation: 'content_approved_for_diffusion',
        }),
      }),
    );
  });

  it('est idempotent quand la version active est déjà approuvée (no-op)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    const res = await POST(postRequest(body));
    const json = (await res.json()) as { unchanged: boolean; approvalId: string };
    expect(res.status).toBe(200);
    expect(json.unchanged).toBe(true);
    expect(json.approvalId).toBe('appr_1');
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/praticien/protocoles/diffusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
  });

  it('retourne l’approbation active et sa caducité', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    // La version active porte HASH_V2, l'approbation ancre HASH_V1 → caduque.
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v2', inputHash: 'HASH_V2', decisionCardInputHash: 'HASH_DEC', supersedesDraftId: 'v1', createdAt: new Date('2026-01-05T00:00:00.000Z') },
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), approvedAt: new Date('2026-01-03T12:00:00.000Z') },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { ok: boolean; approval: { protocolDraftInputHash: string } | null; stale: boolean };
    expect(res.status).toBe(200);
    expect(json.approval?.protocolDraftInputHash).toBe('HASH_V1');
    expect(json.stale).toBe(true);
  });

  it('retourne approval null sans versions', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { approval: null; stale: boolean };
    expect(json.approval).toBeNull();
    expect(json.stale).toBe(false);
  });

  it('refuse la lecture du patient d’un autre praticien (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    expect(res.status).toBe(403);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
  });
});
