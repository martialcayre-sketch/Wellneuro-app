import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    clinicalIntentTag: { findMany: vi.fn(), create: vi.fn() },
    clinicalCriterion: { findMany: vi.fn(), create: vi.fn() },
    supplementIngredient: { findMany: vi.fn() },
    supplementSourceReference: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/regles/vocabulaire';

function requete(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const INTENTION = { id: 'tag_1', code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', categorie: 'sommeil' };

describe('/api/praticien/regles/vocabulaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.clinicalIntentTag.findMany.mockResolvedValue([INTENTION]);
    prisma.clinicalCriterion.findMany.mockResolvedValue([]);
    prisma.supplementIngredient.findMany.mockResolvedValue([]);
    prisma.supplementSourceReference.findMany.mockResolvedValue([]);
    prisma.clinicalIntentTag.create.mockResolvedValue(INTENTION);
    prisma.clinicalCriterion.create.mockResolvedValue({
      id: 'crit_1',
      code: 'sous_isrs',
      labelFr: 'Sous ISRS',
      categorie: null,
    });
  });

  it('exige une session et le drapeau C4', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);

    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    delete process.env.WN_C4_ENABLED;
    expect((await GET()).status).toBe(404);
    expect((await POST(requete({ type: 'intention' }))).status).toBe(404);
  });

  it('liste le vocabulaire actif et les référentiels du formulaire', async () => {
    const reponse = await GET();
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.ok).toBe(true);
    expect(json.intentions).toEqual([INTENTION]);
    expect(json).toHaveProperty('criteres');
    expect(json).toHaveProperty('ingredients');
    expect(json).toHaveProperty('sources');
    // Seul l'actif est servi : le vocabulaire désactivé ne se propose plus.
    expect(prisma.clinicalIntentTag.findMany.mock.calls[0][0].where).toEqual({ actif: true });
  });

  it('crée une intention (catégorie obligatoire) — le vocabulaire est de la donnée', async () => {
    const reponse = await POST(
      requete({ type: 'intention', code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', categorie: 'sommeil' }),
    );
    expect(reponse.status).toBe(201);
    expect(prisma.clinicalIntentTag.create).toHaveBeenCalledWith({
      data: { code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', categorie: 'sommeil' },
      select: { id: true, code: true, labelFr: true, categorie: true },
    });

    const sansCategorie = await POST(
      requete({ type: 'intention', code: 'stress_chronique', labelFr: 'Stress chronique' }),
    );
    expect(sansCategorie.status).toBe(400);
    expect((await sansCategorie.json()).reason).toBe('categorie_requise');
  });

  it('crée un critère, catégorie facultative', async () => {
    const reponse = await POST(requete({ type: 'critere', code: 'sous_isrs', labelFr: 'Sous ISRS' }));
    expect(reponse.status).toBe(201);
    expect(prisma.clinicalCriterion.create).toHaveBeenCalledWith({
      data: { code: 'sous_isrs', labelFr: 'Sous ISRS', categorie: null },
      select: { id: true, code: true, labelFr: true, categorie: true },
    });
  });

  it('refuse type inconnu et code hors snake_case', async () => {
    expect((await POST(requete({ type: 'grade', code: 'x', labelFr: 'X' }))).status).toBe(400);
    expect(
      (await POST(requete({ type: 'critere', code: 'Sous ISRS', labelFr: 'Sous ISRS' }))).status,
    ).toBe(400);
    expect(prisma.clinicalCriterion.create).not.toHaveBeenCalled();
  });

  it('répond 409 sur un code déjà pris (unicité en base)', async () => {
    prisma.clinicalCriterion.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    );
    const reponse = await POST(requete({ type: 'critere', code: 'sous_isrs', labelFr: 'Sous ISRS' }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('code_deja_pris');
  });
});
