import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { resolvePortailPatientFromSession } from '@/lib/consultation/portail';
import { projeterBilanPatient, whereEnvoiVisible, type BilanPatient } from '@/lib/documents/bilanPatient';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

// GET /api/portail/bilan — le bilan que le praticien a TRANSMIS, s'il en a
// transmis un.
//
// La règle de visibilité est le cœur de cette route, et elle tient en une
// phrase : est visible exactement ce qui a été envoyé, jamais ce qui a été
// seulement rédigé. Donc le dernier `BookletEnvoi` de statut `Envoye` — le seul
// statut de succès écrit par `logBookletEnvoi` (`api/praticien/booklet`).
//
// Cette règle n'est PAS écrite ici : elle est portée par `whereEnvoiVisible`
// (`lib/documents/bilanPatient.ts`), que le hub (`api/portail/assignations`,
// `parcours.bookletEnvoye`) appelle aussi. Les deux surfaces ne peuvent donc
// plus diverger — ce qui est arrivé : le hub proposait « Consulter mon bilan »
// sur un bilan rejeté que cette route refusait de servir. Ce qui reste propre à
// cette route est ce que la fonction ne porte pas, et pour cause : l'`orderBy`
// (tri déterministe) et le `select` (projection minimale).
//
// Ce qui est servi est une projection typée (`BilanPatient`) et non la synthèse :
// axes prioritaires, points de vigilance et questions d'entretien sont réservés
// au praticien et au médecin, et le type de sortie ne les porte pas. Voir
// `lib/documents/bilanPatient.ts`.
//
// Auth : cookie de session portail uniquement (LOT-04). Pas d'`authorizePortail`
// ici — celui-ci exige une assignation, or un patient dont le suivi est terminé
// n'en a plus et garde le droit de relire son bilan.

export type PortailBilanResponse =
  | { ok: true; bilan: BilanPatient | null }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' | 'exception'; error: string };

export async function GET(req: Request): Promise<NextResponse<PortailBilanResponse>> {
  const requestContext = createRequestContext(req);
  const session = readPatientSession(req);
  if (!session) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
      domain: 'SECURITY',
      message: 'Session portail absente ou expirée (bilan)',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json<PortailBilanResponse>(
      { ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' },
      { status: 401 },
    ), requestContext);
  }

  // Applique l'appartenance, le compte actif, la révocation du jeton et
  // `sessionsInvalidesAvant`. Un dossier clôturé (`suiviClotureLe`) n'est
  // DÉLIBÉRÉMENT pas exclu : la clôture interdit un nouvel envoi, elle ne
  // reprend pas au patient un document qu'il a déjà reçu.
  //
  // 403 et non 401 : le cookie est lisible, c'est le COMPTE qui est refusé
  // (désactivé, jeton révoqué, sessions invalidées). Répondre 401 renverrait le
  // client au gate du portail, qui refuserait à son tour — une boucle sans
  // message. Même verdict et même message que `api/portail/session` et
  // `api/portail/fiche`.
  const patient = await resolvePortailPatientFromSession(session);
  if (!patient) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
      domain: 'SECURITY',
      message: 'Accès portail révoqué ou incohérent (bilan)',
      context: finalizeLogContext(requestContext, { statusCode: 403, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json<PortailBilanResponse>(
      { ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' },
      { status: 403 },
    ), requestContext);
  }

  try {
    const envoi = await prisma.bookletEnvoi.findFirst({
      // Statut d'envoi, non-rejet de la synthèse, concordance des patients :
      // la définition est unique et partagée avec le hub. Voir
      // `whereEnvoiVisible`.
      where: whereEnvoiVisible(patient.idPatient),
      // `id` en second critère : deux envois de la même seconde rendraient
      // sinon un résultat non déterministe.
      orderBy: [{ dateEnvoi: 'desc' }, { id: 'desc' }],
      select: {
        dateEnvoi: true,
        // L'INSTANTANÉ de la note, pas le champ vivant de la synthèse.
        // `annoter` reste DÉLIBÉRÉMENT sans garde de cycle de vie : le renvoi
        // corrigé (`forceSend`, opération `Renvoi`) consiste précisément à
        // corriger une note puis à la renvoyer, et un renvoi écrit un
        // instantané frais. C'est cet instantané qui ferme le défaut : ce que
        // le patient lit est ce qui est parti, jamais un texte réécrit depuis.
        // Réserve ouverte : sur un dossier clos, annoter reste possible alors
        // que renvoyer ne l'est plus — divergence non réconciliée, sans effet
        // ici puisque la note affichée est figée.
        noteTransmise: true,
        synthese: { select: { syntheseJson: true, modele: true } },
      },
    });

    if (!envoi) return withCorrelationHeader(NextResponse.json<PortailBilanResponse>({ ok: true, bilan: null }), requestContext);

    return withCorrelationHeader(NextResponse.json<PortailBilanResponse>({
      ok: true,
      bilan: projeterBilanPatient({
        syntheseJson: envoi.synthese.syntheseJson,
        notesPraticien: envoi.noteTransmise,
        modele: envoi.synthese.modele,
        transmisLe: envoi.dateEnvoi,
      }),
    }), requestContext);
  } catch (err) {
    // Un `console.error` nu ne portait ni code d'événement ni `correlationId` :
    // le 500 était introuvable depuis la réponse rendue au patient, alors que
    // les deux refus de cette route se journalisent déjà. Même motif que
    // `api/portail/agenda-alimentaire` — code, domaine, contexte finalisé,
    // erreur passée telle quelle au logger qui l'assainit.
    //
    // Le code est celui de la famille SESSION du portail, comme les deux refus
    // ci-dessus : aucun code n'est inventé pour ce lot. Ce qui est journalisé
    // est le message d'erreur assaini, jamais une note, un nom ni un e-mail —
    // la lecture ne passe à Prisma que des identifiants.
    logger.error({
      event: EVENT_CODES.PORTAIL_SESSION_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Erreur technique à la lecture du bilan patient',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json<PortailBilanResponse>(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    ), requestContext);
  }
}
