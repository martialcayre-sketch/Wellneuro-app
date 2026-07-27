import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  resolvePortailPatientFromSession,
  consultationCourante,
} from '@/lib/consultation/portail';
import {
  PORTAIL_COOKIE_NAME,
  PORTAIL_COOKIE_OPTIONS,
  signPatientSession,
  readPatientSession,
} from '@/lib/patient-session';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

export type PortailConsultationState = {
  idConsultation: string;
  statut: string;
  motif: string | null;
  consentementDonne: boolean;
  ficheRemplie: boolean;
  anamneseRemplie: boolean;
};

export type PortailSessionResponse =
  | {
      ok: true;
      // `idPatient` sert au navigateur à nommer ses brouillons locaux et à bâtir
      // les liens du portail. Aucune route portail n'accepte un `idPatient` venu
      // du client — elles le lisent toutes du cookie signé.
      patient: { idPatient: string; prenom: string; nom: string; email: string };
      consultation: PortailConsultationState | null;
      premiereAssignation: string | null;
    }
  | { ok: false; reason: string; error: string };

// POST /api/portail/session — « qui suis-je » du portail patient. Depuis le
// LOT-04, l'unique credential est le cookie de session signé `wn_portail`, posé
// à l'atterrissage magic-link/Google. Cette route lit le cookie, rafraîchit la
// session (glissante) et renvoie l'état d'onboarding. Plus de login par
// jeton+email : sans cookie valide, elle répond 401 et le client redirige vers
// la page de connexion.
export async function POST(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);

  const session = readPatientSession(req);
  if (!session) {
    return withCorrelationHeader(
      NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' },
        { status: 401 },
      ),
      requestContext,
    );
  }

  try {
    const patient = await resolvePortailPatientFromSession(session);
    if (!patient) {
      logger.security({
        event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
        domain: 'SECURITY',
        message: 'Accès portail refusé',
        context: finalizeLogContext(requestContext, { statusCode: 403, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' }, { status: 403 }), requestContext);
    }

    const consultation = await consultationCourante(patient.idPatient);

    // Première assignation en attente (pour enchaîner vers le flux questionnaire existant).
    const premiere = await prisma.assignation.findFirst({
      where: { idPatient: patient.idPatient, statut: { not: 'Complété' } },
      orderBy: { dateAssignation: 'asc' },
      select: { idAssignation: true },
    });

    const res = NextResponse.json<PortailSessionResponse>({
      ok: true,
      patient: { idPatient: patient.idPatient, prenom: patient.prenom, nom: patient.nom, email: patient.email },
      consultation: consultation
        ? {
            idConsultation: consultation.idConsultation,
            statut: consultation.statut,
            motif: consultation.motif,
            consentementDonne: consultation.consentement === 'donne',
            ficheRemplie: consultation.ficheSignaletique != null,
            anamneseRemplie: consultation.anamnese != null,
          }
        : null,
      premiereAssignation: premiere?.idAssignation ?? null,
    });

    // Rafraîchit le cookie (session glissante) : réémet l'identité déjà vérifiée
    // par `resolvePortailPatientFromSession`. Une révocation postérieure a déjà
    // court-circuité ce chemin (403 ci-dessus), donc aucune session révoquée
    // n'est prolongée ici.
    res.cookies.set(
      PORTAIL_COOKIE_NAME,
      signPatientSession({ idPatient: patient.idPatient, email: patient.email }),
      PORTAIL_COOKIE_OPTIONS,
    );

    return withCorrelationHeader(res, requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PORTAIL_SESSION_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec ouverture session portail',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}
