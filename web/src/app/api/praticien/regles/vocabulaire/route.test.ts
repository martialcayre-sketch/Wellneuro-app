import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    clinicalIntentTag: { findMany: vi.fn(), create: vi.fn() },
    clinicalCriterion: { findMany: vi.fn(), create: vi.fn() },
    supplementIngredient: { findMany: vi.fn(), count: vi.fn() },
    supplementSourceReference: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, INGREDIENTS_MAX, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/regles/vocabulaire';

/** GET avec ses paramètres de recherche — la route lit `req.url`. */
function lecture(params: Record<string, string> = {}): Request {
  const url = new URL(URL_BASE);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);
  return new Request(url, { method: 'GET' });
}

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
    prisma.supplementIngredient.count.mockResolvedValue(0);
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
    expect((await GET(lecture())).status).toBe(401);

    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    delete process.env.WN_C4_ENABLED;
    expect((await GET(lecture())).status).toBe(404);
    expect((await POST(requete({ type: 'intention' }))).status).toBe(404);
  });

  it('liste le vocabulaire actif et les référentiels du formulaire', async () => {
    const reponse = await GET(lecture());
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

  // ─── C4-1c : bornage et recherche des ingrédients ─────────────────────────

  it('borne les ingrédients à INGREDIENTS_MAX et dit le total avant troncature', async () => {
    prisma.supplementIngredient.count.mockResolvedValue(1240);
    const reponse = await GET(lecture());
    const json = await reponse.json();

    expect(prisma.supplementIngredient.findMany.mock.calls[0][0].take).toBe(INGREDIENTS_MAX);
    // Sans ce total, 50 résultats sur 1 240 se liraient « il n'y en a que 50 ».
    expect(json.ingredientsTotal).toBe(1240);
    // Le compte porte sur le MÊME filtre que la liste, sinon il annonce une
    // couverture qui n'est pas celle des résultats rendus.
    expect(prisma.supplementIngredient.count.mock.calls[0][0].where).toEqual(
      prisma.supplementIngredient.findMany.mock.calls[0][0].where,
    );
  });

  it('cherche sur le nom ET sur le code, insensible à la casse', async () => {
    await GET(lecture({ requete: 'Sélénium' }));
    expect(prisma.supplementIngredient.findMany.mock.calls[0][0].where).toEqual({
      actif: true,
      OR: [
        { nomFr: { contains: 'Sélénium', mode: 'insensitive' } },
        { code: { contains: 'Sélénium', mode: 'insensitive' } },
      ],
    });
  });

  it('coupe une recherche trop longue au lieu de la refuser', async () => {
    const reponse = await GET(lecture({ requete: 'a'.repeat(300) }));
    expect(reponse.status).toBe(200);
    const où = prisma.supplementIngredient.findMany.mock.calls[0][0].where;
    expect(où.OR[0].nomFr.contains).toHaveLength(200);
  });

  it('une recherche vide ou en blancs ne filtre pas', async () => {
    await GET(lecture({ requete: '   ' }));
    expect(prisma.supplementIngredient.findMany.mock.calls[0][0].where).toEqual({ actif: true });
  });

  it('`ingredientId` hydrate un ingrédient hors recherche, et prime sur `requete`', async () => {
    // Le formulaire de révision cite l'ingrédient de SA règle : il n'a aucune
    // raison de figurer dans les 50 premiers, ni de correspondre à une recherche.
    await GET(lecture({ ingredientId: 'ing_42', requete: 'zinc' }));
    expect(prisma.supplementIngredient.findMany.mock.calls[0][0].where).toEqual({
      actif: true,
      id: 'ing_42',
    });
  });

  it('un `ingredientId` inconnu rend une liste vide, jamais une erreur', async () => {
    prisma.supplementIngredient.findMany.mockResolvedValue([]);
    prisma.supplementIngredient.count.mockResolvedValue(0);
    const reponse = await GET(lecture({ ingredientId: 'ing_inexistant' }));
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).ingredients).toEqual([]);
  });

  it('ne borne QUE les ingrédients — intentions, critères et sources restent entiers', async () => {
    // Ces trois-là sont gouvernés à la main, entrée par entrée ; aucun
    // déversement externe ne les alimente. Les borner serait du refactor.
    await GET(lecture({ requete: 'zinc' }));
    expect(prisma.clinicalIntentTag.findMany.mock.calls[0][0]).not.toHaveProperty('take');
    expect(prisma.clinicalCriterion.findMany.mock.calls[0][0]).not.toHaveProperty('take');
    expect(prisma.supplementSourceReference.findMany.mock.calls[0][0]).not.toHaveProperty('take');
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
