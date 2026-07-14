import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const assignation = {
  idAssignation: 'ASS_SESSION_TEST',
  idPatient: 'PAT_1',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null,
  notes: null,
  statut: 'En attente',
  consentement: 'donne',
  statutReponses: 'en_cours',
};

function request(query = '', cookie?: string): Request {
  return new Request(`http://localhost/api/patient/questionnaire?id=${assignation.idAssignation}${query}`, {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

describe('GET /api/patient/questionnaire — propriété session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      actif: true,
      accessToken: 'TOK_TEST',
      accessTokenRevoked: false,
      email: assignation.emailPatient,
    });
  });

  it('autorise le propriétaire via cookie sans email dans l’URL', async () => {
    const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
    const response = await GET(request('', cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, assignation: { idPatient: assignation.idPatient } });
  });

  it('refuse un autre patient même lorsque son email est identique', async () => {
    const cookie = signPatientSession({ idPatient: 'PAT_2', email: assignation.emailPatient });
    expect((await GET(request('', cookie))).status).toBe(404);
  });

  it('conserve le fallback legacy avec email correct', async () => {
    const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
    expect(response.status).toBe(200);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });
});
