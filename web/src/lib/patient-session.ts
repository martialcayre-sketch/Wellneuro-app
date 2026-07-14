import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';

// Session portail patient — cookie signé (HMAC-SHA256), sans dépendance externe.
//
// Le portail patient n'utilise PAS NextAuth (réservé aux praticiens). Après
// vérification du gate (token d'accès + email), on pose un cookie signé qui
// porte l'identité du patient pour la durée de la session, afin d'éviter la
// ressaisie de l'email à chaque questionnaire. Le cookie ne contourne aucune
// vérification de propriété côté API : il ne fait que fournir l'email/idPatient,
// que les routes recoupent toujours avec l'assignation ciblée.

export const PORTAIL_COOKIE_NAME = 'wn_portail';

// Durée de vie de la session (12 h glissantes).
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export const PORTAIL_COOKIE_OPTIONS = {
  httpOnly: true,
  // En production (https sur Vercel) le cookie est Secure ; en dev http local
  // on le laisse non-Secure pour qu'il soit bien posé/renvoyé par le navigateur.
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};

export type PatientSession = {
  idPatient: string;
  email: string;
  accessTokenFingerprint: string;
};

type SessionPayload = PatientSession & { exp: number };
type PatientSessionInput = Omit<PatientSession, 'accessTokenFingerprint'> & { accessToken: string };

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // En production NEXTAUTH_SECRET est toujours défini (requis par NextAuth).
    // On échoue explicitement plutôt que de signer avec un secret vide.
    throw new Error('NEXTAUTH_SECRET manquant : impossible de signer la session portail.');
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

function fingerprintAccessToken(accessToken: string): string {
  return createHmac('sha256', getSecret())
    .update(`portail-access-token:${accessToken}`)
    .digest('base64url');
}

export function isPatientSessionBoundToToken(
  session: PatientSession,
  accessToken: string,
): boolean {
  const expected = Buffer.from(fingerprintAccessToken(accessToken));
  const provided = Buffer.from(session.accessTokenFingerprint);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/**
 * Sérialise et signe une session patient. Renvoie la valeur à stocker dans le
 * cookie `wn_portail`, au format `<payloadBase64Url>.<signatureBase64Url>`.
 */
export function signPatientSession({ idPatient, email, accessToken }: PatientSessionInput): string {
  const payload: SessionPayload = {
    idPatient,
    email: email.toLowerCase(),
    accessTokenFingerprint: fingerprintAccessToken(accessToken),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Vérifie une valeur de cookie de session. Renvoie l'identité patient si la
 * signature est valide et la session non expirée, sinon null.
 */
export function verifyPatientSession(raw: string | null | undefined): PatientSession | null {
  if (!raw || typeof raw !== 'string') return null;
  const dot = raw.indexOf('.');
  if (dot <= 0) return null;

  const payloadB64 = raw.slice(0, dot);
  const providedSig = raw.slice(dot + 1);

  let expectedSig: string;
  try {
    expectedSig = sign(payloadB64);
  } catch {
    return null;
  }

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload || typeof payload.idPatient !== 'string' || typeof payload.email !== 'string') return null;
    if (typeof payload.accessTokenFingerprint !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return {
      idPatient: payload.idPatient,
      email: payload.email.toLowerCase(),
      accessTokenFingerprint: payload.accessTokenFingerprint,
    };
  } catch {
    return null;
  }
}

/**
 * Lit et vérifie la session patient depuis le cookie `wn_portail` d'une requête.
 * Renvoie null si absent/invalide/expiré.
 */
export function readPatientSession(req: Request): PatientSession | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (name !== PORTAIL_COOKIE_NAME) continue;
    return verifyPatientSession(decodeURIComponent(part.slice(eq + 1).trim()));
  }
  return null;
}

/** Vérifie la propriété et l'état du portail lorsqu'une route utilise le cookie. */
export async function isSessionAuthorizedForAssignment(
  session: PatientSession | null,
  assignation: { idPatient: string; emailPatient: string },
): Promise<boolean> {
  if (!session) return false;
  if (session.idPatient !== assignation.idPatient) return false;
  const patient = await prisma.patient.findUnique({
    where: { idPatient: session.idPatient },
    select: { actif: true, accessToken: true, accessTokenRevoked: true, email: true },
  });
  if (!patient?.actif || !patient.accessToken || patient.accessTokenRevoked) return false;
  return patient.email.toLowerCase() === session.email
    && isPatientSessionBoundToToken(session, patient.accessToken);
}
