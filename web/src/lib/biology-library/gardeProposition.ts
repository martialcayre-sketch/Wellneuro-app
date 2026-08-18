import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { isCbPropositionEnabled } from './featureFlag';

// Garde d'accès partagée par les routes de la proposition de bilan ([[D-073]]).
//
// ELLE EST PARTAGÉE, ET C'EST LE POINT. Deux routes qui recopient le même
// ordre de gardes sont deux routes qu'on peut oublier de corriger ensemble —
// c'est le motif qui a fait retirer la garde jumelle du service au [[D-072]].
// L'ordre lui-même n'est pas décoratif : `verifierAppartenancePatient`
// JOURNALISE l'accès au dossier, donc le drapeau et la session se testent
// AVANT elle, sans quoi la route consignerait un accès qui n'a pas eu lieu.
//
// Ce module ne rend PAS de `NextResponse` : chaque route porte son propre type
// de réponse, et un module de `lib/` n'a pas à connaître la couche HTTP.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export type VerdictGarde =
  | { ok: true; email: string }
  | { ok: false; reason: string; error: string; status: number };

export async function garderProposition(
  idPatient: string,
  acces?: GabaritAcces,
): Promise<VerdictGarde> {
  if (!isCbPropositionEnabled()) {
    return {
      ok: false,
      reason: 'cb_proposition_desactivee',
      error: 'La proposition de bilan biologique n’est pas activée sur cet environnement.',
      status: 503,
    };
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, reason: 'unauthenticated', error: 'Authentification requise.', status: 401 };
  }
  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
    return { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.', status: 400 };
  }
  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, acces);
  if (appartenance === 'introuvable') {
    return { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.', status: 404 };
  }
  if (appartenance === 'autre_praticien') {
    return {
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
      status: 403,
    };
  }
  return { ok: true, email: email ?? '' };
}
