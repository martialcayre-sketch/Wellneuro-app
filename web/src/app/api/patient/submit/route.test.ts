import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn(), update: vi.fn() },
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { create: vi.fn() },
    // Resolver commun : lu seulement pour les ids CAB_ (instruments cabinet).
    cabinetInstrument: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }) },
}));

import { signPatientSession } from '@/lib/patient-session';
import { POST as postSubmit } from './route';

const assignation = {
  idAssignation: 'ASS_SUBMIT_TEST',
  idPatient: 'PAT_SEED_03',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null,
  statutReponses: 'en_cours',
};

function requeteSoumission(): Request {
  const cookie = signPatientSession({
    idPatient: assignation.idPatient,
    email: assignation.emailPatient,
  });
  return new Request('http://localhost/api/patient/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(cookie)}`,
    },
    body: JSON.stringify({
      idAssignation: assignation.idAssignation,
      idQuestionnaire: assignation.idQuestionnaire,
      answers: { NEU3_Q001: 2, NEU3_Q002: 1 },
    }),
  });
}

// Garde de l'audit 5.0, réserve R1 : le score est calculé et persisté côté
// serveur, jamais renvoyé au navigateur patient. Une donnée transmise mais non
// affichée reste une donnée transmise — le test échoue si elle réapparaît dans
// le corps de réponse, quel que soit le nom de la clé.
describe('POST /api/patient/submit — aucun score renvoyé au patient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessToken: 'TOKEN_TEST',
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
  });

  it('accepte la soumission sans exposer le score ni son interprétation', async () => {
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(200);

    const corps = (await res.json()) as Record<string, unknown>;
    expect(corps.ok).toBe(true);
    expect(corps.titre).toBe(assignation.titre);
    expect(Object.keys(corps).sort()).toEqual(['ok', 'titre']);

    // Filet en profondeur, et non redondant avec la ligne ci-dessus : celle-ci
    // borne les clés de premier niveau, celui-là attrape un score enfoui sous
    // une clé au nom anodin. `titre` en est exclu — il porte le libellé du
    // questionnaire, et un intitulé contenant « score » ferait échouer le test
    // sans qu'aucune donnée n'ait fuité.
    const { titre: _titre, ...horsTitre } = corps;
    expect(JSON.stringify(horsTitre)).not.toMatch(/score|interpretation|total/i);
  });

  it('calcule et persiste le score malgré tout', async () => {
    await postSubmit(requeteSoumission());

    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.questionnaireReponse.create.mock.calls[0][0] as {
      data: { scoresJson: Record<string, unknown> };
    };
    expect(data.scoresJson).toBeTruthy();
    expect(data.scoresJson.rawAnswers).toEqual({ NEU3_Q001: 2, NEU3_Q002: 1 });
  });
});

// Instruments du cabinet : la passation est protégée (l'assignation fait
// autorité, même dépublié/désactivé), la complétude est exigée, et JAMAIS de
// verrouillage sans définition résolue — verrouiller une réponse sans scores
// serait une perte clinique silencieuse.
describe('POST /api/patient/submit — instruments du cabinet', () => {
  const assignationCabinet = {
    idAssignation: 'ASS_CAB_TEST',
    idPatient: 'PAT_SEED_03',
    emailPatient: 'sophie.nicola@example.test',
    idQuestionnaire: 'CAB_SUBMIT_1',
    titre: 'Instrument cabinet test',
    dateLimite: null,
    statutReponses: 'en_cours',
  };

  const rowCabinet = {
    idInstrument: 'CAB_SUBMIT_1',
    praticienEmail: 'praticien@wellneuro.fr',
    titre: 'Instrument cabinet test',
    // Dépublié ET désactivé après l'envoi : la passation doit aboutir malgré tout.
    actif: false,
    statutRelecture: 'brouillon',
    definitionJson: {
      sections: [
        {
          id: 'S1',
          questions: [
            {
              id: 'Q1',
              texte: 'Je dors bien.',
              type: 'likert',
              options: [
                { v: 0, l: 'Non' },
                { v: 1, l: 'Oui' },
              ],
            },
            {
              id: 'Q2',
              texte: 'Je me réveille reposé(e).',
              type: 'likert',
              options: [
                { v: 0, l: 'Non' },
                { v: 1, l: 'Oui' },
              ],
            },
          ],
        },
      ],
    },
    scoringJson: {
      type: 'sum',
      maxTotal: 2,
      interpretation: [{ min: 0, max: 2, label: 'Repère', color: 'warning' }],
    },
  };

  function requeteCabinet(answers: Record<string, unknown>): Request {
    const cookie = signPatientSession({
      idPatient: assignationCabinet.idPatient,
      email: assignationCabinet.emailPatient,
    });
    return new Request('http://localhost/api/patient/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `wn_portail=${encodeURIComponent(cookie)}`,
      },
      body: JSON.stringify({
        idAssignation: assignationCabinet.idAssignation,
        idQuestionnaire: assignationCabinet.idQuestionnaire,
        answers,
      }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignationCabinet);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignationCabinet.idPatient,
      actif: true,
      email: assignationCabinet.emailPatient,
      accessToken: 'TOKEN_TEST',
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
    prisma.assignation.update.mockResolvedValue(assignationCabinet);
    prisma.questionnaireReponse.create.mockResolvedValue({});
    prisma.cabinetInstrument.findUnique.mockResolvedValue(rowCabinet);
  });

  it('score et persiste un instrument dépublié/désactivé après l’envoi', async () => {
    const res = await postSubmit(requeteCabinet({ Q1: 1, Q2: 0 }));
    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.questionnaireReponse.create.mock.calls[0][0] as {
      data: { scorePrincipal: number | null; interpretation: string | null };
    };
    expect(data.scorePrincipal).toBe(1);
    expect(data.interpretation).toBe('Repère');
    expect(prisma.assignation.update).toHaveBeenCalledTimes(1);
  });

  it('réponses incomplètes : 400, aucune persistance ni verrouillage', async () => {
    const res = await postSubmit(requeteCabinet({ Q1: 1 }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('Réponses incomplètes');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('définition introuvable : 409, aucune persistance ni verrouillage', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue(null);
    const res = await postSubmit(requeteCabinet({ Q1: 1, Q2: 0 }));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toContain("n'est plus disponible");
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });
});

// Les questionnaires fonctionnels (Q_PLAINTES, Q_ALI_01…) n'ont pas de
// définition dans QUESTIONNAIRE_CATALOGUE : leur donnée clinique est la
// réponse brute, persistée avec un champ error depuis toujours. Le 409
// défensif est réservé aux CAB_ — ce flux historique ne doit pas casser
// (assignations réelles en attente en production).
describe('POST /api/patient/submit — questionnaires fonctionnels sans définition', () => {
  const assignationFonctionnelle = {
    idAssignation: 'ASS_FONC_TEST',
    idPatient: 'PAT_SEED_03',
    emailPatient: 'sophie.nicola@example.test',
    idQuestionnaire: 'Q_PLAINTES',
    titre: 'Plaintes et symptômes',
    dateLimite: null,
    statutReponses: 'en_cours',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignationFonctionnelle);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignationFonctionnelle.idPatient,
      actif: true,
      email: assignationFonctionnelle.emailPatient,
      accessToken: 'TOKEN_TEST',
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
    prisma.assignation.update.mockResolvedValue(assignationFonctionnelle);
    prisma.questionnaireReponse.create.mockResolvedValue({});
  });

  it('persiste les réponses brutes sans score et verrouille (flux historique)', async () => {
    const cookie = signPatientSession({
      idPatient: assignationFonctionnelle.idPatient,
      email: assignationFonctionnelle.emailPatient,
    });
    const res = await postSubmit(
      new Request('http://localhost/api/patient/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `wn_portail=${encodeURIComponent(cookie)}`,
        },
        body: JSON.stringify({
          idAssignation: assignationFonctionnelle.idAssignation,
          idQuestionnaire: assignationFonctionnelle.idQuestionnaire,
          answers: { plainte_1: 'Fatigue au réveil' },
        }),
      }),
    );
    expect(res.status).toBe(200);
    // Le resolver n'est pas consulté pour un id non CAB_ hors catalogue.
    expect(prisma.cabinetInstrument.findUnique).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    const { data } = prisma.questionnaireReponse.create.mock.calls[0][0] as {
      data: { scoresJson: Record<string, unknown>; scorePrincipal: number | null };
    };
    expect(data.scoresJson.error).toBe('Questionnaire introuvable');
    expect(data.scoresJson.rawAnswers).toEqual({ plainte_1: 'Fatigue au réveil' });
    expect(data.scorePrincipal).toBeNull();
    expect(prisma.assignation.update).toHaveBeenCalledTimes(1);
  });
});
