import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    protocolCheckin: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    protocolDraft: { findMany: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustAdverseEffectVerdict: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/copilote/prevol?${query}`);
}

describe('GET /api/praticien/copilote/prevol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'p@wellneuro.fr' });
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.protocolCheckin.findMany.mockResolvedValue([]);
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([]);
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([]);
  });

  // Les instantanés du carnet alimentaire partagent `protocol_drafts` : sans
  // exclusion, une transmission patient compterait comme un protocole relu.
  it('exclut les instantanés du carnet alimentaire des versions relues', async () => {
    await GET(request());
    expect(prisma.protocolDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contractVersion: { not: 'ja-food-observation-v1' } }),
      }),
    );
  });

  it('refuse sans session (401) sans toucher la base', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('rejette un identifiant patient invalide (400)', async () => {
    const res = await GET(request('idPatient=PAT%201!'));
    expect(res.status).toBe(400);
  });

  it('patient inconnu (404)', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, sans lire la moindre donnée liée', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.protocolCheckin.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('un GET accessible journalise l’accès au gabarit littéral (G-TRUST-04)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/copilote/prevol',
        methode: 'GET',
      },
    });
  });

  it('patient sans historique : pré-vol vide et ancre explicite', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.prevol.ancre).toEqual({ type: 'aucune', date: null });
    expect(payload.prevol.faits).toEqual([]);
    expect(payload.prevol.questionsSuggerees).toEqual([]);
  });

  it('ancre sur la dernière consultation validée et ne retient que la suite', async () => {
    prisma.consultation.findFirst.mockResolvedValue({ dateValidation: new Date('2026-02-01T00:00:00.000Z') });
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'AVANT', dateReponse: new Date('2026-01-10T00:00:00.000Z') },
      { idQuestionnaire: 'APRES', dateReponse: new Date('2026-02-10T00:00:00.000Z') },
    ]);
    const res = await GET(request());
    const payload = await res.json();
    expect(payload.prevol.ancre.type).toBe('consultation');
    expect(payload.prevol.faits.map((f: { instrument: string }) => f.instrument)).toEqual(['APRES']);
  });

  it('un check-in au JSON illisible ne déclenche aucune question devinée', async () => {
    prisma.protocolCheckin.findMany.mockResolvedValue([
      { pointEtape: 'J14', soumisLe: new Date('2026-02-10T00:00:00.000Z'), reponses: 'pas-un-objet' },
    ]);
    const res = await GET(request());
    const payload = await res.json();
    // Le point d'étape reste un fait rapporté…
    expect(payload.prevol.faits).toHaveLength(1);
    // …mais rien n'est supposé de son contenu.
    expect(payload.prevol.questionsSuggerees).toEqual([]);
  });

  it('une tolérance difficile remonte en question, sourcée sur son point d’étape', async () => {
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        pointEtape: 'J14',
        soumisLe: new Date('2026-02-10T00:00:00.000Z'),
        reponses: { adhesion: 'plupart_des_jours', tolerance: 'difficilement' },
      },
    ]);
    const res = await GET(request());
    const payload = await res.json();
    expect(payload.prevol.questionsSuggerees[0]).toMatch(/J14/);
  });

  // D-281 §5 : un signalement qui reçoit un avis reste non traité tant qu'il
  // l'attend, quel que soit son statut — la règle du panneau TRUST.
  describe('effet indésirable non traité par l’attente d’avis (D-281 §5)', () => {
    const effet = (id: string, champs: { statutTraitement: string; rattachement: string | null; protocolDraftId: string | null }) => ({
      id, idPatient: 'PAT_1', soumisLe: new Date('2026-02-10T00:00:00.000Z'), ...champs,
    });
    const signale = async () => {
      const payload = await (await GET(request())).json();
      return payload.prevol.faits.some((f: { source: string }) => f.source === 'signalement');
    };

    it('lit le dossier sur le statut ouvert OU un avis à recevoir', async () => {
      await GET(request());
      expect(prisma.trustAdverseEffectReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          AND: [
            { idPatient: 'PAT_1' },
            {
              OR: [
                { statutTraitement: { in: ['recu', 'en_cours'] } },
                { rattachement: { not: null } },
                { protocolDraftId: { not: null } },
              ],
            },
          ],
        },
      }));
    });

    it('rattaché, passé à « traité » sans avis : compté', async () => {
      prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
        effet('aer_rattache', { statutTraitement: 'traite', rattachement: 'element', protocolDraftId: 'pd_1' }),
      ]);
      expect(await signale()).toBe(true);
    });

    it('avis en tête de chaîne : non compté, même au statut « reçu »', async () => {
      prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
        effet('aer_rattache', { statutTraitement: 'recu', rattachement: 'element', protocolDraftId: 'pd_1' }),
      ]);
      prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([
        { id: 'v_1', reportId: 'aer_rattache', verdict: 'implique', elementActionId: 'action-1', supersedesVerdictId: null },
      ]);
      expect(await signale()).toBe(false);
    });

    it('sans avis à recevoir : compté par statut', async () => {
      prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
        effet('aer_traite', { statutTraitement: 'traite', rattachement: null, protocolDraftId: null }),
      ]);
      expect(await signale()).toBe(false);
      prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
        effet('aer_recu', { statutTraitement: 'recu', rattachement: null, protocolDraftId: null }),
      ]);
      expect(await signale()).toBe(true);
      expect(prisma.trustAdverseEffectVerdict.findMany).not.toHaveBeenCalled();
    });
  });

  it('erreur technique (500) sans détail interne', async () => {
    prisma.questionnaireReponse.findMany.mockRejectedValue(new Error('boom'));
    const res = await GET(request());
    expect(res.status).toBe(500);
    const payload = await res.json();
    expect(payload.error).toBe('Erreur technique.');
  });
});
