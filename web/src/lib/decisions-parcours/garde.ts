import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { isDecisionsParcoursEnabled } from './drapeau';
import { MESSAGES_REFUS } from './messages';

// Garde d'accès de la route du cockpit ([[D-343]] §5, §11), sur le patron de
// `garderPhysioTraitements` : le drapeau et la session se testent AVANT
// `verifierAppartenancePatient`, qui JOURNALISE l'accès au dossier (GD-1)
// quand le GET le demande — sans quoi la route consignerait un accès qui n'a
// pas eu lieu. Partagée par le GET et le POST.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const ID_PATIENT_MAX = 64;

export type VerdictGarde =
  | { ok: true; email: string }
  | { ok: false; reason: string; error: string; status: number };

export async function garderDecisionsParcours(idPatient: string, acces?: GabaritAcces): Promise<VerdictGarde> {
  if (!isDecisionsParcoursEnabled()) {
    return { ok: false, reason: 'decisions_desactive', error: MESSAGES_REFUS.decisions_desactive, status: 503 };
  }
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, reason: 'unauthenticated', error: 'Authentification requise.', status: 401 };
  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > ID_PATIENT_MAX) {
    return { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.', status: 400 };
  }
  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, acces);
  if (appartenance === 'introuvable') {
    return { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.', status: 404 };
  }
  if (appartenance === 'autre_praticien') {
    return { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.', status: 403 };
  }
  return { ok: true, email: email ?? '' };
}
