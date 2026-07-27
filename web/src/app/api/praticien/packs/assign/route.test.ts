import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    pack: { findUnique: vi.fn() },
    assignation: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
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
import { resolvePackQuestionnaireIds } from '@/lib/consultation/packRegistry';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  actif: true,
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
    // `clearAllMocks` efface les appels, PAS les implémentations : un
    // `mockResolvedValue` posé dans un test fuiterait sur les suivants. On
    // repose donc la valeur de la fabrique à chaque cas.
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({ qids: ['Q_NEU_03'], source: 'legacy' });
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.pack.findUnique.mockResolvedValue({ idPack: 'PACK_TEST', nom: 'Pack test', actif: true, qids: ['Q_NEU_03'] });
    prisma.assignation.create.mockResolvedValue({});
    // LOT-04 : plus de withActivePortalAccess ; les créations passent par un
    // $transaction(array) qui se contente d'exécuter les promesses.
    prisma.$transaction.mockResolvedValue([]);
    sendMail.mockResolvedValue(undefined);
  });

  it('envoie un seul lien vers la page de connexion, jamais un jeton permanent', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0] as { text: string };
    expect(message.text).toContain('https://app.wellneuro.fr/portail/connexion');
    expect(message.text).not.toContain('/portail/TOK');
    expect(message.text).not.toContain('/patient/ASS_');
  });

  // Cas réel : un pack enregistré en base contient un instrument depuis
  // suspendu. Rien ne retire le qid de `pack.qids` — le filtre doit donc agir
  // à l'envoi. Le pack part amputé plutôt que d'échouer en bloc.
  it('écarte un questionnaire suspendu du pack sans faire échouer l’envoi', async () => {
    vi.mocked(resolvePackQuestionnaireIds).mockResolvedValue({
      qids: ['Q_NEU_03', 'Q_SOM_07'],
      source: 'legacy',
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    const cree = prisma.assignation.create.mock.calls[0][0] as { data: { idQuestionnaire: string } };
    expect(cree.data.idQuestionnaire).toBe('Q_NEU_03');
  });

  it('ne crée aucune assignation lorsque le portail est révoqué', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: 'portal_revoked' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
