import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { isConstatBesoinEnabled } from './drapeau';
import { MESSAGES_REFUS_CONSTAT_BESOIN } from './messages';

// Garde d'accès de la route du constat sur un besoin ([[D-347]] §6, §8), sur
// le patron de `garderDecisionsParcours` : le drapeau et la session se testent
// AVANT `verifierAppartenancePatient`, qui JOURNALISE l'accès au dossier
// (GD-1) quand le GET le demande — sans quoi la route consignerait un accès
// qui n'a pas eu lieu. Partagée par le GET et le POST. L'e-mail rendu est
// celui de la SESSION : la route l'écrit comme auteur, jamais le corps.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const ID_PATIENT_MAX = 64;

export type VerdictGarde =
  | { ok: true; email: string }
  | { ok: false; reason: string; error: string; status: number };

export async function garderConstatsBesoin(idPatient: string, acces?: GabaritAcces): Promise<VerdictGarde> {
  if (!isConstatBesoinEnabled()) {
    return {
      ok: false,
      reason: 'constat_besoin_desactive',
      error: MESSAGES_REFUS_CONSTAT_BESOIN.constat_besoin_desactive,
      status: 503,
    };
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
