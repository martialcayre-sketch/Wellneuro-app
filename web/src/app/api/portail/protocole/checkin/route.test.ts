import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findFirst: vi.fn() },
    patient: { findUnique: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    protocolCheckin: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const assignation = {
  idAssignation: 'ASS_1',
  idPatient: 'PAT_PROPRIO',
  emailPatient: 'proprio@example.test',
};

const reponses = {
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'mieux',
};

// Approbation diffusée il y a 7 jours → point d'étape J7 ouvert.
const approvedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

function proprioCookie(): string {
  return signPatientSession({
    idPatient: assignation.idPatient,
    email: assignation.emailPatient,
    accessToken: 'TOK_PROPRIO',
  });
}

function mockOwnerAuth(): void {
  prisma.assignation.findFirst.mockResolvedValue(assignation);
  prisma.patient.findUnique.mockResolvedValue({
    actif: true,
    accessToken: 'TOK_PROPRIO',
    accessTokenRevoked: false,
    email: assignation.emailPatient,
  });
}

function mockDiffusedProtocol(): void {
  prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
    {
      id: 'appr_1',
      protocolDraftId: 'proto_DEC_1#hash',
      protocolDraftInputHash: 'hash',
      supersedesApprovalId: null,
      createdAt: approvedAt,
      approvedAt,
    },
  ]);
}

function postRequest(cookie: string | undefined, body: unknown): Request {
  return new Request('http://localhost/api/portail/protocole/checkin', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portail/protocole/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  });

  it('refuse sans session portail — email-gate exclu (401)', async () => {
    const res = await POST(postRequest(undefined, { idAssignation: 'ASS_1', reponses }));
    expect(res.status).toBe(401);
    expect(prisma.protocolCheckin.create).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404)', async () => {
    // findFirst renvoie une assignation d'un AUTRE patient que la session.
    prisma.assignation.findFirst.mockResolvedValue(assignation);
    const cookie = signPatientSession({ idPatient: 'PAT_INTRUS', email: assignation.emailPatient, accessToken: 'TOK' });
    const res = await POST(postRequest(cookie, { reponses }));
    expect(res.status).toBe(404);
    expect(prisma.protocolCheckin.create).not.toHaveBeenCalled();
  });

  it('refuse quand aucun protocole diffusé (409)', async () => {
    mockOwnerAuth();
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    const res = await POST(postRequest(proprioCookie(), { idAssignation: 'ASS_1', reponses }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('no_protocol');
  });

  it('enregistre le check-in du point d’étape ouvert (201)', async () => {
    mockOwnerAuth();
    mockDiffusedProtocol();
    prisma.protocolCheckin.create.mockResolvedValue({
      id: 'ck_1',
      idPatient: assignation.idPatient,
      idAssignation: 'ASS_1',
      protocolDraftId: 'proto_DEC_1#hash',
      pointEtape: 'J7',
      reponses: { contractVersion: 'c2a-checkin-v1', ...reponses },
      canal: 'portail',
      supersedesCheckinId: null,
      soumisLe: new Date(),
    });

    const res = await POST(postRequest(proprioCookie(), { idAssignation: 'ASS_1', reponses }));
    const json = (await res.json()) as { ok: boolean; pointEtape?: string; checkinId?: string };
    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.pointEtape).toBe('J7');
    expect(prisma.protocolCheckin.create).toHaveBeenCalled();
  });

  it('refuse un point d’étape ne correspondant pas au calendrier (409)', async () => {
    mockOwnerAuth();
    mockDiffusedProtocol();
    const res = await POST(postRequest(proprioCookie(), { idAssignation: 'ASS_1', reponses, pointEtape: 'J21' }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('step_mismatch');
    expect(prisma.protocolCheckin.create).not.toHaveBeenCalled();
  });

  it('rejette des réponses invalides (400)', async () => {
    mockOwnerAuth();
    mockDiffusedProtocol();
    const res = await POST(postRequest(proprioCookie(), { idAssignation: 'ASS_1', reponses: { adhesion: 'x' } }));
    expect(res.status).toBe(400);
    expect(prisma.protocolCheckin.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/portail/protocole/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  });

  it('retourne l’état des rendez-vous de suivi (200)', async () => {
    mockOwnerAuth();
    mockDiffusedProtocol();
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        id: 'ck_1',
        idPatient: assignation.idPatient,
        idAssignation: 'ASS_1',
        protocolDraftId: 'proto_DEC_1#hash',
        pointEtape: 'J7',
        reponses: { contractVersion: 'c2a-checkin-v1', ...reponses },
        canal: 'portail',
        supersedesCheckinId: null,
        soumisLe: new Date(),
      },
    ]);

    const req = new Request('http://localhost/api/portail/protocole/checkin?id=ASS_1', {
      headers: { cookie: `wn_portail=${encodeURIComponent(proprioCookie())}` },
    });
    const res = await GET(req);
    const json = (await res.json()) as {
      ok: boolean;
      protocoleDiffuse: boolean;
      pointEtapeOuvert: string | null;
      points: { pointEtape: string; renseigne: boolean }[];
    };
    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(true);
    expect(json.pointEtapeOuvert).toBe('J7');
    expect(json.points.find((p) => p.pointEtape === 'J7')?.renseigne).toBe(true);
    expect(json.points.find((p) => p.pointEtape === 'J14')?.renseigne).toBe(false);
  });
});
