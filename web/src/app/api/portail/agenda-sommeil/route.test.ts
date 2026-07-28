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

// Nuit v2 : la durée d'éveil nocturne est obligatoire en écriture. `aucun` est
// une réponse (« nuit continue »), pas un défaut inféré.
const reponses = {
  heureCoucher: '23:00',
  heureLever: '07:00',
  latence: 'lt15',
  qualite: 4,
  reveils: { dureeTotale: 'aucun' },
  aideSommeil: 'aucune',
  extinctionImmediate: true,
  leverImmediat: true,
};

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
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: { ...reponses, heureCoucher: '23:07' } } }));
    expect(res.status).toBe(400);
  });

  it('refuse une écriture sans éveil nocturne (400) — jamais un zéro inféré', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const { reveils: _sansReveils, ...sansEveil } = reponses;
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: sansEveil } }));
    expect(res.status).toBe(400);
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();
  });

  it('refuse une écriture sans aide au sommeil ni mode de lever (400)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    for (const champ of ['aideSommeil', 'leverImmediat'] as const) {
      const { [champ]: _absent, ...incomplet } = reponses;
      const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: incomplet } }));
      expect(res.status).toBe(400);
    }
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();
  });

  it('refuse une classe d’éveil héritée en écriture, tout en la lisant en base (400)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const res = await POST(
      req('POST', cookieFor(), {
        body: { idAssignation: 'ASS_AGD', reponses: { ...reponses, reveils: { dureeTotale: 'e15_45' } } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('refuse un réveil final incohérent avec le mode de lever (400)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    // Levé dès le réveil ET une heure de réveil : contradiction.
    const contradictoire = { ...reponses, heureReveilFinal: '05:00' };
    expect(
      (await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: contradictoire } }))).status,
    ).toBe(400);
    // Resté au lit, mais aucune heure de réveil : incomplet.
    const sansHeure = { ...reponses, leverImmediat: false };
    expect(
      (await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: sansHeure } }))).status,
    ).toBe(400);
    // Réveil APRÈS la sortie du lit : produirait un éveil au lit négatif.
    const apresLever = { ...reponses, leverImmediat: false, heureReveilFinal: '08:00' };
    expect(
      (await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: apresLever } }))).status,
    ).toBe(400);
  });

  it('refuse « rien de particulier » coché avec un autre facteur (400)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const res = await POST(
      req('POST', cookieFor(), {
        body: {
          idAssignation: 'ASS_AGD',
          reponses: { ...reponses, facteurs: { rienDeParticulier: true, alcool: true } },
        },
      }),
    );
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
