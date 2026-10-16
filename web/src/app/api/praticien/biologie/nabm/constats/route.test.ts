import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, deciderConstat } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  deciderConstat: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat : sans ce
// mock, le simple import de la route exige un DATABASE_URL.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/correspondancesNabm', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/biology-library/correspondancesNabm')>();
  return { ...reel, deciderConstat };
});

import { POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const CONSTAT = { millesime: 'V105', verifiePar: PRATICIEN, verifieLe: '2026-10-16T09:00:00.000Z', perime: false };

function post(corps: unknown) {
  return POST(
    new Request('http://localhost/api/praticien/biologie/nabm/constats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    }),
  );
}

const CONSTATER = { analyteCode: 'BIO_HOMOCYSTEINE', decision: 'constater', millesimeVu: 'V105' };
const RETIRER = { analyteCode: 'BIO_HOMOCYSTEINE', decision: 'retirer', verifieLeVu: '2026-10-16T09:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  deciderConstat.mockResolvedValue({ ok: true, constat: CONSTAT });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('gardes d’accès — fail-closed', () => {
  it('sans session : 401, rien n’est écrit', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await post(CONSTATER)).status).toBe(401);
    expect(deciderConstat).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404, rien n’est écrit', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await post(CONSTATER)).status).toBe(404);
    expect(deciderConstat).not.toHaveBeenCalled();
  });

  it('session sans e-mail : 401, rien n’est écrit — un constat exige un signataire', async () => {
    getServerSession.mockResolvedValue({ user: {} });
    expect((await post(CONSTATER)).status).toBe(401);
    expect(deciderConstat).not.toHaveBeenCalled();
  });
});

describe('POST — le signataire vient de la session, jamais du corps', () => {
  it('constater : passe l’e-mail de session et le millésime vu, ignore un signataire envoyé', async () => {
    const reponse = await post({ ...CONSTATER, verifiePar: 'autre@exemple.fr', praticien: 'autre@exemple.fr' });
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, constat: CONSTAT });
    expect(deciderConstat).toHaveBeenCalledWith({
      analyteCode: 'BIO_HOMOCYSTEINE',
      decision: 'constater',
      millesimeVu: 'V105',
      verifieLeVu: undefined,
      praticien: PRATICIEN,
    });
  });

  it('retirer : la date du constat vu est passée à la lib', async () => {
    deciderConstat.mockResolvedValue({ ok: true, constat: null });
    const reponse = await post(RETIRER);
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, constat: null });
    expect(deciderConstat.mock.calls[0][0]).toMatchObject({
      decision: 'retirer',
      verifieLeVu: new Date('2026-10-16T09:00:00.000Z'),
      praticien: PRATICIEN,
    });
  });

  it.each([
    ['corps illisible', '{'],
    ['code d’analyte invalide', { ...CONSTATER, analyteCode: "BIO_X';" }],
    ['décision inconnue', { ...CONSTATER, decision: 'signer' }],
    ['constat sans millésime vu', { ...CONSTATER, millesimeVu: '  ' }],
    ['retrait sans date vue', { ...RETIRER, verifieLeVu: 'pas une date' }],
  ])('%s : 400, rien n’est écrit', async (_cas, corps) => {
    expect((await post(corps)).status).toBe(400);
    expect(deciderConstat).not.toHaveBeenCalled();
  });

  it.each([
    ['constat_non_permis', 409],
    ['analyte_inconnu', 404],
    ['analyte_inactif', 409],
    ['millesime_absent', 409],
    ['signature_presente', 409],
    ['etat_divergent', 409],
  ])('refus %s : statut %i et message en français', async (raison, statut) => {
    deciderConstat.mockResolvedValue({ ok: false, raison });
    const reponse = await post(CONSTATER);
    expect(reponse.status).toBe(statut);
    const json = await reponse.json();
    expect(json).toMatchObject({ ok: false, reason: raison });
    expect(json.error.length).toBeGreaterThan(0);
  });

  it('exception : 500 sans détail', async () => {
    deciderConstat.mockRejectedValue(new Error('secret de connexion'));
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = await post(CONSTATER);
    expect(reponse.status).toBe(500);
    expect(JSON.stringify(await reponse.json())).not.toContain('secret');
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('secret');
    erreur.mockRestore();
  });
});
