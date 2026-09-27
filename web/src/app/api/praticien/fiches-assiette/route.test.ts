import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, lireRayonFichesConseils } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  lireRayonFichesConseils: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-assiette/lecture', () => ({ lireRayonFichesConseils }));

import { GET } from './route';

describe('GET /api/praticien/fiches-assiette (D-251, lot 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@exemple.fr' } });
    lireRayonFichesConseils.mockResolvedValue([{ plateCode: 'ASSIETTE_PROTEINEE', derniere: null }]);
  });

  it('exige une session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await GET()).status).toBe(401);
    expect(lireRayonFichesConseils).not.toHaveBeenCalled();
  });

  it('200 : les assiettes du rayon', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, assiettes: [{ plateCode: 'ASSIETTE_PROTEINEE', derniere: null }] });
  });

  it('500 sans détail', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    lireRayonFichesConseils.mockRejectedValue(new Error('détail interne'));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(JSON.stringify(journal.mock.calls)).not.toContain('détail interne');
    journal.mockRestore();
  });
});
