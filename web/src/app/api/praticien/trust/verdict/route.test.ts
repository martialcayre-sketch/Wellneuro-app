import { beforeEach, describe, expect, it, vi } from 'vitest';

// POST /api/praticien/trust/verdict ([[D-281]] §5, étape 4) — PRATICIEN SEUL,
// signalement scopé par `filtrePatientsDuPraticien`, auteur pris à la session.

const { getServerSession, prisma, elementsDesProgrammesVises } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    trustAdverseEffectReport: { findFirst: vi.fn() },
    trustAdverseEffectVerdict: { findMany: vi.fn(), create: vi.fn() },
  },
  elementsDesProgrammesVises: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/pauseEffetIndesirableServeur', () => ({ elementsDesProgrammesVises }));

import { POST } from './route';

const EMAIL = 'praticien@wellneuro.fr';
const post = (corps: unknown) => POST(new Request('http://localhost/api/praticien/trust/verdict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corps),
}));

describe('/api/praticien/trust/verdict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: EMAIL } });
    prisma.trustAdverseEffectReport.findFirst.mockResolvedValue({
      id: 's1', idPatient: 'PAT_TEST', rattachement: 'ne_sait_pas', elementActionId: null, protocolDraftId: 'draft-1',
    });
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([]);
    prisma.trustAdverseEffectVerdict.create.mockResolvedValue({ id: 'v1' });
    elementsDesProgrammesVises.mockResolvedValue(new Map([['draft-1', [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }]]]));
  });

  it('sans session : 401, rien n’est lu', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await post({ reportId: 's1', verdict: 'non_implique' });
    expect(res.status).toBe(401);
    expect(prisma.trustAdverseEffectReport.findFirst).not.toHaveBeenCalled();
  });

  it('le signalement est cherché dans les dossiers du praticien ; ailleurs : 404', async () => {
    prisma.trustAdverseEffectReport.findFirst.mockResolvedValue(null);
    const res = await post({ reportId: 's1', verdict: 'non_implique' });
    expect(res.status).toBe(404);
    const where = prisma.trustAdverseEffectReport.findFirst.mock.calls[0][0].where;
    expect(where.id).toBe('s1');
    expect(where.patient).toEqual({ praticienEmail: { equals: EMAIL, mode: 'insensitive' } });
    expect(prisma.trustAdverseEffectVerdict.create).not.toHaveBeenCalled();
  });

  it('un signalement sans rattachement ni programme ne reçoit pas d’avis : 409', async () => {
    prisma.trustAdverseEffectReport.findFirst.mockResolvedValue({
      id: 's1', idPatient: 'PAT_TEST', rattachement: null, elementActionId: null, protocolDraftId: null,
    });
    expect((await post({ reportId: 's1', verdict: 'non_implique' })).status).toBe(409);
    expect(prisma.trustAdverseEffectVerdict.create).not.toHaveBeenCalled();
  });

  // D-281 §5, arbitrage du 2026-10-14 : « oui » au programme sans élément. Le
  // praticien désigne l'élément en cause dans le programme visé, ou aucun.
  describe('formulaire d’avant (programme sans rattachement)', () => {
    beforeEach(() => {
      prisma.trustAdverseEffectReport.findFirst.mockResolvedValue({
        id: 's1', idPatient: 'PAT_TEST', rattachement: null, elementActionId: null, protocolDraftId: 'draft-1',
      });
    });

    it('« impliqué » : l’élément choisi dans le programme visé est écrit', async () => {
      const res = await post({
        reportId: 's1', verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'reduire', supersedesVerdictId: null,
      });
      expect(res.status).toBe(200);
      expect(elementsDesProgrammesVises).toHaveBeenCalledWith(['draft-1']);
      expect(prisma.trustAdverseEffectVerdict.create).toHaveBeenCalledWith({
        data: {
          idPatient: 'PAT_TEST', reportId: 's1', verdict: 'implique', elementActionId: 'a-magnesium',
          amenagement: 'reduire', supersedesVerdictId: null, renduPar: EMAIL,
        },
        select: { id: true },
      });
    });

    it('« aucun élément » : « non impliqué » est écrit', async () => {
      const res = await post({ reportId: 's1', verdict: 'non_implique', supersedesVerdictId: null });
      expect(res.status).toBe(200);
      expect(prisma.trustAdverseEffectVerdict.create.mock.calls[0][0].data).toMatchObject({
        verdict: 'non_implique', elementActionId: null, amenagement: null,
      });
    });

    it('un élément hors du programme visé : 400, rien n’est écrit', async () => {
      const res = await post({ reportId: 's1', verdict: 'implique', elementActionId: 'a-inconnu', amenagement: 'retirer' });
      expect(res.status).toBe(400);
      expect(prisma.trustAdverseEffectVerdict.create).not.toHaveBeenCalled();
    });
  });

  it('★ l’auteur est l’e-mail de SESSION, jamais celui du corps', async () => {
    const res = await post({
      reportId: 's1', verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'retirer',
      supersedesVerdictId: null, renduPar: 'quelquun@ailleurs.fr',
    });
    expect(res.status).toBe(200);
    expect(prisma.trustAdverseEffectVerdict.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST', reportId: 's1', verdict: 'implique', elementActionId: 'a-magnesium',
        amenagement: 'retirer', supersedesVerdictId: null, renduPar: EMAIL,
      },
      select: { id: true },
    });
  });

  it('une demande invalide n’écrit rien : 400', async () => {
    const res = await post({ reportId: 's1', verdict: 'implique', elementActionId: 'a-magnesium', amenagement: 'augmenter' });
    expect(res.status).toBe(400);
    expect(prisma.trustAdverseEffectVerdict.create).not.toHaveBeenCalled();
  });

  it('deux avis concurrents : la base refuse le second (P2002), 409', async () => {
    prisma.trustAdverseEffectVerdict.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect((await post({ reportId: 's1', verdict: 'non_implique' })).status).toBe(409);
  });

  it('erreur de base : 500 sans détail', async () => {
    prisma.trustAdverseEffectVerdict.create.mockRejectedValue(new Error('trigger'));
    const res = await post({ reportId: 's1', verdict: 'non_implique' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: 'Erreur technique.' });
  });
});
