import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    filCardRejection: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

const CLE = 'reponse_recente:REP_1';

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/fil/refus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_SEED_01',
  carteCle: CLE,
  refusee: true,
  ...partiel,
});

describe('POST /api/praticien/fil/refus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    prisma.filCardRejection.findMany.mockResolvedValue([]);
    prisma.filCardRejection.create.mockResolvedValue({ id: 'r1' });
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.filCardRejection.create).not.toHaveBeenCalled();
  });

  it('le refus est porté par le praticien propriétaire du patient', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await POST(postRequest(corps()))).status).toBe(403);

    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(404);
    expect(prisma.filCardRejection.create).not.toHaveBeenCalled();
  });

  it('écrit un refus chaîné et l’attribue au praticien', async () => {
    const res = await POST(postRequest(corps()));
    expect(res.status).toBe(201);

    const data = prisma.filCardRejection.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      idPatient: 'PAT_SEED_01',
      carteCle: CLE,
      refusee: true,
      refusePar: 'praticien@wellneuro.fr',
      supersedesRejectionId: null,
    });
  });

  it('annuler chaîne une nouvelle ligne — jamais un update ni un delete', async () => {
    prisma.filCardRejection.findMany.mockResolvedValue([
      { id: 'r1', carteCle: CLE, refusee: true, supersedesRejectionId: null, refuseLe: new Date('2026-07-20T10:00:00.000Z') },
    ]);

    const res = await POST(postRequest(corps({ refusee: false })));
    expect(res.status).toBe(201);
    expect(prisma.filCardRejection.create.mock.calls[0][0].data).toMatchObject({
      refusee: false,
      supersedesRejectionId: 'r1',
    });
    // Le garde-fou dit « refusable », pas « supprimable ».
    expect(prisma.filCardRejection.update).not.toHaveBeenCalled();
    expect(prisma.filCardRejection.delete).not.toHaveBeenCalled();
    expect(prisma.filCardRejection.deleteMany).not.toHaveBeenCalled();
  });

  it('rejouer la même décision n’écrit rien', async () => {
    prisma.filCardRejection.findMany.mockResolvedValue([
      { id: 'r1', carteCle: CLE, refusee: true, supersedesRejectionId: null, refuseLe: new Date('2026-07-20T10:00:00.000Z') },
    ]);

    const res = await POST(postRequest(corps({ refusee: true })));
    expect(res.status).toBe(200);
    expect((await res.json()).inchange).toBe(true);
    expect(prisma.filCardRejection.create).not.toHaveBeenCalled();
  });

  it('refuse une clé qui n’est pas une clé de carte', async () => {
    expect((await POST(postRequest(corps({ carteCle: 'n_importe_quoi:1' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ carteCle: '' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ carteCle: undefined })))).status).toBe(400);
    expect(prisma.filCardRejection.create).not.toHaveBeenCalled();
  });

  it('exige une décision explicite et un patient valide', async () => {
    expect((await POST(postRequest(corps({ refusee: undefined })))).status).toBe(400);
    expect((await POST(postRequest(corps({ refusee: 'oui' })))).status).toBe(400);
    expect((await POST(postRequest(corps({ idPatient: 'PAT SEED' })))).status).toBe(400);
    expect(prisma.filCardRejection.create).not.toHaveBeenCalled();
  });
});
