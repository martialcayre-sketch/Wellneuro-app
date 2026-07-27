import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    assignation: { create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessTokenRevoked: false,
};

function request(): Request {
  return new Request('http://localhost/api/praticien/assignations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailPatient: patient.email, idQuestionnaire: 'Q_NEU_03' }),
  });
}

describe('POST /api/praticien/assignations — lien portail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.assignation.create.mockResolvedValue({});
    sendMail.mockResolvedValue(undefined);
  });

  // LOT-04 : l'e-mail pointe la page de connexion, plus le lien permanent secret.
  it('envoie un lien vers la page de connexion, jamais un jeton permanent', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0] as { text: string };
    expect(message.text).toContain('https://app.wellneuro.fr/portail/connexion');
    expect(message.text).not.toContain('/portail/TOK');
    expect(message.text).not.toContain('/patient/ASS_');
  });

  it('bloque avant écriture lorsque le portail est révoqué', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'portal_revoked' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
