import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn(), update: vi.fn() },
    portailMagicLink: { updateMany: vi.fn() },
    // `$transaction` reçoit un tableau de promesses déjà construites : les
    // exécuter suffit, et les appels sont enregistrés sur les mocks ci-dessus.
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
  },
  verifierAppartenancePatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: () => 'p@wellneuro.fr',
}));

import { DELETE, POST } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/token?${query}`, { method: 'DELETE' });
}

function postRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('DELETE /api/praticien/token — révocation d’accès', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('ok');
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', accessToken: 'TOK_1' });
    prisma.patient.update.mockResolvedValue({});
    prisma.portailMagicLink.updateMany.mockResolvedValue({ count: 0 });
  });

  // IDP2 LOT-02 : révoquer ferme le chemin par jeton ET les sessions de compte
  // déjà ouvertes. Sans la seconde écriture, un cookie valide survivrait à la
  // révocation le jour où le jeton permanent disparaît (LOT-04).
  it('coupe l’accès par jeton et les sessions déjà ouvertes', async () => {
    const avant = Date.now();
    const res = await DELETE(request());
    expect(res.status).toBe(200);

    const [appel] = prisma.patient.update.mock.calls as [
      [{ where: { idPatient: string }; data: { accessTokenRevoked: boolean; sessionsInvalidesAvant: Date } }],
    ];
    expect(appel[0].where).toEqual({ idPatient: 'PAT_1' });
    expect(appel[0].data.accessTokenRevoked).toBe(true);
    expect(appel[0].data.sessionsInvalidesAvant.getTime()).toBeGreaterThanOrEqual(avant);
  });

  // LOT-02c — la troisième porte. Un lien à usage unique émis avant la
  // révocation n'était gardé que par `accessTokenRevoked` : réémettre l'accès
  // le rendait exploitable, jusqu'à 24 h après.
  it('ferme les liens à usage unique encore en vol, dans la même transaction', async () => {
    await DELETE(request());

    const [appel] = prisma.portailMagicLink.updateMany.mock.calls as [
      [{ where: { idPatient: string; consommeLe: null }; data: { consommeLe: Date } }],
    ];
    // `consommeLe: null` : un lien DÉJÀ consommé garde sa date d'origine — la
    // trace ne doit pas être réécrite par une révocation postérieure.
    expect(appel[0].where).toEqual({ idPatient: 'PAT_1', consommeLe: null });
    expect(appel[0].data.consommeLe).toBeInstanceOf(Date);

    // Les deux écritures tombent ensemble : fermer le jeton sans fermer les
    // liens laisserait exactement le trou qu'on referme.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const [operations] = prisma.$transaction.mock.calls[0] as [unknown[]];
    expect(operations).toHaveLength(2);
  });

  it('date les deux écritures du même instant', async () => {
    await DELETE(request());
    const patch = prisma.patient.update.mock.calls[0][0] as { data: { sessionsInvalidesAvant: Date } };
    const liens = prisma.portailMagicLink.updateMany.mock.calls[0][0] as { data: { consommeLe: Date } };
    expect(liens.data.consommeLe.getTime()).toBe(patch.data.sessionsInvalidesAvant.getTime());
  });

  it('refuse sans session praticien, et n’écrit rien', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await DELETE(request())).status).toBe(401);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('refuse le patient d’un autre praticien, et n’écrit rien', async () => {
    verifierAppartenancePatient.mockResolvedValue('autre_praticien');
    expect((await DELETE(request())).status).toBe(403);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  // Propriété centrale du lot : une révocation ne se défait pas par effet de
  // bord. Réémettre rouvre l'accès, mais les sessions d'avant restent mortes.
  it('la réémission d’un accès n’efface pas la date de révocation', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT_1',
      email: 'sophie.nicola@example.test',
      prenom: 'Sophie',
      accessToken: 'TOK_1',
      accessTokenRevoked: true,
      sessionsInvalidesAvant: new Date('2026-07-21T10:00:00.000Z'),
    });

    await POST(postRequest({ idPatient: 'PAT_1', action: 'lien' }));

    const appels = prisma.patient.update.mock.calls as [{ data: Record<string, unknown> }][];
    for (const [appel] of appels) {
      expect(appel.data).not.toHaveProperty('sessionsInvalidesAvant');
    }
  });
});
