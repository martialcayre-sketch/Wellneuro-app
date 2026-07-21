import { prisma } from '@/lib/prisma';
import { isSessionValideForPatient, type PatientSession } from '@/lib/patient-session';
import { lienPermanentHonore } from '@/lib/portail/lienPermanent';

import { VERSION_CONSENTEMENT_COURANTE } from '@/lib/trust/contenus/registre';

// Version du texte de consentement réellement présenté : liée au document
// versionné TRUST `consentement_suivi` (le lien version <-> texte est réel
// depuis TRUST LOT-02 ; les consentements v1 déjà recueillis restent valides).
export const CONSENTEMENT_VERSION = VERSION_CONSENTEMENT_COURANTE;

// Finalité RGPD du consentement recueilli au niveau de la consultation. Sert de
// portée : tant que la finalité (et la version) ne changent pas, le consentement
// couvre les questionnaires du pack sans nouveau recueil (P6).
export const FINALITE_CONSENTEMENT =
  'Accompagnement bien-être et suivi neuronutrition personnalisé (hors diagnostic médical).';

// Validation partagée des identifiants du portail patient (token + email).
// Le token identifie le patient (non révoqué) ; l'email pré-enregistré par le
// praticien sert de second facteur. Aucune session NextAuth côté patient.
export function isTokenValide(token: string | null | undefined): boolean {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(token);
}

export function isEmailValide(email: string | null | undefined): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type PortailPatient = Awaited<ReturnType<typeof prisma.patient.findUnique>>;

/**
 * Résout le patient depuis le token + email. Renvoie null si le token est
 * inconnu, révoqué, si l'email ne correspond pas, ou si la bascule des liens
 * permanents est passée (R4).
 *
 * La bascule est vérifiée EN PREMIER et sans toucher la base : passée, le jeton
 * permanent n'est plus un moyen d'identification, et rien ne justifie d'aller le
 * chercher. C'est aussi ce qui garantit qu'aucune réponse ne pourra distinguer
 * un jeton connu d'un jeton inconnu après la bascule.
 */
export async function resolvePortailPatient(token: string, email: string): Promise<PortailPatient> {
  if (!lienPermanentHonore()) return null;
  const patient = await prisma.patient.findUnique({ where: { accessToken: token } });
  if (!patient) return null;
  if (patient.accessTokenRevoked || !patient.actif) return null;
  if (patient.email.toLowerCase() !== email.toLowerCase()) return null;
  return patient;
}

export async function resolvePortailPatientFromSession(token: string, session: PatientSession): Promise<PortailPatient> {
  if (!lienPermanentHonore()) return null;
  const patient = await prisma.patient.findUnique({ where: { accessToken: token } });
  if (!patient || !isSessionValideForPatient(session, patient)) return null;
  return patient;
}

/**
 * Consultation d'onboarding courante d'un patient : la plus récente non
 * encore validée. Renvoie null si aucune (patient déjà onboardé, ou pas
 * encore de consultation créée par le praticien).
 */
export async function consultationCourante(idPatient: string) {
  return prisma.consultation.findFirst({
    where: { idPatient, statut: { not: 'validee' } },
    orderBy: { createdAt: 'desc' },
  });
}
