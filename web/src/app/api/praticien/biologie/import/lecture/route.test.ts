import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    importBiologique: { findFirst: vi.fn() },
    lectureImportBiologique: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

// L'ACTE DE LECTURE d'un import validé ([[D-268]], BP-10). Identités de
// fixture seulement. La concurrence réelle (deux sessions) s'éprouve contre
// PostgreSQL : `scripts/banc-lectures-imports-deux-sessions.test.mjs`.

const PRATICIEN = 'praticien@wellneuro.fr';
const DRAPEAUX = ['WN_CB_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_BIO_INGEST_ENABLED', 'WN_BIO_LECTURE_ENABLED'];
const avant: Record<string, string | undefined> = {};

function requete(corps: unknown) {
  return new Request('http://localhost/api/praticien/biologie/import/lecture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const LECTURE = {
  id: 'lec_1', acte: 'lecture', idLectureRevoquee: null, codeRevocation: null,
  praticienEmail: PRATICIEN, acteLe: new Date('2026-10-06T10:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const nom of DRAPEAUX) {
    avant[nom] = process.env[nom];
    process.env[nom] = 'true';
  }
  getServerSession.mockResolvedValue({ user: { email: 'Praticien@Wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: null });
  prisma.importBiologique.findFirst.mockResolvedValue({ lignes: [{ statut: 'validee' }, { statut: 'ecartee' }] });
  prisma.lectureImportBiologique.findMany.mockResolvedValue([]);
  prisma.lectureImportBiologique.create.mockResolvedValue({ id: 'lec_neuve', acteLe: new Date('2026-10-06T12:00:00Z') });
});

afterEach(() => {
  for (const nom of DRAPEAUX) {
    if (avant[nom] === undefined) delete process.env[nom];
    else process.env[nom] = avant[nom];
  }
});

describe('POST /api/praticien/biologie/import/lecture', () => {
  it('drapeau éteint : 503, et rien n’est lu ni écrit', async () => {
    delete process.env.WN_BIO_LECTURE_ENABLED;
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.lectureImportBiologique.create).not.toHaveBeenCalled();
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(401);
  });

  it('un autre praticien que celui du dossier : 403, aucun acte (D-268 §5)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre.praticien@wellneuro.fr' });
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(403);
    expect(prisma.lectureImportBiologique.create).not.toHaveBeenCalled();
  });

  it('pose la lecture au nom de la session, en UNE instruction hors transaction', async () => {
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, acte: { id: 'lec_neuve', acte: 'lecture', acteLe: '2026-10-06T12:00:00.000Z' } });
    expect(prisma.lectureImportBiologique.create).toHaveBeenCalledWith({
      data: { idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture', praticienEmail: PRATICIEN },
      select: { id: true, acteLe: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dossier au suivi clôturé : l’acte se pose quand même (précision du 2026-10-06)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN, actif: true, suiviClotureLe: new Date() });
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(201);
  });

  it.each([
    ['import d’un autre dossier', null, [], 404, 'import_introuvable'],
    ['aucune ligne validée', { lignes: [{ statut: 'ecartee' }] }, [], 409, 'import_non_valide'],
    ['lignes encore à décider', { lignes: [{ statut: 'validee' }, { statut: 'proposee' }] }, [], 409, 'lignes_a_decider'],
    ['lecture déjà active', { lignes: [{ statut: 'validee' }] }, [LECTURE], 409, 'lecture_deja_active'],
  ])('lecture refusée — %s', async (_cas, imp, actes, status, reason) => {
    prisma.importBiologique.findFirst.mockResolvedValue(imp);
    prisma.lectureImportBiologique.findMany.mockResolvedValue(actes);
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(status);
    expect((await res.json()).reason).toBe(reason);
    expect(prisma.lectureImportBiologique.create).not.toHaveBeenCalled();
  });

  it('révocation : code de la liste fermée, lecture de cet import', async () => {
    prisma.lectureImportBiologique.findMany.mockResolvedValue([LECTURE]);
    const res = await POST(requete({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', idLecture: 'lec_1', code: 'lecture_a_refaire',
    }));
    expect(res.status).toBe(201);
    expect(prisma.lectureImportBiologique.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', praticienEmail: PRATICIEN,
        idLectureRevoquee: 'lec_1', codeRevocation: 'lecture_a_refaire',
      },
    }));
  });

  it('le praticien actuel révoque la lecture d’un ancien praticien', async () => {
    prisma.lectureImportBiologique.findMany.mockResolvedValue([{ ...LECTURE, praticienEmail: 'ancien.praticien@wellneuro.fr' }]);
    const res = await POST(requete({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', idLecture: 'lec_1', code: 'mauvais_import',
    }));
    expect(res.status).toBe(201);
  });

  it.each([
    ['sans code', { idLecture: 'lec_1' }],
    ['code hors liste', { idLecture: 'lec_1', code: 'resultat_inquietant' }],
    ['sans cible', { code: 'mauvais_import' }],
  ])('révocation mal formée — %s : 400, aucun acte', async (_cas, extra) => {
    prisma.lectureImportBiologique.findMany.mockResolvedValue([LECTURE]);
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', ...extra }));
    expect(res.status).toBe(400);
    expect(prisma.lectureImportBiologique.create).not.toHaveBeenCalled();
  });

  it('aucun texte libre n’est recopié : seuls la cible et le code partent (§5)', async () => {
    prisma.lectureImportBiologique.findMany.mockResolvedValue([LECTURE]);
    await POST(requete({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', idLecture: 'lec_1', code: 'lecture_a_refaire',
      motif: 'un texte libre',
    }));
    expect(Object.keys(prisma.lectureImportBiologique.create.mock.calls[0]?.[0].data).sort()).toEqual(
      ['acte', 'codeRevocation', 'idImport', 'idLectureRevoquee', 'idPatient', 'praticienEmail'],
    );
  });

  it.each([
    ['lecture inexistante', [], 404, 'lecture_introuvable'],
    ['lecture déjà révoquée', [LECTURE, { ...LECTURE, id: 'rev_1', acte: 'revocation', idLectureRevoquee: 'lec_1', codeRevocation: 'mauvais_import' }], 409, 'lecture_deja_revoquee'],
  ])('révocation refusée — %s', async (_cas, actes, status, reason) => {
    prisma.lectureImportBiologique.findMany.mockResolvedValue(actes);
    const res = await POST(requete({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', idLecture: 'lec_1', code: 'mauvais_import',
    }));
    expect(res.status).toBe(status);
    expect((await res.json()).reason).toBe(reason);
  });

  it('COURSE PERDUE : la base refuse, la relecture nomme l’état qui l’a fait perdre', async () => {
    prisma.lectureImportBiologique.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([LECTURE]);
    prisma.lectureImportBiologique.create.mockRejectedValue(new Error('lecture refusée : porte déjà une lecture active'));
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('lecture_deja_active');
  });

  it('DEUX RÉVOCATIONS CONCURRENTES : l’index unique refuse la seconde, nommée « déjà révoquée », jamais un 500', async () => {
    const revocation = { ...LECTURE, id: 'rev_1', acte: 'revocation', idLectureRevoquee: 'lec_1', codeRevocation: 'mauvais_import' };
    prisma.lectureImportBiologique.findMany.mockResolvedValueOnce([LECTURE]).mockResolvedValueOnce([LECTURE, revocation]);
    prisma.lectureImportBiologique.create.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));
    const res = await POST(requete({
      idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'revocation', idLecture: 'lec_1', code: 'lecture_a_refaire',
    }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('lecture_deja_revoquee');
  });

  it('un refus de la base que la relecture n’explique pas reste une erreur technique, jamais un succès', async () => {
    prisma.lectureImportBiologique.create.mockRejectedValue(new Error('panne'));
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp_1', acte: 'lecture' }));
    expect(res.status).toBe(500);
  });

  it('import mal désigné : 400', async () => {
    const res = await POST(requete({ idPatient: 'PAT_SOPHIE', idImport: 'imp 1;', acte: 'lecture' }));
    expect(res.status).toBe(400);
  });
});
