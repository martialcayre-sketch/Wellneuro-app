import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient, cloturerAgendaAli } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: { assignation: { findUnique: vi.fn() } },
  verifierAppartenancePatient: vi.fn(),
  cloturerAgendaAli: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: () => 'praticien@wellneuro.fr',
}));
vi.mock('@/lib/agenda-alimentaire/cloture', () => ({ cloturerAgendaAli }));

import { POST } from './route';

function post(body: unknown): Request {
  return new Request('http://localhost/api/praticien/agenda-alimentaire/cloture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/praticien/agenda-alimentaire/cloture', () => {
  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGA' }));
    expect(res.status).toBe(401);
    expect(cloturerAgendaAli).not.toHaveBeenCalled();
  });

  it('refuse un patient hors périmètre (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('non_accessible');
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGA' }));
    expect(res.status).toBe(403);
    expect(cloturerAgendaAli).not.toHaveBeenCalled();
  });

  it('refuse une assignation appartenant à un autre patient (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE', idQuestionnaire: 'Q_ALI_09' });
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGA' }));
    expect(res.status).toBe(404);
    expect(cloturerAgendaAli).not.toHaveBeenCalled();
  });

  it('refuse une assignation qui n’est pas un agenda alimentaire (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_1', idQuestionnaire: 'Q_SOM_09' });
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGA' }));
    expect(res.status).toBe(404);
    expect(cloturerAgendaAli).not.toHaveBeenCalled();
  });

  it('clôture l’agenda du bon patient (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_1', idQuestionnaire: 'Q_ALI_09' });
    cloturerAgendaAli.mockResolvedValue({ idReponse: 'REP_1', titre: 'Agenda', nbJours: 7, dejaCloture: false });
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGA' }));
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload).toEqual({ ok: true, idReponse: 'REP_1', nbJours: 7, dejaCloture: false });
    expect(cloturerAgendaAli).toHaveBeenCalledWith({ idAssignation: 'ASS_AGA' });
  });

  it('traduit un refus métier de la clôture en 400 nommé (quarantaine, vide, annulée)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_1', idQuestionnaire: 'Q_ALI_09' });
    cloturerAgendaAli.mockRejectedValue(new TypeError('Aucune journée renseignée : rien à clôturer.'));
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGA' }));
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toMatch(/Aucune journée/);
  });
});
