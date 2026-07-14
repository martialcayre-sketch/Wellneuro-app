import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
const tx = { $queryRaw: vi.fn(), patient: { update: vi.fn() }, assignation: { create: vi.fn() } };
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
  accessToken: 'TOK_PORTAIL_TEST',
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
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.$transaction.mockImplementation((operation: (client: typeof tx) => unknown) => operation(tx));
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: patient.accessToken, accessTokenRevoked: false }]);
    tx.assignation.create.mockResolvedValue({});
    sendMail.mockResolvedValue(undefined);
  });

  it('envoie le lien permanent du portail', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(tx.assignation.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0] as { text: string };
    expect(message.text).toContain('https://app.wellneuro.fr/portail/TOK_PORTAIL_TEST');
    expect(message.text).not.toContain('/patient/ASS_');
  });

  it('bloque avant écriture lorsque le portail est révoqué', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: patient.accessToken, accessTokenRevoked: true }]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'portal_revoked' });
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
