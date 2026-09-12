import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    assignation: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    // Lue SEULEMENT sous `WN_ECHEANCE_OBLIGATOIRE` : c'est elle qui dit si
    // l'assignation qu'on pose compose le second rideau.
    syntheseIA: { findFirst: vi.fn() },
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
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
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

  it('contrôle négatif — la dédup exclut les statuts terminaux, un statut inconnu bloque', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    const whereDedup = prisma.assignation.findMany.mock.calls[0][0] as {
      where: { statut: { notIn: string[] } };
    };
    expect(whereDedup.where.statut.notIn).toEqual(['Complété', 'Annulée']);
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

// ── L'ÉCHÉANCE DU SECOND RIDEAU (`WN_ECHEANCE_OBLIGATOIRE`) ─────────────────
//
// Le second rideau garde le `T0` ([[D-158]]) : tant qu'il n'est pas rendu, la
// trajectoire entière est arrêtée. Sans échéance, cet arrêt n'a ni terme ni
// rappel — la relance elle-même refuse de partir (`sans_echeance`).
describe('POST /api/praticien/assignations — échéance du second rideau', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.assignation.create.mockResolvedValue({});
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.syntheseIA.findFirst.mockResolvedValue({ idSynthese: 'SYN_1' });
  });

  function sansEcheance(): Request {
    return new Request('http://localhost/api/praticien/assignations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailPatient: patient.email, idQuestionnaire: 'Q_NEU_03' }),
    });
  }

  it('drapeau éteint : rien ne change, et la synthèse n’est même pas lue', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', '');
    const res = await POST(sansEcheance());

    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.findFirst).not.toHaveBeenCalled();
  });

  it('drapeau allumé : refuse 422 une assignation sans échéance sur un dossier déjà synthétisé', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', 'true');
    const res = await POST(sansEcheance());

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ success: false, reason: 'echeance_requise' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
  });

  // LE PREMIER RIDEAU RESTE LIBRE. Un dossier qui commence se remplit au rythme
  // de l'entrée ; lui imposer un terme au premier jour serait une borne
  // administrative sur un parcours qui démarre.
  it('drapeau allumé : laisse passer tant qu’aucune synthèse n’est validée', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', 'true');
    prisma.syntheseIA.findFirst.mockResolvedValueOnce(null);
    const res = await POST(sansEcheance());

    expect(res.status).toBe(200);
  });

  it('drapeau allumé : une échéance posée passe sans lire la synthèse', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', 'true');
    const res = await POST(new Request('http://localhost/api/praticien/assignations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailPatient: patient.email, idQuestionnaire: 'Q_NEU_03', dateLimite: '2026-04-01',
      }),
    }));

    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.findFirst).not.toHaveBeenCalled();
  });
});
