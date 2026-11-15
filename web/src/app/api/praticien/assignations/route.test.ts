import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    assignation: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    // Lue SEULEMENT sous `WN_ECHEANCE_OBLIGATOIRE` : c'est elle qui dit si
    // l'assignation qu'on pose compose le second rideau.
    syntheseIA: { findFirst: vi.fn() },
    correspondancePatient: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import nodemailer from 'nodemailer';
import { PATCH, POST } from './route';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import {
  MESSAGE_DOSSIER_CLOS,
  MESSAGE_DOSSIER_DESACTIVE,
  RAISON_DOSSIER_CLOS,
  RAISON_DOSSIER_DESACTIVE,
} from '@/lib/patient/cycleDeVie';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessTokenRevoked: false,
};

function request(idQuestionnaire = 'Q_NEU_03'): Request {
  return new Request('http://localhost/api/praticien/assignations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailPatient: patient.email, idQuestionnaire }),
  });
}

describe('POST /api/praticien/assignations — lien portail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.assignation.create.mockResolvedValue({});
    // Dédup : aucune assignation ouverte par défaut ; la transaction
    // interactive passe le client mocké lui-même comme tx.
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    sendMail.mockResolvedValue(undefined);
  });

  // LOT-04 : l'e-mail pointe la page de connexion, plus le lien permanent secret.
  it('envoie un lien vers la page de connexion, jamais un jeton permanent', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0] as { text: string };
    expect(message.text).toContain('https://app.wellneuro.fr/portail/connexion');
    expect(message.text).not.toContain('/portail/TOK');
    expect(message.text).not.toContain('/patient/ASS_');
    // assignation_questionnaire@2 (2026-10-23) : ni titre ni note.
    const titre = (QUESTIONNAIRE_CATALOGUE as Record<string, { titre: string }>).Q_NEU_03.titre;
    expect(titre.length).toBeGreaterThan(0);
    expect(message.text).not.toContain(titre);
    expect(message.text).not.toContain('« ');
    expect(message.text).not.toContain('Note de votre praticien');
  });

  // [[D-398]] §1 (Q4) : une exception à la PRÉPARATION du transport s'écrit
  // « Erreur » avec son motif, comme un refus SMTP — elle ne laissait aucune trace.
  it('un transport qui lève à sa préparation : trace « Erreur » avec son motif, l’assignation reste', async () => {
    vi.spyOn(nodemailer, 'createTransport').mockImplementationOnce(() => {
      throw new Error('transport indisponible');
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.correspondancePatient.create).toHaveBeenCalledTimes(1);
    expect(prisma.correspondancePatient.create.mock.calls[0][0].data).toMatchObject({
      type: 'questionnaire',
      statut: 'Erreur',
      erreurCourte: expect.stringContaining('transport indisponible'),
      referenceType: 'assignation',
    });
  });

  // Le refus doit être DANS la route, pas dans l'écran : retirer l'entrée du
  // sélecteur laisse passer un appel direct. `Q_FIB_03` est nommé exprès — un
  // invariant générique sur « les suspendus » resterait vert si on le
  // réactivait, et c'est cette décision-là qu'on verrouille ici.
  it('refuse un questionnaire suspendu, avant toute écriture et tout envoi', async () => {
    const response = await POST(request('Q_FIB_03'));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      success: false,
      reason: 'questionnaire_suspendu',
    });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('bloque avant écriture lorsque le portail est révoqué', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'portal_revoked' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  // [[D-427]] : un dossier désactivé n'est pas « introuvable » — le praticien
  // l'a sous les yeux. Il reçoit son propre refus, avant toute écriture.
  it('refuse 409 un dossier désactivé, avec son propre refus, avant toute écriture', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, actif: false, suiviClotureLe: null });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      reason: RAISON_DOSSIER_DESACTIVE,
      error: MESSAGE_DOSSIER_DESACTIVE,
    });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('un suivi clôturé reçoit le refus du dossier clos, avant toute écriture', async () => {
    prisma.patient.findFirst.mockResolvedValue({ ...patient, suiviClotureLe: new Date('2026-10-01T10:00:00Z') });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      reason: RAISON_DOSSIER_CLOS,
      error: MESSAGE_DOSSIER_CLOS,
    });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
  });

  it('un dossier clos puis désactivé reste « clos » : la clôture prime', async () => {
    prisma.patient.findFirst.mockResolvedValue({
      ...patient, actif: false, suiviClotureLe: new Date('2026-10-01T10:00:00Z'),
    });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ reason: RAISON_DOSSIER_CLOS });
  });

  it('contrôle négatif — un dossier absent reste « introuvable », en 404', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      reason: 'patient_not_found',
      error: 'Patient introuvable.',
    });
  });

  // Dédup : une assignation OUVERTE du même questionnaire bloque la création
  // et l'e-mail. Le filtre porte sur le statut, pas sur l'existence : une
  // assignation annulée ou complétée ne bloque jamais une repassation.
  it('refuse en 409 deja_assigne si une assignation ouverte existe déjà', async () => {
    prisma.assignation.findMany.mockResolvedValue([{ idQuestionnaire: 'Q_NEU_03' }]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'deja_assigne' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('contrôle négatif — la dédup exclut les statuts terminaux, un statut inconnu bloque', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    const whereDedup = prisma.assignation.findMany.mock.calls[0][0] as {
      where: { statut: { notIn: string[] } };
    };
    expect(whereDedup.where.statut.notIn).toEqual(['Complété', 'Annulée']);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
  });
});

// Quatrième chemin d'envoi, celui que #406 avait nommé sans le fermer :
// déverrouiller ROUVRE la saisie. « Geste délibéré, mais non gardé » — il l'est
// désormais.
describe('PATCH /api/praticien/assignations — déverrouillage', () => {
  function patchRequest(idAssignation = 'ASS_1') {
    return new Request('http://localhost/api/praticien/assignations', {
      method: 'PATCH',
      body: JSON.stringify({ idAssignation }),
    });
  }
  const suiviOuvert = { actif: true, suiviClotureLe: null };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
      patient: suiviOuvert,
    });
    prisma.assignation.updateMany.mockResolvedValue({ count: 1 });
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
  });

  it('refuse de rouvrir la saisie d’un instrument suspendu, avant toute écriture', async () => {
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_FIB_03', idPatient: 'PAT_1', statut: 'En attente',
      patient: suiviOuvert,
    });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'questionnaire_suspendu' });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  // [[D-422]] §2 : ni une annulée ni un suivi clos ne se débloquent, et le
  // refus tombe avant toute écriture, avec le message de la relance.
  it('refuse de débloquer une assignation annulée, avant toute écriture', async () => {
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'Annulée',
      patient: suiviOuvert,
    });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      reason: 'assignation_annulee',
      error: 'Cette assignation est annulée : vous ne l’attendez plus.',
    });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('refuse de débloquer l’assignation d’un suivi clôturé, même une demande de correction', async () => {
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
      statutReponses: 'modification_demandee',
      patient: { actif: true, suiviClotureLe: new Date('2026-10-01T10:00:00Z') },
    });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      reason: RAISON_DOSSIER_CLOS,
      error: MESSAGE_DOSSIER_CLOS,
    });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('lit l’état du suivi avec l’assignation, sous la garde d’appartenance', async () => {
    await PATCH(patchRequest());
    const args = prisma.assignation.findFirst.mock.calls[0][0];
    expect(args.where).toMatchObject({ idAssignation: 'ASS_1', patient: expect.anything() });
    expect(args.include).toEqual({ patient: { select: { actif: true, suiviClotureLe: true } } });
  });

  // [[D-427]] : le refus du dossier désactivé, comme la relance — plus
  // « Rouvrez le suivi » sur un suivi qui n'est pas clos.
  it('un dossier désactivé reçoit son propre refus, comme à la relance', async () => {
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
      patient: { actif: false, suiviClotureLe: null },
    });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      success: false,
      reason: RAISON_DOSSIER_DESACTIVE,
      error: MESSAGE_DOSSIER_DESACTIVE,
    });
    expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
  });

  it('une désactivation concurrente rend le refus du dossier désactivé, jamais un succès', async () => {
    prisma.assignation.findFirst
      .mockResolvedValueOnce({
        idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
        patient: suiviOuvert,
      })
      .mockResolvedValueOnce({
        idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
        patient: { actif: false, suiviClotureLe: null },
      });
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: RAISON_DOSSIER_DESACTIVE });
  });

  it('le dossier d’abord : une annulée d’un suivi clos reçoit le refus du dossier', async () => {
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'Annulée',
      patient: { actif: true, suiviClotureLe: new Date('2026-10-01T10:00:00Z') },
    });
    const response = await PATCH(patchRequest());
    expect(await response.json()).toMatchObject({ reason: RAISON_DOSSIER_CLOS });
  });

  // L'écriture répète les gardes : une annulation passée entre la lecture et
  // l'écriture ne laisse ni annulée déverrouillée, ni succès sans effet.
  it('écrit sous condition des deux gardes d’état', async () => {
    await PATCH(patchRequest());
    expect(prisma.assignation.updateMany.mock.calls[0][0]).toEqual({
      where: {
        idAssignation: 'ASS_1',
        statut: { not: 'Annulée' },
        patient: { actif: true, suiviClotureLe: null },
      },
      data: { statutReponses: 'deverrouille' },
    });
  });

  // La clôture écrit la ligne patient dans une transaction : sans le verrou
  // du dossier AVANT l'écriture, le filtre relationnel lirait encore le suivi
  // ouvert pendant qu'elle s'achève (revue Copilot de #1825).
  it('prend le verrou du dossier avant l’écriture, dans la même transaction', async () => {
    await PATCH(patchRequest());
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.assignation.updateMany.mock.invocationCallOrder[0],
    );
    expect(prisma.$queryRaw.mock.calls[0].slice(1)).toEqual(['PAT_1']);
  });

  it('une annulation concurrente rend le refus de l’annulée, jamais un succès', async () => {
    prisma.assignation.findFirst
      .mockResolvedValueOnce({
        idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
        patient: suiviOuvert,
      })
      .mockResolvedValueOnce({
        idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'Annulée',
        patient: suiviOuvert,
      });
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'assignation_annulee' });
  });

  // Revue PR-Agent de #1825 : zéro ligne écrite puis un état redevenu bon
  // (suivi rouvert) ne doit jamais répondre « introuvable ».
  it('un état redevenu bon entre-temps : un second essai, qui réussit', async () => {
    prisma.assignation.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(prisma.assignation.updateMany).toHaveBeenCalledTimes(2);
  });

  it('deux essais sans effet : une erreur technique, jamais « introuvable »', async () => {
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, reason: 'exception' });
    expect(prisma.assignation.updateMany).toHaveBeenCalledTimes(2);
  });

  it('une ligne disparue entre lecture et écriture rend 404', async () => {
    prisma.assignation.findFirst
      .mockResolvedValueOnce({
        idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
        patient: suiviOuvert,
      })
      .mockResolvedValueOnce(null);
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(404);
  });

  it('contrôle négatif — un instrument courant se déverrouille toujours', async () => {
    const response = await PATCH(patchRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(prisma.assignation.updateMany).toHaveBeenCalledTimes(1);
  });

  // [[D-524]] §2 (réponse 20261114-2145-a) : un `CAB_` dont la copie dit
  // « oui » ne se déverrouille que si sa copie concorde avec la désignation
  // que l'envoi écrirait aujourd'hui, lue SOUS VERROU (`FOR SHARE`). Le refus
  // ne relit pas le drapeau. Les deux sens : constat manqué, constat de trop.
  describe('instrument du cabinet — concordance de la copie (D-524 §2)', () => {
    const DEFINITION = {
      sections: [{ id: 'S', questions: [{ id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] }] }],
    };
    const LIGNE = {
      titre: 'Humeur cabinet',
      definition_json: DEFINITION,
      pose_question_suicide: true,
      question_suicide_id: 'Q2',
      question_suicide_option_non: 0,
    };
    const COPIE = {
      poseQuestionSuicide: true,
      questionSuicideId: 'Q2',
      questionSuicideOptionNon: 0,
      questionSuicideCopie: { instrument: 'Humeur cabinet', enonce: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] },
    };
    let ligneInstrument: unknown[] = [LIGNE];

    function assignationCab(copie: Record<string, unknown>) {
      prisma.assignation.findFirst.mockResolvedValue({
        idAssignation: 'ASS_1', idQuestionnaire: 'CAB_HUMEUR', idPatient: 'PAT_1', statut: 'En attente',
        statutReponses: 'verrouille', ...copie, patient: suiviOuvert,
      });
    }
    function requetesInstrument(): string[] {
      return prisma.$queryRaw.mock.calls
        .map(appel => (appel[0] as TemplateStringsArray).join('?'))
        .filter(sql => sql.includes('cabinet_instruments'));
    }

    beforeEach(() => {
      ligneInstrument = [LIGNE];
      prisma.$queryRaw.mockImplementation((sql: TemplateStringsArray) =>
        Promise.resolve(sql.join('?').includes('cabinet_instruments') ? ligneInstrument : [{ id: 1 }]),
      );
    });

    async function attendreRefus() {
      const response = await PATCH(patchRequest());
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        success: false,
        reason: 'instrument_modifie',
        error: 'La copie de l’instrument prise à l’envoi ne correspond plus à l’instrument, ou elle manque : ce questionnaire ne peut pas être débloqué. Envoyez l’instrument de nouveau, après avoir annulé cette assignation si elle n’a pas encore de réponse.',
      });
      expect(prisma.assignation.updateMany).not.toHaveBeenCalled();
    }

    it('second essai de la boucle : l’instrument est relu sous verrou, et une discordance survenue entre-temps refuse', async () => {
      assignationCab(COPIE);
      // Premier essai : concordance, mais zéro ligne écrite (l'état a bougé).
      prisma.assignation.updateMany.mockResolvedValueOnce({ count: 0 });
      // Puis l'instrument change avant le second essai.
      const q = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 3, l: 'Souvent' }] };
      const discordante = [{ ...LIGNE, definition_json: { sections: [{ id: 'S', questions: [q] }] } }];
      let lectures = 0;
      prisma.$queryRaw.mockImplementation((sql: TemplateStringsArray) => {
        if (!sql.join('?').includes('cabinet_instruments')) return Promise.resolve([{ id: 1 }]);
        lectures += 1;
        return Promise.resolve(lectures === 1 ? [LIGNE] : discordante);
      });
      const response = await PATCH(patchRequest());
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ reason: 'instrument_modifie' });
      expect(lectures).toBe(2);
      expect(prisma.assignation.updateMany).toHaveBeenCalledTimes(1);
    });

    it('copie concordante : déverrouillée, l’instrument lu sous verrou FOR SHARE, la copie jamais réécrite', async () => {
      assignationCab(COPIE);
      const response = await PATCH(patchRequest());
      expect(response.status).toBe(200);
      const [sql] = requetesInstrument();
      expect(sql).toMatch(/FOR SHARE/);
      expect(prisma.assignation.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.assignation.updateMany.mock.calls[0][0].data).toEqual({ statutReponses: 'deverrouille' });
      expect(prisma.assignation.update).not.toHaveBeenCalled();
    });

    it('options renumérotées : refus', async () => {
      assignationCab(COPIE);
      const q = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 1, l: 'Jamais' }, { v: 3, l: 'Souvent' }] };
      ligneInstrument = [{ ...LIGNE, definition_json: { sections: [{ id: 'S', questions: [q] }] }, question_suicide_option_non: 1 }];
      await attendreRefus();
    });

    it('identifiant de la question changé : refus', async () => {
      assignationCab(COPIE);
      const q = { id: 'Q7', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] };
      ligneInstrument = [{ ...LIGNE, definition_json: { sections: [{ id: 'S', questions: [q] }] }, question_suicide_id: 'Q7' }];
      await attendreRefus();
    });

    it('option ajoutée : refus', async () => {
      assignationCab(COPIE);
      const q = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 3, l: 'Souvent' }] };
      ligneInstrument = [{ ...LIGNE, definition_json: { sections: [{ id: 'S', questions: [q] }] } }];
      await attendreRefus();
    });

    it('désignation absente — brouillon à déclaration effacée, instrument introuvable : refus', async () => {
      assignationCab(COPIE);
      ligneInstrument = [{ ...LIGNE, pose_question_suicide: null, question_suicide_id: null, question_suicide_option_non: null }];
      await attendreRefus();
      vi.clearAllMocks();
      assignationCab(COPIE);
      ligneInstrument = [];
      await attendreRefus();
    });

    it('le refus ne relit pas le drapeau : éteint ou allumé, même refus', async () => {
      for (const valeur of ['', 'true']) {
        vi.stubEnv('WN_ENABLE_DECLARATION_SUICIDE_CAB', valeur);
        vi.clearAllMocks();
        assignationCab(COPIE);
        ligneInstrument = [];
        await attendreRefus();
      }
      vi.unstubAllEnvs();
    });

    it('un CAB_ « non » ou non déclaré : inchangé, l’instrument n’est pas lu', async () => {
      for (const pose of [false, null]) {
        vi.clearAllMocks();
        assignationCab({ poseQuestionSuicide: pose, questionSuicideId: null, questionSuicideOptionNon: null, questionSuicideCopie: null });
        ligneInstrument = [];
        const response = await PATCH(patchRequest());
        expect(response.status).toBe(200);
        expect(requetesInstrument()).toEqual([]);
        expect(prisma.assignation.updateMany).toHaveBeenCalledTimes(1);
      }
    });

    it('le catalogue : inchangé, aucun instrument du cabinet lu', async () => {
      prisma.assignation.findFirst.mockResolvedValue({
        idAssignation: 'ASS_1', idQuestionnaire: 'Q_SOM_06', idPatient: 'PAT_1', statut: 'En attente',
        poseQuestionSuicide: true, patient: suiviOuvert,
      });
      const response = await PATCH(patchRequest());
      expect(response.status).toBe(200);
      expect(requetesInstrument()).toEqual([]);
    });
  });
});

// ── L'ÉCHÉANCE DU SECOND RIDEAU (`WN_ECHEANCE_OBLIGATOIRE`) ─────────────────
//
// Le second rideau garde le `T0` ([[D-158]]) : tant qu'il n'est pas rendu, la
// trajectoire entière est arrêtée. Sans échéance, cet arrêt n'a ni terme ni
// rappel — la relance elle-même refuse de partir (`sans_echeance`).
describe('POST /api/praticien/assignations — échéance du second rideau', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.assignation.create.mockResolvedValue({});
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.syntheseIA.findFirst.mockResolvedValue({ idSynthese: 'SYN_1' });
  });

  function sansEcheance(): Request {
    return new Request('http://localhost/api/praticien/assignations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailPatient: patient.email, idQuestionnaire: 'Q_NEU_03' }),
    });
  }

  it('drapeau éteint : rien ne change, et la synthèse n’est même pas lue', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', '');
    const res = await POST(sansEcheance());

    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.findFirst).not.toHaveBeenCalled();
  });

  it('drapeau allumé : refuse 422 une assignation sans échéance sur un dossier déjà synthétisé', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', 'true');
    const res = await POST(sansEcheance());

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ success: false, reason: 'echeance_requise' });
    expect(prisma.assignation.create).not.toHaveBeenCalled();
  });

  // LE PREMIER RIDEAU RESTE LIBRE. Un dossier qui commence se remplit au rythme
  // de l'entrée ; lui imposer un terme au premier jour serait une borne
  // administrative sur un parcours qui démarre.
  it('drapeau allumé : laisse passer tant qu’aucune synthèse n’est validée', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', 'true');
    prisma.syntheseIA.findFirst.mockResolvedValueOnce(null);
    const res = await POST(sansEcheance());

    expect(res.status).toBe(200);
  });

  it('drapeau allumé : une échéance posée passe sans lire la synthèse', async () => {
    vi.stubEnv('WN_ECHEANCE_OBLIGATOIRE', 'true');
    const res = await POST(new Request('http://localhost/api/praticien/assignations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailPatient: patient.email, idQuestionnaire: 'Q_NEU_03', dateLimite: '2026-04-01',
      }),
    }));

    expect(res.status).toBe(200);
    expect(prisma.syntheseIA.findFirst).not.toHaveBeenCalled();
  });
});
