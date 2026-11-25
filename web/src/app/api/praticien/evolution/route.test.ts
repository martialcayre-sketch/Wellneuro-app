import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';
import { MOTIFS_PASSATION_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/evolution?${query}`);
}

const episode = (id: string, milestone: string, iso: string, ids: string[]) => ({
  id,
  cycleId: 'c1',
  confirmedAt: new Date(iso),
  milestone,
  versionScore: 'v1',
  payload: { includedResponseIds: ids },
});

const passation = (idReponse: string, idQuestionnaire: string, iso: string, score: number | null) => ({
  idReponse,
  idQuestionnaire,
  titre: `Titre ${idQuestionnaire}`,
  dateReponse: new Date(iso),
  statutValidite: 'VALID',
  scorePrincipal: score,
  interpretation: 'Libellé lu',
});

describe('GET /api/praticien/evolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'p@wellneuro.fr' });
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('rejette un identifiant patient invalide (400)', async () => {
    const res = await GET(request('idPatient=pas%20valide'));
    expect(res.status).toBe(400);
  });

  it('patient d’un autre praticien : 403, rien n’est lu ni journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(prisma.assessmentEpisode.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('sans épisode : planche vide, aucune lecture de passation, accès journalisé', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      planche: { colonnes: [], lignes: [], introuvablesParColonne: [] },
    });
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('range les passations retenues par jalon, lues dans CE dossier seulement', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      episode('e0', 'T0', '2026-01-01T10:00:00.000Z', ['r1']),
      episode('e1', 'J21', '2026-02-01T10:00:00.000Z', ['r2', 'r9']),
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('r1', 'Q_A', '2025-12-30T10:00:00.000Z', 12),
      passation('r2', 'Q_A', '2026-01-30T10:00:00.000Z', 9),
    ]);

    const res = await GET(request());
    const corps = await res.json();

    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1', idReponse: { in: ['r1', 'r2', 'r9'] } } }),
    );
    expect(corps.planche.colonnes.map((c: { milestone: string }) => c.milestone)).toEqual(['T0', 'J21']);
    expect(corps.planche.lignes).toHaveLength(1);
    expect(corps.planche.lignes[0].cases.map((c: { score: number }[]) => c.map((p) => p.score))).toEqual([[12], [9]]);
    // `r9` est retenue par l'épisode mais absente du dossier : signalée.
    expect(corps.planche.introuvablesParColonne).toEqual([0, 1]);
    // Aucun écart n'est servi.
    expect(JSON.stringify(corps)).not.toMatch(/ecart|delta|tendance/i);
  });

  it('les passations AMBIGUOUS et INVALID sont servies et marquées, jamais filtrées', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([episode('e0', 'T0', '2026-01-01T10:00:00.000Z', ['r1', 'r2'])]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('r1', 'Q_A', '2025-12-30T10:00:00.000Z', 12), statutValidite: 'AMBIGUOUS' },
      { ...passation('r2', 'Q_A', '2025-12-31T10:00:00.000Z', 11), statutValidite: 'INVALID' },
    ]);
    const corps = await (await GET(request())).json();
    expect(corps.planche.lignes[0].cases[0]).toEqual([
      expect.objectContaining({ idReponse: 'r1', ambigue: true, statutExclu: null }),
      expect.objectContaining({ idReponse: 'r2', ambigue: false, statutExclu: 'INVALID' }),
    ]);
  });

  it('une passation non interprétable est servie nommée-mais-vidée', async () => {
    const [idQuestionnaire] = [...MOTIFS_PASSATION_NON_INTERPRETABLE.keys()];
    prisma.assessmentEpisode.findMany.mockResolvedValue([episode('e0', 'T0', '2026-01-01T10:00:00.000Z', ['r1'])]);
    // Date antérieure à toute reconstruction : la passation reste marquée.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('r1', idQuestionnaire, '2025-01-01T10:00:00.000Z', 30),
    ]);

    const corps = await (await GET(request())).json();
    const [servie] = corps.planche.lignes[0].cases[0];
    expect(servie.score).toBeNull();
    expect(servie.interpretation).toBeNull();
    expect(servie.nonInterpretable).toEqual(expect.any(String));
  });

  it('une panne de lecture rend 500, jamais une planche vide', async () => {
    prisma.assessmentEpisode.findMany.mockRejectedValue(new Error('base indisponible'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(request());
    expect(res.status).toBe(500);
  });
});
