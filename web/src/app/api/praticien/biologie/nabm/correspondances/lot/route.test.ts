import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, listerCorrespondancesALot, signerCorrespondancesLot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  listerCorrespondancesALot: vi.fn(),
  signerCorrespondancesLot: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/correspondancesNabm', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/biology-library/correspondancesNabm')>();
  return { ...reel, listerCorrespondancesALot, signerCorrespondancesLot };
});

import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const LIGNE = { analyteCode: 'BIO_ALAT', codeActe: '0516', nature: 'isole' };

function post(corps: unknown) {
  return POST(
    new Request('http://localhost/api/praticien/biologie/nabm/correspondances/lot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  listerCorrespondancesALot.mockResolvedValue({ millesime: 'V105', lignes: [] });
  signerCorrespondancesLot.mockResolvedValue({ ok: true, signees: 1 });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('gardes d’accès — fail-closed', () => {
  it('sans session : 401, rien n’est lu ni signé', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await post({ lignes: [LIGNE] })).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(signerCorrespondancesLot).not.toHaveBeenCalled();
    expect(listerCorrespondancesALot).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404 en lecture comme en écriture', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await post({ lignes: [LIGNE] })).status).toBe(404);
    expect((await GET()).status).toBe(404);
    expect(signerCorrespondancesLot).not.toHaveBeenCalled();
  });
});

describe('GET — la liste du lot', () => {
  it('rend la liste du service', async () => {
    const reponse = await GET();
    expect(await reponse.json()).toEqual({ ok: true, millesime: 'V105', lignes: [] });
  });

  it('erreur technique : 500, sans détail', async () => {
    listerCorrespondancesALot.mockRejectedValue(new Error('base indisponible'));
    const reponse = await GET();
    expect(reponse.status).toBe(500);
    expect(await reponse.json()).toEqual({ ok: false, reason: 'exception', error: 'Erreur technique.' });
  });
});

describe('POST — le signataire vient de la session, jamais du corps', () => {
  it('passe l’e-mail de session et ne garde que les trois champs de chaque ligne', async () => {
    const reponse = await post({
      praticien: 'autre@exemple.fr',
      lignes: [{ ...LIGNE, analyteCode: ' BIO_ALAT ', verifiePar: 'autre@exemple.fr' }],
    });
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, signees: 1 });
    expect(signerCorrespondancesLot).toHaveBeenCalledWith({ lignes: [LIGNE], praticien: PRATICIEN });
  });

  it.each([
    ['corps illisible', '{', 400],
    ['corps nul', null, 400],
    ['sans lignes', {}, 400],
    ['lignes vides', { lignes: [] }, 400],
    ['plus de cent lignes', { lignes: Array.from({ length: 101 }, () => LIGNE) }, 400],
  ])('%s : refusé avant le service', async (_cas, corps, statut) => {
    expect((await post(corps)).status).toBe(statut);
    expect(signerCorrespondancesLot).not.toHaveBeenCalled();
  });

  it('un refus du service nomme la ligne et dit que rien n’est signé', async () => {
    signerCorrespondancesLot.mockResolvedValue({
      ok: false,
      raison: 'acte_introuvable',
      ligne: { analyteCode: 'BIO_ALAT', codeActe: '0516' },
    });
    const reponse = await post({ lignes: [LIGNE] });
    expect(reponse.status).toBe(404);
    const corps = await reponse.json();
    expect(corps.reason).toBe('acte_introuvable');
    expect(corps.ligne).toEqual({ analyteCode: 'BIO_ALAT', codeActe: '0516' });
    expect(corps.error).toMatch(/^Rien n’a été signé \(BIO_ALAT → 0516\) : /);
  });

  it('lot mal formé selon le service : 400', async () => {
    signerCorrespondancesLot.mockResolvedValue({ ok: false, raison: 'lot_invalide', ligne: null });
    const reponse = await post({ lignes: [LIGNE] });
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).error).toBe('Rien n’a été signé : Une ligne du lot est mal formée ou en double.');
  });

  it('erreur technique : 500, rien n’est signé', async () => {
    signerCorrespondancesLot.mockRejectedValue(new Error('boum'));
    const reponse = await post({ lignes: [LIGNE] });
    expect(reponse.status).toBe(500);
    expect((await reponse.json()).error).toBe('Erreur technique : rien n’a été signé.');
  });
});
