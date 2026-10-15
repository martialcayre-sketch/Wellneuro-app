import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, chercherActeNabm } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  chercherActeNabm: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/correspondancesNabm', () => ({ chercherActeNabm }));

import { GET } from './route';

const requete = (code: string) => new Request(`http://localhost/x?code=${code}`);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  chercherActeNabm.mockResolvedValue({ ok: true, millesime: 'V105', acte: null });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('GET /api/praticien/biologie/nabm/acte', () => {
  it('sans session : 401, la nomenclature n’est pas lue', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete('1208'))).status).toBe(401);
    expect(chercherActeNabm).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await GET(requete('1208'))).status).toBe(404);
    expect(chercherActeNabm).not.toHaveBeenCalled();
  });

  it('code mal formé : 400 ; nomenclature non importée : 409', async () => {
    chercherActeNabm.mockResolvedValueOnce({ ok: false, raison: 'code_invalide' });
    expect((await GET(requete('12'))).status).toBe(400);
    chercherActeNabm.mockResolvedValueOnce({ ok: false, raison: 'millesime_absent' });
    expect((await GET(requete('1208'))).status).toBe(409);
  });

  it('rend l’acte lu, ou son absence, dans le millésime courant', async () => {
    const reponse = await GET(requete('1208'));
    expect(chercherActeNabm).toHaveBeenCalledWith('1208');
    expect(await reponse.json()).toEqual({ ok: true, millesime: 'V105', acte: null });
  });
});
