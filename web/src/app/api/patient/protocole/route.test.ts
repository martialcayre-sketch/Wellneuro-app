import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    protocolDraft: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const assignation = {
  idAssignation: 'ASS_1',
  idPatient: 'PAT_PROPRIETAIRE',
  emailPatient: 'proprietaire@example.test',
  statutReponses: 'verrouille',
};

function request(cookie?: string): Request {
  return new Request(`http://localhost/api/patient/protocole?id=${assignation.idAssignation}`, {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

describe('GET /api/patient/protocole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  });

  it('refuse l’accès sans session portail — email-gate exclu (401)', async () => {
    const res = await GET(request()); // aucun cookie
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(401);
    expect(json.reason).toBe('unauthenticated');
    expect(prisma.protocolDraft.findFirst).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    // Session d'un AUTRE patient que le propriétaire de l'assignation.
    const cookie = signPatientSession({
      idPatient: 'PAT_INTRUS',
      email: assignation.emailPatient,
      accessToken: 'TOK_INTRUS',
    });
    const res = await GET(request(cookie));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(404);
    expect(json.reason).toBe('not_found');
    expect(prisma.protocolDraft.findFirst).not.toHaveBeenCalled();
  });

  it('renvoie le statut du protocole relu au patient propriétaire (200)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      actif: true,
      accessToken: 'TOK_PROPRIO',
      accessTokenRevoked: false,
      email: assignation.emailPatient,
    });
    prisma.protocolDraft.findFirst.mockResolvedValue({
      status: 'practitioner_reviewed',
      reviewedAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    const cookie = signPatientSession({
      idPatient: assignation.idPatient,
      email: assignation.emailPatient,
      accessToken: 'TOK_PROPRIO',
    });
    const res = await GET(request(cookie));
    const json = (await res.json()) as { ok: boolean; hasReviewedProtocol: boolean; status: string | null };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.hasReviewedProtocol).toBe(true);
    expect(json.status).toBe('practitioner_reviewed');
    // Scopé au patient de l'assignation vérifiée.
    expect(prisma.protocolDraft.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPatient: 'PAT_PROPRIETAIRE', status: 'practitioner_reviewed' },
      }),
    );
  });
});
