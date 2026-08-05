import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    assignation: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { PATCH, POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessTokenRevoked: false,
};

function request(idQuestionnaire = 'Q_NEU_03'): Request {
  return new Request('http://localhost/api/praticien/assignations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailPatient: patient.email, idQuestionnaire }),
  });
}

describe('POST /api/praticien/assignations — lien portail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.assignation.create.mockResolvedValue({});
    // Dédup : aucune assignation ouverte par défaut ; la transaction
    // interactive passe le client mocké lui-même comme tx.
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
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

  // Le refus doit être DANS la route, pas dans l'écran : retirer l'entrée du
  // sélecteur laisse passer un appel direct. `Q_FIB_03` est nommé exprès — un
  // invariant générique sur « les suspendus » resterait vert si on le
  // réactivait, et c'est cette décision-là qu'on verrouille ici.
  it('refuse un questionnaire suspendu, avant toute écriture et tout envoi', async () => {
    const response = await POST(request('Q_FIB_03'));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      success: false,
      reason: 'questionnaire_suspendu',
    });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('bloque avant écriture lorsque le portail est révoqué', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'portal_revoked' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  // Dédup : une assignation OUVERTE du même questionnaire bloque la création
  // et l'e-mail. Le filtre porte sur le statut, pas sur l'existence : une
  // assignation annulée ou complétée ne bloque jamais une repassation.
  it('refuse en 409 deja_assigne si une assignation ouverte existe déjà', async () => {
    prisma.assignation.findMany.mockResolvedValue([{ idQuestionnaire: 'Q_NEU_03' }]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'deja_assigne' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('contrôle négatif — la requête de dédup ne regarde que les statuts ouverts', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    const whereDedup = prisma.assignation.findMany.mock.calls[0][0] as {
      where: { statut: { in: string[] } };
    };
    expect(whereDedup.where.statut.in).toEqual(['En attente']);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
  });
});

// Quatrième chemin d'envoi, celui que #406 avait nommé sans le fermer :
// déverrouiller ROUVRE la saisie. « Geste délibéré, mais non gardé » — il l'est
// désormais.
describe('PATCH /api/praticien/assignations — déverrouillage', () => {
  function patchRequest(idAssignation = 'ASS_1') {
    return new Request('http://localhost/api/praticien/assignations', {
      method: 'PATCH',
      body: JSON.stringify({ idAssignation }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1',
    });
    prisma.assignation.update.mockResolvedValue({});
  });

  it('refuse de rouvrir la saisie d’un instrument suspendu, avant toute écriture', async () => {
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_FIB_03', idPatient: 'PAT_1',
    });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'questionnaire_suspendu' });
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('contrôle négatif — un instrument courant se déverrouille toujours', async () => {
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(prisma.assignation.update).toHaveBeenCalledTimes(1);
  });
});
