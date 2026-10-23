import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route du constat sur un besoin ([[D-347]], t40). La base refuse
// ce que la route refuse (contrat `constats_besoin_praticien_v1_negatif.sql`,
// banc à deux sessions) ; ce banc-ci éprouve que la route le DIT, nommé,
// n'écrit rien quand elle refuse, écrit l'e-mail de la session et ne rend
// aucune valeur. Les besoins qui portent un score sont passés par le module
// `besoins` simulé : le banc ne lit pas le référentiel des sources.

const { getServerSession, prisma, avecScore } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    resultatBiologique: { findMany: vi.fn() },
    annulationResultatBiologique: { findMany: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    constatBesoinPraticien: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    pieceConstatBesoinPraticien: { createMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
  avecScore: new Set<number>(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/dateParis', () => ({ dateJourParis: () => '2026-10-23' }));
vi.mock('@/lib/constats-besoin/besoins', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/constats-besoin/besoins')>()),
  besoinsConstatablesAvecScore: () => new Set(avecScore),
}));

import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const PRELEVE = new Date('2026-10-01T08:00:00.000Z');

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/besoins/constats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const lecture = () => GET(new Request('http://localhost/api/praticien/besoins/constats?idPatient=PAT1'));

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

const POSE = { idPatient: 'PAT1', acte: 'pose', besoin: 6, verdict: 'a_soutenir' };

const acteLu = (surcharge: Record<string, unknown> = {}) => ({
  id: 'c1',
  ordre: BigInt(1),
  acte: 'pose',
  besoin: 6,
  verdict: 'non_evaluable',
  motif: 'non_aborde',
  note: null,
  aRevoirLe: null,
  idConstatRemplace: null,
  praticienEmail: PRATICIEN,
  acteLe: new Date('2026-10-10T09:00:00.000Z'),
  pieces: [],
  ...surcharge,
});

beforeEach(() => {
  vi.clearAllMocks();
  avecScore.clear();
  process.env.WN_CONSTAT_BESOIN = 'true';
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: null });
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  dossier([ligne('res1', 'BIO_TEST', PRELEVE)]);
  prisma.annulationResultatBiologique.findMany.mockResolvedValue([]);
  prisma.biologyAnalyte.findMany.mockResolvedValue([{ code: 'BIO_TEST', libelle: 'Analyse de test' }]);
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.constatBesoinPraticien.findMany.mockResolvedValue([]);
  // Par défaut : aucun acte sur le besoin.
  prisma.constatBesoinPraticien.findFirst.mockResolvedValue(null);
  prisma.constatBesoinPraticien.create.mockResolvedValue({ id: 'nouveau' });
  prisma.pieceConstatBesoinPraticien.createMany.mockResolvedValue({ count: 1 });
  prisma.journalAccesDossier.create.mockResolvedValue({});
  prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  delete process.env.WN_CONSTAT_BESOIN;
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
});

describe('drapeau WN_CONSTAT_BESOIN — éteint, fail-closed', () => {
  it.each([undefined, 'false', '1'])('drapeau %s : 503, aucune session lue, aucune lecture ni écriture', async valeur => {
    if (valeur === undefined) delete process.env.WN_CONSTAT_BESOIN;
    else process.env.WN_CONSTAT_BESOIN = valeur;
    expect((await lecture()).status).toBe(503);
    expect((await POST(requete(POSE))).status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.constatBesoinPraticien.findMany).not.toHaveBeenCalled();
    expect(prisma.constatBesoinPraticien.create).not.toHaveBeenCalled();
  });

  it('sans session : 401 ; dossier d’un autre praticien : 403, rien lu', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await lecture()).status).toBe(401);
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', actif: true, suiviClotureLe: null });
    expect((await lecture()).status).toBe(403);
    expect((await POST(requete(POSE))).status).toBe(403);
    expect(prisma.constatBesoinPraticien.findMany).not.toHaveBeenCalled();
    expect(prisma.constatBesoinPraticien.create).not.toHaveBeenCalled();
  });
});

describe('GET — les quatre besoins, leurs constats, sans aucune valeur', () => {
  it('rend les besoins offerts, la tête, « à relire » et les citables ; journalise l’accès', async () => {
    dossier([ligne('res1', 'BIO_TEST', PRELEVE), ligne('res2', 'BIO_TEST', new Date('2026-10-15T08:00:00.000Z'))]);
    prisma.constatBesoinPraticien.findMany.mockResolvedValue([
      acteLu({ besoin: 2, verdict: 'a_soutenir', motif: null, pieces: [{ idResultat: 'res1', idQuestionnaireReponse: null }] }),
    ]);
    const response = await lecture();
    expect(response.status).toBe(200);
    const corps = await response.json();
    expect(corps.offerts.map((o: { besoin: number }) => o.besoin)).toEqual([2, 6, 7, 11]);
    expect(corps.offerts.every((o: { avecScore: boolean; libelle: string }) => o.avecScore === false && o.libelle.length > 0)).toBe(true);
    expect(corps.besoins).toHaveLength(1);
    expect(corps.besoins[0].tete.id).toBe('c1');
    expect(corps.besoins[0].tete.pieces).toEqual([
      { type: 'resultat', id: 'res1', analyteCode: 'BIO_TEST', analyteLibelle: 'Analyse de test', preleveLe: PRELEVE.toISOString() },
    ]);
    expect(corps.besoins[0].aRelire).toEqual(['nouveau_prelevement']);
    expect(corps.citables.map((p: { id: string }) => p.id)).toEqual(['res2', 'res1']);
    // Aucune valeur ne sort : la lecture n'en demande pas.
    for (const [appel] of prisma.resultatBiologique.findMany.mock.calls) {
      expect(Object.keys(appel.select).sort()).toEqual(['analyteCode', 'id', 'preleveLe', 'saisiLe', 'supersedesResultatId']);
    }
    // Aucune CLÉ de valeur ou d'unité (le libellé du besoin 11 dit « valeurs »).
    expect(JSON.stringify(corps)).not.toMatch(/"(?:valeur|unite)[A-Za-z]*":/i);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalled();
  });

  it('un besoin qui gagne une source de score : signalé, et son constat se dit « à relire »', async () => {
    avecScore.add(6);
    prisma.constatBesoinPraticien.findMany.mockResolvedValue([acteLu()]);
    const corps = await (await lecture()).json();
    expect(corps.offerts.find((o: { besoin: number }) => o.besoin === 6).avecScore).toBe(true);
    expect(corps.besoins[0].aRelire).toEqual(['besoin_avec_score']);
  });

  it('étage des résultats fermé : aucune ligne de biologie offerte, la table n’est pas lue', async () => {
    process.env.WN_CB_RESULTS_ENABLED = 'false';
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { id: 'rep1', idQuestionnaire: 'Q_TEST', titre: 'Questionnaire de test', dateReponse: PRELEVE, statutValidite: 'VALID' },
    ]);
    const corps = await (await lecture()).json();
    expect(corps.citables).toEqual([{ type: 'reponse', id: 'rep1', titre: 'Questionnaire de test', dateReponse: PRELEVE.toISOString() }]);
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
  });
});

describe('POST pose — un acte en ajout seul, auteur = la session', () => {
  it('prend les verrous dans l’ordre du trigger : dossier, besoin (espace 347), puis chaque clé citée', async () => {
    await POST(requete({ ...POSE, pieces: [{ type: 'resultat', id: 'res1' }] }));
    const appels = prisma.$executeRaw.mock.calls;
    const sql = appels.map(([gabarit]) => (gabarit as TemplateStringsArray).join('?'));
    expect(sql).toHaveLength(3);
    expect(sql[0]).toMatch(/FROM public\.patients .* FOR KEY SHARE/);
    expect(sql[1]).toMatch(/pg_advisory_xact_lock\(347,/);
    // La clé du verrou : `id_patient || '|' || besoin::text`, comme le trigger.
    expect(appels[1].slice(1)).toEqual(['PAT1', '6']);
    expect(sql[2]).toMatch(/resultats_biologiques_verrouiller_cle/);
    expect(prisma.$executeRaw.mock.invocationCallOrder[2]).toBeLessThan(prisma.constatBesoinPraticien.create.mock.invocationCallOrder[0]);
  });

  it('« à soutenir » sans pièce s’écrit ; l’e-mail et la date du corps sont ignorés', async () => {
    const response = await POST(requete({ ...POSE, praticienEmail: 'pirate@exemple.fr', acteLe: '2020-01-01' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, id: 'nouveau' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.constatBesoinPraticien.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT1',
        acte: 'pose',
        besoin: 6,
        verdict: 'a_soutenir',
        motif: null,
        note: null,
        aRevoirLe: null,
        idConstatRemplace: null,
        praticienEmail: PRATICIEN,
      },
      select: { id: true },
    });
    expect(prisma.pieceConstatBesoinPraticien.createMany).not.toHaveBeenCalled();
  });

  it('consigne la pose et ses pièces dans la même transaction, pièces dans l’ordre des clés', async () => {
    dossier([ligne('resB', 'BIO_B', PRELEVE), ligne('resA2', 'BIO_A', new Date('2026-10-02T08:00:00.000Z')), ligne('resA1', 'BIO_A', PRELEVE)]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { id: 'rep2', statutValidite: 'VALID' },
      { id: 'rep1', statutValidite: 'AMBIGUOUS' },
    ]);
    const response = await POST(requete({
      ...POSE,
      besoin: 2,
      verdict: 'non_evaluable',
      motif: 'piece_attendue_manquante',
      aRevoirLe: '2026-11-15',
      pieces: [
        { type: 'reponse', id: 'rep2' },
        { type: 'resultat', id: 'resB' },
        { type: 'resultat', id: 'resA2' },
        { type: 'reponse', id: 'rep1' },
        { type: 'resultat', id: 'resA1' },
      ],
    }));
    expect(response.status).toBe(201);
    const ecrit = prisma.constatBesoinPraticien.create.mock.calls[0][0].data;
    expect(ecrit.aRevoirLe).toEqual(new Date('2026-11-15T00:00:00Z'));
    const pieces = prisma.pieceConstatBesoinPraticien.createMany.mock.calls[0][0].data;
    expect(pieces.map((p: { idResultat?: string; idQuestionnaireReponse?: string }) => p.idResultat ?? p.idQuestionnaireReponse))
      .toEqual(['resA1', 'resA2', 'resB', 'rep1', 'rep2']);
    expect(pieces.every((p: { idConstat: string; idPatient: string }) => p.idConstat === 'nouveau' && p.idPatient === 'PAT1')).toBe(true);
  });

  it('une pose sur un besoin qui a une tête doit la désigner', async () => {
    prisma.constatBesoinPraticien.findFirst.mockResolvedValue({ id: 'c1', acte: 'pose' });
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('tete_changee');
    expect(prisma.constatBesoinPraticien.create).not.toHaveBeenCalled();

    expect((await POST(requete({ ...POSE, remplace: 'c1' }))).status).toBe(201);
    expect(prisma.constatBesoinPraticien.create.mock.calls[0][0].data.idConstatRemplace).toBe('c1');
  });

  it('une pièce corrigée, annulée, inconnue ou une passation exclue : refus nommé, rien écrit', async () => {
    const avecPiece = { ...POSE, pieces: [{ type: 'resultat', id: 'res1' }] };
    dossier([ligne('res1', 'BIO_TEST', PRELEVE), ligne('res9', 'BIO_TEST', PRELEVE, 'res1')]);
    expect((await (await POST(requete(avecPiece))).json()).reason).toBe('piece_corrigee');

    dossier([ligne('res1', 'BIO_TEST', PRELEVE)]);
    prisma.annulationResultatBiologique.findMany.mockResolvedValueOnce([
      { id: 'an1', idResultat: 'res1', motifAnnulation: 'erreur_saisie', praticienEmail: PRATICIEN, acteLe: new Date() },
    ]);
    expect((await (await POST(requete(avecPiece))).json()).reason).toBe('piece_annulee');

    // Le dossier, le besoin, puis la clé de la ligne : introuvable au verrou.
    prisma.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    expect((await (await POST(requete(avecPiece))).json()).reason).toBe('piece_inconnue');

    expect((await (await POST(requete({ ...POSE, pieces: [{ type: 'resultat', id: 'ailleurs' }] }))).json()).reason)
      .toBe('piece_inconnue');

    prisma.questionnaireReponse.findMany.mockResolvedValue([{ id: 'rep1', statutValidite: 'INVALID' }]);
    expect((await (await POST(requete({ ...POSE, pieces: [{ type: 'reponse', id: 'rep1' }] }))).json()).reason)
      .toBe('passation_exclue');

    expect(prisma.constatBesoinPraticien.create).not.toHaveBeenCalled();
  });

  it('besoin qui porte une source de score : 409 avant toute transaction ; le retrait reste offert', async () => {
    avecScore.add(6);
    const response = await POST(requete(POSE));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('besoin_avec_score');
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.constatBesoinPraticien.findFirst.mockResolvedValue({ id: 'c1', acte: 'pose' });
    expect((await POST(requete({ idPatient: 'PAT1', acte: 'retrait', besoin: 6, remplace: 'c1' }))).status).toBe(201);
  });

  it('besoin hors de 2, 6, 7 et 11, ou demande illisible : 400 nommé', async () => {
    for (const [corps, raison] of [
      [{ ...POSE, besoin: 1 }, 'besoin_invalide'],
      [{ ...POSE, besoin: '6' }, 'besoin_invalide'],
      [{ ...POSE, verdict: 'carence' }, 'verdict_invalide'],
      [{ ...POSE, verdict: 'non_retenu' }, 'motif_invalide'],
    ] as const) {
      const response = await POST(requete(corps));
      expect(response.status).toBe(400);
      expect((await response.json()).reason).toBe(raison);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('étage des résultats fermé : une ligne de biologie ne se cite pas', async () => {
    process.env.WN_CB_RESULTS_ENABLED = 'false';
    const response = await POST(requete({ ...POSE, pieces: [{ type: 'resultat', id: 'res1' }] }));
    expect(response.status).toBe(400);
    expect((await response.json()).reason).toBe('pieces_invalides');
  });

  it('dossier clos : 409, rien écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: new Date() });
    expect((await POST(requete(POSE))).status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('POST retrait', () => {
  it('retire la tête désignée, sans pièce', async () => {
    prisma.constatBesoinPraticien.findFirst.mockResolvedValue({ id: 'c1', acte: 'pose' });
    const response = await POST(requete({ idPatient: 'PAT1', acte: 'retrait', besoin: 6, remplace: 'c1' }));
    expect(response.status).toBe(201);
    expect(prisma.constatBesoinPraticien.create).toHaveBeenCalledWith({
      data: { idPatient: 'PAT1', acte: 'retrait', besoin: 6, idConstatRemplace: 'c1', praticienEmail: PRATICIEN },
      select: { id: true },
    });
    expect(prisma.pieceConstatBesoinPraticien.createMany).not.toHaveBeenCalled();
  });

  it('un retrait qui ne vise pas la tête est refusé', async () => {
    prisma.constatBesoinPraticien.findFirst.mockResolvedValue({ id: 'r1', acte: 'retrait' });
    const response = await POST(requete({ idPatient: 'PAT1', acte: 'retrait', besoin: 6, remplace: 'c1' }));
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe('tete_changee');
  });
});

describe('POST — les refus de la base, reconnus à leur code', () => {
  const erreurs = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  it('refus de trigger (P2039 / P0001) et refus différé au commit : 409 refus_base, sans message journalisé', async () => {
    const espion = erreurs();
    const message = 'identifiant PAT1 dans le message';
    prisma.constatBesoinPraticien.create.mockRejectedValueOnce(
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
  });

  it('autre échec : 500, sans message journalisé', async () => {
    const espion = erreurs();
    prisma.$transaction.mockRejectedValueOnce(new Error('identifiant PAT1'));
    expect((await POST(requete(POSE))).status).toBe(500);
    expect(JSON.stringify(espion.mock.calls)).not.toContain('identifiant PAT1');
    espion.mockRestore();
  });
});
