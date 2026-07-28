import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    agendaSommeilNuit: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const OWNER = { idPatient: 'PAT_PROPRIO', email: 'proprio@example.test' };

const assignationAgenda = {
  idAssignation: 'ASS_AGD',
  idPatient: OWNER.idPatient,
  emailPatient: OWNER.email,
  idQuestionnaire: 'Q_SOM_09',
  titre: 'Agenda du sommeil — 21 nuits',
  statutReponses: 'non_rempli',
  dateLimite: null as string | null,
};

const reponses = { heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4 };

function cookieFor(idPatient = OWNER.idPatient, email = OWNER.email): string {
  return signPatientSession({ idPatient, email });
}

function mockOwner(): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: OWNER.idPatient,
    actif: true,
    email: OWNER.email,
    accessToken: 'TOK',
    accessTokenRevoked: false,
    sessionsInvalidesAvant: null,
  });
}

function req(method: 'GET' | 'POST', cookie: string | undefined, opts: { body?: unknown; query?: string } = {}): Request {
  const url = `http://localhost/api/portail/agenda-sommeil${opts.query ?? ''}`;
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

// Jour fixe pour des dates déterministes (Paris = UTC+2 l'été → même date).
const AUJOURDHUI = '2026-07-15';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'));
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/portail/agenda-sommeil', () => {
  it('refuse sans session portail (401)', async () => {
    const res = await POST(req('POST', undefined, { body: { idAssignation: 'ASS_AGD', reponses } }));
    expect(res.status).toBe(401);
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();
  });

  it('refuse la saisie d’une nuit sur une assignation annulée (Fil A) : 410, aucune écriture', async () => {
    // L'agenda honore l'annulation à son point d'auth commun (vue + saisie nuit).
    mockOwner();
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, statut: 'Annulée' });
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('annulee');
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const res = await POST(req('POST', cookieFor('PAT_INTRUS'), { body: { idAssignation: 'ASS_AGD', reponses } }));
    expect(res.status).toBe(404);
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();
  });

  it('refuse une assignation qui n’est pas un agenda (409 wrong_instrument)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, idQuestionnaire: 'Q_SOM_01' });
    mockOwner();
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    expect(res.status).toBe(409);
  });

  it('refuse la saisie sur un agenda clôturé (409 locked)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, statutReponses: 'verrouille' });
    mockOwner();
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('locked');
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();
  });

  it('refuse une date antérieure à la veille (409 date_hors_fenetre)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', dateNuit: '2026-07-10', reponses } }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('date_hors_fenetre');
  });

  it('enregistre la nuit du jour (201)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    prisma.agendaSommeilNuit.create.mockResolvedValue({
      id: 'nuit_1',
      idPatient: OWNER.idPatient,
      idAssignation: 'ASS_AGD',
      dateNuit: AUJOURDHUI,
      reponses: { contractVersion: 'agenda-sommeil-v1', ...reponses },
      canal: 'portail',
      supersedesNuitId: null,
      soumisLe: new Date(),
    });
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    const json = (await res.json()) as { ok: boolean; nuitId?: string };
    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(prisma.agendaSommeilNuit.create).toHaveBeenCalled();
  });

  it('rejette une nuit mal formée (400)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: { heureCoucher: '23:07', heureLever: '07:00', latence: 'lt15', qualite: 4 } } }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/portail/agenda-sommeil', () => {
  it('renvoie la frise et les saisies brutes, sans agrégat', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      {
        id: 'nuit_1',
        idPatient: OWNER.idPatient,
        idAssignation: 'ASS_AGD',
        dateNuit: '2026-07-14',
        reponses: { contractVersion: 'agenda-sommeil-v1', ...reponses },
        canal: 'portail',
        supersedesNuitId: null,
        soumisLe: new Date('2026-07-14T07:00:00.000Z'),
      },
    ]);
    const res = await GET(req('GET', cookieFor(), { query: '?id=ASS_AGD' }));
    const json = (await res.json()) as { ok: boolean; nuits: unknown[]; fenetre: { dateDebut: string } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.nuits).toHaveLength(1);
    expect(json.fenetre.dateDebut).toBe('2026-07-14');
    // Aucune clé d'agrégat ne doit transiter vers le patient.
    expect(JSON.stringify(json)).not.toContain('AGD_');
  });
});
