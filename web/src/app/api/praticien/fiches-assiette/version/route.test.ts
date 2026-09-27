import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, lireVersionFiche } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  lireVersionFiche: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-assiette/lecture', () => ({ lireVersionFiche }));

import { GET } from './route';

const requete = (id: string) => new Request(`http://localhost/api/praticien/fiches-assiette/version?id=${encodeURIComponent(id)}`);

describe('GET /api/praticien/fiches-assiette/version (D-251, lot 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@exemple.fr' } });
    lireVersionFiche.mockResolvedValue({ id: 'version0000000002', texteSource: 'Source synthétique.' });
  });

  it('exige une session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete('version0000000002'))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await GET(requete('version0000000002'))).status).toBe(401);
    expect(lireVersionFiche).not.toHaveBeenCalled();
  });

  it('400 sur un identifiant invalide, 404 sur une version absente', async () => {
    expect((await GET(requete('../x'))).status).toBe(400);
    lireVersionFiche.mockResolvedValue(null);
    expect((await GET(requete('version0000000009'))).status).toBe(404);
  });

  it('200 : la version pour la relecture', async () => {
    const res = await GET(requete('version0000000002'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, version: { id: 'version0000000002' } });
  });

  it('une erreur ne recopie aucun texte au journal', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    lireVersionFiche.mockRejectedValue(Object.assign(new Error('ligne lue : « Source synthétique. »'), { code: 'P2023' }));
    const res = await GET(requete('version0000000002'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('synthétique');
    expect(JSON.stringify(journal.mock.calls)).not.toContain('synthétique');
    journal.mockRestore();
  });
});
