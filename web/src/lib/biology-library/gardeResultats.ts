import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { isCbResultsEnabled } from './featureFlag';

// Garde d'accès des routes de RÉSULTATS biologiques (étage 2, CB-09,
// [[D-122]] §2) — sœur de `garderProposition`, même ordre, autre drapeau :
// `isCbResultsEnabled` (qui exige AUSSI le rayon, `D-081`). Les résultats
// sont des données de santé nominatives : le drapeau et la session se
// testent AVANT `verifierAppartenancePatient`, qui JOURNALISE l'accès au
// dossier (GD-1) — sans quoi la route consignerait un accès qui n'a pas eu
// lieu. Partagée par le GET (lecture de la série) et le POST (saisie), pour
// le motif du D-072 : deux routes qui recopient le même ordre de gardes sont
// deux routes qu'on peut oublier de corriger ensemble.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

export type VerdictGardeResultats =
  | { ok: true; email: string }
  | { ok: false; reason: string; error: string; status: number };

export async function garderResultats(
  idPatient: string,
  acces?: GabaritAcces,
): Promise<VerdictGardeResultats> {
  if (!isCbResultsEnabled()) {
    return {
      ok: false,
      reason: 'cb_resultats_desactives',
      error: 'La saisie de résultats biologiques n’est pas activée sur cet environnement.',
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
