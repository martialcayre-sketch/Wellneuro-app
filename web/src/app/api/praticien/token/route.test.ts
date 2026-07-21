import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn(), update: vi.fn() },
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

import { DELETE } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/token?${query}`, { method: 'DELETE' });
}

describe('DELETE /api/praticien/token — révocation d’accès', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('ok');
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', accessToken: 'TOK_1' });
    prisma.patient.update.mockResolvedValue({});
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
});
