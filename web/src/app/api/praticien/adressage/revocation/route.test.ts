import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    adressageSignalAlerte: { findFirst: vi.fn(), create: vi.fn() },
  },
  verifierAppartenancePatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: (session: { user?: { email?: string } } | null) => session?.user?.email ?? null,
}));

import { MOTIF_REVOCATION_MAX, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';

function post(body: unknown): Request {
  return new Request('http://localhost/api/praticien/adressage/revocation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const CORPS = { idPatient: 'PAT1', idAdressage: 'adr_1', motif: 'Lettre consignée sur le mauvais dossier.' };

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  verifierAppartenancePatient.mockResolvedValue('accessible');
  prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null });
  prisma.adressageSignalAlerte.findFirst.mockResolvedValue({ id: 'adr_1', revocations: [] });
  prisma.adressageSignalAlerte.create.mockResolvedValue({ id: 'rev_1' });
});

describe('révocation d’un adressage — D-257 §6, LOT-03', () => {
  it('écrit une ligne de révocation motivée, sans constats', async () => {
    const res = await POST(post(CORPS));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, idRevocation: 'rev_1' });
    expect(prisma.adressageSignalAlerte.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT1',
        acte: 'revocation',
        idAdressageRevoque: 'adr_1',
        motif: 'Lettre consignée sur le mauvais dossier.',
        praticienEmail: PRATICIEN,
      },
      select: { id: true },
    });
    // `findingIds` ABSENT, jamais `[]` : le CHECK `forme_revocation` exige NULL.
    expect(prisma.adressageSignalAlerte.create.mock.calls[0][0].data).not.toHaveProperty('findingIds');
  });

  it('ne cherche la cible que parmi les ADRESSAGES de CE dossier', async () => {
    await POST(post(CORPS));
    expect(prisma.adressageSignalAlerte.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'adr_1', idPatient: 'PAT1', acte: 'adressage' } }),
    );
  });

  it('cible introuvable sur ce dossier : 404, rien d’écrit', async () => {
    prisma.adressageSignalAlerte.findFirst.mockResolvedValue(null);
    const res = await POST(post(CORPS));
    expect(res.status).toBe(404);
    expect(prisma.adressageSignalAlerte.create).not.toHaveBeenCalled();
  });

  it('adressage déjà révoqué : 409, rien d’écrit', async () => {
    prisma.adressageSignalAlerte.findFirst.mockResolvedValue({ id: 'adr_1', revocations: [{ id: 'rev_0' }] });
    const res = await POST(post(CORPS));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_revoque');
    expect(prisma.adressageSignalAlerte.create).not.toHaveBeenCalled();
  });

  it('course de deux révocations : l’index unique tranche en 409', async () => {
    prisma.adressageSignalAlerte.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res = await POST(post(CORPS));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_revoque');
  });

  it('motif absent, blanc ou trop long : 400 avant toute lecture du dossier', async () => {
    for (const motif of [undefined, '   ', 'm'.repeat(MOTIF_REVOCATION_MAX + 1)]) {
      const res = await POST(post({ ...CORPS, motif }));
      expect(res.status).toBe(400);
    }
    expect(verifierAppartenancePatient).not.toHaveBeenCalled();
    expect(prisma.adressageSignalAlerte.create).not.toHaveBeenCalled();
  });

  it('sans session : 401 ; dossier d’un autre praticien : 403 ; dossier clos : 409', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await POST(post(CORPS))).status).toBe(401);
    verifierAppartenancePatient.mockResolvedValueOnce('autre_praticien');
    expect((await POST(post(CORPS))).status).toBe(403);
    prisma.patient.findUnique.mockResolvedValueOnce({ actif: false, suiviClotureLe: new Date() });
    expect((await POST(post(CORPS))).status).toBe(409);
    expect(prisma.adressageSignalAlerte.create).not.toHaveBeenCalled();
  });

  it('aucun drapeau : la révocation reste ouverte quand la lettre est fermée', async () => {
    // Révoquer ne fait que rebloquer : le sens prudent ne se ferme jamais.
    delete process.env.WN_ADRESSAGE_COURRIER;
    expect((await POST(post(CORPS))).status).toBe(201);
  });

  it('une erreur ne journalise que son NOM, jamais le motif', async () => {
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    const erreur = new Error(`échec : ${CORPS.motif}`);
    erreur.name = 'PrismaClientUnknownRequestError';
    prisma.adressageSignalAlerte.create.mockRejectedValue(erreur);
    const res = await POST(post(CORPS));
    expect(res.status).toBe(500);
    const journalise = espion.mock.calls.flat().join(' ');
    expect(journalise).toContain('PrismaClientUnknownRequestError');
    expect(journalise).not.toContain('mauvais dossier');
    espion.mockRestore();
  });
});
