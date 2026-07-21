import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { GET as getAssignations } from './assignations/route';
import { POST as postConsentement } from './consentement/route';
import { GET as getEquilibre } from './equilibre/route';
import { GET as getReponses } from './reponses/route';
import { POST as postSubmit } from './submit/route';

const assignation = {
  idAssignation: 'ASS_SESSION_TEST',
  idPatient: 'PAT_PROPRIETAIRE',
  emailPatient: 'adresse-partagee@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null,
  statutReponses: 'en_cours',
};

function cookieAutrePatient(): string {
  return signPatientSession({ idPatient: 'PAT_AUTRE', email: assignation.emailPatient });
}

function getRequest(path: string): Request {
  return new Request(`http://localhost${path}?id=${assignation.idAssignation}`, {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookieAutrePatient())}` },
  });
}

function postRequest(path: string, body: object): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(cookieAutrePatient())}`,
    },
    body: JSON.stringify(body),
  });
}

describe('routes patient — isolation par idPatient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
  });

  it('refuse la liste des assignations à un autre patient ayant le même email', async () => {
    expect((await getAssignations(getRequest('/api/patient/assignations'))).status).toBe(404);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('refuse les réponses et Mon équilibre avant toute lecture clinique', async () => {
    expect((await getReponses(getRequest('/api/patient/reponses'))).status).toBe(404);
    expect((await getEquilibre(getRequest('/api/patient/equilibre'))).status).toBe(404);
    expect(prisma.questionnaireReponse.findFirst).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('refuse consentement et soumission avant toute écriture', async () => {
    const consentement = await postConsentement(postRequest('/api/patient/consentement', {
      idAssignation: assignation.idAssignation,
      action: 'donner',
    }));
    const soumission = await postSubmit(postRequest('/api/patient/submit', {
      idAssignation: assignation.idAssignation,
      answers: { SIGH_Q001: 0 },
    }));
    expect(consentement.status).toBe(403);
    expect(soumission.status).toBe(403);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
  });
});
