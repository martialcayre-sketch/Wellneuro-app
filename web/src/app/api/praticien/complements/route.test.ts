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

import { CatalogueRequeteInvalide, PAR_PAGE_MAX } from '@/lib/supplement-library/catalogue';
import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/complements';

const CATALOGUE = {
  contractVersion: 'c4-catalogue-v4',
  aucunScoreGlobal: true,
  intentionFiltre: null,
  codesInconnus: [],
  tri: 'neutre',
  recherche: '',
  page: 1,
  parPage: 25,
  total: 0,
  fiches: [],
  facettes: {},
  facettesServies: [],
  facettesIndisponibles: [],
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

  it('vérifie l’authentification AVANT le drapeau (aucune fuite d’état)', async () => {
    delete process.env.WN_C4_ENABLED;
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(401);
  });

  it('sert le catalogue et ne renvoie jamais de score global', async () => {
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.aucunScoreGlobal).toBe(true);
    expect(json.fiches).toEqual([]);
  });

  it('transmet la recherche, l’intention, les facettes connues et le tri', async () => {
    const res = await GET(new Request(
      `${URL_BASE}?q=magn%C3%A9sium&intention=sommeil_fragmente&qualite=bien_documentee,valeur_inconnue&statut=verifiee&tri=marque`,
    ));
    expect(res.status).toBe(200);
    expect(listerCatalogue).toHaveBeenCalledWith(expect.objectContaining({
      recherche: 'magnésium',
      intentionCode: 'sommeil_fragmente',
      tri: 'marque',
      filtres: expect.objectContaining({
        qualite: ['bien_documentee'], // « valeur_inconnue » écartée
        statut: ['verifiee'],
      }),
    }));
  });

  it('transmet la pagination demandée', async () => {
    await GET(new Request(`${URL_BASE}?q=zinc&page=4&parPage=10`));
    expect(listerCatalogue).toHaveBeenCalledWith(expect.objectContaining({ page: 4, parPage: 10 }));
  });

  it('retombe sur le tri neutre pour une clé de tri inconnue', async () => {
    await GET(new Request(`${URL_BASE}?tri=meilleur_produit`));
    expect(listerCatalogue).toHaveBeenCalledWith(expect.objectContaining({ tri: 'neutre' }));
  });

  // ─── Critères sans donnée : REFUSÉS, jamais ignorés ───────────────────────

  it.each(['grade', 'biodisponibilite', 'compatibilite', 'cumul'])(
    'refuse la facette « %s » tant que sa donnée n’existe pas',
    async (facette) => {
      const res = await GET(new Request(`${URL_BASE}?${facette}=fort`));
      expect(res.status).toBe(400);
      expect((await res.json()).reason).toBe('facette_indisponible');
      // Le point capital : la requête n'est PAS servie en ignorant le filtre.
      expect(listerCatalogue).not.toHaveBeenCalled();
    },
  );

  it('refuse « interactions=aucune_connue », dont le prédicat n’est pas fiable', async () => {
    // Motif DISTINCT des facettes ci-dessus : la donnée existe, c'est sa
    // complétude qui n'est pas prouvée. Le message doit le dire, sinon le
    // praticien attend un import qui ne débloquera pas ce critère à lui seul.
    const res = await GET(new Request(`${URL_BASE}?interactions=aucune_connue`));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.reason).toBe('valeur_facette_indisponible');
    expect(json.error).toMatch(/entièrement résolue/i);
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('refuse « aucune_connue » même mêlée à une valeur servie', async () => {
    const res = await GET(new Request(`${URL_BASE}?interactions=signalees,aucune_connue`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('valeur_facette_indisponible');
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it.each(['signalees', 'non_evaluee'])(
    'sert toujours « interactions=%s », dont le prédicat reste sain',
    async (valeur) => {
      const res = await GET(new Request(`${URL_BASE}?interactions=${valeur}`));
      expect(res.status).toBe(200);
      expect(listerCatalogue).toHaveBeenCalledWith(expect.objectContaining({
        filtres: expect.objectContaining({ interactions: [valeur] }),
      }));
    },
  );

  it('refuse le tri par nombre de règles correspondantes (aucune règle en base)', async () => {
    const res = await GET(new Request(`${URL_BASE}?tri=reglesCorrespondantes`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('tri_indisponible');
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  // ─── Validation des paramètres de pagination ──────────────────────────────

  it.each([
    ['page=0', 'page_invalide'],
    ['page=abc', 'page_invalide'],
    ['parPage=0', 'par_page_invalide'],
    ['parPage=999', 'par_page_invalide'],
    ['parPage=deux', 'par_page_invalide'],
  ])('refuse « %s » en 400', async (query, raison) => {
    const res = await GET(new Request(`${URL_BASE}?${query}`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe(raison);
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('accepte la borne haute de parPage', async () => {
    const res = await GET(new Request(`${URL_BASE}?parPage=${PAR_PAGE_MAX}`));
    expect(res.status).toBe(200);
  });

  it('refuse une recherche démesurée', async () => {
    const res = await GET(new Request(`${URL_BASE}?q=${'a'.repeat(201)}`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('recherche_invalide');
  });

  it('traduit un refus de pagination du service en 400 explicite, pas en panne', async () => {
    listerCatalogue.mockRejectedValue(
      new CatalogueRequeteInvalide('offset_trop_loin', 'Affinez la recherche.'),
    );
    const res = await GET(new Request(`${URL_BASE}?q=zinc&page=9000`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('offset_trop_loin');
  });

  it('reste en 500 générique sur une panne réelle (aucun détail fuité)', async () => {
    listerCatalogue.mockRejectedValue(new Error('connexion base perdue: user=admin'));
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.reason).toBe('exception');
    expect(JSON.stringify(json)).not.toContain('admin');
  });
});
