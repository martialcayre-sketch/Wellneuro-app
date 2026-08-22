import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, cloturerAgenda } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    agendaSommeilNuit: { findMany: vi.fn() },
  },
  cloturerAgenda: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/agenda-sommeil/cloture', () => ({ cloturerAgenda }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const OWNER = { idPatient: 'PAT_PROPRIO', email: 'proprio@example.test' };
const ASS = {
  idAssignation: 'ASS_AGD',
  idPatient: OWNER.idPatient,
  emailPatient: OWNER.email,
  idQuestionnaire: 'Q_SOM_09',
  titre: 'Agenda du sommeil — 21 nuits',
  statutReponses: 'non_rempli',
};
const rep = { contractVersion: 'agenda-sommeil-v1', heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4 };

function cookie(idPatient = OWNER.idPatient): string {
  return signPatientSession({ idPatient, email: OWNER.email });
}
function mockOwner(): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: OWNER.idPatient, actif: true, email: OWNER.email,
    accessTokenRevoked: false, sessionsInvalidesAvant: null,
  });
}
function post(c: string | undefined, body: unknown): Request {
  return new Request('http://localhost/api/portail/agenda-sommeil/cloture', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(c ? { cookie: `wn_portail=${encodeURIComponent(c)}` } : {}) },
    body: JSON.stringify(body),
  });
}
function nuit(dateNuit: string) {
  return { id: `n_${dateNuit}`, idPatient: OWNER.idPatient, idAssignation: 'ASS_AGD', dateNuit, reponses: rep, canal: 'portail', supersedesNuitId: null, soumisLe: new Date(`${dateNuit}T07:00:00.000Z`) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z')); // aujourd'hui = 2026-07-15
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
});
afterEach(() => vi.useRealTimers());

describe('POST /api/portail/agenda-sommeil/cloture', () => {
  it('refuse sans session portail (401)', async () => {
    const res = await POST(post(undefined, { idAssignation: 'ASS_AGD' }));
    expect(res.status).toBe(401);
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    mockOwner();
    const res = await POST(post(cookie('PAT_INTRUS'), { idAssignation: 'ASS_AGD' }));
    expect(res.status).toBe(404);
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('refuse la clôture avant la fin des 21 nuits (409 trop_tot)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    mockOwner();
    // Deux nuits récentes → fenêtre non atteinte.
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([nuit('2026-07-14'), nuit('2026-07-15')]);
    const res = await POST(post(cookie(), { idAssignation: 'ASS_AGD' }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('trop_tot');
    expect(cloturerAgenda).not.toHaveBeenCalled();
  });

  it('clôture quand la fenêtre de 21 nuits est atteinte (200)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    mockOwner();
    // Première nuit à J-21 → cloturable aujourd'hui.
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([nuit('2026-06-25'), nuit('2026-07-15')]);
    cloturerAgenda.mockResolvedValue({ idReponse: 'REP_1', titre: ASS.titre, nbNuits: 2, dejaCloture: false });
    const res = await POST(post(cookie(), { idAssignation: 'ASS_AGD' }));
    const json = (await res.json()) as { ok: boolean; titre?: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(cloturerAgenda).toHaveBeenCalledWith({ idAssignation: 'ASS_AGD' });
  });
});
