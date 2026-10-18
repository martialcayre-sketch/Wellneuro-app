import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, deciderComposition, lireCompositionAnalyte } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  deciderComposition: vi.fn(),
  lireCompositionAnalyte: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/compositionsAnalytes', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/biology-library/compositionsAnalytes')>();
  return { ...reel, deciderComposition, lireCompositionAnalyte };
});

import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';

function post(corps: unknown) {
  return POST(
    new Request('http://localhost/api/praticien/biologie/compositions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    }),
  );
}

const CORPS = { analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM', 'BIO_POTASSIUM'] };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  deciderComposition.mockResolvedValue({ ok: true, active: null });
  lireCompositionAnalyte.mockResolvedValue({
    ok: true,
    active: null,
    retirees: [],
    preparee: null,
    operandesAbsents: null,
    membreDe: [],
  });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('gardes d’accès — fail-closed', () => {
  it('sans session : 401, rien n’est écrit', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await post(CORPS)).status).toBe(401);
    expect(deciderComposition).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404 en lecture comme en écriture', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await post(CORPS)).status).toBe(404);
    expect((await GET(new Request('http://localhost/x?analyte=BIO_NFS'))).status).toBe(404);
    expect(deciderComposition).not.toHaveBeenCalled();
    expect(lireCompositionAnalyte).not.toHaveBeenCalled();
  });
});

describe('POST — le signataire vient de la session, jamais du corps', () => {
  it('passe l’e-mail de session et ignore un signataire ou un type envoyés par le client', async () => {
    const reponse = await post({ ...CORPS, verifiePar: 'autre@exemple.fr', praticien: 'autre@exemple.fr', type: 'calcul' });
    expect(reponse.status).toBe(200);
    expect(deciderComposition).toHaveBeenCalledWith({
      analyteCode: 'BIO_IONOGRAMME',
      decision: 'signer',
      composants: ['BIO_SODIUM', 'BIO_POTASSIUM'],
      verifieLeVu: undefined,
      praticien: PRATICIEN,
    });
  });

  it.each([
    ['code d’analyte en minuscules', { analyteCode: 'bio_nfs' }, 'analyte_invalide'],
    ['décision inconnue', { decision: 'valider' }, 'decision_invalide'],
    ['composants absents', { composants: undefined }, 'composants_invalides'],
    ['composant mal formé', { composants: ['bio sodium'] }, 'composants_invalides'],
    ['composant non textuel', { composants: [42] }, 'composants_invalides'],
  ])('%s : 400, la lib n’est pas appelée', async (_cas, surcharge, reason) => {
    const reponse = await post({ ...CORPS, ...surcharge });
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).reason).toBe(reason);
    expect(deciderComposition).not.toHaveBeenCalled();
  });

  it('retrait : la date de la composition vue est exigée, et passée à la lib', async () => {
    const sansDate = await post({ analyteCode: 'BIO_NFS', decision: 'retirer' });
    expect(sansDate.status).toBe(400);
    expect((await sansDate.json()).reason).toBe('signature_vue_invalide');
    expect(deciderComposition).not.toHaveBeenCalled();

    await post({ analyteCode: 'BIO_NFS', decision: 'retirer', verifieLeVu: '2026-10-18T10:00:00.000Z' });
    expect(deciderComposition.mock.calls[0][0].verifieLeVu).toEqual(new Date('2026-10-18T10:00:00.000Z'));
  });

  it('corps illisible : 400', async () => {
    expect((await post('{')).status).toBe(400);
  });

  it.each([
    ['etat_divergent', 409],
    ['composition_non_preparee', 409],
    ['composants_invalides', 422],
    ['analyte_inconnu', 404],
    ['analyte_inactif', 409],
  ])('refus %s : statut %i et message en français', async (raison, statut) => {
    deciderComposition.mockResolvedValue({ ok: false, raison });
    const reponse = await post(CORPS);
    expect(reponse.status).toBe(statut);
    const json = await reponse.json();
    expect(json).toMatchObject({ ok: false, reason: raison });
    expect(json.error.length).toBeGreaterThan(0);
  });

  it('exception : 500 sans détail', async () => {
    deciderComposition.mockRejectedValue(new Error('secret de base'));
    const reponse = await post(CORPS);
    expect(reponse.status).toBe(500);
    expect(JSON.stringify(await reponse.json())).not.toContain('secret');
  });
});

describe('GET', () => {
  it('code invalide : 400', async () => {
    expect((await GET(new Request('http://localhost/x?analyte=..'))).status).toBe(400);
  });
  it('analyte inconnu : 404', async () => {
    lireCompositionAnalyte.mockResolvedValue({ ok: false, raison: 'analyte_inconnu' });
    expect((await GET(new Request('http://localhost/x?analyte=BIO_INCONNU'))).status).toBe(404);
  });
  it('rend la lecture de la lib', async () => {
    const reponse = await GET(new Request('http://localhost/x?analyte=BIO_NFS'));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toMatchObject({ ok: true, membreDe: [] });
  });
});
