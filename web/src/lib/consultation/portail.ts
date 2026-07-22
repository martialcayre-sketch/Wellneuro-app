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

// Durée de vie d'un jeton d'accès portail. Un lien patient circule par email et
// survit dans les historiques de navigation, les journaux de proxy et les
// transferts de message ; sans péremption il reste valable jusqu'à révocation
// manuelle par le praticien, c'est-à-dire en pratique indéfiniment.
export const TTL_JETON_PORTAIL_JOURS_DEFAUT = 90;

function ttlJetonJours(): number {
  const brut = process.env.WN_PORTAIL_TOKEN_TTL_JOURS;
  if (brut === undefined || brut === '') return TTL_JETON_PORTAIL_JOURS_DEFAUT;
  const valeur = Number(brut);
  // Valeur illisible : on retombe sur le défaut plutôt que de désactiver la
  // péremption par accident. `0` reste l'échappatoire explicite.
  if (!Number.isFinite(valeur) || valeur < 0) return TTL_JETON_PORTAIL_JOURS_DEFAUT;
  return valeur;
}

/**
 * Un jeton est périmé passé son TTL. Deux cas ne périment jamais :
 *
 * - `creeLe` nul — jetons émis avant que la date de création soit posée
 *   systématiquement. Les périmer déconnecterait des patients actifs sans que
 *   personne puisse dater leur lien ; ils restent soumis à la révocation.
 * - TTL à `0` — désactivation explicite, par variable d'environnement.
 */
export function isJetonPerime(creeLe: Date | null | undefined, maintenant: Date = new Date()): boolean {
  const ttlJours = ttlJetonJours();
  if (ttlJours === 0) return false;
  if (!creeLe) return false;
  const ageMs = maintenant.getTime() - creeLe.getTime();
  return ageMs > ttlJours * 24 * 60 * 60 * 1000;
}

/**
 * Résout le patient depuis le token + email. Renvoie null si le token est
 * inconnu, révoqué, périmé, si l'email ne correspond pas, ou si la bascule
 * des liens permanents est passée (R4).
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
  if (isJetonPerime(patient.accessTokenCreatedAt)) return null;
  if (patient.email.toLowerCase() !== email.toLowerCase()) return null;
  return patient;
}

export async function resolvePortailPatientFromSession(token: string, session: PatientSession): Promise<PortailPatient> {
  if (!lienPermanentHonore()) return null;
  const patient = await prisma.patient.findUnique({ where: { accessToken: token } });
  if (!patient || !isSessionValideForPatient(session, patient)) return null;
  if (isJetonPerime(patient.accessTokenCreatedAt)) return null;
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
