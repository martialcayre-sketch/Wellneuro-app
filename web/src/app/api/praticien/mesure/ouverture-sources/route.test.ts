import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    compteurOuvertureSources: { upsert: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

// Bancs de la route qui incrémente le compteur de « Voir les sources et
// limites ».
//
// CE QUE CES CAS GARDENT EST SURTOUT UNE ABSENCE. La route écrit un jour, une
// espèce et un incrément — et rien d'autre. Ni dossier, ni praticien, ni
// instant. « Ce praticien n'ouvre jamais les limitations » doit rester une
// phrase que le dépôt est incapable de produire, et un cas négatif l'épingle
// plutôt que de la confier au commentaire.

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/mesure/ouverture-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/praticien/mesure/ouverture-sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.compteurOuvertureSources.upsert.mockResolvedValue({});
  });

  it('incrémente le compteur du jour pour l’espèce reçue', async () => {
    const res = await POST(postRequest({ espece: 'ouverture' }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true, espece: 'ouverture' });
    expect(prisma.compteurOuvertureSources.upsert).toHaveBeenCalledTimes(1);
    const appel = prisma.compteurOuvertureSources.upsert.mock.calls[0][0];
    expect(appel.update).toEqual({ compte: { increment: 1 } });
    expect(appel.create).toMatchObject({ espece: 'ouverture', compte: 1 });
  });

  it('LE DÉNOMINATEUR PASSE PAR LA MÊME PORTE que le numérateur', () => {
    // Une route qui n'accepterait que `ouverture` rendrait le taux
    // incalculable — et le compteur produirait exactement le nombre sans
    // dénominateur que le lot existe pour éviter.
    return POST(postRequest({ espece: 'affichage' })).then(async res => {
      expect(res.status).toBe(201);
      await expect(res.json()).resolves.toEqual({ ok: true, espece: 'affichage' });
    });
  });

  it('LE JOUR EST UTC ET POSÉ PAR LE SERVEUR, jamais reçu', async () => {
    // Un compteur qu'on peut antidater ne mesure plus rien : il laisserait
    // remplir le passé et fausserait un quotient déjà lu.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T23:30:00.000Z'));
    await POST(postRequest({ espece: 'ouverture', jour: '2020-01-01' }));
    vi.useRealTimers();
    const appel = prisma.compteurOuvertureSources.upsert.mock.calls[0][0];
    expect(appel.where.jour_espece.jour.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(appel.create.jour.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('N’ÉCRIT NI DOSSIER, NI PRATICIEN, NI INSTANT — le contrat négatif', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    await POST(postRequest({ espece: 'ouverture', idPatient: 'PAT_SEED_01' }));
    const appel = prisma.compteurOuvertureSources.upsert.mock.calls[0][0];
    const ecrit = JSON.stringify({ where: appel.where, create: appel.create, update: appel.update });
    for (const interdit of ['idPatient', 'PAT_SEED_01', 'praticien@wellneuro.fr', 'email', 'luePar']) {
      expect(ecrit).not.toContain(interdit);
    }
    // Les seules clés écrites, et la liste est close.
    expect(Object.keys(appel.create).sort()).toEqual(['compte', 'espece', 'jour']);
  });

  it('refuse une espèce forgée SANS toucher la base', async () => {
    // Le `CHECK` de Postgres rendrait un 23514, donc un 500, pour une situation
    // parfaitement identifiable ici.
    const res = await POST(postRequest({ espece: 'connexion' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, reason: 'espece_inconnue' });
    expect(prisma.compteurOuvertureSources.upsert).not.toHaveBeenCalled();
  });

  it('exige une session, et le compteur ne s’alimente pas du dehors', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ espece: 'ouverture' }));
    expect(res.status).toBe(401);
    expect(prisma.compteurOuvertureSources.upsert).not.toHaveBeenCalled();
  });

  it('un corps illisible est refusé, pas avalé', async () => {
    const req = new Request('http://localhost/api/praticien/mesure/ouverture-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'pas du json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prisma.compteurOuvertureSources.upsert).not.toHaveBeenCalled();
  });

  it('une panne de base rend 500 et ne lève pas', async () => {
    prisma.compteurOuvertureSources.upsert.mockRejectedValue(new Error('base indisponible'));
    const res = await POST(postRequest({ espece: 'ouverture' }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ ok: false, reason: 'exception' });
  });
});
