import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    assignation: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { security: vi.fn(), error: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  prenom: 'Sophie',
  nom: 'Nicola',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessToken: 'TOK_NOUVEAU',
  accessTokenRevoked: false,
};

function request(cookie: string): Request {
  return new Request('http://localhost/api/portail/assignations', {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookie)}` },
  });
}

describe('GET /api/portail/assignations — liaison session au token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.assignation.findMany.mockResolvedValue([]);
  });

  it('refuse un ancien cookie après réémission du token', async () => {
    const oldCookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email,
      accessToken: 'TOK_ANCIEN',
    });

    expect((await GET(request(oldCookie))).status).toBe(401);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('accepte le cookie signé avec le token courant', async () => {
    const currentCookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email,
      accessToken: patient.accessToken,
    });

    const response = await GET(request(currentCookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      patient: { prenom: patient.prenom, nom: patient.nom },
      assignations: [],
    });
  });
});
