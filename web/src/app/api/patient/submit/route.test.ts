import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, after, sendMailAck } = vi.hoisted(() => ({
  sendMailAck: vi.fn().mockResolvedValue({}),
  // `after` EXIGE UN CONTEXTE DE REQUÊTE NEXT, que ce banc n'a pas : il appelle
  // le handler directement. Le mock EXÉCUTE la tâche au lieu de la planifier —
  // c'est ce qui rendrait un travail de fond observable ici. IL EST CONSERVÉ
  // APRÈS LE RETRAIT DU RIDEAU : c'est lui qui permet au banc ci-dessous
  // d'affirmer qu'AUCUN travail de fond n'est planifié sur ce chemin.
  after: vi.fn((tache: () => unknown) => { void tache(); }),
  prisma: {
    // Transaction et verrou de ligne de la création (t04) : par défaut, la
    // transaction rappelle son callback avec ce même objet, et le verrou rend
    // une assignation ouverte. Le banc de concurrence les remplace.
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    assignation: { findUnique: vi.fn(), update: vi.fn() },
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { create: vi.fn() },
    // `syntheseIA` N'EST PAS UN BESOIN DU HANDLER : il est là pour être
    // OBSERVÉ. Sans cette entrée, une génération réintroduite en synchrone
    // lèverait un `TypeError` sur un mock absent — un rouge, mais qui parle de
    // plomberie de test et non de l'invariant violé. Avec elle, la garde
    // ci-dessous peut affirmer qu'aucune synthèse n'est écrite, par quelque
    // chemin que ce soit (constat de revue, PR #1185).
    syntheseIA: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    // Resolver commun : lu seulement pour les ids CAB_ (instruments cabinet).
    cabinetInstrument: { findUnique: vi.fn() },
    // Le journal de correspondance, observé par le banc de [[D-398]] (Q4).
    correspondancePatient: { create: vi.fn() },
  },
}));
type Transaction = (tx: typeof prisma) => Promise<unknown>;
const transactionParDefaut = (fn: Transaction) => fn(prisma);
const verrouParDefaut = async () => [{ statut: 'En attente', statutReponses: 'non_rempli' }];
prisma.$transaction.mockImplementation(transactionParDefaut);
prisma.$queryRaw.mockImplementation(verrouParDefaut);
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
// [[D-277]] §2 : la règle « positive » reste réelle (c'est elle qu'on câble) ;
// seul l'envoi est observé — il a son propre banc.
vi.mock('@/lib/securite/alerteSecuritePraticien', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/securite/alerteSecuritePraticien')>()),
  notifierPraticienSignalSecurite: vi.fn(),
}));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: sendMailAck }) },
}));

import nodemailer from 'nodemailer';
import { signPatientSession } from '@/lib/patient-session';
import { notifierPraticienSignalSecurite } from '@/lib/securite/alerteSecuritePraticien';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { questionSecuriteDe } from '@/lib/clinical/safetyQuestionnaireV1';
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
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
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

  it('★ date de naissance manquante : 409, questionnaire en pause, rien n’est écrit (D-284 §3)', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: null,
    });
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(409);
    expect(((await res.json()) as { reason: string }).reason).toBe('date_naissance_requise');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('★ patient mineur : 409, pause maintenue jusqu’au circuit des mineurs (D-284 §4)', async () => {
    const quinzeAns = new Date(Date.now() - 15 * 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: quinzeAns,
    });
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(409);
    expect(((await res.json()) as { reason: string }).reason).toBe('circuit_mineur_requis');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
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

  // Fil A : refus défensif symétrique à `patient/questionnaire`. Une annulée ne
  // se soumet par aucun chemin — 409 (un retrait, pas une expiration), sans
  // calcul ni écriture.
  it('refuse la soumission d’une assignation annulée : 409, sans rien écrire', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, statut: 'Annulée' });
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'annulee' });
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  // Le portail ne propose plus un instrument suspendu, mais un refus qui ne vit
  // que dans l'écran se contourne par un appel direct — mot pour mot la leçon
  // du lot #406 sur les trois chemins d'assignation. 409 et non 410 : ce n'est
  // pas une expiration, c'est un retrait.
  it('refuse la soumission d’un instrument suspendu, sans rien calculer ni écrire', async () => {
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignation,
      idQuestionnaire: 'Q_FIB_03',
    });
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'questionnaire_suspendu' });
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
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
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
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

// EVA — famille sans interprétation (`D-088`), passation de bout en bout.
//
// DEUX TROUS À PROUVER, et c'est le seul endroit où ils se prouvent :
//
//  1. `sum_no_interpretation` n'émet NI `missing` NI `repondus` (moteur
//     `@/lib/questions`, à comparer à `sum` qui les rend). Sur cette famille,
//     la complétude d'un instrument du cabinet n'est donc tenue que par la
//     garde de CETTE route — pas par le moteur, pas par les bandes (il n'y en
//     a pas). Le banc de recueil partiel ci-dessous EST cette preuve.
//  2. Les bornes `min`/`max` d'un item `number` ne sont que des attributs HTML
//     côté navigateur : c'est la garde serveur de cette route qui les tient,
//     et une EVA n'a que ça.
describe('POST /api/patient/submit — EVA sans interprétation (D-088)', () => {
  const assignationEva = {
    idAssignation: 'ASS_EVA_TEST',
    idPatient: 'PAT_SEED_03',
    emailPatient: 'sophie.nicola@example.test',
    idQuestionnaire: 'CAB_EVA_1',
    titre: 'EVA fatigue — cabinet',
    dateLimite: null,
    statutReponses: 'en_cours',
  };

  const rowEva = {
    idInstrument: 'CAB_EVA_1',
    praticienEmail: 'praticien@wellneuro.fr',
    titre: 'EVA fatigue — cabinet',
    actif: true,
    statutRelecture: 'valide',
    definitionJson: {
      instructions: 'Placez le curseur là où vous vous situez aujourd’hui.',
      sections: [
        {
          id: 'S1',
          questions: [
            {
              id: 'EVA1',
              texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
              type: 'number',
              min: 0,
              max: 10,
              unit: '/10',
            },
            {
              id: 'EVA2',
              texte: 'Où en êtes-vous de votre douleur aujourd’hui ?',
              type: 'number',
              min: 0,
              max: 10,
              unit: '/10',
            },
          ],
        },
      ],
    },
    scoringJson: { type: 'sum_no_interpretation', maxTotal: 20 },
  };

  function requeteEva(answers: Record<string, unknown>): Request {
    const cookie = signPatientSession({
      idPatient: assignationEva.idPatient,
      email: assignationEva.emailPatient,
    });
    return new Request('http://localhost/api/patient/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `wn_portail=${encodeURIComponent(cookie)}`,
      },
      body: JSON.stringify({
        idAssignation: assignationEva.idAssignation,
        idQuestionnaire: assignationEva.idQuestionnaire,
        answers,
      }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignationEva);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignationEva.idPatient,
      actif: true,
      email: assignationEva.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
    });
    prisma.assignation.update.mockResolvedValue(assignationEva);
    prisma.questionnaireReponse.create.mockResolvedValue({});
    prisma.cabinetInstrument.findUnique.mockResolvedValue(rowEva);
  });

  it('persiste la valeur brute et interpretation NULL — aucun verdict fabriqué', async () => {
    const res = await postSubmit(requeteEva({ EVA1: 7, EVA2: 3 }));
    expect(res.status).toBe(200);
    const { data } = prisma.questionnaireReponse.create.mock.calls[0][0] as {
      data: {
        scorePrincipal: number | null;
        interpretation: string | null;
        scoresJson: Record<string, unknown>;
      };
    };
    expect(data.scorePrincipal).toBe(10);
    // La colonne `interpretation` reste NULL : c'est ce que lit la fiche
    // patient pour afficher « — ».
    expect(data.interpretation).toBeNull();
    expect(data.scoresJson.type).toBe('sum_no_interpretation');
    expect(data.scoresJson.interpretation).toBeNull();
    expect(data.scoresJson.maxTotal).toBe(20);
    expect(data.scoresJson.rawAnswers).toEqual({ EVA1: 7, EVA2: 3 });
    // Aucune bande, aucune couleur de sévérité, aucun libellé : le JSON entier
    // est muet là-dessus.
    expect(JSON.stringify(data.scoresJson)).not.toMatch(/label|color|danger|warning|success/);
  });

  // LE TROU PROUVÉ : le moteur ne rend ni `missing` ni `repondus` sur cette
  // famille — la garde de complétude de cette route est la seule qui tienne.
  it('recueil partiel : 400, aucune persistance ni verrouillage', async () => {
    const res = await postSubmit(requeteEva({ EVA1: 7 }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('Réponses incomplètes');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('valeur hors des ancres déclarées : 400, aucune persistance', async () => {
    const res = await postSubmit(requeteEva({ EVA1: 42, EVA2: 3 }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('limites autorisées');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('zéro est une VALEUR, pas une absence : la borne basse passe', async () => {
    const res = await postSubmit(requeteEva({ EVA1: 0, EVA2: 10 }));
    expect(res.status).toBe(200);
    const { data } = prisma.questionnaireReponse.create.mock.calls[0][0] as {
      data: { scorePrincipal: number | null };
    };
    expect(data.scorePrincipal).toBe(10);
  });
});

// BORNES DES SAISIES CHIFFRÉES — ajoutées le 2026-07-31 avec `Q_ALI_03`.
//
// `min`/`max` d'un item `type: 'number'` n'étaient que des attributs HTML : le
// navigateur les respecte, une requête directe non. Le moteur de `Q_ALI_03`
// MULTIPLIE chaque saisie par un coefficient, donc une valeur aberrante ne reste
// pas aberrante — elle devient une estimation d'apport aberrante, persistée en
// base et renvoyée au modèle de synthèse comme une déclaration du patient.
describe('POST /api/patient/submit — bornes des saisies chiffrées', () => {
  function requeteApports(answers: Record<string, unknown>): Request {
    const cookie = signPatientSession({
      idPatient: assignation.idPatient,
      email: assignation.emailPatient,
    });
    return new Request('http://localhost/api/patient/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
      body: JSON.stringify({
        idAssignation: assignation.idAssignation,
        idQuestionnaire: 'Q_ALI_03',
        answers,
      }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, idQuestionnaire: 'Q_ALI_03' });
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
  });

  it.each([
    ['au-dessus du maximum déclaré', { AP1: 999999 }],
    ['négative', { AP1: -50 }],
    ['non numérique', { AP1: 'beaucoup' }],
  ])('refuse une valeur %s : 400, aucune persistance ni verrouillage', async (_libelle, answers) => {
    const res = await postSubmit(requeteApports(answers));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('limites autorisées');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it.each([
    ['un forfait hors des options proposées', { AP1: 1, AP13: 9999 }],
    ['un grignotage hors des options proposées', { AP1: 1, AP14: 999999 }],
  ])('refuse %s : 400, aucune persistance', async (_libelle, answers) => {
    // Les deux items à CHOIX UNIQUE dont la valeur d'option EST la quantité —
    // 15 ou 10 g de forfait, 0/150/300 kcal de grignotage. Un garde calibré sur
    // `type: 'number'` les laissait passer, et `{ AP13: 9999 }` rendait 9 999 g
    // de protéines par jour, affichés sur la fiche avec leur unité.
    const res = await postSubmit(requeteApports(answers));
    expect(res.status).toBe(400);
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
  });

  it('accepte une valeur dans les bornes (contrôle négatif)', async () => {
    // Sans lui, un refus inconditionnel ferait passer les trois cas ci-dessus.
    const res = await postSubmit(requeteApports({ AP1: 2 }));
    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
  });
});

// Les questionnaires fonctionnels — `Q_PLAINTES` — n'ont pas de définition dans
// QUESTIONNAIRE_CATALOGUE : leur donnée clinique est la réponse brute, persistée
// avec un champ error depuis toujours. Le 409 défensif est réservé aux CAB_ —
// ce flux historique ne doit pas casser (assignations réelles en attente en
// production).
//
// Correction du 2026-07-28 : ce commentaire citait `Q_ALI_01` parmi eux, à tort.
// Il est bien au catalogue et scoré comme les autres — le test ci-dessous ne
// l'a d'ailleurs jamais couvert, il n'exerce que `Q_PLAINTES`.
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
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
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

// Les DEUX agendas sont refusés par cette route, et rien d'autre ne le garantit.
//
// Ce refus était non couvert : `Q_SOM_09` depuis son ajout, `Q_ALI_09` en
// héritait. Drapeau éteint, `IDS_SUSPENDUS` masque le trou en empêchant
// l'assignation ; drapeau ALLUMÉ, ces quelques lignes de `route.ts` sont la
// seule chose qui empêche une passation fabriquée — et les supprimer ne faisait
// rougir aucun test. C'est exactement la classe de défaut que ce dépôt traque :
// une protection dont la disparition est silencieuse.
//
// Ce qu'une soumission générique produirait sans elles : une
// `QuestionnaireReponse` à `rawAnswers: {}` et une assignation passée à
// `Complété` / `verrouille`, sur un agenda à zéro journée saisie.
describe('POST /api/patient/submit — les agendas ne se soumettent pas ici', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  });

  it.each([
    ['Q_SOM_09', /nuit par nuit/],
    ['Q_ALI_09', /jour par jour/],
  ])('%s est refusé en 409 sans rien écrire', async (idQuestionnaire, motif) => {
    const agenda = { ...assignation, idQuestionnaire, statutReponses: 'en_cours' };
    prisma.assignation.findUnique.mockResolvedValue(agenda);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: agenda.idPatient,
      actif: true,
      email: agenda.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
    });

    const cookie = signPatientSession({ idPatient: agenda.idPatient, email: agenda.emailPatient });
    const res = await postSubmit(
      new Request('http://localhost/api/patient/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
        body: JSON.stringify({
          idAssignation: agenda.idAssignation,
          idQuestionnaire,
          // Une charge NON VIDE : la route refuse pour l'instrument, pas parce
          // que le corps serait vide (un corps vide part en 400 bien plus haut,
          // et le test passerait alors pour une raison qui n'est pas la sienne).
          answers: { AGD_NB_NUITS: 21 },
        }),
      }),
    );

    expect(res.status).toBe(409);
    const corps = await res.json();
    expect(corps.reason).toBe('unavailable');
    expect(corps.error).toMatch(motif);
    // LE point du test : aucune écriture. Un 409 qui aurait déjà persisté la
    // réponse ne protégerait rien.
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });
});

// ── AUCUNE GÉNÉRATION SUR CE CHEMIN, ET C'EST LA GARDE ─────────────────────
//
// Le rideau a été retiré le 2026-09-17 : une réponse de patient ne déclenche
// plus aucune production de synthèse. Ce banc garde l'ABSENCE, ce qui est plus
// difficile que de garder une présence — il faut un observateur du chemin de
// fond, et c'est `after` qui le donne : le mock exécute ce qu'on lui planifie,
// donc toute tâche rebranchée ici le ferait rougir.
//
// CE QU'IL NE GARDE PAS : que `cartesSynthesesAGenerer` invite bien à générer.
// C'est l'autre moitié de la décision, et elle a ses propres bancs dans
// `lib/fil/cartes.test.ts`. Les deux se lisent ensemble.
describe('POST /api/patient/submit — aucune génération automatique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
  });

  // ★ LA GARDE DU RETRAIT, ET ELLE FERME LES DEUX CHEMINS.
  //
  // L'assertion ne nomme aucun déclencheur : elle constate qu'aucune tâche de
  // fond n'est planifiée, donc un banc nommant `genererSiRideauFerme` serait
  // resté vert devant un second mécanisme.
  //
  // MAIS `after` SEUL NE SUFFISAIT PAS, et c'est une revue qui l'a vu (PR
  // #1185). L'invariant annoncé par [[D-226]] est qu'une soumission ne
  // déclenche AUCUNE production — or une génération réintroduite en SYNCHRONE,
  // sans `after`, passait cette garde. La seconde assertion ferme ce chemin :
  // quel que soit le mode, aucune synthèse n'est écrite sur ce parcours.
  it('ne déclenche AUCUNE production de synthèse — ni différée, ni synchrone', async () => {
    const res = await postSubmit(requeteSoumission());

    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });

  // La soumission reste ce qu'elle était pour le patient : sa réponse est
  // enregistrée, son assignation close, son accusé parti. Le retrait du rideau
  // ne devait rien lui coûter, et ce banc le constate.
  it('enregistre la réponse et clôt l’assignation, comme avant le retrait', async () => {
    const res = await postSubmit(requeteSoumission());

    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalled();
    expect(prisma.assignation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statut: 'Complété' }) }),
    );
  });
});

describe('POST /api/patient/submit — réponse suicidaire : le praticien est prévenu ([[D-277]] §2)', () => {
  const question = questionSecuriteDe('Q_NEU_03')!;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
      praticienEmail: 'praticien@wellneuro.fr',
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
    vi.mocked(notifierPraticienSignalSecurite).mockResolvedValue({ statut: 'Envoye' });
    sendMailAck.mockResolvedValue({});
  });

  function soumettre(valeur: unknown): Request {
    const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
    return new Request('http://localhost/api/patient/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
      body: JSON.stringify({
        idAssignation: assignation.idAssignation,
        idQuestionnaire: assignation.idQuestionnaire,
        answers: { NEU3_Q001: 2, [question.idQuestion]: valeur },
      }),
    });
  }

  it('une réponse autre que « non » prévient le praticien du dossier, APRÈS l’enregistrement', async () => {
    const res = await postSubmit(soumettre(question.options[1].v));
    expect(res.status).toBe(200);
    expect(notifierPraticienSignalSecurite).toHaveBeenCalledWith({
      idPatient: assignation.idPatient,
      praticienEmail: 'praticien@wellneuro.fr',
      source: { type: 'reponse_questionnaire', id: expect.any(String) },
    });
    expect(prisma.questionnaireReponse.create.mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(notifierPraticienSignalSecurite).mock.invocationCallOrder[0]);
  });

  it('« non » ne prévient personne', async () => {
    const res = await postSubmit(soumettre(question.options[0].v));
    expect(res.status).toBe(200);
    expect(notifierPraticienSignalSecurite).not.toHaveBeenCalled();
  });

  it('une adresse introuvable n’empêche ni l’envoi tracé ni la réponse', async () => {
    prisma.patient.findUnique
      .mockResolvedValueOnce({
        idPatient: assignation.idPatient, actif: true, email: assignation.emailPatient,
        accessTokenRevoked: false, sessionsInvalidesAvant: null, dateNaissance: '1985-03-14',
      })
      // Garde d'âge (D-284 §3) : un patient majeur passe.
      .mockResolvedValueOnce({ dateNaissance: '1985-03-14' })
      .mockRejectedValueOnce(new Error('base indisponible'));
    const res = await postSubmit(soumettre(question.options[1].v));
    expect(res.status).toBe(200);
    expect(notifierPraticienSignalSecurite).toHaveBeenCalledWith(expect.objectContaining({ praticienEmail: null }));
  });
});

describe('POST /api/patient/submit — alerte et accusé : en parallèle, échec tracé ([[D-277]] §2-§3)', () => {
  const question = questionSecuriteDe('Q_NEU_03')!;
  const smtpOrigine = process.env.SMTP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.SMTP_URL = 'smtp://test';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient, actif: true, email: assignation.emailPatient,
      accessTokenRevoked: false, sessionsInvalidesAvant: null, dateNaissance: '1985-03-14', praticienEmail: 'praticien@wellneuro.fr',
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
    sendMailAck.mockResolvedValue({});
  });
  afterEach(() => {
    if (smtpOrigine === undefined) delete process.env.SMTP_URL; else process.env.SMTP_URL = smtpOrigine;
  });

  function soumettrePositive(): Request {
    const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
    return new Request('http://localhost/api/patient/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
      body: JSON.stringify({
        idAssignation: assignation.idAssignation,
        idQuestionnaire: assignation.idQuestionnaire,
        answers: { NEU3_Q001: 2, [question.idQuestion]: question.options[1].v },
      }),
    });
  }

  // Deux envois SMTP à la suite dépasseraient le délai du routeur (revue
  // wn-reviewer, P2-1). Si l'accusé attendait l'alerte, il ne partirait
  // jamais tant que l'alerte reste suspendue : ce banc expirerait.
  it('l’accusé part pendant que l’alerte est encore en vol', async () => {
    let liberer: (() => void) | undefined;
    vi.mocked(notifierPraticienSignalSecurite).mockImplementation(
      () => new Promise(resolve => { liberer = () => resolve({ statut: 'Envoye' }); }),
    );
    const enCours = postSubmit(soumettrePositive());
    await vi.waitFor(() => {
      expect(liberer).toBeDefined();
      expect(sendMailAck).toHaveBeenCalled();
    });
    liberer!();
    expect((await enCours).status).toBe(200);
  });

  it('un courriel d’alerte en échec est journalisé en exploitation, la réponse reste 200', async () => {
    vi.mocked(notifierPraticienSignalSecurite).mockResolvedValue({ statut: 'Erreur', erreur: new Error('SMTP') });
    const res = await postSubmit(soumettrePositive());
    expect(res.status).toBe(200);
    expect(vi.mocked(logger.error).mock.calls.map(([payload]) => payload.event))
      .toContain(EVENT_CODES.SECURITE_ALERTE_PRATICIEN_EMAIL_FAILED);
  });
});

// Dette t04 du plan (§8, h1) : deux transmissions concurrentes d'une même
// assignation franchissaient ensemble les refus, lus sans verrou, et créaient
// deux réponses, deux accusés et, sur une réponse suicidaire, deux alertes.
// Le banc sérialise les transactions comme le ferait le verrou de ligne.
describe('POST /api/patient/submit — deux transmissions concurrentes : une seule réponse (t04)', () => {
  const question = questionSecuriteDe('Q_NEU_03')!;
  const smtpOrigine = process.env.SMTP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.SMTP_URL = 'smtp://test';
    // Lecture SANS verrou, périmée pour le second envoi : c'est la course.
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient, actif: true, email: assignation.emailPatient,
      accessTokenRevoked: false, sessionsInvalidesAvant: null, dateNaissance: '1985-03-14', praticienEmail: 'praticien@wellneuro.fr',
    });
    prisma.questionnaireReponse.create.mockResolvedValue({});
    sendMailAck.mockResolvedValue({});
    vi.mocked(notifierPraticienSignalSecurite).mockResolvedValue({ statut: 'Envoye' });
  });
  afterEach(() => {
    prisma.$transaction.mockImplementation(transactionParDefaut);
    prisma.$queryRaw.mockImplementation(verrouParDefaut);
    prisma.assignation.update.mockReset();
    if (smtpOrigine === undefined) delete process.env.SMTP_URL; else process.env.SMTP_URL = smtpOrigine;
  });

  function soumettrePositive(): Request {
    const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
    return new Request('http://localhost/api/patient/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
      body: JSON.stringify({
        idAssignation: assignation.idAssignation,
        idQuestionnaire: assignation.idQuestionnaire,
        answers: { NEU3_Q001: 2, [question.idQuestion]: question.options[1].v },
      }),
    });
  }

  it('la seconde retombe sur « déjà complété » : une réponse, un accusé, une alerte', async () => {
    let statutReponses = 'non_rempli';
    let file: Promise<unknown> = Promise.resolve();
    prisma.$transaction.mockImplementation((fn: Transaction) => {
      const tour = file.then(() => fn(prisma));
      file = tour.catch(() => undefined);
      return tour;
    });
    prisma.$queryRaw.mockImplementation(async () => [{ statut: 'En attente', statutReponses }]);
    prisma.assignation.update.mockImplementation(async () => {
      statutReponses = 'verrouille';
      return assignation;
    });

    const [a, b] = await Promise.all([postSubmit(soumettrePositive()), postSubmit(soumettrePositive())]);
    const statuts = [a.status, b.status].sort();
    expect(statuts).toEqual([200, 409]);
    const refus = await (a.status === 409 ? a : b).json();
    expect(refus.reason).toBe('already_done');
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    expect(prisma.assignation.update).toHaveBeenCalledTimes(1);
    expect(sendMailAck).toHaveBeenCalledTimes(1);
    // accuse_reception@2 (2026-10-23) : l'accusé ne nomme plus le questionnaire.
    expect((sendMailAck.mock.calls[0][0] as { text: string }).text).not.toContain(assignation.titre);
    expect(notifierPraticienSignalSecurite).toHaveBeenCalledTimes(1);
  });

  it('le verrou est un verrou de ligne sur l’assignation, pris avant la création', async () => {
    prisma.assignation.update.mockResolvedValue(assignation);
    expect((await postSubmit(soumettrePositive())).status).toBe(200);
    const [morceaux, ...valeurs] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    expect(morceaux.join('?')).toMatch(/FROM assignations\s+WHERE id_assignation = \?\s+FOR UPDATE/);
    expect(valeurs).toEqual([assignation.idAssignation]);
    expect(prisma.$queryRaw.mock.invocationCallOrder[0])
      .toBeLessThan(prisma.questionnaireReponse.create.mock.invocationCallOrder[0]);
  });

  it('déverrouillée par le praticien : la re-soumission passe, une fois', async () => {
    prisma.$queryRaw.mockImplementation(async () => [{ statut: 'Complété', statutReponses: 'deverrouille' }]);
    prisma.assignation.update.mockResolvedValue(assignation);
    expect((await postSubmit(soumettrePositive())).status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
  });

  it('modification demandée pendant la saisie : « déjà complété », rien n’est écrit', async () => {
    prisma.$queryRaw.mockImplementation(async () => [{ statut: 'Complété', statutReponses: 'modification_demandee' }]);
    const res = await postSubmit(soumettrePositive());
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('already_done');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
  });

  it('date limite passée pendant la saisie : refus sous verrou (410), sauf déverrouillage', async () => {
    prisma.$queryRaw.mockImplementation(async () => [{ statut: 'En attente', statutReponses: 'non_rempli', dateLimite: '2020-01-01' }]);
    const res = await postSubmit(soumettrePositive());
    expect(res.status).toBe(410);
    expect((await res.json()).reason).toBe('expired');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();

    prisma.$queryRaw.mockImplementation(async () => [{ statut: 'Complété', statutReponses: 'deverrouille', dateLimite: '2020-01-01' }]);
    prisma.assignation.update.mockResolvedValue(assignation);
    expect((await postSubmit(soumettrePositive())).status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
  });

  it('transaction en échec : erreur technique, ni accusé ni alerte', async () => {
    prisma.$transaction.mockImplementation(async () => { throw new Error('délai de transaction dépassé'); });
    const res = await postSubmit(soumettrePositive());
    expect(res.status).toBe(500);
    expect(sendMailAck).not.toHaveBeenCalled();
    expect(notifierPraticienSignalSecurite).not.toHaveBeenCalled();
  });

  it('annulée pendant la saisie : refus sous verrou, rien n’est écrit ni envoyé', async () => {
    prisma.$queryRaw.mockImplementation(async () => [{ statut: 'Annulée', statutReponses: 'non_rempli' }]);
    const res = await postSubmit(soumettrePositive());
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('annulee');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
    expect(sendMailAck).not.toHaveBeenCalled();
    expect(notifierPraticienSignalSecurite).not.toHaveBeenCalled();
  });
});

// [[D-398]] §1 (Q4) : une exception à la PRÉPARATION du transport s'écrit
// « Erreur » avec son motif, comme un refus SMTP — elle ne laissait aucune trace.
describe('POST /api/patient/submit — accusé : un échec de préparation se trace', () => {
  const smtpOrigine = process.env.SMTP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    process.env.SMTP_URL = 'smtp://test';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
      dateNaissance: '1985-03-14',
    });
    prisma.assignation.update.mockResolvedValue(assignation);
    prisma.questionnaireReponse.create.mockResolvedValue({});
    sendMailAck.mockResolvedValue({});
  });
  afterEach(() => {
    if (smtpOrigine === undefined) delete process.env.SMTP_URL; else process.env.SMTP_URL = smtpOrigine;
  });

  it('un transport qui lève à sa préparation : trace « Erreur » avec son motif, la réponse reste', async () => {
    vi.spyOn(nodemailer, 'createTransport').mockImplementationOnce(() => {
      throw new Error('transport indisponible');
    });
    const res = await postSubmit(requeteSoumission());
    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    expect(sendMailAck).not.toHaveBeenCalled();
    const lignes = prisma.correspondancePatient.create.mock.calls
      .map(([arg]) => (arg as { data: Record<string, unknown> }).data)
      .filter(data => data.type === 'accuse_questionnaire');
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      statut: 'Erreur',
      referenceType: 'reponse_questionnaire',
      erreurCourte: expect.stringContaining('transport indisponible'),
    });
  });
});
