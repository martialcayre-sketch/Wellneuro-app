import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, lireVersionFicheUsage } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  lireVersionFicheUsage: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-usage/lecture', () => ({ lireVersionFicheUsage }));

import { GET } from './route';

function requete(id: string) {
  return new Request(`http://localhost/api/praticien/fiches-usage/version?id=${encodeURIComponent(id)}`);
}

describe('GET /api/praticien/fiches-usage/version', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@exemple.fr' } });
    lireVersionFicheUsage.mockResolvedValue({ id: 'version0000000002', rubriques: [] });
  });

  it('401 sans session, 400 sur un identifiant hors format, 404 sur une version absente', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete('version0000000002'))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: { email: 'praticien@exemple.fr' } });
    expect((await GET(requete('../x'))).status).toBe(400);
    lireVersionFicheUsage.mockResolvedValue(null);
    expect((await GET(requete('version0000000002'))).status).toBe(404);
  });

  it('rend le détail', async () => {
    const res = await GET(requete('version0000000002'));
    expect(res.status).toBe(200);
    expect((await res.json()).version.id).toBe('version0000000002');
  });
});
