import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAcknowledgement: { create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  nom: 'Nicola',
  actif: true,
  accessToken: 'TOK_TRUST_TEST',
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

function request(body: object, avecSession = true): Request {
  const cookie = avecSession
    ? signPatientSession({ idPatient: patient.idPatient, email: patient.email })
    : null;
  return new Request('http://localhost/api/portail/trust/lecture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portail/trust/lecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.trustAcknowledgement.create.mockResolvedValue({});
  });

  it('enregistre un accusé avec version et hash résolus côté serveur', async () => {
    const response = await POST(
      request({ token: patient.accessToken, documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }),
    );
    expect(response.status).toBe(200);
    const attendu = getDocumentCourant('cadre_accompagnement');
    expect(prisma.trustAcknowledgement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idPatient: patient.idPatient,
        documentKey: 'cadre_accompagnement',
        documentVersion: attendu.version,
        contentHash: attendu.hash,
        type: 'pris_connaissance',
      }),
    });
  });

  it('est idempotent : un accusé déjà présent (P2002) répond ok sans erreur', async () => {
    prisma.trustAcknowledgement.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const response = await POST(
      request({ token: patient.accessToken, documentKey: 'cadre_accompagnement', type: 'pris_connaissance' }),
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as { ok: boolean }).ok).toBe(true);
  });

  it('refuse un document ou type inconnu et une session absente', async () => {
    expect((await POST(request({ token: patient.accessToken, documentKey: 'x', type: 'pris_connaissance' }))).status).toBe(400);
    expect((await POST(request({ token: patient.accessToken, documentKey: 'usage_ia', type: 'signe' }))).status).toBe(400);
    expect(
      (await POST(request({ token: patient.accessToken, documentKey: 'usage_ia', type: 'presente' }, false))).status,
    ).toBe(401);
  });
});
