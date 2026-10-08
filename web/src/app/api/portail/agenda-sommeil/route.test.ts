import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    agendaSommeilNuit: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
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

  // Contrat v4 ([[D-271]], [[D-272]]) : un agenda garde le contrat de sa
  // PREMIÈRE nuit. Le serveur le lit lui-même — aucun client ne le choisit.
  it('un agenda sans nuit s’ouvre en v4 : « je ne sais pas » passe, la ligne porte la v4', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    prisma.agendaSommeilNuit.findFirst.mockResolvedValue(null);
    const nuitIncertaine = { ...reponses, latence: 'inconnu', reveils: { dureeTotale: 'inconnu' } };
    prisma.agendaSommeilNuit.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'nuit_v4',
      soumisLe: new Date(),
      canal: 'portail',
      supersedesNuitId: null,
      ...data,
    }));
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: nuitIncertaine } }));
    expect(res.status).toBe(201);
    const ecrit = prisma.agendaSommeilNuit.create.mock.calls[0][0].data.reponses as Record<string, unknown>;
    expect(ecrit.contractVersion).toBe('agenda-sommeil-v4');
    expect(ecrit.latence).toBe('inconnu');
    expect(ecrit.reveils).toEqual({ dureeTotale: 'inconnu' });
  });

  it('un agenda ouvert en v3 s’y termine : « je ne sais pas » y est refusé, une nuit complète y reste v3', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    prisma.agendaSommeilNuit.findFirst.mockResolvedValue({
      reponses: { contractVersion: 'agenda-sommeil-v3', ...reponses },
      soumisLe: new Date('2026-07-14T07:00:00.000Z'),
    });
    const refus = await POST(
      req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses: { ...reponses, latence: 'inconnu' } } }),
    );
    expect(refus.status).toBe(400);
    expect(prisma.agendaSommeilNuit.create).not.toHaveBeenCalled();

    prisma.agendaSommeilNuit.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'nuit_v3',
      soumisLe: new Date(),
      canal: 'portail',
      supersedesNuitId: null,
      ...data,
    }));
    const ok = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    expect(ok.status).toBe(201);
    const ecrit = prisma.agendaSommeilNuit.create.mock.calls[0][0].data.reponses as Record<string, unknown>;
    expect(ecrit.contractVersion).toBe('agenda-sommeil-v3');
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
    const json = (await res.json()) as {
      ok: boolean;
      nuits: unknown[];
      fenetre: { dateDebut: string };
      contrat: string;
    };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.nuits).toHaveLength(1);
    expect(json.fenetre.dateDebut).toBe('2026-07-14');
    // Un agenda ouvert avant la v4 s'y termine ([[D-272]] §3).
    expect(json.contrat).toBe('agenda-sommeil-v3');
    // Aucune clé d'agrégat ne doit transiter vers le patient.
    expect(JSON.stringify(json)).not.toContain('AGD_');
  });

  it('un agenda sans nuit annonce le contrat v4', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([]);
    const res = await GET(req('GET', cookieFor(), { query: '?id=ASS_AGD' }));
    const json = (await res.json()) as { contrat: string };
    expect(res.status).toBe(200);
    expect(json.contrat).toBe('agenda-sommeil-v4');
  });
});

// ── Journalisation des refus ─────────────────────────────────────────────────
// Le journal se lit par `console` (`logger.ts`) : WARN → `console.warn`,
// ERROR/SECURITY → `console.error`, le reste → `console.log`. Le CANAL fait donc
// partie de l'assertion. Jumeau de `describe('journalisation …')` côté
// agenda-alimentaire : aucune saisie du patient ne doit atteindre le journal.
describe('journalisation de /api/portail/agenda-sommeil', () => {
  type Ligne = {
    level: string;
    event: string;
    domain: string;
    statusCode?: number;
    metadata?: { motif?: string; detail?: string };
    error?: { type?: string; message?: string };
  };
  const SAISIE_SECRETE = 'SAISIE_SECRETE_DU_PATIENT';

  function espionner(canal: 'warn' | 'error' | 'log') {
    const espion = vi.spyOn(console, canal).mockImplementation(() => {});
    return {
      lignes: () => espion.mock.calls.map((appel) => String(appel[0])),
      relacher: () => espion.mockRestore(),
    };
  }

  it('un refus de validation journalise NUIT_REJETEE, sans `reponses` ni valeur saisie', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const warn = espionner('warn');
    const res = await POST(
      req('POST', cookieFor(), {
        body: {
          idAssignation: 'ASS_AGD',
          reponses: { ...reponses, heureCoucher: '23:07', commentaire: SAISIE_SECRETE },
        },
      }),
    );
    const lignes = warn.lignes();
    warn.relacher();

    expect(res.status).toBe(400);
    expect(lignes).toHaveLength(1);
    const ev = JSON.parse(lignes[0]) as Ligne;
    expect(ev.level).toBe('WARN');
    expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.NUIT_REJETEE');
    expect(ev.statusCode).toBe(400);
    expect(ev.metadata?.motif).toBe('invalid');
    // Le motif nomme le champ fautif (par son libellé), jamais sa valeur.
    expect(ev.metadata?.detail).toContain('Heure invalide pour');
    // Ni la clé `reponses`, ni une valeur saisie, ni l'identifiant d'assignation.
    expect(lignes[0]).not.toContain('"reponses"');
    expect(lignes[0]).not.toContain('23:07');
    expect(lignes[0]).not.toContain(SAISIE_SECRETE);
    expect(lignes[0]).not.toContain('ASS_AGD');
  });

  it.each([
    ['agenda clôturé', { statutReponses: 'verrouille' }, {}, 409, 'locked'],
    ['période de recueil terminée', { dateLimite: '2026-07-01' }, {}, 410, 'expired'],
    ['date hors fenêtre', {}, { dateNuit: '2026-07-10' }, 409, 'date_hors_fenetre'],
  ])('le refus « %s » journalise NUIT_REJETEE avec son motif', async (_libelle, assignation, extra, statut, motif) => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, ...assignation });
    mockOwner();
    const warn = espionner('warn');
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses, ...extra } }));
    const lignes = warn.lignes();
    warn.relacher();

    expect(res.status).toBe(statut);
    expect(((await res.json()) as { reason: string }).reason).toBe(motif);
    expect(lignes).toHaveLength(1);
    const ev = JSON.parse(lignes[0]) as Ligne;
    expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.NUIT_REJETEE');
    expect(ev.statusCode).toBe(statut);
    expect(ev.metadata?.motif).toBe(motif);
    expect(lignes[0]).not.toContain('"reponses"');
    expect(lignes[0]).not.toContain('ASS_AGD');
  });

  it('un refus d’accès journalise FORBIDDEN en SECURITY, sans identifiant', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    const erreur = espionner('error');
    const res = await POST(
      req('POST', cookieFor('PAT_INTRUS'), { body: { idAssignation: 'ASS_AGD', reponses } }),
    );
    const lignes = erreur.lignes();
    erreur.relacher();

    expect(res.status).toBe(404);
    expect(lignes).toHaveLength(1);
    const ev = JSON.parse(lignes[0]) as Ligne;
    expect(ev.level).toBe('SECURITY');
    expect(ev.domain).toBe('SECURITY');
    expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.FORBIDDEN');
    expect(ev.metadata?.motif).toBe('not_found');
    expect(lignes[0]).not.toContain('ASS_AGD');
    expect(lignes[0]).not.toContain('PAT_INTRUS');
  });

  it('une assignation annulée (410) est journalisée FORBIDDEN, sur le GET comme sur le POST', async () => {
    mockOwner();
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, statut: 'Annulée' });
    const erreur = espionner('error');
    const post = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    const get = await GET(req('GET', cookieFor(), { query: '?id=ASS_AGD' }));
    const lignes = erreur.lignes();
    erreur.relacher();

    expect(post.status).toBe(410);
    expect(get.status).toBe(410);
    expect(lignes).toHaveLength(2);
    for (const l of lignes) {
      const ev = JSON.parse(l) as Ligne;
      expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.FORBIDDEN');
      expect(ev.metadata?.motif).toBe('annulee');
    }
  });

  it('un corps JSON illisible est tracé en DEBUG (FORME_REJETEE), pas en WARN', async () => {
    const warn = espionner('warn');
    const log = espionner('log');
    const res = await POST(
      new Request('http://localhost/api/portail/agenda-sommeil', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{ ceci n’est pas du JSON',
      }),
    );
    const lignesWarn = warn.lignes();
    const lignesLog = log.lignes();
    warn.relacher();
    log.relacher();

    expect(res.status).toBe(400);
    expect(lignesWarn).toHaveLength(0);
    expect(lignesLog).toHaveLength(1);
    const ev = JSON.parse(lignesLog[0]) as Ligne;
    expect(ev.level).toBe('DEBUG');
    expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.FORME_REJETEE');
  });

  it('l’enregistrement d’une nuit journalise NUIT_ENREGISTREE sans la saisie', async () => {
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
    const log = espionner('log');
    const res = await POST(
      req('POST', cookieFor(), {
        body: { idAssignation: 'ASS_AGD', reponses: { ...reponses, commentaire: SAISIE_SECRETE } },
      }),
    );
    const lignes = log.lignes();
    log.relacher();

    expect(res.status).toBe(201);
    expect(lignes).toHaveLength(1);
    const ev = JSON.parse(lignes[0]) as Ligne;
    expect(ev.level).toBe('INFO');
    expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.NUIT_ENREGISTREE');
    expect(ev.metadata).toBeUndefined();
    expect(lignes[0]).not.toContain(SAISIE_SECRETE);
    expect(lignes[0]).not.toContain('nuit_1');
  });

  it('une panne à l’écriture journalise EXCEPTION SANS citer le message de l’erreur', async () => {
    prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
    mockOwner();
    // Un `PrismaClientValidationError` recopie l'invocation fautive, `reponses`
    // comprise : le message ne doit jamais atteindre le journal.
    prisma.agendaSommeilNuit.create.mockRejectedValue(
      new Error(`Invalid prisma.create() invocation: data.reponses ${SAISIE_SECRETE}`),
    );
    const erreur = espionner('error');
    const res = await POST(req('POST', cookieFor(), { body: { idAssignation: 'ASS_AGD', reponses } }));
    const lignes = erreur.lignes();
    erreur.relacher();

    expect(res.status).toBe(500);
    expect(((await res.json()) as { reason: string }).reason).toBe('exception');
    expect(lignes).toHaveLength(1);
    const ev = JSON.parse(lignes[0]) as Ligne;
    expect(ev.event).toBe('PORTAIL_PATIENT.AGENDA_SOMMEIL.EXCEPTION');
    expect(ev.error?.message).toContain('non journalisé');
    expect(lignes[0]).not.toContain(SAISIE_SECRETE);
    expect(lignes[0]).not.toContain('data.reponses');
  });
});
