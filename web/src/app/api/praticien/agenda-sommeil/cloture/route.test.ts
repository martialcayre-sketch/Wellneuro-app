import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient, cloturerAgenda } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: { assignation: { findUnique: vi.fn() } },
  verifierAppartenancePatient: vi.fn(),
  cloturerAgenda: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: () => 'praticien@wellneuro.fr',
}));
vi.mock('@/lib/agenda-sommeil/cloture', () => ({ cloturerAgenda }));

import { POST } from './route';

function post(body: unknown): Request {
  return new Request('http://localhost/api/praticien/agenda-sommeil/cloture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/praticien/agenda-sommeil/cloture', () => {
  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGD' }));
    expect(res.status).toBe(401);
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('refuse un patient hors périmètre (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('non_accessible');
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGD' }));
    expect(res.status).toBe(403);
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('refuse une assignation appartenant à un autre patient (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE', idQuestionnaire: 'Q_SOM_09' });
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGD' }));
    expect(res.status).toBe(404);
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('refuse une assignation qui n’est pas un agenda (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_1', idQuestionnaire: 'Q_SOM_01' });
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGD' }));
    expect(res.status).toBe(404);
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('clôture l’agenda du bon patient (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findUnique.mockResolvedValue({ idPatient: 'PAT_1', idQuestionnaire: 'Q_SOM_09' });
    cloturerAgenda.mockResolvedValue({ idReponse: 'REP_1', nbNuits: 7, dejaCloture: false });
    const res = await POST(post({ idPatient: 'PAT_1', idAssignation: 'ASS_AGD' }));
    const json = (await res.json()) as { ok: boolean; idReponse?: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.idReponse).toBe('REP_1');
    expect(cloturerAgenda).toHaveBeenCalledWith({ idAssignation: 'ASS_AGD' });
  });
});
