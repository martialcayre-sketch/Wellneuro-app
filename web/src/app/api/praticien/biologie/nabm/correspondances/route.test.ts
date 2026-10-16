import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, deciderCorrespondance, lireCorrespondancesAnalyte } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  deciderCorrespondance: vi.fn(),
  lireCorrespondancesAnalyte: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat : sans ce
// mock, le simple import de la route exige un DATABASE_URL.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/correspondancesNabm', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/biology-library/correspondancesNabm')>();
  return { ...reel, deciderCorrespondance, lireCorrespondancesAnalyte };
});

import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';

function post(corps: unknown) {
  return POST(
    new Request('http://localhost/api/praticien/biologie/nabm/correspondances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof corps === 'string' ? corps : JSON.stringify(corps),
    }),
  );
}

const CORPS = {
  analyteCode: 'BIO_FERRITINE',
  codeActe: '1208',
  decision: 'signer',
  etatAttendu: 'absente',
  nature: 'isole',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  deciderCorrespondance.mockResolvedValue({
    ok: true,
    correspondance: { codeActe: '1208', etat: 'signee', verifiePar: PRATICIEN, verifieLe: '2026-10-15T10:00:00.000Z' },
  });
  lireCorrespondancesAnalyte.mockResolvedValue({
    ok: true,
    millesime: 'V105',
    correspondances: [],
    candidats: null,
    constat: null,
  });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('gardes d’accès — fail-closed', () => {
  it('sans session : 401, rien n’est écrit', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await post(CORPS)).status).toBe(401);
    expect(deciderCorrespondance).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404 en lecture comme en écriture', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await post(CORPS)).status).toBe(404);
    expect((await GET(new Request('http://localhost/x?analyte=BIO_FERRITINE'))).status).toBe(404);
    expect(deciderCorrespondance).not.toHaveBeenCalled();
    expect(lireCorrespondancesAnalyte).not.toHaveBeenCalled();
  });
});

describe('POST — le signataire vient de la session, jamais du corps', () => {
  it('passe l’e-mail de session et ignore un signataire envoyé par le client', async () => {
    const reponse = await post({ ...CORPS, verifiePar: 'autre@exemple.fr', praticien: 'autre@exemple.fr' });
    expect(reponse.status).toBe(200);
    expect(deciderCorrespondance).toHaveBeenCalledWith({
      analyteCode: 'BIO_FERRITINE',
      codeActe: '1208',
      decision: 'signer',
      etatAttendu: 'absente',
      nature: 'isole',
      praticien: PRATICIEN,
    });
  });

  it.each([
    ['code d’acte à trois chiffres', { codeActe: '120' }, 'code_invalide'],
    ['code d’analyte en minuscules', { analyteCode: 'bio_ferritine' }, 'analyte_invalide'],
    ['décision inconnue', { decision: 'valider' }, 'decision_invalide'],
    ['état attendu inconnu', { etatAttendu: 'VALIDE' }, 'decision_invalide'],
  ])('%s : 400, la lib n’est pas appelée', async (_cas, surcharge, reason) => {
    const reponse = await post({ ...CORPS, ...surcharge });
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).reason).toBe(reason);
    expect(deciderCorrespondance).not.toHaveBeenCalled();
  });

  it('retrait : la date de la signature vue est exigée, et passée à la lib', async () => {
    const sansDate = await post({ ...CORPS, decision: 'retirer', etatAttendu: 'signee', nature: undefined });
    expect(sansDate.status).toBe(400);
    expect((await sansDate.json()).reason).toBe('signature_vue_invalide');
    expect(deciderCorrespondance).not.toHaveBeenCalled();

    await post({
      ...CORPS,
      decision: 'retirer',
      etatAttendu: 'signee',
      nature: undefined,
      verifieLeVu: '2026-10-15T10:00:00.000Z',
    });
    expect(deciderCorrespondance.mock.calls[0][0].verifieLeVu).toEqual(new Date('2026-10-15T10:00:00.000Z'));
  });

  it('corps illisible : 400', async () => {
    expect((await post('{')).status).toBe(400);
  });

  it.each([
    ['etat_divergent', 409],
    ['acte_introuvable', 404],
    ['acte_inactif', 409],
    ['nature_requise', 422],
    ['transition_invalide', 409],
    ['constat_present', 409],
  ])('refus %s : statut %i et message en français', async (raison, statut) => {
    deciderCorrespondance.mockResolvedValue({ ok: false, raison });
    const reponse = await post(CORPS);
    expect(reponse.status).toBe(statut);
    const json = await reponse.json();
    expect(json).toMatchObject({ ok: false, reason: raison });
    expect(json.error.length).toBeGreaterThan(0);
  });

  it('exception : 500 sans détail', async () => {
    deciderCorrespondance.mockRejectedValue(new Error('secret de connexion'));
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = await post(CORPS);
    expect(reponse.status).toBe(500);
    expect(JSON.stringify(await reponse.json())).not.toContain('secret');
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('secret');
    erreur.mockRestore();
  });
});

describe('GET', () => {
  it('code d’analyte invalide : 400', async () => {
    const reponse = await GET(new Request('http://localhost/x?analyte=%27%3B'));
    expect(reponse.status).toBe(400);
    expect(lireCorrespondancesAnalyte).not.toHaveBeenCalled();
  });

  it('analyte inconnu : 404', async () => {
    lireCorrespondancesAnalyte.mockResolvedValue({ ok: false, raison: 'analyte_inconnu' });
    expect((await GET(new Request('http://localhost/x?analyte=BIO_X'))).status).toBe(404);
  });

  it('rend les correspondances lues', async () => {
    const reponse = await GET(new Request('http://localhost/x?analyte=BIO_FERRITINE'));
    expect(await reponse.json()).toEqual({
      ok: true,
      millesime: 'V105',
      correspondances: [],
      candidats: null,
      constat: null,
    });
  });

  it('rend le constat « aucun acte » lu, périmé compris (M-3c)', async () => {
    const constat = { millesime: 'V104', verifiePar: PRATICIEN, verifieLe: '2026-10-16T09:00:00.000Z', perime: true };
    lireCorrespondancesAnalyte.mockResolvedValue({ ok: true, millesime: 'V105', correspondances: [], candidats: null, constat });
    const reponse = await GET(new Request('http://localhost/x?analyte=BIO_HOMOCYSTEINE'));
    expect((await reponse.json()).constat).toEqual(constat);
  });

  it('rend les candidats résolus par le serveur (M-3b), sans rien écrire', async () => {
    const candidats = {
      millesimeListe: 'V105',
      situation: 'libelle_explicite',
      motif: null,
      propositions: [
        {
          codeActe: '1208',
          nature: 'isole',
          motif: 'T.S.H. seule.',
          acte: {
            codeActe: '1208',
            libelle: 'T.S.H.(SANG)',
            coefficientB: 20,
            inactif: false,
            ententePrealable: null,
            acteReserve: null,
            remboursementTotal: null,
          },
        },
      ],
    };
    lireCorrespondancesAnalyte.mockResolvedValue({ ok: true, millesime: 'V105', correspondances: [], candidats });
    const reponse = await GET(new Request('http://localhost/x?analyte=BIO_TSH_US'));
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).candidats).toEqual(candidats);
    expect(lireCorrespondancesAnalyte).toHaveBeenCalledWith('BIO_TSH_US');
    expect(deciderCorrespondance).not.toHaveBeenCalled();
  });
});
