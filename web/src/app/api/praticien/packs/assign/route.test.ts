import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn(), findFirst: vi.fn() },
    pack: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
const tx = { $queryRaw: vi.fn(), patient: { update: vi.fn() }, assignation: { create: vi.fn() } };
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('@/lib/consultation/packRegistry', () => ({
  resolvePackQuestionnaireIds: vi.fn().mockResolvedValue({ qids: ['Q_NEU_03'] }),
}));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn() },
}));

import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessToken: 'TOK_PORTAIL_TEST',
  accessTokenRevoked: false,
};

function request(): Request {
  return new Request('http://localhost/api/praticien/packs/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailPatient: patient.email, idPack: 'PACK_TEST' }),
  });
}

describe('POST /api/praticien/packs/assign — lien portail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.$transaction.mockImplementation((operation: (client: typeof tx) => unknown) => operation(tx));
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: patient.accessToken, accessTokenRevoked: false }]);
    prisma.pack.findUnique.mockResolvedValue({ idPack: 'PACK_TEST', nom: 'Pack test', actif: true, qids: ['Q_NEU_03'] });
    tx.assignation.create.mockResolvedValue({});
    sendMail.mockResolvedValue(undefined);
  });

  it('envoie un seul lien vers le hub permanent', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0] as { text: string };
    expect(message.text).toContain('https://app.wellneuro.fr/portail/TOK_PORTAIL_TEST');
    expect(message.text).not.toContain('/patient/ASS_');
  });

  it('ne crée aucune assignation lorsque le portail est révoqué', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    tx.$queryRaw.mockResolvedValue([{ actif: true, accessToken: patient.accessToken, accessTokenRevoked: true }]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: 'portal_revoked' });
    expect(tx.assignation.create).not.toHaveBeenCalled();
  });
});
