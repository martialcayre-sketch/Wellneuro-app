import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, chercherActesNabmParLibelle } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  chercherActesNabmParLibelle: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/correspondancesNabm', () => ({
  chercherActesNabmParLibelle,
  RECHERCHE_NABM_MIN: 3,
  RECHERCHE_NABM_MAX: 80,
}));

import { GET } from './route';

const requete = (q: string) => new Request(`http://localhost/x?q=${encodeURIComponent(q)}`);

const ACTE = {
  codeActe: '1208',
  libelle: 'HOMOCYSTEINE',
  coefficientB: 50,
  inactif: false,
  ententePrealable: null,
  acteReserve: null,
  remboursementTotal: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  chercherActesNabmParLibelle.mockResolvedValue({ ok: true, millesime: 'V105', total: 1, actes: [ACTE] });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('GET /api/praticien/biologie/nabm/recherche (D-320 §1)', () => {
  it('sans session : 401, la nomenclature n’est pas lue', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete('homocysteine'))).status).toBe(401);
    expect(chercherActesNabmParLibelle).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await GET(requete('homocysteine'))).status).toBe(404);
    expect(chercherActesNabmParLibelle).not.toHaveBeenCalled();
  });

  it('saisie invalide : 400 avec la borne dite ; nomenclature non importée : 409', async () => {
    chercherActesNabmParLibelle.mockResolvedValueOnce({ ok: false, raison: 'saisie_invalide' });
    const invalide = await GET(requete('ho'));
    expect(invalide.status).toBe(400);
    expect((await invalide.json()).error).toMatch(/de 3 à 80 caractères/);
    chercherActesNabmParLibelle.mockResolvedValueOnce({ ok: false, raison: 'millesime_absent' });
    expect((await GET(requete('homocysteine'))).status).toBe(409);
  });

  it('transmet la saisie telle quelle et rend les actes, le total et le millésime', async () => {
    const reponse = await GET(requete('homocystéine totale'));
    expect(chercherActesNabmParLibelle).toHaveBeenCalledWith('homocystéine totale');
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, millesime: 'V105', total: 1, actes: [ACTE] });
  });

  it('sans paramètre : la saisie vide part au service, qui la refuse', async () => {
    chercherActesNabmParLibelle.mockResolvedValueOnce({ ok: false, raison: 'saisie_invalide' });
    const reponse = await GET(new Request('http://localhost/x'));
    expect(chercherActesNabmParLibelle).toHaveBeenCalledWith('');
    expect(reponse.status).toBe(400);
  });

  it('échec technique : 500 générique', async () => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
    chercherActesNabmParLibelle.mockRejectedValueOnce(new Error('boom'));
    const reponse = await GET(requete('homocysteine'));
    expect(reponse.status).toBe(500);
    expect((await reponse.json()).error).toBe('Erreur technique.');
    silence.mockRestore();
  });
});
