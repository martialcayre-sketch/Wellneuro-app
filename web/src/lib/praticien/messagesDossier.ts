// Messages d'erreur du dossier patient, PARTAGÉS entre les deux surfaces nées
// de la scission de « Questionnaires & packs » (2026-09-16) : le rayon
// Patients (`components/patient/RayonPatientsPanel`) et le rayon assignations
// et packs de la Bibliothèque (`components/bibliotheque/AssignationsPacksPanel`).
//
// UNE SEULE TABLE, ET C'EST LE POINT. Les deux écrans appellent les mêmes
// routes — `/api/praticien/patients` sert les dossiers à l'un et les
// assignations à l'autre — et se partagent donc les mêmes `reason`. Deux
// copies auraient dérivé : un refus corrigé d'un côté, laissé tel quel de
// l'autre, et le praticien lisant deux phrases différentes pour un même refus
// du serveur.

import { MESSAGE_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';

const MESSAGES: Record<string, string> = {
  unauthenticated: 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.',
  duplicate_email: 'Un patient avec cet email existe déjà.',
  patient_not_found: 'Patient introuvable.',
  forbidden: 'Ce dossier n’est pas accessible depuis votre compte.',
  portal_revoked: 'Accès au portail révoqué : réactivez-le avant d’envoyer un lien.',
  // DISTINCT du précédent, et pas un synonyme : `portal_revoked` dit que le
  // rétablissement est IMPOSSIBLE par ce chemin (lien à usage unique) ;
  // celui-ci dit qu'il est possible et n'attend qu'un accord. Ce message ne
  // se lit qu'en repli — la surface pose le dialogue AVANT d'appeler, et ne
  // tombe ici que si l'état affiché était périmé (révocation faite ailleurs).
  retablissement_non_confirme:
    'L’accès de ce patient a été révoqué entre-temps. Rechargez la page, puis réessayez.',
  // Refus servis par le cycle de vie du dossier (IDP2, LOT-01a).
  dossier_cloture: MESSAGE_DOSSIER_CLOS,
  confirmation_manquante: 'Effacement non confirmé : aucune donnée n’a été touchée.',
  questionnaire_not_found: 'Questionnaire introuvable.',
  // Annulation d'assignation (Fil A) : seules les ouvertes sont annulables.
  already_filled: 'Ce questionnaire a déjà été rempli — il ne peut pas être annulé.',
  exception: 'Erreur technique. Vérifiez le terminal Next.js.',
};

/**
 * `invalid_payload` N'EST PAS DANS LA TABLE, et il ne peut pas y être : sa
 * valeur dépend de l'appel. Le serveur sait toujours mieux que nous QUEL champ
 * il a refusé (« Email invalide », « Date de naissance invalide (format
 * attendu : AAAA-MM-JJ) »…), donc le texte de la route passe devant. Ce n'est
 * qu'en son absence qu'on sert une phrase générique — et « Données invalides »
 * en dit plus que « Erreur inconnue », qui serait le repli par défaut.
 */
export function erreurLisible(reason?: string, fallback?: string): string {
  if (reason === 'invalid_payload') return fallback ?? 'Données invalides.';
  return (reason && MESSAGES[reason]) ?? fallback ?? 'Erreur inconnue.';
}
