import { NextResponse } from 'next/server';
import { readPatientSession } from '@/lib/patient-session';
import { resolvePortailPatientFromSession } from '@/lib/consultation/portail';
import {
  EN_TETE_DOSSIER_PAGE,
  MESSAGE_AUTRE_DOSSIER,
  RAISON_AUTRE_DOSSIER,
  segmentEstLeDossier,
} from '@/lib/portail/dossierPage';

type PatientPortail = NonNullable<Awaited<ReturnType<typeof resolvePortailPatientFromSession>>>;

/**
 * Authentification commune des routes TRUST du portail : cookie de session
 * obligatoire (LOT-04 — le cookie signé `wn_portail` est le seul credential).
 * Jamais d'email en query string (R9). Réponse neutre en cas d'accès non
 * autorisé. Le segment d'URL n'est plus un facteur d'authentification.
 */
export async function authentifierPatientPortail(
  req: Request,
): Promise<{ patient: PatientPortail; erreur?: never } | { patient?: never; erreur: NextResponse }> {
  const session = readPatientSession(req);
  if (!session) {
    return {
      erreur: NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' },
        { status: 401 },
      ),
    };
  }
  const patient = await resolvePortailPatientFromSession(session);
  if (!patient) {
    return {
      erreur: NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' },
        { status: 403 },
      ),
    };
  }
  return { patient };
}

/**
 * Garde du dossier de la page ([[D-481]], complément DOC-12, Q8 a) : à appeler
 * par une route d'écriture du portail APRÈS `authentifierPatientPortail` (401 et
 * 403 passent avant, inchangés) et AVANT toute lecture du corps, toute écriture
 * et toute notification. Renvoie le refus 409 (T-51) quand le segment de la page
 * qui envoie, porté par l'en-tête `EN_TETE_DOSSIER_PAGE`, n'est pas l'`idPatient`
 * de la session — absent compris ; sinon `null`.
 */
export function refusAutreDossier(req: Request, idPatient: string): NextResponse | null {
  if (segmentEstLeDossier(req.headers.get(EN_TETE_DOSSIER_PAGE), idPatient)) return null;
  return NextResponse.json(
    { ok: false, reason: RAISON_AUTRE_DOSSIER, error: MESSAGE_AUTRE_DOSSIER },
    { status: 409 },
  );
}
