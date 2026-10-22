import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route des constats ([[D-331]], BP-11). La base refuse ce que la
// route refuse (contrat `constats_praticien_v1_negatif.sql`, banc à deux
// sessions) ; ce banc-ci éprouve que la route le DIT, nommé, n'écrit rien
// quand elle refuse, et ne rend aucune valeur. Structure synthétique : la
// vraie est vide et non signée.

const { getServerSession, prisma, structure } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    resultatBiologique: { findMany: vi.fn() },
    annulationResultatBiologique: { findMany: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    constatPraticien: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    pieceConstatPraticien: { createMany: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
  structure: { signee: true, empreinte: 'e'.repeat(64), hypotheses: ['HYP_TEST_A'] as readonly string[] },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/dateParis', () => ({ dateJourParis: () => '2026-10-20' }));
vi.mock('@/lib/bio-parcours/constats/structure', () => ({ structureDuParcours: () => ({ ...structure }) }));
vi.mock('@/lib/fiches-usage/lecture', () => ({
  lireRayonFichesUsage: async () => ({
    termes: [{ termeId: 'HYP_TEST_A', nature: 'hypothese', reference: 'l1', libelles: [{ id: 'l1', libelle: 'Hypothèse de test' }] }],
  }),
}));

import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const PRELEVE = new Date('2026-10-01T08:00:00.000Z');

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/biologie/constats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const lecture = () => GET(new Request('http://localhost/api/praticien/biologie/constats?idPatient=PAT1'));

const ligne = (id: string, analyteCode: string, preleveLe: Date, supersedesResultatId: string | null = null) => ({
  id,
  analyteCode,
  preleveLe,
  supersedesResultatId,
  saisiLe: new Date(preleveLe.getTime() + 3600_000),
});

/** Les lignes du dossier : `where.id.in` filtre, sinon tout le dossier. */
function dossier(lignes: ReturnType<typeof ligne>[]) {
  prisma.resultatBiologique.findMany.mockImplementation(async (arg: { where: { id?: { in: string[] } } }) =>
    (arg.where.id ? lignes.filter(l => arg.where.id!.in.includes(l.id)) : lignes));
}

const POSE = {
  idPatient: 'PAT1',
  acte: 'pose',
  hypothese: 'HYP_TEST_A',
  verdict: 'confirmee',
  pieces: [{ type: 'resultat', id: 'res1' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  process.env.WN_BIO_CONSTAT = 'true';
  structure.signee = true;
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: null });
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  dossier([ligne('res1', 'BIO_TEST', PRELEVE)]);
  prisma.annulationResultatBiologique.findMany.mockResolvedValue([]);
  prisma.biologyAnalyte.findMany.mockResolvedValue([{ code: 'BIO_TEST', libelle: 'Analyse de test' }]);
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.constatPraticien.findMany.mockResolvedValue([]);
  // Par défaut : aucun acte sur l'hypothèse.
  prisma.constatPraticien.findFirst.mockResolvedValue(null);
  prisma.constatPraticien.create.mockResolvedValue({ id: 'nouveau' });
  prisma.pieceConstatPraticien.createMany.mockResolvedValue({ count: 1 });
  prisma.journalAccesDossier.create.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
  delete process.env.WN_BIO_CONSTAT;
});

describe('drapeau WN_BIO_CONSTAT — éteint, fail-closed', () => {
  it.each([undefined, 'false', '1'])('drapeau %s : 503, aucune lecture ni écriture', async valeur => {
    if (valeur === undefined) delete process.env.WN_BIO_CONSTAT;
    else process.env.WN_BIO_CONSTAT = valeur;
    expect((await lecture()).status).toBe(503);
    expect((await POST(requete(POSE))).status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.constatPraticien.create).not.toHaveBeenCalled();
  });

  it('le drapeau parent éteint suffit à fermer', async () => {
    process.env.WN_CB_RESULTS_ENABLED = 'false';
    expect((await lecture()).status).toBe(503);
  });
});

describe('GET — les constats par hypothèse, sans aucune valeur', () => {
  it('rend la tête, « à relire », les hypothèses offertes et les citables ; journalise l’accès', async () => {
    dossier([ligne('res1', 'BIO_TEST', PRELEVE), ligne('res2', 'BIO_TEST', new Date('2026-10-15T08:00:00.000Z'))]);
    prisma.constatPraticien.findMany.mockResolvedValue([{
      id: 'c1',
      ordre: BigInt(1),
      acte: 'pose',
      hypotheseCode: 'HYP_TEST_A',
      verdict: 'confirmee',
      motif: null,
      note: null,
      aRevoirLe: null,
      idConstatRemplace: null,
      praticienEmail: PRATICIEN,
      acteLe: new Date('2026-10-10T09:00:00.000Z'),
      pieces: [{ idResultat: 'res1', idQuestionnaireReponse: null, idTraitement: null }],
    }]);
    const response = await lecture();
    expect(response.status).toBe(200);
    const corps = await response.json();
    expect(corps.structureSignee).toBe(true);
    expect(corps.offertes).toEqual([{ hypotheseCode: 'HYP_TEST_A', libelle: 'Hypothèse de test' }]);
    expect(corps.hypotheses).toHaveLength(1);
    expect(corps.hypotheses[0].tete.id).toBe('c1');
    expect(corps.hypotheses[0].tete.pieces).toEqual([
      { type: 'resultat', id: 'res1', analyteCode: 'BIO_TEST', analyteLibelle: 'Analyse de test', preleveLe: PRELEVE.toISOString() },
    ]);
    expect(corps.hypotheses[0].aRelire).toEqual(['nouveau_prelevement']);
    expect(corps.citables.map((p: { id: string }) => p.id)).toEqual(['res2', 'res1']);
    // Aucune valeur ne sort : la lecture n'en demande pas.
    for (const [appel] of prisma.resultatBiologique.findMany.mock.calls) {
      expect(Object.keys(appel.select).sort()).toEqual(['analyteCode', 'id', 'preleveLe', 'saisiLe', 'supersedesResultatId']);
    }
    expect(JSON.stringify(corps)).not.toMatch(/valeur|unite/i);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalled();
  });

  it('structure non signée : aucune hypothèse offerte ni en vigueur, la lecture reste', async () => {
    structure.signee = false;
    prisma.constatPraticien.findMany.mockResolvedValue([{
      id: 'c1',
      ordre: BigInt(1),
      acte: 'pose',
      hypotheseCode: 'HYP_TEST_A',
      verdict: 'sans_objet',
      motif: 'hors_population',
      note: null,
      aRevoirLe: null,
      idConstatRemplace: null,
      praticienEmail: PRATICIEN,
      acteLe: new Date('2026-10-10T09:00:00.000Z'),
      pieces: [],
    }]);
    const corps = await (await lecture()).json();
    expect(corps.structureSignee).toBe(false);
    expect(corps.offertes).toEqual([]);
    // Retouchée sans re-signature : le constat ne tient plus contre elle.
    expect(corps.hypotheses[0].aRelire).toEqual(['hypothese_hors_structure']);
  });

  it('dossier d’un autre praticien : 403, rien lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    expect((await lecture()).status).toBe(403);
    expect(prisma.constatPraticien.findMany).not.toHaveBeenCalled();
  });
});

describe('POST pose — un acte en ajout seul, auteur = la session', () => {
  it('prend les verrous dans l’ordre du trigger : dossier, hypothèse, puis chaque clé citée', async () => {
    await POST(requete(POSE));
    const sql = prisma.$executeRaw.mock.calls.map(([gabarit]) => (gabarit as TemplateStringsArray).join('?'));
    expect(sql).toHaveLength(3);
    expect(sql[0]).toMatch(/FROM public\.patients .* FOR KEY SHARE/);
    expect(sql[1]).toMatch(/pg_advisory_xact_lock\(331,/);
    expect(sql[2]).toMatch(/resultats_biologiques_verrouiller_cle/);
    expect(prisma.$executeRaw.mock.invocationCallOrder[2]).toBeLessThan(prisma.constatPraticien.create.mock.invocationCallOrder[0]);
  });

  it('consigne la pose et ses pièces dans la même transaction, pièces dans l’ordre des clés', async () => {
    dossier([ligne('resB', 'BIO_B', PRELEVE), ligne('resA2', 'BIO_A', new Date('2026-10-02T08:00:00.000Z')), ligne('resA1', 'BIO_A', PRELEVE)]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { id: 'rep2', statutValidite: 'VALID' },
      { id: 'rep1', statutValidite: 'AMBIGUOUS' },
    ]);
    const response = await POST(requete({
      ...POSE,
      praticienEmail: 'pirate@exemple.fr',
      acteLe: '2020-01-01',
      pieces: [
        { type: 'reponse', id: 'rep2' },
        { type: 'resultat', id: 'resB' },
        { type: 'resultat', id: 'resA2' },
        { type: 'reponse', id: 'rep1' },
        { type: 'resultat', id: 'resA1' },
      ],
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, id: 'nouveau' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.constatPraticien.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT1',
        acte: 'pose',
        hypotheseCode: 'HYP_TEST_A',
        verdict: 'confirmee',
        motif: null,
        note: null,
        aRevoirLe: null,
        idConstatRemplace: null,
        structureSha256: 'e'.repeat(64),
        praticienEmail: PRATICIEN,
      },
      select: { id: true },
    });
    const pieces = prisma.pieceConstatPraticien.createMany.mock.calls[0][0].data;
    expect(pieces.map((p: { idResultat?: string; idQuestionnaireReponse?: string }) => p.idResultat ?? p.idQuestionnaireReponse))
      .toEqual(['resA1', 'resA2', 'resB', 'rep1', 'rep2']);
  });

  it('une pose sur une hypothèse qui a une tête doit la désigner', async () => {
    prisma.constatPraticien.findFirst.mockResolvedValue({ id: 'c1', acte: 'pose' });
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('tete_changee');
    expect(prisma.constatPraticien.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: null });
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.constatPraticien.findFirst.mockResolvedValue({ id: 'c1', acte: 'pose' });
    prisma.constatPraticien.create.mockResolvedValue({ id: 'c2' });
    expect((await POST(requete({ ...POSE, remplace: 'c1' }))).status).toBe(201);
    expect(prisma.constatPraticien.create.mock.calls[0][0].data.idConstatRemplace).toBe('c1');
  });

  it('une pièce corrigée, annulée, inconnue ou une passation exclue : refus nommé, rien écrit', async () => {
    dossier([ligne('res1', 'BIO_TEST', PRELEVE), ligne('res9', 'BIO_TEST', PRELEVE, 'res1')]);
    expect((await (await POST(requete(POSE))).json()).reason).toBe('piece_corrigee');

    dossier([ligne('res1', 'BIO_TEST', PRELEVE)]);
    prisma.annulationResultatBiologique.findMany.mockResolvedValueOnce([
      { id: 'an1', idResultat: 'res1', motifAnnulation: 'erreur_saisie', praticienEmail: PRATICIEN, acteLe: new Date() },
    ]);
    expect((await (await POST(requete(POSE))).json()).reason).toBe('piece_annulee');

    // Le dossier, l'hypothèse, puis la clé de la ligne : introuvable au verrou.
    prisma.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    expect((await (await POST(requete(POSE))).json()).reason).toBe('piece_inconnue');

    expect((await (await POST(requete({ ...POSE, pieces: [{ type: 'resultat', id: 'ailleurs' }] }))).json()).reason)
      .toBe('piece_inconnue');

    prisma.questionnaireReponse.findMany.mockResolvedValue([{ id: 'rep1', statutValidite: 'INVALID' }]);
    expect((await (await POST(requete({ ...POSE, pieces: [{ type: 'reponse', id: 'rep1' }] }))).json()).reason)
      .toBe('passation_exclue');

    expect(prisma.constatPraticien.create).not.toHaveBeenCalled();
  });

  it('structure non signée, hypothèse hors structure : 409 avant toute transaction', async () => {
    structure.signee = false;
    expect((await (await POST(requete(POSE))).json()).reason).toBe('structure_non_signee');
    structure.signee = true;
    const response = await POST(requete({ ...POSE, hypothese: 'HYP_TEST_Z' }));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('hypothese_hors_structure');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('demande illisible : 400 nommé', async () => {
    const response = await POST(requete({ ...POSE, verdict: 'normal' }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('verdict_invalide');
  });

  it('dossier clos : 409, rien écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: new Date() });
    expect((await POST(requete(POSE))).status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('POST retrait', () => {
  it('retire la tête désignée', async () => {
    prisma.constatPraticien.findFirst.mockResolvedValue({ id: 'c1', acte: 'pose' });
    const response = await POST(requete({ idPatient: 'PAT1', acte: 'retrait', hypothese: 'HYP_TEST_A', remplace: 'c1' }));
    expect(response.status).toBe(201);
    expect(prisma.constatPraticien.create).toHaveBeenCalledWith({
      data: { idPatient: 'PAT1', acte: 'retrait', hypotheseCode: 'HYP_TEST_A', idConstatRemplace: 'c1', praticienEmail: PRATICIEN },
      select: { id: true },
    });
    expect(prisma.pieceConstatPraticien.createMany).not.toHaveBeenCalled();
  });

  it('un retrait qui ne vise pas la tête est refusé', async () => {
    prisma.constatPraticien.findFirst.mockResolvedValue({ id: 'r1', acte: 'retrait' });
    const response = await POST(requete({ idPatient: 'PAT1', acte: 'retrait', hypothese: 'HYP_TEST_A', remplace: 'c1' }));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('tete_changee');
  });
});

describe('POST — les refus de la base, reconnus à leur code', () => {
  const erreurs = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  it('refus de trigger (P2039 / P0001) et refus différé au commit : 409 refus_base, sans message journalisé', async () => {
    const espion = erreurs();
    const message = 'identifiant PAT1 dans le message';
    prisma.constatPraticien.create.mockRejectedValueOnce(
      Object.assign(new Error(message), { code: 'P2039', meta: { driverAdapterError: { cause: { code: 'P0001' } } } }),
    );
    expect((await (await POST(requete(POSE))).json()).reason).toBe('refus_base');
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error(message), { cause: { code: 'P0001' } }));
    expect((await (await POST(requete(POSE))).json()).reason).toBe('refus_base');
    expect(JSON.stringify(espion.mock.calls)).not.toContain(message);
    espion.mockRestore();
  });

  it('course perdue : 409 conflit_concurrent', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'P2034' }));
    expect((await (await POST(requete(POSE))).json()).reason).toBe('conflit_concurrent');
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('x'), { cause: { code: '40P01' } }));
    expect((await (await POST(requete(POSE))).json()).reason).toBe('conflit_concurrent');
    // Délai de la transaction interactive dépassé : un verrou tenu ailleurs.
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'P2028' }));
    expect((await (await POST(requete(POSE))).json()).reason).toBe('conflit_concurrent');
  });

  it('autre échec : 500, sans message journalisé', async () => {
    const espion = erreurs();
    prisma.$transaction.mockRejectedValueOnce(new Error('identifiant PAT1'));
    expect((await POST(requete(POSE))).status).toBe(500);
    expect(JSON.stringify(espion.mock.calls)).not.toContain('identifiant PAT1');
    espion.mockRestore();
  });
});
