import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, journaliserAccesDossier } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    agendaSommeilNuit: { findMany: vi.fn() },
  },
  journaliserAccesDossier: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
// `@/lib/praticien/appartenance` N'EST PAS mocké : le scoping praticien est
// l'invariant central de cette route, le test doit exercer la clause réelle
// (patron météo-adhésion — un mock ferait passer une route sans filtre).
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier }));

import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // 10 h UTC = 12 h à Paris : dateJourParis() rend 2026-07-30.
  vi.setSystemTime(new Date('2026-07-30T10:00:00.000Z'));
});
afterEach(() => vi.useRealTimers());

const session = { user: { email: 'praticien@wellneuro.fr' } };

describe('GET /api/praticien/agenda-sommeil/suivi', () => {
  it('refuse sans session (401) sans lire la base', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('sans patient actif : liste vide, aucune requête d’assignations', async () => {
    getServerSession.mockResolvedValue(session);
    prisma.patient.findMany.mockResolvedValue([]);
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ ok: true, lignes: [], relanceActive: false });
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('sert l’état du drapeau : sans lui, le bouton promettrait un envoi refusé', async () => {
    getServerSession.mockResolvedValue(session);
    prisma.patient.findMany.mockResolvedValue([]);
    expect((await (await GET()).json()).relanceActive).toBe(false);
    process.env.WN_AGENDA_RELANCE = 'true';
    expect((await (await GET()).json()).relanceActive).toBe(true);
    delete process.env.WN_AGENDA_RELANCE;
  });

  it('borne la lecture des patients au praticien en session (clause réelle, non mockée)', async () => {
    getServerSession.mockResolvedValue(session);
    prisma.patient.findMany.mockResolvedValue([]);
    await GET();
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.actif).toBe(true);
    // Mêmes gardes que la relance : pas de bouton sur un dossier qu'elle
    // refuserait (accès révoqué, suivi clôturé).
    expect(where.accessTokenRevoked).toBe(false);
    expect(where.suiviClotureLe).toBeNull();
    expect(where.praticienEmail).toEqual({
      equals: 'praticien@wellneuro.fr',
      mode: 'insensitive',
    });
  });

  it('résume les agendas ouverts, dédupliqué par date, sans jamais lire les réponses', async () => {
    getServerSession.mockResolvedValue(session);
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' },
      { idPatient: 'PAT_2', prenom: 'Michel', nom: 'Dogné' },
    ]);
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_A',
        idPatient: 'PAT_1',
        titre: 'Agenda du sommeil — 21 nuits',
        dateAssignation: new Date('2026-07-29T09:00:00.000Z'),
      },
      {
        idAssignation: 'ASS_B',
        idPatient: 'PAT_2',
        titre: 'Agenda du sommeil — 21 nuits',
        dateAssignation: new Date('2026-07-26T09:00:00.000Z'),
      },
    ]);
    // ASS_A : 3 lignes pour 2 nuits distinctes (correction chaînée, cas réel).
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      { idAssignation: 'ASS_A', dateNuit: '2026-07-29', soumisLe: new Date('2026-07-29T07:00:00Z') },
      { idAssignation: 'ASS_A', dateNuit: '2026-07-29', soumisLe: new Date('2026-07-29T08:00:00Z') },
      { idAssignation: 'ASS_A', dateNuit: '2026-07-30', soumisLe: new Date('2026-07-30T07:00:00Z') },
    ]);

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.lignes).toHaveLength(2);

    const a = json.lignes.find((l: { idAssignation: string }) => l.idAssignation === 'ASS_A');
    expect(a.etat).toBe('a_jour');
    expect(a.nbRenseignees).toBe(2);
    expect(a.patient).toBe('Sophie Nicola');

    const b = json.lignes.find((l: { idAssignation: string }) => l.idAssignation === 'ASS_B');
    expect(b.etat).toBe('jamais_commence');
    expect(b.joursDepuisAssignation).toBe(4);

    // La requête de nuits ne sélectionne jamais le JSONB des réponses.
    const selectNuits = prisma.agendaSommeilNuit.findMany.mock.calls[0][0].select;
    expect(selectNuits).not.toHaveProperty('reponses');
    // Et le filtre d'assignations est une liste BLANCHE : seul un recueil en
    // cours (`non_rempli`) entre — `deverrouille`/`modification_demandee`
    // désignent un agenda déjà clôturé rouvert, l'inclure inviterait à une
    // seconde clôture.
    const whereAss = prisma.assignation.findMany.mock.calls[0][0].where;
    expect(whereAss.statut).toEqual({ not: 'Annulée' });
    expect(whereAss.statutReponses).toBe('non_rempli');
  });

  // Garde RÉSIDUELLE : elle n'attraperait qu'un import direct de
  // `journaliserAccesDossier` ajouté plus tard dans route.ts — le chemin
  // indirect (via `verifierAppartenancePatient` + option `acces`) est déjà
  // exclu par construction, la route ne l'appelle pas.
  it('ne journalise JAMAIS d’accès dossier : liste de cabinet, pas ouverture de dossier', async () => {
    getServerSession.mockResolvedValue(session);
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.assignation.findMany.mockResolvedValue([]);
    await GET();
    expect(journaliserAccesDossier).not.toHaveBeenCalled();
  });

  it('rend 500 indisponible sur panne de base, sans fuiter le détail', async () => {
    getServerSession.mockResolvedValue(session);
    prisma.patient.findMany.mockRejectedValue(new Error('panne'));
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.unavailable).toBe(true);
    expect(JSON.stringify(json)).not.toContain('panne');
  });
});
