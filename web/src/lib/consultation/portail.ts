import { prisma } from '@/lib/prisma';
import { isSessionValideForPatient, type PatientSession } from '@/lib/patient-session';

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

// Validation de l'email pré-enregistré par le praticien. Utilisée par le canal
// public de redemande de lien magique (`lien/demande`). Le portail n'a plus de
// « second facteur email » : depuis le LOT-04 l'accès repose sur le cookie de
// session signé, jamais sur un couple jeton+email.
export function isEmailValide(email: string | null | undefined): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type PortailPatient = Awaited<ReturnType<typeof prisma.patient.findUnique>>;

/**
 * Résout le patient d'une requête portail à partir de la SEULE session cookie
 * (LOT-04 : le cookie signé `wn_portail` est l'unique credential). L'identité
 * vient de `session.idPatient` — plus aucun lookup par jeton d'URL, qui n'est
 * plus qu'un segment de routage non secret. `isSessionValideForPatient` applique
 * l'appartenance, le compte actif, la révocation (`accessTokenRevoked`) et
 * `sessionsInvalidesAvant`. Renvoie null si la session ne vaut pas pour ce compte.
 */
export async function resolvePortailPatientFromSession(session: PatientSession): Promise<PortailPatient> {
  const patient = await prisma.patient.findUnique({ where: { idPatient: session.idPatient } });
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
