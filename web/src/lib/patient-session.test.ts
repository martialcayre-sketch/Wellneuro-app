import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patient } = vi.hoisted(() => ({ patient: { findUnique: vi.fn() } }));
vi.mock('@/lib/prisma', () => ({ prisma: { patient } }));

import {
  isSessionAuthorizedForAssignment,
  isSessionValideForPatient,
  signPatientSession,
  verifyPatientSession,
} from './patient-session';

const SECRET = 'secret-de-test-non-production';
const TTL_SECONDS = 12 * 60 * 60;

/** Compte tel que le lisent les routes ; `sessionsInvalidesAvant` à null par défaut. */
function compte(over: Partial<{
  idPatient: string;
  email: string;
  actif: boolean;
  accessToken: string | null;
  accessTokenRevoked: boolean;
  sessionsInvalidesAvant: Date | null;
}> = {}) {
  return {
    idPatient: 'PAT_1',
    email: 'patient@example.test',
    actif: true,
    accessToken: 'TOK_TEST',
    accessTokenRevoked: false,
    sessionsInvalidesAvant: null,
    ...over,
  };
}

/**
 * Forge un cookie AU FORMAT D'AVANT IDP2 LOT-02 : empreinte du jeton permanent,
 * aucune date d'émission. C'est la forme des cookies déjà en circulation.
 */
function cookieAncienFormat(idPatient: string, email: string, exp: number): string {
  const payload = {
    idPatient,
    email,
    accessTokenFingerprint: createHmac('sha256', SECRET)
      .update('portail-access-token:TOK_TEST')
      .digest('base64url'),
    exp,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${createHmac('sha256', SECRET).update(payloadB64).digest('base64url')}`;
}

describe('session patient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = SECRET;
  });

  it('signe et vérifie une session, mais refuse une valeur falsifiée', () => {
    const signed = signPatientSession({ idPatient: 'PAT_1', email: 'Patient@Example.test' });
    expect(verifyPatientSession(signed)).toMatchObject({ idPatient: 'PAT_1', email: 'patient@example.test' });
    expect(verifyPatientSession(signed)?.iat).toBeGreaterThan(0);
    expect(verifyPatientSession(`${signed}x`)).toBeNull();
  });

  it('accepte un cookie émis avant le passage au compte, en reconstruisant sa date', () => {
    // Les 13 accès portail ouverts en production portent cette forme : les
    // refuser déconnecterait au déploiement.
    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const session = verifyPatientSession(cookieAncienFormat('PAT_1', 'patient@example.test', exp));
    expect(session).toMatchObject({ idPatient: 'PAT_1', email: 'patient@example.test' });
    expect(session?.iat).toBe(exp - TTL_SECONDS);
  });

  it('refuse une charge sans date d’émission ni empreinte', () => {
    const payload = { idPatient: 'PAT_1', email: 'patient@example.test', exp: Math.floor(Date.now() / 1000) + 60 };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const forge = `${payloadB64}.${createHmac('sha256', SECRET).update(payloadB64).digest('base64url')}`;
    expect(verifyPatientSession(forge)).toBeNull();
  });

  it('autorise uniquement le patient actif propriétaire de l’assignation', async () => {
    patient.findUnique.mockResolvedValue(compte());
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    const session = verifyPatientSession(signPatientSession({
      idPatient: 'PAT_1', email: 'patient@example.test',
    }));
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(true);
    await expect(isSessionAuthorizedForAssignment(
      verifyPatientSession(signPatientSession({ idPatient: 'PAT_2', email: 'patient@example.test' })),
      assignment,
    )).resolves.toBe(false);
  });

  it('refuse un portail révoqué ou un patient inactif', async () => {
    const session = verifyPatientSession(signPatientSession({
      idPatient: 'PAT_1', email: 'patient@example.test',
    }));
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    patient.findUnique.mockResolvedValueOnce(compte({ accessTokenRevoked: true }));
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(false);
    patient.findUnique.mockResolvedValueOnce(compte({ actif: false }));
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(false);
  });

  it('autorise une assignation historique après correction de l’email patient', async () => {
    const session = verifyPatientSession(signPatientSession({
      idPatient: 'PAT_1', email: 'nouveau@example.test',
    }));
    patient.findUnique.mockResolvedValue(compte({ email: 'nouveau@example.test' }));
    await expect(isSessionAuthorizedForAssignment(session, {
      idPatient: 'PAT_1',
      emailPatient: 'ancien@example.test',
    })).resolves.toBe(true);
  });

  it('survit à une réémission du jeton permanent', async () => {
    // Comportement INVERSÉ par IDP2 LOT-02 : la session appartient au compte,
    // plus au jeton. Réémettre un lien d'accès ne déconnecte plus personne.
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    const session = verifyPatientSession(signPatientSession({
      idPatient: 'PAT_1', email: 'patient@example.test',
    }));
    patient.findUnique.mockResolvedValue(compte({ accessToken: 'TOK_NEW' }));
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(true);
  });

  it('est coupée par une révocation postérieure à son émission', async () => {
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    const session = verifyPatientSession(signPatientSession({
      idPatient: 'PAT_1', email: 'patient@example.test',
    }));
    patient.findUnique.mockResolvedValueOnce(compte({
      sessionsInvalidesAvant: new Date(Date.now() + 60_000),
    }));
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(false);

    // Une révocation ANTÉRIEURE (session ouverte après, donc après réémission)
    // ne coupe pas.
    patient.findUnique.mockResolvedValueOnce(compte({
      sessionsInvalidesAvant: new Date(Date.now() - 60_000),
    }));
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(true);
  });

  // Ce que le backfill de la migration protège. Un cookie ANCIEN FORMAT était
  // tué par la rotation du jeton ; `sessionsInvalidesAvant` initialisée à
  // `access_token_created_at` reproduit exactement cette coupure — sans quoi un
  // cookie volé avant une révocation redeviendrait valide au déploiement.
  it('un cookie ancien format ne survit pas à la rotation qui l’avait tué', async () => {
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const ancien = verifyPatientSession(cookieAncienFormat('PAT_1', 'patient@example.test', exp));

    // Jeton réémis APRÈS l'émission du cookie : la date reprise du backfill est
    // postérieure, la session tombe.
    patient.findUnique.mockResolvedValueOnce(compte({
      accessToken: 'TOK_REEMIS',
      sessionsInvalidesAvant: new Date(Date.now() + 1_000),
    }));
    await expect(isSessionAuthorizedForAssignment(ancien, assignment)).resolves.toBe(false);
  });

  it('coupe une session ouverte avant une révocation déjà passée', async () => {
    // Séquence réelle, les deux dates dans le passé : émission à T0, révocation
    // à T0 + 1 min, lecture à T0 + 2 min.
    vi.useFakeTimers();
    try {
      const t0 = new Date('2026-07-21T10:00:00.000Z');
      vi.setSystemTime(t0);
      const session = verifyPatientSession(signPatientSession({
        idPatient: 'PAT_1', email: 'patient@example.test',
      }));

      vi.setSystemTime(new Date(t0.getTime() + 2 * 60_000));
      patient.findUnique.mockResolvedValue(compte({
        sessionsInvalidesAvant: new Date(t0.getTime() + 60_000),
      }));
      await expect(isSessionAuthorizedForAssignment(
        session,
        { idPatient: 'PAT_1', emailPatient: 'patient@example.test' },
      )).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('isSessionValideForPatient refuse identité, e-mail ou compte inactif discordants', () => {
    const session = verifyPatientSession(signPatientSession({
      idPatient: 'PAT_1', email: 'patient@example.test',
    }))!;
    expect(isSessionValideForPatient(session, compte())).toBe(true);
    expect(isSessionValideForPatient(session, compte({ idPatient: 'PAT_2' }))).toBe(false);
    expect(isSessionValideForPatient(session, compte({ email: 'autre@example.test' }))).toBe(false);
    expect(isSessionValideForPatient(session, compte({ actif: false }))).toBe(false);
    // Portée du jeton, tenue par la fonction elle-même et non par ses appelants :
    // un sixième appelant ne peut plus l'oublier.
    expect(isSessionValideForPatient(session, compte({ accessToken: null }))).toBe(false);
    expect(isSessionValideForPatient(session, compte({ accessTokenRevoked: true }))).toBe(false);
  });
});
