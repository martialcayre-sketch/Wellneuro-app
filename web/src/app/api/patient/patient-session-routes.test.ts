import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { GET as getAssignations } from './assignations/route';
import { POST as postConsentement } from './consentement/route';
import { GET as getEquilibre } from './equilibre/route';
import { GET as getQuestionnaire } from './questionnaire/route';
import { GET as getReponses } from './reponses/route';
import { POST as postSubmit } from './submit/route';

const assignation = {
  idAssignation: 'ASS_SESSION_TEST',
  idPatient: 'PAT_PROPRIETAIRE',
  emailPatient: 'adresse-partagee@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null,
  statutReponses: 'en_cours',
};

function cookieAutrePatient(): string {
  return signPatientSession({ idPatient: 'PAT_AUTRE', email: assignation.emailPatient });
}

function getRequest(path: string): Request {
  return new Request(`http://localhost${path}?id=${assignation.idAssignation}`, {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookieAutrePatient())}` },
  });
}

function postRequest(path: string, body: object): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(cookieAutrePatient())}`,
    },
    body: JSON.stringify(body),
  });
}

describe('routes patient — isolation par idPatient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
  });

  it('refuse la liste des assignations à un autre patient ayant le même email', async () => {
    expect((await getAssignations(getRequest('/api/patient/assignations'))).status).toBe(404);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('refuse les réponses et Mon équilibre avant toute lecture clinique', async () => {
    expect((await getReponses(getRequest('/api/patient/reponses'))).status).toBe(404);
    expect((await getEquilibre(getRequest('/api/patient/equilibre'))).status).toBe(404);
    expect(prisma.questionnaireReponse.findFirst).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('refuse consentement et soumission avant toute écriture', async () => {
    const consentement = await postConsentement(postRequest('/api/patient/consentement', {
      idAssignation: assignation.idAssignation,
      action: 'donner',
    }));
    const soumission = await postSubmit(postRequest('/api/patient/submit', {
      idAssignation: assignation.idAssignation,
      answers: { SIGH_Q001: 0 },
    }));
    expect(consentement.status).toBe(403);
    expect(soumission.status).toBe(403);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
  });
});

// ── SANS SESSION PORTAIL, TOUT EST REFUSÉ (LOT-04) ──────────────────────────
// Le repli email est RETIRÉ de ces six routes. Ce qui se ferme n'est pas
// seulement le compte révoqué ou désactivé : c'est TOUT accès sans cookie
// `wn_portail`, y compris muni de l'identifiant d'assignation ET de l'adresse
// exacts — deux valeurs qui voyagent ensemble dans le mail d'invitation, et
// dont la seule possession suffisait jusqu'ici à ouvrir la surface patient.
//
// Le repli n'était plus atteint par aucun appelant légitime : la navigation
// vers `/patient/[idAssignation]` est redirigée vers `/portail/connexion`
// (next.config.mjs), et les trois entrées qui posent le cookie — lien magique,
// Google, jeton d'accès — sont actives en production. Ce qui restait était donc
// une surface d'attaque sans usage, pas une compatibilité.
//
// L'ABSENCE de session refuse désormais en 401 sur les six routes, aligné sur
// `protocole/route.ts` : le client (`portail/[token]/questionnaires/[idAssignation]`)
// ne redirige vers le gate que sur 400/401 — une session expirée doit rester
// récupérable, pas se présenter comme un lien mort (404) ou un refus définitif
// (403). Seul CE cas change : une session présente mais pointant sur un autre
// patient reste refusée avec le code que la route rendait déjà (404/403,
// bloc « isolation par idPatient » ci-dessus) — ce n'est pas le défaut corrigé
// ici.
describe('routes patient — aucune session portail : refus systématique', () => {
  // Les valeurs qu'un attaquant a sous la main s'il a lu le mail d'invitation.
  function getSansCookie(path: string): Request {
    return new Request(
      `http://localhost${path}?id=${assignation.idAssignation}` +
        `&email=${encodeURIComponent(assignation.emailPatient)}`,
    );
  }

  function postSansCookie(path: string, body: object): Request {
    return new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: assignation.emailPatient, ...body }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    // Volontairement peuplé : le refus doit tomber AVANT d'y toucher.
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
  });

  it('refuse les quatre lectures (401), même avec l’adresse exacte', async () => {
    expect((await getQuestionnaire(getSansCookie('/api/patient/questionnaire'))).status).toBe(401);
    expect((await getAssignations(getSansCookie('/api/patient/assignations'))).status).toBe(401);
    expect((await getReponses(getSansCookie('/api/patient/reponses'))).status).toBe(401);
    expect((await getEquilibre(getSansCookie('/api/patient/equilibre'))).status).toBe(401);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findFirst).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('refuse consentement et soumission avant toute écriture (401)', async () => {
    const consentement = await postConsentement(
      postSansCookie('/api/patient/consentement', {
        idAssignation: assignation.idAssignation,
        action: 'donner',
      }),
    );
    const soumission = await postSubmit(
      postSansCookie('/api/patient/submit', {
        idAssignation: assignation.idAssignation,
        answers: { SIGH_Q001: 0 },
      }),
    );
    expect(consentement.status).toBe(401);
    expect(soumission.status).toBe(401);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
  });

  it('le refus précède la base : l’assignation n’est même pas lue', async () => {
    // Ce que le repli email ne pouvait pas offrir — il devait charger
    // l'assignation pour comparer l'adresse. Sans session, plus une seule
    // requête n'est émise pour un identifiant deviné.
    await getQuestionnaire(getSansCookie('/api/patient/questionnaire'));
    await getAssignations(getSansCookie('/api/patient/assignations'));
    await getReponses(getSansCookie('/api/patient/reponses'));
    await getEquilibre(getSansCookie('/api/patient/equilibre'));
    await postConsentement(
      postSansCookie('/api/patient/consentement', {
        idAssignation: assignation.idAssignation,
        action: 'donner',
      }),
    );
    await postSubmit(
      postSansCookie('/api/patient/submit', {
        idAssignation: assignation.idAssignation,
        answers: { SIGH_Q001: 0 },
      }),
    );
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });
});

// ── LE CHEMIN NORMAL RESTE OUVERT ───────────────────────────────────────────
// Le pendant obligatoire du bloc précédent : retirer le repli ne doit rien
// fermer au patient qui arrive par le portail, cookie en main. Sans ces
// assertions, « tout refuser » passerait la suite au vert.
describe('routes patient — session du propriétaire : accès normal', () => {
  function getAvecCookie(path: string): Request {
    const cookie = signPatientSession({
      idPatient: assignation.idPatient,
      email: assignation.emailPatient,
    });
    return new Request(`http://localhost${path}?id=${assignation.idAssignation}`, {
      headers: { cookie: `wn_portail=${encodeURIComponent(cookie)}` },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findFirst.mockResolvedValue({
      titre: assignation.titre,
      dateReponse: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('sert les quatre lectures au propriétaire de l’assignation (200)', async () => {
    expect((await getQuestionnaire(getAvecCookie('/api/patient/questionnaire'))).status).toBe(200);
    expect((await getAssignations(getAvecCookie('/api/patient/assignations'))).status).toBe(200);
    expect((await getReponses(getAvecCookie('/api/patient/reponses'))).status).toBe(200);
    expect((await getEquilibre(getAvecCookie('/api/patient/equilibre'))).status).toBe(200);
  });
});
