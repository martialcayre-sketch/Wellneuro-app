import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, poserActeLibelle } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  poserActeLibelle: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/fiches-usage/decision', () => ({ poserActeLibelle, poserActeRubrique: vi.fn() }));

import { POST } from './route';

// Le cœur de la voie est éprouvé par le banc des actes de rubrique, qui partage
// `actesHttp.ts` ; ce banc tient ce qui est propre aux libellés.
const CORPS = {
  idLibelle: 'libelle0000000001',
  acte: 'retiree',
  empreinteVue: 'a'.repeat(64),
  dernierActeVu: '3',
  motif: 'Motif synthétique.',
};

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/fiches-usage/libelles/actes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/praticien/fiches-usage/libelles/actes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@exemple.fr' } });
    poserActeLibelle.mockResolvedValue({ issue: 'refusee', raison: 'etat_divergent' });
  });

  it('transmet l’identifiant du libellé, le motif et le validateur de session', async () => {
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(409);
    expect(poserActeLibelle.mock.calls[0][0]).toMatchObject({
      idLibelle: 'libelle0000000001',
      acte: 'retiree',
      motif: 'Motif synthétique.',
      dernierActeVu: '3',
      validateur: 'praticien@exemple.fr',
    });
  });

  it('400 sur un identifiant de libellé hors format', async () => {
    const res = await POST(requete({ ...CORPS, idLibelle: 'x' }));
    expect(res.status).toBe(400);
    expect(poserActeLibelle).not.toHaveBeenCalled();
  });
});
