import { NextResponse } from 'next/server';
import { readPatientSession } from '@/lib/patient-session';
import { resolvePortailPatientFromSession } from '@/lib/consultation/portail';

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
