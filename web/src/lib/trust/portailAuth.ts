import { NextResponse } from 'next/server';
import { readPatientSession } from '@/lib/patient-session';
import { isTokenValide, resolvePortailPatientFromSession } from '@/lib/consultation/portail';

type PatientPortail = NonNullable<Awaited<ReturnType<typeof resolvePortailPatientFromSession>>>;

/**
 * Authentification commune des routes TRUST du portail : session cookie
 * obligatoire (posée au gate email) + liaison au token d'accès. Jamais
 * d'email en query string (R9). Réponse neutre en cas d'accès non autorisé.
 */
export async function authentifierPatientPortail(
  req: Request,
  token: string | null,
): Promise<{ patient: PatientPortail; erreur?: never } | { patient?: never; erreur: NextResponse }> {
  if (!isTokenValide((token ?? '').trim())) {
    return {
      erreur: NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiants invalides.' },
        { status: 400 },
      ),
    };
  }
  const session = readPatientSession(req);
  if (!session) {
    return {
      erreur: NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' },
        { status: 401 },
      ),
    };
  }
  const patient = await resolvePortailPatientFromSession((token ?? '').trim(), session);
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
