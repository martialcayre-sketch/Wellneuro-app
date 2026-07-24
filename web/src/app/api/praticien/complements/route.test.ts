import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, listerCatalogue } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  listerCatalogue: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/supplement-library/catalogue', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/supplement-library/catalogue')>();
  return { ...actual, listerCatalogue };
});

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/complements';

const CATALOGUE = {
  contractVersion: 'c4-catalogue-v1',
  aucunScoreGlobal: true,
  intentionFiltre: null,
  codesInconnus: [],
  tri: 'neutre',
  total: 0,
  fiches: [],
  facettes: {},
};

describe('/api/praticien/complements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    listerCatalogue.mockResolvedValue(CATALOGUE);
  });

  it('exige une session authentifiée', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(401);
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('exige un e-mail praticien dans la session', async () => {
    getServerSession.mockResolvedValue({ user: {} });
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(401);
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('répond 404 fail-closed quand WN_C4_ENABLED est éteint', async () => {
    delete process.env.WN_C4_ENABLED;
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('flag_eteint');
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('sert le catalogue et ne renvoie jamais de score global', async () => {
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.aucunScoreGlobal).toBe(true);
    expect(json.fiches).toEqual([]);
  });

  it('transmet l’intention, les facettes connues (inconnues ignorées) et le tri mono-dimension', async () => {
    const res = await GET(new Request(
      `${URL_BASE}?intention=sommeil_fragmente&qualite=bien_documentee,valeur_inconnue&grade=fort&statut=verifiee&tri=marque`,
    ));
    expect(res.status).toBe(200);
    expect(listerCatalogue).toHaveBeenCalledWith({
      intentionCode: 'sommeil_fragmente',
      tri: 'marque',
      filtres: expect.objectContaining({
        qualite: ['bien_documentee'], // « valeur_inconnue » écartée
        grade: ['fort'],
        statut: ['verifiee'],
      }),
    });
  });

  it('retombe sur le tri neutre pour une clé de tri inconnue', async () => {
    await GET(new Request(`${URL_BASE}?tri=meilleur_produit`));
    expect(listerCatalogue).toHaveBeenCalledWith(expect.objectContaining({ tri: 'neutre' }));
  });
});
