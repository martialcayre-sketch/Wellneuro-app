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
  });

  it('patient d’un autre praticien : 403, sans lire la moindre donnée liée', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.protocolCheckin.findMany).not.toHaveBeenCalled();
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

  it('erreur technique (500) sans détail interne', async () => {
    prisma.questionnaireReponse.findMany.mockRejectedValue(new Error('boom'));
    const res = await GET(request());
    expect(res.status).toBe(500);
    const payload = await res.json();
    expect(payload.error).toBe('Erreur technique.');
  });
});
