import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, compterCabinet } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  compterCabinet: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/praticien/comptesCabinet', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/praticien/comptesCabinet')>()),
  compterCabinet,
}));

import { GET } from './route';

describe('GET /api/praticien/comptes-cabinet (D-385)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    compterCabinet.mockResolvedValue(
      Array.from({ length: 3 }, () => ({ etape: 'decision', protocole: 'sans_protocole' })),
    );
  });

  it('refuse sans session (401), sans rien compter', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(compterCabinet).not.toHaveBeenCalled();
  });

  it('compte pour le praticien de la session, à l’heure du serveur passée en paramètre', async () => {
    const avant = Date.now();
    await GET();
    expect(compterCabinet).toHaveBeenCalledTimes(1);
    const [email, maintenant] = compterCabinet.mock.calls[0] as [string, Date];
    expect(email).toBe('p@wellneuro.fr');
    expect(maintenant).toBeInstanceOf(Date);
    expect(maintenant.getTime()).toBeGreaterThanOrEqual(avant);
  });

  it('ne rend que l’agrégat, masqué côté serveur : aucune ligne par dossier ne sort', async () => {
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown> & {
      ok: boolean;
      comptes: { prochaineEtape: { effectif: number; repartitionMasquee: boolean; lignes: { compte: unknown }[] } };
    };
    expect(res.status).toBe(200);
    expect(Object.keys(json).sort()).toEqual(['comptes', 'ok']);
    expect(json.comptes.prochaineEtape.effectif).toBe(3);
    expect(json.comptes.prochaineEtape.repartitionMasquee).toBe(true);
    expect(json.comptes.prochaineEtape.lignes.every(l => l.compte === 'masqué')).toBe(true);
  });

  it('une exception rend 500, jamais un cabinet vide', async () => {
    compterCabinet.mockRejectedValue(new Error('panne'));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });
});
