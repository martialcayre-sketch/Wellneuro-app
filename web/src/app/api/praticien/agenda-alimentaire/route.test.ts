import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assignation: { findMany: vi.fn() },
    agendaAlimentaireJour: { findMany: vi.fn() },
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
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';

const REPONSES = {
  contractVersion: 'agenda-alimentaire-v1',
  prises: [
    { heure: '07:30', nature: 'repas' },
    { heure: '12:30', nature: 'repas' },
    { heure: '19:30', nature: 'repas' },
  ],
  premierePriseProteines: true,
  legumesDeuxPrises: true,
  fruitsOuOleagineux: false,
  ultraTransformes: false,
};

function getReq(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/agenda-alimentaire?${query}`);
}

function ligne(over: Record<string, unknown> = {}) {
  return {
    id: 'JOUR_1',
    idPatient: 'PAT_1',
    idAssignation: 'ASS_ALI',
    dateJour: '2026-08-04',
    reponses: REPONSES,
    canal: 'portail',
    supersedesJourId: null,
    soumisLe: new Date('2026-08-04T09:15:00.000Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-05T10:00:00.000Z'));
});
afterEach(() => vi.useRealTimers());

describe('GET /api/praticien/agenda-alimentaire', () => {
  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it('refuse un idPatient absent (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await GET(getReq('idPatient='));
    expect(res.status).toBe(400);
  });

  it('refuse un idPatient malformé (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await GET(getReq('idPatient=' + encodeURIComponent('../../etc')));
    expect(res.status).toBe(400);
  });

  it('refuse un patient hors périmètre (403) SANS lire aucune donnée Prisma', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('non_accessible');
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    // La garde d'appartenance doit précéder la PREMIÈRE lecture Prisma —
    // c'est elle qui journalise l'accès (G-TRUST-04).
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('rend episodes: [] sur un patient sans assignation d’agenda', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([]);
    const res = await GET(getReq());
    const json = (await res.json()) as { ok: boolean; episodes: unknown[] };
    expect(res.status).toBe(200);
    expect(json.episodes).toEqual([]);
  });

  it('remonte le compte de journées, illisibles séparément, sans gonfler nbRenseignees — et ancre la fenêtre sur la quarantaine (D-023)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_ALI',
        titre: 'Agenda alimentaire — 21 jours',
        statutReponses: 'non_rempli',
        dateAssignation: new Date('2026-08-01T09:00:00.000Z'),
      },
    ]);
    // La ligne en quarantaine porte la date la PLUS ANCIENNE : c'est le cas
    // qui mord sur `datesIllisibles` (D-023) — si l'option disparaît de
    // `calculerFenetreAli`, l'ancre glisse vers le 2026-08-01 et ce test
    // tombe. Avec la date relue la plus ancienne en tête (comme avant ce
    // correctif), l'ancre vaudrait la même chose que l'option soit passée ou
    // non, et le test resterait vert pour une mauvaise raison.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      // Ligne en quarantaine : version de contrat inconnue, JSONB illisible.
      ligne({
        id: 'JOUR_QUARANTAINE',
        dateJour: '2026-07-31',
        reponses: { ...REPONSES, contractVersion: 'version-inconnue' },
        soumisLe: new Date('2026-07-31T09:00:00.000Z'),
      }),
      ligne({ id: 'JOUR_1', dateJour: '2026-08-01' }),
    ]);
    const res = await GET(getReq());
    const json = (await res.json()) as {
      ok: boolean;
      episodes: { jours: unknown[]; illisibles: number; fenetre: { nbRenseignees: number; dateDebut: string | null } }[];
    };
    expect(res.status).toBe(200);
    expect(json.episodes).toHaveLength(1);
    expect(json.episodes[0].illisibles).toBe(1);
    // Une seule journée relue : la ligne en quarantaine ne compte pas comme
    // « renseignée », faute de quoi un lot tronqué pourrait franchir les
    // seuils d'exploitabilité sur du vide.
    expect(json.episodes[0].jours).toHaveLength(1);
    expect(json.episodes[0].fenetre.nbRenseignees).toBe(1);
    // L'ancre sort de l'UNION (dates ∪ datesIllisibles), pas des seules
    // lignes relues — sinon la journée la plus ancienne mise en quarantaine
    // ferait glisser la fenêtre de 21 jours vers l'avant (D-023).
    expect(json.episodes[0].fenetre.dateDebut).toBe('2026-07-31');
  });

  it('rend illisibles: 0 même quand aucune ligne n’est en quarantaine', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_ALI',
        titre: 'Agenda alimentaire — 21 jours',
        statutReponses: 'non_rempli',
        dateAssignation: new Date('2026-08-01T09:00:00.000Z'),
      },
    ]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligne()]);
    const res = await GET(getReq());
    const json = (await res.json()) as { episodes: { illisibles: number }[] };
    expect(json.episodes[0].illisibles).toBe(0);
  });

  it(
    // Exception assumée (arbitrage LOT-05, distinct de D-025) : la lecture
    // praticien n'est PAS gardée par le drapeau, contrairement à la
    // bibliothèque, au hub patient et à l'écriture. Le drapeau éteint ne doit
    // donc PAS fermer cette route.
    //
    // Fixture PEUPLÉE, délibérément — pas `findMany.mockResolvedValue([])`.
    // Un `[]` laisse passer une implémentation qui, drapeau éteint, rendrait
    // `{ ok: true, episodes: [] }` sans avoir rien lu : la forme la plus
    // naturelle de « fermer la surface sans casser le client », exactement le
    // défaut que ce test doit attraper. Seule une assertion sur le CONTENU
    // (des journées remontent) le fait mordre.
    'reste accessible et remonte les journées drapeau WN_AGENDA_ALI éteint (exception assumée à D-025)',
    async () => {
      const avant = process.env.WN_AGENDA_ALI;
      delete process.env.WN_AGENDA_ALI;
      try {
        getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
        verifierAppartenancePatient.mockResolvedValue('accessible');
        prisma.assignation.findMany.mockResolvedValue([
          {
            idAssignation: 'ASS_ALI',
            titre: 'Agenda alimentaire — 21 jours',
            statutReponses: 'non_rempli',
            dateAssignation: new Date('2026-08-01T09:00:00.000Z'),
          },
        ]);
        prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligne()]);
        const res = await GET(getReq());
        const json = (await res.json()) as {
          ok: boolean;
          episodes: { jours: unknown[]; fenetre: { nbRenseignees: number } }[];
        };
        expect(res.status).toBe(200);
        expect(json.episodes[0].jours.length).toBe(1);
        expect(json.episodes[0].fenetre.nbRenseignees).toBe(1);
      } finally {
        if (avant === undefined) delete process.env.WN_AGENDA_ALI;
        else process.env.WN_AGENDA_ALI = avant;
      }
    },
  );

  it('ne porte aucune clé de gramme, kcal, score, indice ou quantité — y compris dans le bloc agrégats', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_ALI',
        titre: 'Agenda alimentaire — 21 jours',
        statutReponses: 'non_rempli',
        dateAssignation: new Date('2026-08-01T09:00:00.000Z'),
      },
    ]);
    // 8 journées, PAS 1 : sous MIN_JOURS_AGREGATS (7), `calculerAgregatsAli`
    // rend `null` et le bloc agrégats (jeûne, fenêtre, écarts-types…) n'est
    // jamais sérialisé — la moitié du contrat serait alors absente de ce que
    // ce test scanne, et une clé interdite glissée dans les agrégats
    // passerait inaperçue.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) =>
        ligne({
          id: `JOUR_${i}`,
          dateJour: `2026-08-0${i + 1}`,
          soumisLe: new Date(`2026-08-0${i + 1}T09:00:00.000Z`),
        }),
      ),
    );
    const res = await GET(getReq());
    const json = (await res.json()) as { episodes: { agregats: unknown }[] };
    // Garde que la fixture mord réellement sur le bloc agrégats.
    expect(json.episodes[0].agregats).not.toBeNull();
    const texte = JSON.stringify(json).toLowerCase();
    for (const motif of ['gramme', 'kcal', 'score', 'indice', 'quantite', 'quantité']) {
      expect(texte).not.toContain(motif);
    }
  });

  it('refuse un idAssignation présent mais hors motif (400), sans le confondre avec une absence', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    const res = await GET(getReq('idPatient=PAT_1&idAssignation=' + encodeURIComponent('../../etc')));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { reason: string };
    expect(json.reason).toBe('invalid_payload');
    // Un paramètre INVALIDE ne doit jamais se comporter comme un paramètre
    // ABSENT (repli silencieux vers « tous les épisodes du patient ») :
    // aucune lecture Prisma ne doit avoir lieu.
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('idAssignation absent : aucun filtre — le where ne porte pas la clé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([]);
    await GET(getReq('idPatient=PAT_1'));
    const appel = prisma.assignation.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect('idAssignation' in appel.where).toBe(false);
  });

  it('filtre les assignations sur idQuestionnaire = Q_ALI_09 : un agenda du sommeil ne remonte pas dans cette route', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.assignation.findMany.mockResolvedValue([]);
    await GET(getReq());
    const appel = prisma.assignation.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(appel.where.idQuestionnaire).toBe(AGENDA_ALI_ID);
  });

  it("priorise le statut 'annulee' sur 'en_cours' pour une assignation annulée par le praticien", async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    // `assignations/annulation` accepte l'annulation précisément quand
    // statutReponses === 'non_rempli' — c'est-à-dire à tout moment de la vie
    // d'un agenda alimentaire, jamais après. L'assignation reste LISTÉE
    // (append-only), mais son statut affiché ne doit jamais rester
    // 'en_cours'.
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_ALI',
        titre: 'Agenda alimentaire — 21 jours',
        statut: 'Annulée',
        statutReponses: 'non_rempli',
        dateAssignation: new Date('2026-08-01T09:00:00.000Z'),
      },
    ]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligne()]);
    const res = await GET(getReq());
    const json = (await res.json()) as { episodes: { statut: string }[] };
    expect(json.episodes[0].statut).toBe('annulee');
  });
});
