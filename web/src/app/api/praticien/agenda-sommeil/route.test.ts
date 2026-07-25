import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assignation: { findMany: vi.fn() },
    agendaSommeilNuit: { findMany: vi.fn() },
  },
  verifierAppartenancePatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: () => 'praticien@wellneuro.fr',
}));

import { GET } from './route';

const reponses = { contractVersion: 'agenda-sommeil-v1', heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4 };

function getReq(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/agenda-sommeil?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-20T10:00:00.000Z'));
});
afterEach(() => vi.useRealTimers());

describe('GET /api/praticien/agenda-sommeil', () => {
  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('refuse un patient hors périmètre (403) sans lire les données', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('non_accessible');
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('retourne les épisodes avec nuits et agrégats provisoires', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_AGD',
        titre: 'Agenda du sommeil — 21 nuits',
        statutReponses: 'non_rempli',
        dateAssignation: new Date('2026-07-10T09:00:00.000Z'),
      },
    ]);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      { id: 'n1', idPatient: 'PAT_1', idAssignation: 'ASS_AGD', dateNuit: '2026-07-10', reponses, canal: 'portail', supersedesNuitId: null, soumisLe: new Date('2026-07-10T07:00:00.000Z') },
      { id: 'n2', idPatient: 'PAT_1', idAssignation: 'ASS_AGD', dateNuit: '2026-07-11', reponses, canal: 'portail', supersedesNuitId: null, soumisLe: new Date('2026-07-11T07:00:00.000Z') },
    ]);
    const res = await GET(getReq());
    const json = (await res.json()) as { ok: boolean; episodes: { statut: string; nuits: unknown[]; agregats: unknown }[] };
    expect(res.status).toBe(200);
    expect(json.episodes).toHaveLength(1);
    expect(json.episodes[0].statut).toBe('en_cours');
    expect(json.episodes[0].nuits).toHaveLength(2);
    // < 5 nuits → pas d'agrégats (null, jamais des zéros).
    expect(json.episodes[0].agregats).toBeNull();
  });
});
