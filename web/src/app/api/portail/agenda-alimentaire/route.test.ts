import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    agendaAlimentaireJour: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
// Les VRAIES classes d'erreur Prisma, pas des `Error` renommées : c'est la
// LONGUEUR de leur nom (26 à 31 caractères) qui déclenche la règle `[id]` de
// `sanitizeString`, et un doublon écrit à la main pourrait la manquer.
import { Prisma } from '@/generated/prisma';

/**
 * ── POURQUOI LA ROUTE EST IMPORTÉE DYNAMIQUEMENT, ET PAS EN TÊTE DE FICHIER ──
 *
 * `IDS_SUSPENDUS` est un `const` de module calculé À L'IMPORT de
 * `questionnaires-catalog`, à partir de `isAgendaAlimentaireEnabled()`. La
 * position du drapeau au moment du premier import décide donc du comportement
 * de toute la suite.
 *
 * Deux conséquences, et elles imposent ce montage :
 *
 * 1. Un `import { POST } from './route'` en tête figerait le drapeau sur la
 *    valeur ambiante. Or `npm run check` est lancé DANS LES DEUX POSITIONS :
 *    sans drapeau, `Q_ALI_09` est suspendu et tous les cas nominaux rendraient
 *    409. La suite serait verte d'un côté, rouge de l'autre. (Aucun COMPTE de
 *    cas n'est annoncé ici : un chiffre écrit dans un commentaire dérive dès le
 *    premier test ajouté, et il l'avait déjà fait.)
 * 2. Mocker `@/lib/questionnaires-catalog` pour y poser un `IDS_SUSPENDUS`
 *    arbitraire testerait que la route lit un ensemble — pas qu'elle lit LE
 *    catalogue piloté par le drapeau. C'est précisément la garde à prouver :
 *    la route ne doit JAMAIS lire `process.env.WN_AGENDA_ALI` elle-même.
 *
 * D'où `vi.stubEnv` + `vi.resetModules()` + `await import()` à chaque test, sur
 * le patron de `lib/agendaAlimentaireDrapeau.guard.test.ts`. Le drapeau est
 * ALLUMÉ par défaut (l'agenda est ouvert), et un seul test le rallume à l'état
 * absent — l'état réel de Vercel — pour vérifier que la route se referme.
 *
 * `vi.mock('@/lib/prisma')` survit à `resetModules` : la fabrique rend l'objet
 * `vi.hoisted` ci-dessus, donc les mêmes espions à chaque réimport.
 *
 * Le paramètre n'a PAS de valeur par défaut, et c'est délibéré : avec un défaut
 * `'true'`, l'appel `chargerRoute(undefined)` — la position « drapeau absent »,
 * celle qu'on veut tester — retomberait sur le défaut. JavaScript ne distingue
 * pas « argument omis » de « argument valant `undefined` ». Le test du drapeau
 * éteint est passé au vert par cette voie avant que la mutation ne le révèle.
 */
async function chargerRoute(drapeau: string | undefined) {
  vi.resetModules();
  vi.stubEnv('WN_AGENDA_ALI', drapeau as string);
  return import('./route');
}

const OWNER = { idPatient: 'PAT_PROPRIO', email: 'proprio@example.test' };
const ID_ASSIGNATION = 'ASS_AGD_ALI';
const CONTRACT_VERSION = 'agenda-alimentaire-v1';

// Jour fixe pour des dates déterministes (Paris = UTC+2 l'été → même date).
const AUJOURDHUI = '2026-07-15';
const HIER = '2026-07-14';

const assignationAgenda = {
  idAssignation: ID_ASSIGNATION,
  idPatient: OWNER.idPatient,
  emailPatient: OWNER.email,
  idQuestionnaire: 'Q_ALI_09',
  statut: 'En attente',
  statutReponses: 'non_rempli',
  dateLimite: null as string | null,
  // Nominal = consentement DONNÉ. Le défaut en base est `'non_donne'`
  // (`schema.prisma:121`) : c'est le `ConsentScreen` du portail qui le fait
  // passer à `'donne'` avant que l'instrument ne s'ouvre.
  consentement: 'donne',
  consentementRetraitDate: null as Date | null,
  patient: { suiviClotureLe: null as Date | null },
};

// Journée valide : trois prises croissantes + les quatre présences + le champ
// sans abstention. `null` est permis sur les quatre présences, jamais sur
// `soirPlusCopieux`.
const reponses = {
  prises: [
    { heure: '08:00', nature: 'repas' },
    { heure: '12:30', nature: 'repas' },
    { heure: '19:30', nature: 'repas' },
  ],
  premierePriseProteines: true,
  legumesDeuxPrises: true,
  fruitsOuOleagineux: false,
  ultraTransformes: false,
  soirPlusCopieux: false,
};

function cookieFor(idPatient = OWNER.idPatient, email = OWNER.email): string {
  return signPatientSession({ idPatient, email });
}

function ligneEnBase(
  dateJour: string,
  id = 'jour_A',
  extra: { supersedesJourId?: string | null; contractVersion?: string } = {},
) {
  return {
    id,
    idPatient: OWNER.idPatient,
    idAssignation: ID_ASSIGNATION,
    dateJour,
    reponses: { contractVersion: extra.contractVersion ?? CONTRACT_VERSION, ...reponses },
    canal: 'portail',
    supersedesJourId: extra.supersedesJourId ?? null,
    soumisLe: new Date('2026-07-15T08:00:00.000Z'),
  };
}

function req(
  method: 'GET' | 'POST',
  cookie: string | undefined,
  opts: { body?: unknown; rawBody?: string; query?: string } = {},
): Request {
  const url = `http://localhost/api/portail/agenda-alimentaire${opts.query ?? ''}`;
  const corps = opts.rawBody ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined);
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    ...(corps !== undefined ? { body: corps } : {}),
  });
}

function corpsPost(extra: Record<string, unknown> = {}) {
  return { idAssignation: ID_ASSIGNATION, reponses, ...extra };
}

beforeEach(() => {
  vi.resetAllMocks();
  // Seul `Date` est simulé : les minuteries restent réelles, l'import dynamique
  // de la route en dépend.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'));
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';

  prisma.assignation.findUnique.mockResolvedValue(assignationAgenda);
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: OWNER.idPatient,
    actif: true,
    email: OWNER.email,
    accessTokenRevoked: false,
    sessionsInvalidesAvant: null,
  });
  prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
  prisma.agendaAlimentaireJour.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'jour_cree',
    idPatient: data.idPatient,
    idAssignation: data.idAssignation,
    dateJour: data.dateJour,
    reponses: data.reponses,
    canal: data.canal,
    supersedesJourId: data.supersedesJourId ?? null,
    soumisLe: new Date('2026-07-15T10:00:00.000Z'),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('POST /api/portail/agenda-alimentaire', () => {
  it('refuse sans session portail (401)', async () => {
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', undefined, { body: corpsPost() }));
    expect(res.status).toBe(401);
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse l’accès inter-patient (404, message indistinct de « introuvable »)', async () => {
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor('PAT_INTRUS', 'intrus@example.test'), { body: corpsPost() }));
    expect(res.status).toBe(404);
    const json = (await res.json()) as { reason: string; error: string };
    expect(json.reason).toBe('not_found');
    // Le message ne doit pas révéler que l'assignation EXISTE.
    expect(json.error).not.toMatch(/appartient|autre patient/i);
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse un identifiant hors format SANS interroger la base (404) — barrière 2', async () => {
    // Trop long, puis caractères interdits. Un identifiant hors format n'a pas à
    // devenir une requête : c'est ce qui empêche la route de servir de sonde.
    const { POST } = await chargerRoute('true');
    for (const idHorsFormat of ['A'.repeat(65), 'ASS/../ADMIN', 'ASS AGD', '']) {
      const res = await POST(
        req('POST', cookieFor(), { body: { idAssignation: idHorsFormat, reponses } }),
      );
      expect(res.status, `identifiant « ${idHorsFormat} »`).toBe(404);
      expect((await res.json()).reason).toBe('not_found');
    }
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse quand le consentement n’a jamais été donné (403 consentement_absent)', async () => {
    // La garde qui mord RÉELLEMENT aujourd'hui. Une assignation créée depuis la
    // bibliothèque praticien naît `'non_donne'` ; jusqu'ici seul un ÉCRAN s'y
    // opposait (`portail/[token]/questionnaires/[idAssignation]/page.tsx:106`),
    // qu'un appel direct contourne entièrement.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      consentement: 'non_donne',
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('consentement_absent');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse une assignation qui n’est pas un agenda alimentaire (409 wrong_instrument)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, idQuestionnaire: 'Q_SOM_09' });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('wrong_instrument');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('DRAPEAU ÉTEINT : refuse la saisie sur une assignation déjà créée (409 unavailable)', async () => {
    // La garde qui empêche `WN_AGENDA_ALI` de devenir irréversible. Éteindre le
    // drapeau referme le catalogue, la bibliothèque, la liste portail et
    // `patient/submit` — mais les assignations existantes gardent leur URL.
    // Sans ce refus, cette route resterait ouverte pour toujours.
    const { POST } = await chargerRoute(undefined);
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('unavailable');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse après retrait du consentement (403)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      consentementRetraitDate: new Date('2026-07-10T09:00:00.000Z'),
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('consentement_retire');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse la saisie sur une assignation annulée (410 annulee)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, statut: 'Annulée' });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('annulee');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('ORDRE : annulée + consentement JAMAIS donné rend 410 annulee, pas 403', async () => {
    // PRÉCÉDENCE, et elle n'est pas cosmétique. Avec l'ordre inverse, le patient
    // recevait « donnez d'abord votre consentement » sur une assignation
    // annulée — or `api/patient/consentement/route.ts:65` refuse en 410 sur une
    // annulée. On le renvoyait vers un geste que l'autre route lui refuse.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      statut: 'Annulée',
      consentement: 'non_donne',
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('annulee');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('ORDRE : suivi clos + consentement JAMAIS donné rend 410 suivi_clos, pas 403', async () => {
    // Cas PLUS GRAVE que le précédent : `api/patient/consentement` ne lit PAS
    // `suiviClotureLe`. Un 403 « donnez votre consentement » ici provoquerait une
    // ÉCRITURE de consentement sur un dossier clôturé, que la barrière suivante
    // refermerait ensuite. On provoquait l'écriture qu'on refuse.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      patient: { suiviClotureLe: new Date('2026-07-12T09:00:00.000Z') },
      consentement: 'non_donne',
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('suivi_clos');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse la saisie sur un dossier au suivi clôturé (410 suivi_clos)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      patient: { suiviClotureLe: new Date('2026-07-12T09:00:00.000Z') },
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('suivi_clos');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse la saisie sur un agenda verrouillé (409 locked)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, statutReponses: 'verrouille' });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('locked');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse la saisie en modification_demandee (409) — aligné sur patient/submit', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      statutReponses: 'modification_demandee',
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('locked');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse la saisie après la date limite (410 expired)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, dateLimite: '2026-07-01' });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('expired');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('ACCEPTE la saisie après la date limite si le praticien a déverrouillé (201)', async () => {
    // Sans cette exemption, le bouton « déverrouiller » du praticien ne rouvre
    // rien : l'écran annonce un agenda rouvert et la route continue de refuser.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      dateLimite: '2026-07-01',
      statutReponses: 'deverrouille',
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(201);
    expect(prisma.agendaAlimentaireJour.create).toHaveBeenCalledTimes(1);
  });

  it('refuse une date antérieure à la veille (409 date_hors_fenetre)', async () => {
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost({ dateJour: '2026-07-10' }) }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('date_hors_fenetre');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse une journée DÉJÀ NOTÉE sans supersedesJourId (409 deja_notee)', async () => {
    // « lignes − dates distinctes » est le taux de correction : un double-clic
    // qui créerait une seconde ligne non chaînée le fausserait.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligneEnBase(AUJOURDHUI)]);
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_notee');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('accepte une correction chaînée sur la journée active (201)', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligneEnBase(AUJOURDHUI, 'jour_A')]);
    prisma.agendaAlimentaireJour.findUnique.mockResolvedValue({
      idPatient: OWNER.idPatient,
      idAssignation: ID_ASSIGNATION,
      dateJour: AUJOURDHUI,
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(
      req('POST', cookieFor(), { body: corpsPost({ supersedesJourId: 'jour_A' }) }),
    );
    expect(res.status).toBe(201);
    const appel = prisma.agendaAlimentaireJour.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(appel.data.supersedesJourId).toBe('jour_A');
  });

  it('refuse un supersedesJourId qui ne désigne pas la journée active de cette date (409)', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligneEnBase(AUJOURDHUI, 'jour_A')]);
    const { POST } = await chargerRoute('true');
    const res = await POST(
      req('POST', cookieFor(), { body: corpsPost({ supersedesJourId: 'jour_INCONNU' }) }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('correction_invalide');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse l’écriture SUR LA DATE dont une ligne est ILLISIBLE (409 agenda_illisible)', async () => {
    // Le GET remonte `illisibles` ; le POST doit s'ARRÊTER dessus. Une ligne en
    // quarantaine (version de contrat inconnue) est invisible de
    // `resolveJoursActifs` : sans ce refus, la date passerait pour non notée et
    // une SECONDE ligne NON CHAÎNÉE serait écrite — le doublon même que le 409
    // `deja_notee` existe pour empêcher.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligneEnBase(AUJOURDHUI, 'jour_QUARANTAINE', { contractVersion: 'agenda-alimentaire-v99' }),
    ]);
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('agenda_illisible');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('ACCEPTE l’écriture sur une date SAINE quand une AUTRE date est illisible (201)', async () => {
    // LE CAS QUI DÉPARTAGE, et le correctif de revue. Un refus sur `illisibles > 0`
    // fermait l'agenda ENTIER — les vingt autres journées et jusqu'aux corrections
    // légitimes — alors qu'aucun geste de sortie n'existe : le seul `deleteMany`
    // sur cette table est l'effacement RGPD du dossier. `date_jour` étant une
    // COLONNE, `listJours` sait NOMMER la date touchée ; le refus s'y borne.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligneEnBase(HIER, 'jour_QUARANTAINE', { contractVersion: 'agenda-alimentaire-v99' }),
    ]);
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(201);
    expect(prisma.agendaAlimentaireJour.create).toHaveBeenCalledTimes(1);
  });

  it('refuse la date illisible même quand une autre date est saine (409)', async () => {
    // Le pendant du précédent : c'est bien la DATE VISÉE qui décide, pas la
    // présence d'une ligne saine ailleurs dans l'agenda.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligneEnBase(AUJOURDHUI, 'jour_SAIN'),
      ligneEnBase(HIER, 'jour_QUARANTAINE', { contractVersion: 'agenda-alimentaire-v99' }),
    ]);
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost({ dateJour: HIER }) }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('agenda_illisible');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('BORNE les lectures Prisma à CETTE assignation, et l’assignation à son identifiant', async () => {
    // Le second argument de `listJours` n'est pas décoratif : sans lui, la
    // lecture porterait sur TOUT le patient et fusionnerait les journées de deux
    // agendas alimentaires du même dossier — l'un servant de doublon à l'autre.
    // Un mock qui rend la même chose quel que soit le `where` ne peut pas le
    // dire ; l'assertion porte donc sur les ARGUMENTS.
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(201);

    const appelAssignation = prisma.assignation.findUnique.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(appelAssignation.where).toEqual({ idAssignation: ID_ASSIGNATION });

    const appelJours = prisma.agendaAlimentaireJour.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(appelJours.where).toEqual({
      idPatient: OWNER.idPatient,
      idAssignation: ID_ASSIGNATION,
    });
  });

  it('NE CHARGE PAS la ligne entière de l’assignation : le `select` est épinglé', async () => {
    // Le docblock de `SELECT_ASSIGNATION` fait de la non-lecture de `notes` —
    // texte libre du praticien SUR le patient — une propriété de SÉCURITÉ. Sans
    // cette assertion, supprimer le `select` (donc charger `notes` dans le
    // processus d'une route PATIENT) passait la totalité de la suite. La liste
    // est épinglée EXACTEMENT : y ajouter un champ est une décision, pas un
    // effet de bord.
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
    expect(res.status).toBe(201);

    const appel = prisma.assignation.findUnique.mock.calls[0][0] as {
      select?: Record<string, unknown>;
    };
    expect(appel.select, 'le `select` explicite a disparu').toBeDefined();
    expect(Object.keys(appel.select as Record<string, unknown>).sort()).toEqual(
      [
        'consentement',
        'consentementRetraitDate',
        'dateLimite',
        'emailPatient',
        'idAssignation',
        'idPatient',
        'idQuestionnaire',
        'patient',
        'statut',
        'statutReponses',
      ].sort(),
    );
    // Nommé explicitement : c'est LE champ dont l'absence est la propriété.
    expect(appel.select).not.toHaveProperty('notes');
    // La relation n'est pas chargée en entier non plus.
    expect((appel.select as Record<string, unknown>).patient).toEqual({
      select: { suiviClotureLe: true },
    });
  });

  it('500 : journalise la CLASSE de l’erreur EN CLAIR, jamais son message', async () => {
    // ── LA BRANCHE 500 N'ÉTAIT EXERCÉE PAR RIEN, ET LE JOURNAL PAR PERSONNE ──
    // Ce test tient les deux moitiés d'un même arbitrage :
    //  1. le message ne sort pas — un `PrismaClientValidationError` recopie
    //     l'invocation fautive, `data.reponses` comprise, donc les horaires de
    //     prises du patient, c'est-à-dire de la donnée de santé ;
    //  2. la classe sort EN CLAIR — une version précédente la rangeait dans
    //     `metadata.erreurType`, où `sanitizeString` réduit tout mot de 24
    //     caractères ou plus à `[id]` : les QUATRE classes Prisma (26 à 31
    //     caractères) y disparaissaient, et seul `TypeError` survivait. La
    //     précaution avait coûté la trace des pannes.
    const MESSAGE_PRISMA = [
      'Invalid `prisma.agendaAlimentaireJour.create()` invocation:',
      '{ data: { reponses: { prises: [ { heure: "07:12", nature: "repas" },',
      '{ heure: "21:34", nature: "collation" } ] } } }',
    ].join('\n');

    const echantillons: { erreur: Error; classe: string; code?: string }[] = [
      {
        erreur: new Prisma.PrismaClientValidationError(MESSAGE_PRISMA, { clientVersion: '7.8.0' }),
        classe: 'PrismaClientValidationError',
      },
      {
        erreur: new Prisma.PrismaClientKnownRequestError(MESSAGE_PRISMA, {
          code: 'P2002',
          clientVersion: '7.8.0',
        }),
        classe: 'PrismaClientKnownRequestError',
        code: 'P2002',
      },
      // Les DEUX classes que le commentaire nommait sans les jouer — et ce sont
      // précisément les plus longues (31 et 26 caractères), donc celles dont la
      // longueur porte l'argument. Ni l'une ni l'autre n'expose de `code` : leur
      // échantillon vérifie aussi qu'aucune `metadata` n'est fabriquée.
      {
        erreur: new Prisma.PrismaClientInitializationError(MESSAGE_PRISMA, '7.8.0'),
        classe: 'PrismaClientInitializationError',
      },
      {
        erreur: new Prisma.PrismaClientRustPanicError(MESSAGE_PRISMA, '7.8.0'),
        classe: 'PrismaClientRustPanicError',
      },
    ];

    const { POST } = await chargerRoute('true');
    for (const { erreur, classe, code } of echantillons) {
      const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
      prisma.agendaAlimentaireJour.create.mockRejectedValueOnce(erreur);
      const res = await POST(req('POST', cookieFor(), { body: corpsPost() }));
      const lignes = espion.mock.calls.map(appel => String(appel[0])).join('\n');
      // Restauré AVANT les assertions : un échec doit rester lisible.
      espion.mockRestore();

      expect(res.status, classe).toBe(500);
      expect((await res.json()).reason).toBe('exception');

      // 1 — RIEN de la saisie du patient.
      expect(lignes, `${classe} : horaire du patient journalisé`).not.toContain('07:12');
      expect(lignes, `${classe} : horaire du patient journalisé`).not.toContain('21:34');
      expect(lignes, `${classe} : le mot « reponses » a fui`).not.toContain('reponses');

      // 2 — la classe, LISIBLE. `[id]` ici signifie que la trace est repassée
      // par `metadata` et ne vaut plus rien.
      const evenement = JSON.parse(lignes) as {
        error?: { type?: string; message?: string; code?: string };
        metadata?: Record<string, unknown>;
      };
      expect(evenement.error?.type, `${classe} : classe illisible`).toBe(classe);
      expect(lignes).not.toContain('[id]');
      expect(evenement.error?.message).not.toContain('Invalid');
      // Le `code` Prisma, lui, reste en `metadata` : court, sans donnée.
      //
      // L'assertion est SCINDÉE. Écrite en un seul `toBe(code)`, elle réussissait
      // PAR VACUITÉ sur les échantillons sans `code` : `metadata` est absent,
      // `code` vaut `undefined`, et `undefined === undefined` ne prouve rien —
      // ranger le code ailleurs, ou ne plus le ranger du tout, restait vert.
      if (code) {
        expect(evenement.metadata?.erreurCode, `${classe} : code Prisma perdu`).toBe(code);
      } else {
        expect(evenement.metadata, `${classe} : metadata fabriqué sans code`).toBeUndefined();
      }
    }
  });

  it('accepte une journée sans prise portant soirPlusCopieux à null, et n’écrit QUE aucunePrise (201)', async () => {
    // L'arbitrage le plus discutable du lot : `soirPlusCopieux` n'accepte PAS
    // l'abstention (400 ailleurs), SAUF sur une journée sans prise, où
    // `precontrolerReponses` sort avant le contrôle et où `jour.ts` tolère
    // explicitement `null` sur les cinq champs. Ce qui est écrit alors n'est pas
    // le corps reçu : `ensureJourReponses` rend `{ aucunePrise: true }` NU.
    const { POST } = await chargerRoute('true');
    const res = await POST(
      req('POST', cookieFor(), {
        body: corpsPost({ reponses: { aucunePrise: true, soirPlusCopieux: null } }),
      }),
    );
    expect(res.status).toBe(201);
    const appel = prisma.agendaAlimentaireJour.create.mock.calls[0][0] as {
      data: { reponses: Record<string, unknown> };
    };
    expect(appel.data.reponses).toEqual({
      contractVersion: CONTRACT_VERSION,
      aucunePrise: true,
    });
    // Explicite, parce que c'est la question posée : la clé ne survit pas.
    expect(appel.data.reponses).not.toHaveProperty('soirPlusCopieux');
  });

  it('refuse une présence obligatoire absente, EN LA NOMMANT (400)', async () => {
    const { legumesDeuxPrises: _absent, ...incomplet } = reponses;
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { body: corpsPost({ reponses: incomplet }) }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('légumes');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse soirPlusCopieux à null (400) — jour.ts l’avalerait en silence', async () => {
    // `jour.ts:230` écarte un `null` sans lever : la route rendrait 201 et le
    // champ serait absent de la ligne écrite. Une UI offrant « je ne sais pas »
    // sur les cinq champs perdrait le cinquième à chaque journée.
    const { POST } = await chargerRoute('true');
    const res = await POST(
      req('POST', cookieFor(), { body: corpsPost({ reponses: { ...reponses, soirPlusCopieux: null } }) }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('copieux');
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('refuse un corps trop volumineux (413), avant tout parse', async () => {
    const enorme = JSON.stringify({
      idAssignation: ID_ASSIGNATION,
      reponses,
      bourrage: 'x'.repeat(40000),
    });
    const { POST } = await chargerRoute('true');
    const res = await POST(req('POST', cookieFor(), { rawBody: enorme }));
    expect(res.status).toBe(413);
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
    expect(prisma.agendaAlimentaireJour.create).not.toHaveBeenCalled();
  });

  it('accepte une journée de la veille (201) et une journée sans prise', async () => {
    const { POST } = await chargerRoute('true');
    const veille = await POST(req('POST', cookieFor(), { body: corpsPost({ dateJour: HIER }) }));
    expect(veille.status).toBe(201);

    const sansPrise = await POST(
      req('POST', cookieFor(), { body: corpsPost({ reponses: { aucunePrise: true } }) }),
    );
    expect(sansPrise.status).toBe(201);
  });

  it('enregistre la journée du jour (201) avec l’idPatient de la SESSION et la version de contrat', async () => {
    const { POST } = await chargerRoute('true');
    const res = await POST(
      req('POST', cookieFor(), {
        // Le corps porte un idPatient : il ne doit JAMAIS être utilisé.
        body: corpsPost({ idPatient: 'PAT_INTRUS' }),
      }),
    );
    const json = (await res.json()) as { ok: boolean; jourId?: string };
    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.jourId).toBe('jour_cree');

    const appel = prisma.agendaAlimentaireJour.create.mock.calls[0][0] as {
      data: { idPatient: string; idAssignation: string; dateJour: string; reponses: Record<string, unknown> };
    };
    // 1 — l'identité écrite vient de la session, pas du corps.
    expect(appel.data.idPatient).toBe(OWNER.idPatient);
    expect(appel.data.idAssignation).toBe(ID_ASSIGNATION);
    expect(appel.data.dateJour).toBe(AUJOURDHUI);
    // 2 — la version de contrat est bien posée dans le JSONB écrit.
    expect(appel.data.reponses.contractVersion).toBe(CONTRACT_VERSION);
  });
});

describe('GET /api/portail/agenda-alimentaire', () => {
  it('refuse sans session portail (401)', async () => {
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', undefined, { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(401);
  });

  it('refuse la consultation d’une assignation annulée (410)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, statut: 'Annulée' });
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('annulee');
  });

  it('refuse la consultation d’un autre instrument (409 wrong_instrument)', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignationAgenda, idQuestionnaire: 'Q_SOM_09' });
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('wrong_instrument');
  });

  // ── LES BARRIÈRES D'ÉTAT, SUR LE CHEMIN DE LECTURE ────────────────────────
  // Elles vivent dans `authorizeAgendaAlimentairePortail`, partagé par les deux
  // verbes — mais « partagé » est une lecture de code, pas une preuve. La
  // question « `IDS_SUSPENDUS` couvre-t-il le GET autant que le POST ? » n'avait
  // de réponse que par relecture, et c'est la barrière qui rend le drapeau
  // réversible : un GET resté ouvert continuerait de rendre 21 jours de donnée
  // de santé sur un instrument retiré de production.

  it('refuse la consultation inter-patient (404, message indistinct de « introuvable »)', async () => {
    const { GET } = await chargerRoute('true');
    const res = await GET(
      req('GET', cookieFor('PAT_INTRUS', 'intrus@example.test'), { query: `?id=${ID_ASSIGNATION}` }),
    );
    expect(res.status).toBe(404);
    const json = (await res.json()) as { reason: string; error: string };
    expect(json.reason).toBe('not_found');
    expect(json.error).not.toMatch(/appartient|autre patient/i);
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('DRAPEAU ÉTEINT : refuse aussi la CONSULTATION (409 unavailable) — barrière 5', async () => {
    const { GET } = await chargerRoute(undefined);
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('unavailable');
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('refuse la consultation sans consentement donné (403 consentement_absent) — barrière 8', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      consentement: 'non_donne',
    });
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('consentement_absent');
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('refuse la consultation après retrait du consentement (403) — barrière 9', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      consentementRetraitDate: new Date('2026-07-10T09:00:00.000Z'),
    });
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('consentement_retire');
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('refuse la consultation sur un dossier au suivi clôturé (410 suivi_clos) — barrière 7', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignationAgenda,
      patient: { suiviClotureLe: new Date('2026-07-12T09:00:00.000Z') },
    });
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('suivi_clos');
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });

  it('refuse un identifiant hors format SANS interroger la base (404) — barrière 2', async () => {
    const { GET } = await chargerRoute('true');
    for (const idHorsFormat of ['A'.repeat(65), 'ASS%2F..%2FADMIN', '']) {
      const res = await GET(req('GET', cookieFor(), { query: `?id=${idHorsFormat}` }));
      expect(res.status, `identifiant « ${idHorsFormat} »`).toBe(404);
    }
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
  });

  it('BORNE la lecture à CETTE assignation (arguments Prisma)', async () => {
    // Sans le second argument de `listJours`, la frise mêlerait les journées de
    // deux agendas alimentaires du même patient. Le mock rend la même chose quel
    // que soit le `where` : seul l'argument le dit.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligneEnBase(HIER, 'jour_A')]);
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    expect(res.status).toBe(200);

    const appelAssignation = prisma.assignation.findUnique.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(appelAssignation.where).toEqual({ idAssignation: ID_ASSIGNATION });

    const appelJours = prisma.agendaAlimentaireJour.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(appelJours.where).toEqual({
      idPatient: OWNER.idPatient,
      idAssignation: ID_ASSIGNATION,
    });
  });

  it('renvoie la frise, les saisies brutes, et REMONTE les lignes illisibles', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligneEnBase(HIER, 'jour_A'),
      // Version de contrat inconnue : mise en quarantaine par `listJours`.
      ligneEnBase(AUJOURDHUI, 'jour_B', { contractVersion: 'agenda-alimentaire-v99' }),
    ]);
    const { GET } = await chargerRoute('true');
    // La quarantaine ouvre une ligne d'intégrité SUR LA LECTURE AUSSI : attendue
    // ici, et épinglée par le test dédié plus bas. Étouffée pour garder la sortie
    // de la suite lisible.
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    espion.mockRestore();
    const json = (await res.json()) as {
      ok: boolean;
      jours: { dateJour: string }[];
      fenetre: { dateDebut: string };
      illisibles: number;
      derniereJournee: unknown;
    };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.jours).toHaveLength(1);
    expect(json.jours[0].dateJour).toBe(HIER);
    expect(json.fenetre.dateDebut).toBe(HIER);
    // Le compte n'est PAS avalé : un lot tronqué en silence pourrait franchir
    // les seuils d'exploitabilité en ayant perdu des journées.
    expect(json.illisibles).toBe(1);
    expect(json.derniereJournee).not.toBeNull();
  });

  it('ne laisse fuir AUCUNE clé d’agrégat vers le patient', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([ligneEnBase(HIER, 'jour_A')]);
    const { GET } = await chargerRoute('true');
    const res = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    const json = (await res.json()) as Record<string, unknown>;
    // Surface EXACTE de la réponse — un ajout futur devra être décidé ici.
    expect(Object.keys(json).sort()).toEqual(
      ['aujourdHui', 'derniereJournee', 'fenetre', 'illisibles', 'jours', 'ok', 'statutReponses'].sort(),
    );
    const brut = JSON.stringify(json);
    for (const cle of [
      'jeuneMedian',
      'fenetreAliMoyenne',
      'nbPairesJeune',
      'freqLegumesSem',
      'freqUltraTransformesSem',
      'regularitePremiereEcartType',
    ]) {
      expect(brut, `la clé d’agrégat « ${cle} » ne doit pas sortir`).not.toContain(cle);
    }
  });
});

/**
 * ── CE QUE LA SUITE NE VOYAIT PAS ────────────────────────────────────────────
 * Les trois propriétés ci-dessous vivaient dans des commentaires et nulle part
 * ailleurs : le NIVEAU des refus de forme, le DOMAINE d'un refus d'accès, et
 * l'existence même de l'événement d'intégrité. Chacune a déjà été changée en
 * revue, dans un sens puis dans l'autre, sans qu'un seul test tombe.
 *
 * Le journal se lit par `console` (`logger.ts:42-58`) : `WARN` → `console.warn`,
 * `ERROR`/`SECURITY` → `console.error`, le reste → `console.log`. Le CANAL fait
 * donc partie de l'assertion — c'est lui qui distingue une démotion silencieuse.
 */
describe('journalisation de /api/portail/agenda-alimentaire', () => {
  it('413 en WARN, 400 de forme en DEBUG — les niveaux sont épinglés', async () => {
    const { POST } = await chargerRoute('true');

    // 1 — le 413. SEUL signal d'abus du chemin d'écriture, et il coûte 32 Kio à
    // déclencher. Il a été descendu en `DEBUG` en revue, puis remonté : le
    // motif (« un anonyme remplit le journal ») ne tenait pas, la branche
    // `unauthenticated` écrivant déjà un `console.error` par simple GET.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const enorme = JSON.stringify({
      idAssignation: ID_ASSIGNATION,
      reponses,
      bourrage: 'x'.repeat(40000),
    });
    const trop = await POST(req('POST', cookieFor(), { rawBody: enorme }));
    const lignesWarn = warn.mock.calls.map(appel => String(appel[0]));
    const lignesLog = log.mock.calls.map(appel => String(appel[0]));
    warn.mockRestore();
    log.mockRestore();

    expect(trop.status).toBe(413);
    expect(lignesLog, 'le 413 est descendu sous WARN').toHaveLength(0);
    expect(lignesWarn, 'le 413 ne se journalise plus').toHaveLength(1);
    const ev413 = JSON.parse(lignesWarn[0]) as { level: string; event: string; domain: string };
    expect(ev413.level).toBe('WARN');
    // Code DISTINCT de `JOUR_REJETE` : les deux refus ne portent pas sur la même
    // population, et un code commun les additionnerait dans le même compte.
    expect(ev413.event).toBe('PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.FORME_REJETEE');

    // 2 — les deux 400 de forme, eux, restent en `DEBUG` : un client mal câblé
    // les produit en série, et le statut HTTP dit déjà tout ce qu'ils apprennent.
    const warn2 = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log2 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const illisible = await POST(req('POST', cookieFor(), { rawBody: '{ ceci n’est pas du JSON' }));
    const lignesWarn2 = warn2.mock.calls.map(appel => String(appel[0]));
    const lignesLog2 = log2.mock.calls.map(appel => String(appel[0]));
    warn2.mockRestore();
    log2.mockRestore();

    expect(illisible.status).toBe(400);
    expect(lignesWarn2, 'un 400 de forme est monté en WARN').toHaveLength(0);
    expect(lignesLog2).toHaveLength(1);
    const ev400 = JSON.parse(lignesLog2[0]) as { level: string; event: string };
    expect(ev400.level).toBe('DEBUG');
    expect(ev400.event).toBe('PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.FORME_REJETEE');
  });

  it('un refus d’accès déclare domain: SECURITY, jamais le préfixe de son code', async () => {
    // `EventCode` et `LogDomain` sont deux champs INDÉPENDANTS de `LogPayload`
    // (`observability/logger.ts:5-11`). Sur un `logger.security`, `domain` porte
    // la NATURE de l'événement, pas le premier segment du code — convention
    // constatée : `api/portail/session/route.ts` et
    // `api/portail/assignations/route.ts` déclarent déjà `SECURITY` sur des
    // codes préfixés `PORTAIL_PATIENT.`. Le champ n'était épinglé nulle part :
    // le faire passer à `PORTAIL_PATIENT` laissait la suite entière verte.
    const { POST } = await chargerRoute('true');
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(req('POST', undefined, { body: corpsPost() }));
    const lignes = espion.mock.calls.map(appel => String(appel[0]));
    espion.mockRestore();

    expect(res.status).toBe(401);
    expect(lignes, 'le refus d’accès ne se journalise plus').toHaveLength(1);
    const evenement = JSON.parse(lignes[0]) as {
      level: string;
      domain: string;
      event: string;
      metadata?: Record<string, unknown>;
    };
    expect(evenement.domain, '`domain` doit porter la NATURE de l’événement').toBe('SECURITY');
    expect(evenement.level).toBe('SECURITY');
    expect(evenement.event).toBe('PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.FORBIDDEN');
    // Le motif suffit à compter ; aucun identifiant n'accompagne le refus.
    expect(evenement.metadata).toEqual({ motif: 'unauthenticated' });
  });

  it('LIGNE_ILLISIBLE : émis au POST comme au GET, et sa metadata ne porte AUCUNE date', async () => {
    // La quarantaine porte sur HIER, DÉLIBÉRÉMENT et pas sur AUJOURDHUI :
    // l'horodatage de l'événement contient la date du jour simulé, et une
    // assertion d'absence portée sur AUJOURDHUI passerait pour la mauvaise
    // raison — ou tomberait sans qu'aucune donnée n'ait fui.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ligneEnBase(HIER, 'jour_QUARANTAINE', { contractVersion: 'agenda-alimentaire-v99' }),
    ]);
    const { POST, GET } = await chargerRoute('true');

    // ── ÉCRITURE ────────────────────────────────────────────────────────────
    const espionPost = vi.spyOn(console, 'error').mockImplementation(() => {});
    const post = await POST(req('POST', cookieFor(), { body: corpsPost({ dateJour: HIER }) }));
    const lignesPost = espionPost.mock.calls.map(appel => String(appel[0]));
    espionPost.mockRestore();

    expect(post.status).toBe(409);
    // POSITIF D'ABORD. Sans lui, l'assertion d'absence qui suit serait satisfaite
    // par un journal vide — c'est-à-dire par la suppression de l'événement.
    expect(lignesPost, 'l’anomalie d’intégrité ne se journalise plus').toHaveLength(1);
    const evPost = JSON.parse(lignesPost[0]) as {
      level: string;
      event: string;
      metadata?: Record<string, unknown>;
    };
    expect(evPost.event).toBe('PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.LIGNE_ILLISIBLE');
    expect(evPost.level).toBe('ERROR');
    // Surface EXACTE : le compte, et un BOOLÉEN qui dit si l'écriture demandée
    // portait sur une des dates touchées.
    expect(evPost.metadata).toEqual({ illisibles: 1, dateVisee: true });
    // ABSENCE, appariée au positif ci-dessus : `dateJour` est de la donnée de
    // recueil et n'a rien à faire dans un journal d'exploitation.
    expect(
      JSON.stringify(evPost.metadata),
      'une date de recueil est entrée dans `metadata`',
    ).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(lignesPost[0], 'la date en quarantaine a fui dans la ligne').not.toContain(HIER);

    // ── LECTURE ─────────────────────────────────────────────────────────────
    // Le GET journalise AUSSI : la quarantaine naît d'un rollback, fenêtre où
    // les lectures dépassent de loin les écritures. Borner l'événement au POST
    // ferait dépendre la détection d'une saisie fortuite.
    const espionGet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const get = await GET(req('GET', cookieFor(), { query: `?id=${ID_ASSIGNATION}` }));
    const lignesGet = espionGet.mock.calls.map(appel => String(appel[0]));
    espionGet.mockRestore();

    expect(get.status).toBe(200);
    expect(lignesGet, 'la lecture n’ouvre aucun incident').toHaveLength(1);
    const evGet = JSON.parse(lignesGet[0]) as { event: string; metadata?: Record<string, unknown> };
    expect(evGet.event).toBe('PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.LIGNE_ILLISIBLE');
    // Pas de `dateVisee` : une lecture ne vise aucune date. Surtout pas `false`,
    // qui se lirait « la date visée est saine ».
    expect(evGet.metadata).toEqual({ illisibles: 1 });
    expect(lignesGet[0], 'la date en quarantaine a fui dans la ligne').not.toContain(HIER);
  });
});
