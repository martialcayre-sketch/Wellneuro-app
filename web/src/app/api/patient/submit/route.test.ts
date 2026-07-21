import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn(), update: vi.fn() },
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }) },
}));

import { signPatientSession } from '@/lib/patient-session';
import { POST as postSubmit } from './route';

const assignation = {
  idAssignation: 'ASS_SUBMIT_TEST',
  idPatient: 'PAT_SEED_03',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null,
  statutReponses: 'en_cours',
};

function requeteSoumission(): Request {
  const cookie = signPatientSession({
    idPatient: assignation.idPatient,
    email: assignation.emailPatient,
  });
  return new Request('http://localhost/api/patient/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(cookie)}`,
    },
    body: JSON.stringify({
      idAssignation: assignation.idAssignation,
      idQuestionnaire: assignation.idQuestionnaire,
      answers: { NEU3_Q001: 2, NEU3_Q002: 1 },
    }),
  });
}

// Garde de l'audit 5.0, réserve R1 : le score est calculé et persisté côté
// serveur, jamais renvoyé au navigateur patient. Une donnée transmise mais non
// affichée reste une donnée transmise — le test échoue si elle réapparaît dans
// le corps de réponse, quel que soit le nom de la clé.
describe('POST /api/patient/submit — aucun score renvoyé au patient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessToken: 'TOKEN_TEST',
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
  });

  it('accepte la soumission sans exposer le score ni son interprétation', async () => {
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(200);

    const corps = (await res.json()) as Record<string, unknown>;
    expect(corps.ok).toBe(true);
    expect(corps.titre).toBe(assignation.titre);
    expect(Object.keys(corps).sort()).toEqual(['ok', 'titre']);
    expect(JSON.stringify(corps)).not.toMatch(/score|interpretation|total/i);
  });

  it('calcule et persiste le score malgré tout', async () => {
    await postSubmit(requeteSoumission());

    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.questionnaireReponse.create.mock.calls[0][0] as {
      data: { scoresJson: Record<string, unknown> };
    };
    expect(data.scoresJson).toBeTruthy();
    expect(data.scoresJson.rawAnswers).toEqual({ NEU3_Q001: 2, NEU3_Q002: 1 });
  });
});
