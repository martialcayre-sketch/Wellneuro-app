import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    assignation: { findMany: vi.fn() },
    questionnaireReponse: { aggregate: vi.fn() },
    // Signaux du parcours synchronisé (SP-CONV LOT-04) : consultation courante
    // + booklet envoyé. Par défaut : aucun des deux — l'état le plus prudent.
    consultation: { findFirst: vi.fn() },
    bookletEnvoi: { findFirst: vi.fn() },
    agendaSommeilNuit: { findMany: vi.fn() },
    agendaAlimentaireJour: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { security: vi.fn(), error: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  prenom: 'Sophie',
  nom: 'Nicola',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessToken: 'TOK_NOUVEAU',
  accessTokenRevoked: false,
};

function request(cookie: string): Request {
  return new Request('http://localhost/api/portail/assignations', {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookie)}` },
  });
}

describe('GET /api/portail/assignations — liaison session au compte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.aggregate.mockResolvedValue({ _max: { dateReponse: null } });
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
  });

  it('expose les signaux du parcours (SP-CONV LOT-04) — statuts seuls, jamais de contenu', async () => {
    prisma.consultation.findFirst.mockResolvedValue({ idConsultation: 'C1', statut: 'en_cours' });
    prisma.bookletEnvoi.findFirst.mockResolvedValue({ id: 'B1' });
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });

    const corps = await (await GET(request(cookie))).json();
    expect(corps.parcours).toEqual({ consultationStatut: 'en_cours', bookletEnvoye: true });
  });

  // IDP2 LOT-02 : la révocation, et non plus la rotation du jeton, est ce qui
  // coupe une session ouverte.
  it('refuse un cookie émis avant une révocation', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...patient,
      sessionsInvalidesAvant: new Date(Date.now() + 60_000),
    });
    const cookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email,
    });

    expect((await GET(request(cookie))).status).toBe(401);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('survit à une réémission du jeton permanent', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, accessToken: 'TOK_REEMIS' });
    const currentCookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email,
    });

    const response = await GET(request(currentCookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      patient: { idPatient: patient.idPatient, prenom: patient.prenom, nom: patient.nom },
      assignations: [],
      derniereReponseLe: null,
    });
  });

  it('expose la date de dernière réponse, sans aucune donnée de score', async () => {
    // Horloge de la reprise (SP-SPI / LOT-01) : seule la position dans le
    // temps est racontée au patient — jamais le score de cette réponse.
    prisma.questionnaireReponse.aggregate.mockResolvedValue({
      _max: { dateReponse: new Date('2025-07-21T12:00:00.000Z') },
    });
    const cookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email
    });

    const corps = await (await GET(request(cookie))).json();
    expect(corps.derniereReponseLe).toBe('2025-07-21T12:00:00.000Z');
    expect(JSON.stringify(corps)).not.toMatch(/score|interpretation/i);
  });

  // Un instrument suspendu parce qu'il NE MESURE PAS ce qu'il annonce ne doit
  // plus être proposé, même si son assignation est partie avant la suspension :
  // faire remplir 20 items pour un résultat retiré à la lecture ferait perdre
  // au patient un temps qu'on sait d'avance inutile.
  it('n’affiche plus un questionnaire suspendu encore à remplir', async () => {
    prisma.assignation.findMany.mockResolvedValue([
      { idAssignation: 'ASS_1', idQuestionnaire: 'Q_FIB_03', titre: 'ELFE', statut: 'Envoyé', dateAssignation: new Date('2026-07-01'), dateLimite: null, idPatient: patient.idPatient, emailPatient: patient.email, statutReponses: null, createdAt: new Date('2026-07-01') },
      { idAssignation: 'ASS_2', idQuestionnaire: 'Q_SOM_06', titre: 'Pichot', statut: 'Envoyé', dateAssignation: new Date('2026-07-02'), dateLimite: null, idPatient: patient.idPatient, emailPatient: patient.email, statutReponses: null, createdAt: new Date('2026-07-02') },
    ]);
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
    const corps = await (await GET(request(cookie))).json();
    const ids = corps.assignations.map((a: { idAssignation: string }) => a.idAssignation);
    expect(ids).toContain('ASS_2');
    expect(ids).not.toContain('ASS_1');
  });

  it('conserve une passation suspendue DÉJÀ complétée — elle n’est plus à remplir', async () => {
    // Contrôle négatif du filtre : sans lui, on effacerait de l'historique du
    // patient un questionnaire qu'il a bel et bien rempli.
    prisma.assignation.findMany.mockResolvedValue([
      { idAssignation: 'ASS_1', idQuestionnaire: 'Q_FIB_03', titre: 'ELFE', statut: 'Complété', dateAssignation: new Date('2026-07-01'), dateLimite: null, idPatient: patient.idPatient, emailPatient: patient.email, statutReponses: 'verrouille', createdAt: new Date('2026-07-01') },
    ]);
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
    const corps = await (await GET(request(cookie))).json();
    expect(corps.assignations.map((a: { idAssignation: string }) => a.idAssignation)).toContain('ASS_1');
  });
});


// L'agenda du sommeil au portail : le hub reçoit le compte de nuits et la
// position dans la fenêtre, JAMAIS un agrégat ni un score.
describe('GET /api/portail/assignations — agendas du sommeil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T10:00:00.000Z'));
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.questionnaireReponse.aggregate.mockResolvedValue({ _max: { dateReponse: null } });
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
    prisma.assignation.findMany.mockResolvedValue([
      {
        idAssignation: 'ASS_AGD',
        idPatient: 'PAT_TEST',
        idQuestionnaire: 'Q_SOM_09',
        titre: 'Agenda du sommeil — 21 nuits',
        statut: 'En attente',
        statutReponses: 'non_rempli',
        dateAssignation: new Date('2026-07-29T09:00:00.000Z'),
        dateLimite: null,
        notes: null,
        createdAt: new Date('2026-07-29T09:00:00.000Z'),
      },
    ]);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      { idAssignation: 'ASS_AGD', dateNuit: '2026-07-29' },
      { idAssignation: 'ASS_AGD', dateNuit: '2026-07-29' },
    ]);
  });
  afterEach(() => vi.useRealTimers());

  it('sert le compte de nuits distinctes et l’état du jour, sans aucun agrégat', async () => {
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
    const res = await GET(request(cookie));
    const json = await res.json();

    expect(json.agendas).toEqual([
      {
        idAssignation: 'ASS_AGD',
        nbRenseignees: 1,
        jourCourant: 2,
        nuitDuJourNotee: false,
        cloturablePatient: false,
      },
    ]);

    // Assertion NÉGATIVE : aucune clé d'agrégat ni de score ne doit sortir.
    const brut = JSON.stringify(json);
    for (const interdit of [
      'AGD_TST_MOY',
      'AGD_EFF_MOY',
      'AGD_LAT_MED',
      'scorePrincipal',
      'interpretation',
      'reponses',
    ]) {
      expect(brut).not.toContain(interdit);
    }
    // Et la requête ne demande jamais le JSONB des réponses.
    const select = prisma.agendaSommeilNuit.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('reponses');
  });

  it('n’interroge pas les nuits quand aucun agenda n’est ouvert', async () => {
    prisma.assignation.findMany.mockResolvedValue([]);
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
    const res = await GET(request(cookie));
    expect((await res.json()).agendas).toEqual([]);
    expect(prisma.agendaSommeilNuit.findMany).not.toHaveBeenCalled();
  });
});

/**
 * L'agenda ALIMENTAIRE au portail (`Q_ALI_09`).
 *
 * ── POURQUOI LA ROUTE EST IMPORTÉE DYNAMIQUEMENT ICI ────────────────────────
 * `IDS_SUSPENDUS` est un `const` de module calculé à l'import de
 * `questionnaires-catalog`, à partir de `isAgendaAlimentaireEnabled()`. La
 * position de `WN_AGENDA_ALI` au moment du PREMIER import décide donc du
 * comportement de toute la suite : un `import` en tête figerait le drapeau sur
 * la valeur ambiante, et `npm run check` tourne DANS LES DEUX POSITIONS. Même
 * montage que `api/portail/agenda-alimentaire/route.test.ts` et
 * `lib/agendaAlimentaireDrapeau.guard.test.ts`.
 *
 * Le paramètre n'a PAS de valeur par défaut : avec un défaut `'true'`, l'appel
 * `chargerRoute(undefined)` — la position « drapeau absent », celle de Vercel
 * aujourd'hui — retomberait sur le défaut, JavaScript ne distinguant pas
 * « argument omis » de « argument valant `undefined` ».
 */
async function chargerRoute(drapeau: string | undefined) {
  vi.resetModules();
  vi.stubEnv('WN_AGENDA_ALI', drapeau as string);
  const mod = await import('./route');
  return mod.GET;
}

describe('GET /api/portail/assignations — agendas alimentaires', () => {
  const ASSIGNATION_ALI = {
    idAssignation: 'ASS_AGD_ALI',
    idPatient: 'PAT_TEST',
    idQuestionnaire: 'Q_ALI_09',
    titre: 'Agenda alimentaire — 21 jours',
    statut: 'En attente',
    statutReponses: 'non_rempli',
    dateAssignation: new Date('2026-07-29T09:00:00.000Z'),
    dateLimite: null,
    notes: null,
    createdAt: new Date('2026-07-29T09:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T10:00:00.000Z'));
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.questionnaireReponse.aggregate.mockResolvedValue({ _max: { dateReponse: null } });
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([]);
    prisma.assignation.findMany.mockResolvedValue([ASSIGNATION_ALI]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      // Deux lignes de la MÊME date : le modèle est append-only, une correction
      // porte la date de la ligne qu'elle supplante. La fenêtre déduplique.
      { idAssignation: 'ASS_AGD_ALI', dateJour: '2026-07-29' },
      { idAssignation: 'ASS_AGD_ALI', dateJour: '2026-07-29' },
    ]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const cookie = () => signPatientSession({ idPatient: patient.idPatient, email: patient.email });

  it('sert le compte de journées distinctes et l’état du jour, sans aucun agrégat', async () => {
    const GET_ = await chargerRoute('true');
    const json = await (await GET_(request(cookie()))).json();

    expect(json.agendasAlimentaires).toEqual([
      {
        idAssignation: 'ASS_AGD_ALI',
        nbRenseignees: 1,
        jourCourant: 2,
        journeeDuJourEnregistree: false,
        cloturablePatient: false,
      },
    ]);

    // Assertion NÉGATIVE : aucune grandeur de l'étage d'agrégation ne sort.
    const brut = JSON.stringify(json);
    for (const interdit of [
      'jeune',
      'jeûne',
      'fenetreAlimentaire',
      'indice',
      'scorePrincipal',
      'interpretation',
      'reponses',
      'prises',
    ]) {
      expect(brut).not.toContain(interdit);
    }
    // Et la requête ne demande JAMAIS le JSONB des réponses.
    const args = prisma.agendaAlimentaireJour.findMany.mock.calls[0][0];
    expect(args.select).toEqual({ idAssignation: true, dateJour: true });
    expect(args.select).not.toHaveProperty('reponses');
    // Garde patient en défense de profondeur, en plus du filtre sur les ids.
    expect(args.where).toEqual({
      idAssignation: { in: ['ASS_AGD_ALI'] },
      idPatient: 'PAT_TEST',
    });
  });

  it('journée du jour présente en base : `journeeDuJourEnregistree` vrai', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      { idAssignation: 'ASS_AGD_ALI', dateJour: '2026-07-29' },
      { idAssignation: 'ASS_AGD_ALI', dateJour: '2026-07-30' },
    ]);
    const GET_ = await chargerRoute('true');
    const json = await (await GET_(request(cookie()))).json();
    expect(json.agendasAlimentaires[0]).toMatchObject({
      nbRenseignees: 2,
      jourCourant: 2,
      journeeDuJourEnregistree: true,
    });
  });

  // Le verrou de bout en bout du lot : tant que `WN_AGENDA_ALI` est éteint,
  // `Q_ALI_09` est suspendu au catalogue et disparaît du hub — assignation ET
  // bloc agenda. Sans ce filtre, un pack parti avant l'extinction rouvrirait
  // l'instrument par la porte du hub.
  it('drapeau ABSENT : ni assignation ni agenda, et la table n’est pas interrogée', async () => {
    const GET_ = await chargerRoute(undefined);
    const json = await (await GET_(request(cookie()))).json();
    expect(json.agendasAlimentaires).toEqual([]);
    expect(
      json.assignations.map((a: { idAssignation: string }) => a.idAssignation),
    ).not.toContain('ASS_AGD_ALI');
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['verrouillé (transmis)', { statutReponses: 'verrouille' }],
    ['annulé', { statut: 'Annulée' }],
  ])('agenda %s : exclu du bloc, aucune requête sur les journées', async (_libelle, over) => {
    prisma.assignation.findMany.mockResolvedValue([{ ...ASSIGNATION_ALI, ...over }]);
    const GET_ = await chargerRoute('true');
    const json = await (await GET_(request(cookie()))).json();
    expect(json.agendasAlimentaires).toEqual([]);
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('agenda sans aucune journée : compte à zéro, fenêtre non ancrée', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
    const GET_ = await chargerRoute('true');
    const json = await (await GET_(request(cookie()))).json();
    expect(json.agendasAlimentaires).toEqual([
      {
        idAssignation: 'ASS_AGD_ALI',
        nbRenseignees: 0,
        jourCourant: null,
        journeeDuJourEnregistree: false,
        cloturablePatient: false,
      },
    ]);
  });

  // Deux tableaux distincts, pas un champ discriminant : la branche sommeil ne
  // doit rien voir passer de l'alimentaire, et réciproquement.
  it('les deux agendas coexistent sans se mélanger', async () => {
    prisma.assignation.findMany.mockResolvedValue([
      ASSIGNATION_ALI,
      {
        ...ASSIGNATION_ALI,
        idAssignation: 'ASS_AGD_SOM',
        idQuestionnaire: 'Q_SOM_09',
        titre: 'Agenda du sommeil — 21 nuits',
      },
    ]);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      { idAssignation: 'ASS_AGD_SOM', dateNuit: '2026-07-30' },
    ]);
    const GET_ = await chargerRoute('true');
    const json = await (await GET_(request(cookie()))).json();

    expect(json.agendas).toEqual([
      {
        idAssignation: 'ASS_AGD_SOM',
        nbRenseignees: 1,
        jourCourant: 1,
        nuitDuJourNotee: true,
        cloturablePatient: false,
      },
    ]);
    expect(json.agendasAlimentaires.map((g: { idAssignation: string }) => g.idAssignation)).toEqual([
      'ASS_AGD_ALI',
    ]);
    // Aucune clé du vocabulaire sommeil ne fuit dans le bloc alimentaire.
    expect(json.agendasAlimentaires[0]).not.toHaveProperty('nuitDuJourNotee');
    expect(json.agendas[0]).not.toHaveProperty('journeeDuJourEnregistree');
  });
});
