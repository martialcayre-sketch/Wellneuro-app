import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    envoiBrouillon: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const tx = {
  $queryRaw: vi.fn(),
  patient: { update: vi.fn() },
  assignation: { create: vi.fn() },
  envoiBrouillon: { updateMany: vi.fn() },
};

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { POST } from './route';

const BROUILLON = {
  idBrouillon: 'ENV_1',
  idPatient: 'PAT001',
  qids: ['Q_STR_02', 'Q_SOM_02'],
  dateLimite: '2026-08-01',
  notes: null,
  statut: 'brouillon',
};

const PATIENT = {
  idPatient: 'PAT001',
  email: 'sophie.nicola@example.com',
  actif: true,
  suiviClotureLe: null,
};

function postRequest(body: unknown) {
  return new Request('http://localhost/api/praticien/file-envoi/envoyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('file-envoi/envoyer POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.envoiBrouillon.findFirst.mockResolvedValue(BROUILLON);
    prisma.patient.findFirst.mockResolvedValue(PATIENT);
    prisma.$transaction.mockImplementation((op: (t: typeof tx) => unknown) => op(tx));
    tx.$queryRaw.mockResolvedValue([
      { actif: true, accessToken: 'TOK_PORTAIL_TEST', accessTokenRevoked: false },
    ]);
    tx.envoiBrouillon.updateMany.mockResolvedValue({ count: 1 });
  });

  it('crée une assignation par questionnaire, passe le brouillon à parti, un seul mail portail', async () => {
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, count: 2 });

    expect(tx.assignation.create).toHaveBeenCalledTimes(2);
    const premiere = tx.assignation.create.mock.calls[0][0].data;
    expect(premiere.statut).toBe('En attente');
    expect(premiere.emailPatient).toBe('sophie.nicola@example.com');
    expect(premiere.dateLimite).toBe('2026-08-01');

    expect(tx.envoiBrouillon.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idBrouillon: 'ENV_1', statut: 'brouillon' },
        data: expect.objectContaining({ statut: 'parti' }),
      }),
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.text).toContain('https://app.wellneuro.fr/portail/TOK_PORTAIL_TEST');
    expect(message.text).not.toContain('/patient/ASS_');
    expect(message.text).toContain('PSS-10');
  });

  it('révocation portail : 409, aucune assignation, brouillon intact', async () => {
    tx.$queryRaw.mockResolvedValue([
      { actif: true, accessToken: 'TOK_PORTAIL_TEST', accessTokenRevoked: true },
    ]);
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('portal_revoked');
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(tx.envoiBrouillon.updateMany).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('envoi concurrent : le second claim trouve count=0 → 409, aucune assignation, aucun mail', async () => {
    tx.envoiBrouillon.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_envoye');
    expect(tx.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('brouillon d’un autre praticien : introuvable (cloisonnement), 404', async () => {
    prisma.envoiBrouillon.findFirst.mockResolvedValue(null);
    const res = await POST(postRequest({ idBrouillon: 'ENV_AUTRE_PRATICIEN' }));
    expect(res.status).toBe(404);
    const where = prisma.envoiBrouillon.findFirst.mock.calls[0][0].where;
    expect(where.praticienEmail.equals).toBe('praticien@wellneuro.fr');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dossier au suivi clôturé : 409, rien ne part', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...PATIENT, suiviClotureLe: new Date() });
    const res = await POST(postRequest({ idBrouillon: 'ENV_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('brouillon inconnu : 404', async () => {
    prisma.envoiBrouillon.findFirst.mockResolvedValue(null);
    const res = await POST(postRequest({ idBrouillon: 'ENV_INCONNU' }));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('not_found');
  });
});
