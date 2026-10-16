import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_FICHES_USAGE_VALIDATEURS', 'praticien@exemple.fr');
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

  it('403 pour une session qui n’est pas celle du responsable — rien n’est posé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'autre@exemple.fr' } });
    const res = await POST(requete(CORPS));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'reserve_au_responsable' });
    expect(poserActeLibelle).not.toHaveBeenCalled();
  });

  it('400 sur un identifiant de libellé hors format', async () => {
    const res = await POST(requete({ ...CORPS, idLibelle: 'x' }));
    expect(res.status).toBe(400);
    expect(poserActeLibelle).not.toHaveBeenCalled();
  });
});
