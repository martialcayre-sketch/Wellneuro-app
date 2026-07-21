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
  // Secure par défaut (production https sur Vercel, ou NEXTAUTH_URL absente) ;
  // non-Secure uniquement quand NEXTAUTH_URL est explicitement en http —
  // même convention que NextAuth. NODE_ENV n'est pas le bon signal : les e2e
  // de parité production (`next start`, PLAYWRIGHT_WEB_SERVER=start) tournent
  // avec NODE_ENV=production mais sur http://localhost, où WebKit refuse de
  // stocker un cookie Secure (Chromium le tolère sur localhost).
  secure: !(process.env.NEXTAUTH_URL ?? 'https://').startsWith('http://'),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};

export type PatientSession = {
  idPatient: string;
  email: string;
  /** Date d'émission, en secondes epoch. Comparée à `sessionsInvalidesAvant`. */
  iat: number;
};

type SessionPayload = PatientSession & { exp: number };
/**
 * Ancien format de charge (avant IDP2 LOT-02) : la session était ancrée au
 * jeton permanent et ne portait pas sa date d'émission. Les cookies déjà émis
 * en production sont de cette forme — ils restent acceptés (voir
 * `verifyPatientSession`).
 */
type LegacySessionPayload = {
  idPatient: string;
  email: string;
  accessTokenFingerprint: string;
  exp: number;
};
type PatientSessionInput = { idPatient: string; email: string };

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

/** État de compte lu en base, suffisant pour statuer sur une session. */
export type PatientSessionAccount = {
  idPatient: string;
  email: string;
  actif: boolean;
  sessionsInvalidesAvant: Date | null;
};

/**
 * La session appartient-elle toujours à ce compte, et n'a-t-elle pas été
 * révoquée ? Remplace l'ancien ancrage au jeton permanent : une réémission de
 * jeton ne déconnecte plus, une révocation coupe (elle pose la date).
 */
export function isSessionValideForPatient(
  session: PatientSession,
  patient: PatientSessionAccount,
): boolean {
  if (session.idPatient !== patient.idPatient) return false;
  if (!patient.actif) return false;
  if (patient.email.toLowerCase() !== session.email) return false;
  if (patient.sessionsInvalidesAvant && session.iat * 1000 <= patient.sessionsInvalidesAvant.getTime()) {
    return false;
  }
  return true;
}

/**
 * Sérialise et signe une session patient. Renvoie la valeur à stocker dans le
 * cookie `wn_portail`, au format `<payloadBase64Url>.<signatureBase64Url>`.
 */
export function signPatientSession({ idPatient, email }: PatientSessionInput): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    idPatient,
    email: email.toLowerCase(),
    iat,
    exp: iat + SESSION_TTL_SECONDS,
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
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as
      Partial<SessionPayload & LegacySessionPayload>;
    if (!payload || typeof payload.idPatient !== 'string' || typeof payload.email !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;

    // Deux formats acceptés, et c'est délibéré : les cookies émis avant IDP2
    // LOT-02 portent l'empreinte du jeton et pas de `iat`. Les refuser
    // déconnecterait au déploiement les accès portail ouverts. Leur date
    // d'émission se reconstruit exactement — la durée de vie est fixe.
    const iat = typeof payload.iat === 'number'
      ? payload.iat
      : typeof payload.accessTokenFingerprint === 'string'
        ? payload.exp - SESSION_TTL_SECONDS
        : null;
    if (iat === null) return null;

    return {
      idPatient: payload.idPatient,
      email: payload.email.toLowerCase(),
      iat,
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
    select: {
      idPatient: true,
      actif: true,
      email: true,
      accessToken: true,
      accessTokenRevoked: true,
      sessionsInvalidesAvant: true,
    },
  });
  if (!patient) return false;
  // `accessToken` et `accessTokenRevoked` restent contrôlés tant que le chemin
  // par jeton existe : ceinture et bretelles jusqu'à son retrait (LOT-04).
  if (!patient.accessToken || patient.accessTokenRevoked) return false;
  return isSessionValideForPatient(session, patient);
}
