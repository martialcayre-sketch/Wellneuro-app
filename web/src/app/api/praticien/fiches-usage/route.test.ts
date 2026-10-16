import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, lireRayonFichesUsage } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  lireRayonFichesUsage: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-usage/lecture', () => ({ lireRayonFichesUsage }));

import { GET } from './route';

const RAYON = { structure: { signee: false, empreinte: 'c'.repeat(64), fiches: 0, termes: 0 }, fiches: [], termes: [] };

describe('GET /api/praticien/fiches-usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@exemple.fr' } });
    lireRayonFichesUsage.mockResolvedValue(RAYON);
  });

  it('401 sans session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(lireRayonFichesUsage).not.toHaveBeenCalled();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('rend le rayon, et dit si la session peut décider (responsable seul, fermé par défaut)', async () => {
    expect(await (await GET()).json()).toEqual({ ok: true, rayon: RAYON, peutDecider: false });
    vi.stubEnv('WN_FICHES_USAGE_VALIDATEURS', 'praticien@exemple.fr');
    expect(await (await GET()).json()).toEqual({ ok: true, rayon: RAYON, peutDecider: true });
  });

  it('500 sans texte journalisé', async () => {
    lireRayonFichesUsage.mockRejectedValue(new Error('Libellé synthétique recopié'));
    const journal = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await GET()).status).toBe(500);
    expect(JSON.stringify(journal.mock.calls)).not.toContain('synthétique');
    journal.mockRestore();
  });
});
