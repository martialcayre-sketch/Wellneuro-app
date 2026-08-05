import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
type Args = Record<string, any>;

const { getServerSession, prisma, sendMail, creerTransportSmtp, ordre } = vi.hoisted(() => {
  const ordre: string[] = [];
  const sendMail = vi.fn(async (_options: Record<string, string>) => {
    ordre.push('sendMail');
  });
  return {
    ordre,
    sendMail,
    creerTransportSmtp: vi.fn(() => ({ sendMail })),
    getServerSession: vi.fn(),
    prisma: {
      patient: { findFirst: vi.fn((_a: Args) => Promise.resolve<Any>(null)) },
      assignation: { findUnique: vi.fn((_a: Args) => Promise.resolve<Any>(null)) },
      agendaSommeilNuit: { findMany: vi.fn((_a: Args) => Promise.resolve<Any>([])) },
      correspondancePatient: {
        count: vi.fn((_a: Args) => Promise.resolve<Any>(0)),
        findFirst: vi.fn((_a: Args) => Promise.resolve<Any>(null)),
        create: vi.fn(async (_a: Args): Promise<Any> => {
          ordre.push('create');
          return { id: 'CORR_1' };
        }),
        update: vi.fn(async (_a: Args): Promise<Any> => {
          ordre.push('update');
          return {};
        }),
      },
    },
  };
});

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/email/transportSmtp', () => ({ creerTransportSmtp }));
// `appartenance` et `cycleDeVie` NE SONT PAS mockés : le scoping praticien et
// la garde de dossier clos sont des invariants de cette route.

import { POST } from './route';
import { JOURS_ENTRE_RELANCES, MAX_TENTATIVES_FENETRE } from '@/lib/agenda-sommeil/relanceEmail';

const PRATICIEN = 'praticien@wellneuro.fr';
const session = { user: { email: PRATICIEN } };

function req(body: unknown = { idPatient: 'PAT_1', idAssignation: 'ASS_1' }): Request {
  return new Request('http://localhost/api/praticien/agenda-sommeil/relance', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const patientOk = {
  idPatient: 'PAT_1',
  prenom: 'Michel',
  email: 'michel.dogne@fictif.wellneuro.fr',
  actif: true,
  accessTokenRevoked: false,
  suiviClotureLe: null,
};

const assOk = {
  idPatient: 'PAT_1',
  idQuestionnaire: 'Q_SOM_09',
  statut: 'En attente',
  statutReponses: 'non_rempli',
  dateLimite: null,
  dateAssignation: new Date('2026-07-24T08:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  ordre.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-30T10:00:00.000Z'));
  process.env.WN_AGENDA_RELANCE = 'true';
  process.env.SMTP_URL = 'smtp://exemple.invalid';
  getServerSession.mockResolvedValue(session);
  prisma.patient.findFirst.mockResolvedValue(patientOk);
  prisma.assignation.findUnique.mockResolvedValue(assOk);
  // Cas nominal = `silencieux` : dernière nuit le 27, aujourd'hui le 30, donc
  // au moins une nuit DÉFINITIVEMENT perdue. Le 29 (nuit du jour seule
  // manquante) tenait ce rôle avant le seuil du 2026-07-31 — il est depuis un
  // cas de REFUS, éprouvé comme tel dans la table ci-dessous.
  prisma.agendaSommeilNuit.findMany.mockResolvedValue([{ dateNuit: '2026-07-27' }]);
  prisma.correspondancePatient.findFirst.mockResolvedValue(null);
  prisma.correspondancePatient.count.mockResolvedValue(0);
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.WN_AGENDA_RELANCE;
  delete process.env.SMTP_URL;
});

// Chaque refus doit être MUET côté SMTP : c'est l'assertion qui compte.
describe('POST relance — les refus n’envoient jamais', () => {
  it.each([
    [
      'sans session',
      401,
      'unauthenticated',
      () => getServerSession.mockResolvedValue(null),
    ],
    [
      'drapeau éteint',
      404,
      'not_found',
      () => {
        process.env.WN_AGENDA_RELANCE = 'false';
      },
    ],
    [
      'SMTP absent',
      503,
      'smtp_indisponible',
      () => {
        delete process.env.SMTP_URL;
      },
    ],
    [
      'patient d’un autre praticien',
      404,
      'patient_not_found',
      () => prisma.patient.findFirst.mockResolvedValue(null),
    ],
    [
      'patient inactif',
      404,
      'patient_not_found',
      () => prisma.patient.findFirst.mockResolvedValue({ ...patientOk, actif: false }),
    ],
    [
      'accès portail révoqué',
      409,
      'portal_revoked',
      () => prisma.patient.findFirst.mockResolvedValue({ ...patientOk, accessTokenRevoked: true }),
    ],
    [
      'dossier clôturé',
      409,
      'dossier_cloture',
      () =>
        prisma.patient.findFirst.mockResolvedValue({
          ...patientOk,
          suiviClotureLe: new Date('2026-07-01'),
        }),
    ],
    [
      'assignation inconnue',
      404,
      'not_found',
      () => prisma.assignation.findUnique.mockResolvedValue(null),
    ],
    [
      'assignation d’un autre patient',
      404,
      'not_found',
      () => prisma.assignation.findUnique.mockResolvedValue({ ...assOk, idPatient: 'PAT_2' }),
    ],
    [
      'autre instrument',
      404,
      'not_found',
      () => prisma.assignation.findUnique.mockResolvedValue({ ...assOk, idQuestionnaire: 'Q_ALI_01' }),
    ],
    [
      'assignation annulée',
      404,
      'not_found',
      () => prisma.assignation.findUnique.mockResolvedValue({ ...assOk, statut: 'Annulée' }),
    ],
    [
      'recueil déjà clôturé',
      409,
      'deja_cloture',
      () => prisma.assignation.findUnique.mockResolvedValue({ ...assOk, statutReponses: 'verrouille' }),
    ],
    [
      'date limite dépassée',
      409,
      'date_limite_depassee',
      () => prisma.assignation.findUnique.mockResolvedValue({ ...assOk, dateLimite: '2026-07-29' }),
    ],
    [
      'fenêtre écoulée',
      409,
      'fenetre_ecoulee',
      () => prisma.agendaSommeilNuit.findMany.mockResolvedValue([{ dateNuit: '2026-07-01' }]),
    ],
    [
      'nuit du jour déjà notée',
      409,
      'nuit_du_jour_deja_notee',
      () => prisma.agendaSommeilNuit.findMany.mockResolvedValue([{ dateNuit: '2026-07-30' }]),
    ],
    [
      'relance récente',
      409,
      'relance_recente',
      () => prisma.correspondancePatient.count.mockResolvedValue(MAX_TENTATIVES_FENETRE),
    ],
    [
      // Seuil du 2026-07-31. Le bouton n'est déjà pas rendu ; cette garde couvre
      // l'onglet resté ouvert, dont la page porte un `relancable` de la veille.
      'seule la nuit du jour manque',
      409,
      'non_relancable',
      () => prisma.agendaSommeilNuit.findMany.mockResolvedValue([{ dateNuit: '2026-07-29' }]),
    ],
    [
      // Délai de grâce au démarrage : pas de relance le jour de la consultation.
      'jamais commencé, assigné aujourd’hui',
      409,
      'non_relancable',
      () => {
        prisma.assignation.findUnique.mockResolvedValue({
          ...assOk,
          dateAssignation: new Date('2026-07-30T08:00:00.000Z'),
        });
        prisma.agendaSommeilNuit.findMany.mockResolvedValue([]);
      },
    ],
  ])('%s → %i (%s), sans sendMail', async (_nom, status, reason, arrange) => {
    arrange();
    const res = await POST(req());
    expect(res.status).toBe(status);
    expect((await res.json()).reason).toBe(reason);
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });

  it('les deux causes de non-relance ne rendent PAS le même message', async () => {
    // Un seul `reason` couvre deux populations. Le message, lui, doit coller à
    // ce que le praticien a sous les yeux : « Assigné aujourd'hui — aucune nuit
    // notée » n'a rien à voir avec une nuit encore notable. La table ci-dessus
    // n'assert que `reason` : elle passerait au vert avec un message faux.
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([{ dateNuit: '2026-07-29' }]);
    const nuitDuJour = await (await POST(req())).json();
    expect(nuitDuJour.error).toContain('notable');

    prisma.assignation.findUnique.mockResolvedValue({
      ...assOk,
      dateAssignation: new Date('2026-07-30T08:00:00.000Z'),
    });
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([]);
    const jamaisCommence = await (await POST(req())).json();
    expect(jamaisCommence.error).toContain('deux jours');
    expect(jamaisCommence.error).not.toBe(nuitDuJour.error);
  });

  it('charge utile invalide → 400 sans lire la base', async () => {
    const res = await POST(req({ idPatient: '../etc', idAssignation: '' }));
    expect(res.status).toBe(400);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });
});

describe('POST relance — idempotence', () => {
  it('réserve AVANT d’envoyer, puis marque envoyé (ordre vérifié)', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(ordre).toEqual(['create', 'sendMail', 'update']);

    const data = prisma.correspondancePatient.create.mock.calls[0][0].data;
    expect(data.type).toBe('relance_agenda_sommeil');
    expect(data.statut).toBe('Non_envoye');
    expect(data.sourceType).toBe('agenda_relance');
    // Un créneau par agenda et par jour de Paris.
    expect(data.sourceId).toBe('ASS_1:2026-07-30');
    expect(prisma.correspondancePatient.update.mock.calls[0][0].data.statut).toBe('Envoye');
  });

  it('violation d’unicité (P2002) → 409 et AUCUN envoi', async () => {
    prisma.correspondancePatient.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );
    const res = await POST(req());
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('deja_relance');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('échec d’envoi : trace en Erreur, créneau du jour libéré, réessai possible', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect((await res.json()).reason).toBe('envoi_echoue');

    const maj = prisma.correspondancePatient.update.mock.calls[0][0].data;
    expect(maj.statut).toBe('Erreur');
    // Le sourceId est suffixé : la contrainte n'interdit plus le réessai.
    expect(maj.sourceId).not.toBe('ASS_1:2026-07-30');
    expect(maj.sourceId).toContain('erreur');

    // Second essai, sans obstacle.
    ordre.length = 0;
    const res2 = await POST(req());
    expect(res2.status).toBe(200);
    expect(ordre).toEqual(['create', 'sendMail', 'update']);
  });

  it('le plafond compte TOUTES les tentatives de la fenêtre, quel que soit leur statut', async () => {
    await POST(req());
    const where = prisma.correspondancePatient.count.mock.calls[0][0].where;
    // L'absence de filtre sur `statut` est l'invariant : un échec SMTP peut
    // avoir livré (socket 20 s, 250 perdu), un `update` raté laisse
    // « Non_envoye » sur un message parti. Les deux comptent comme reçus.
    expect(where.statut).toBeUndefined();
    expect(where.referenceId).toBe('ASS_1');
    expect(where.type).toBe('relance_agenda_sommeil');
    const attendu = new Date('2026-07-30T10:00:00.000Z').getTime() - JOURS_ENTRE_RELANCES * 86_400_000;
    expect(where.enregistreLe.gte.getTime()).toBe(attendu);
  });

  it('un échec SMTP ambigu est rattrapable UNE fois, pas deux', async () => {
    // 1re tentative : échec. Le créneau du jour est libéré...
    sendMail.mockRejectedValueOnce(new Error('socket timeout'));
    expect((await POST(req())).status).toBe(502);

    // ...mais la ligne reste comptée : le message a PEUT-ÊTRE été livré.
    prisma.correspondancePatient.count.mockResolvedValue(1);
    expect((await POST(req())).status).toBe(200);

    // 3e clic : le plafond ferme, même si les deux traces disent « Erreur ».
    prisma.correspondancePatient.count.mockResolvedValue(2);
    const troisieme = await POST(req());
    expect(troisieme.status).toBe(409);
    expect((await troisieme.json()).reason).toBe('relance_recente');
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('une panne AVANT l’envoi libère aussi le créneau du jour', async () => {
    // URL SMTP malformée : `creerTransportSmtp` lève avant tout sendMail.
    creerTransportSmtp.mockImplementationOnce(() => {
      throw new Error('URL SMTP invalide');
    });
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(sendMail).not.toHaveBeenCalled();
    // Le sourceId est suffixé : un réessai n'obtient pas « déjà enregistrée ».
    const maj = prisma.correspondancePatient.update.mock.calls[0][0].data;
    expect(maj.statut).toBe('Erreur');
    expect(maj.sourceId).toContain('erreur');
  });
});

describe('POST relance — contenu de l’e-mail', () => {
  it('n’emporte aucune donnée de santé et pointe la page d’accès', async () => {
    await POST(req());
    const envoi = sendMail.mock.calls[0][0];
    expect(envoi.to).toBe(patientOk.email);
    expect(envoi.from).toBe('"Wellneuro" <noreply@wellneuro.fr>');
    const tout = `${envoi.subject}\n${envoi.text}`.toLowerCase();
    for (const interdit of ['sommeil', 'nuit', 'agenda', 'q_som']) {
      expect(tout).not.toContain(interdit);
    }
    expect(envoi.text).toContain('/portail/connexion');
  });

  it('borne la lecture du patient au praticien en session (clause réelle)', async () => {
    await POST(req());
    const where = prisma.patient.findFirst.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: PRATICIEN, mode: 'insensitive' });
  });
});
