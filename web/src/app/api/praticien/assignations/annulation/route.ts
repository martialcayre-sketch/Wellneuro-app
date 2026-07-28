import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';

// Annulation d'une assignation (Fil A). Petite route dédiée, patron de
// `rendez-vous/annulation` : l'annulation est un STATUT ('Annulée') idempotent,
// jamais une suppression — l'assignation reste une trace. Un `delete` serait de
// toute façon exclu : `ProtocolCheckin` et `AgendaSommeilNuit` référencent
// `Assignation` en FK RESTRICT (il échouerait), et les `QuestionnaireReponse`
// resteraient orphelines (lien souple `String`, sans FK).
//
// Portée : seules les assignations OUVERTES (`statutReponses === 'non_rempli'`,
// jamais soumises) sont annulables. Une assignation déjà remplie porte une
// passation clinique ; l'annuler la masquerait — c'est un autre geste
// (effacement), refusé ici (409). Le refus vit dans la ROUTE, jamais seulement
// dans l'écran : c'est la leçon des trois chemins d'assignation (cf.
// `patient/submit/route.ts`).

export type AnnulationAssignationResponse =
  | { ok: true }
  | {
      ok: false;
      reason: 'unauthenticated' | 'invalid' | 'not_found' | 'already_filled' | 'exception';
      error: string;
    };

function echec(
  reason: 'unauthenticated' | 'invalid' | 'not_found' | 'already_filled' | 'exception',
  error: string,
  status: number,
): NextResponse<AnnulationAssignationResponse> {
  return NextResponse.json<AnnulationAssignationResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<AnnulationAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  try {
    const corps = (await req.json().catch(() => null)) as { idAssignation?: unknown } | null;
    const idAssignation =
      corps && typeof corps.idAssignation === 'string' ? corps.idAssignation.trim() : '';
    if (!idAssignation || idAssignation.length > 64) {
      return echec('invalid', 'Assignation invalide.', 400);
    }

    const emailSession = emailPraticien(session);
    if (!emailSession) return echec('unauthenticated', 'Authentification requise.', 401);

    // Garde d'appartenance : l'assignation d'un autre praticien est introuvable.
    const ass = await prisma.assignation.findFirst({
      where: { idAssignation, patient: filtrePatientsDuPraticien(emailSession) },
      select: { statut: true, statutReponses: true },
    });
    if (!ass) return echec('not_found', 'Assignation introuvable.', 404);

    // Portée : seules les assignations ouvertes sont annulables. Une soumise, en
    // correction ou rouverte porte une passation — refus AVANT toute écriture.
    if (ass.statutReponses !== 'non_rempli' || ass.statut === 'Complété') {
      return echec(
        'already_filled',
        'Ce questionnaire a déjà été rempli — il ne peut pas être annulé.',
        409,
      );
    }

    // Idempotent : une assignation déjà annulée n'est pas ré-écrite.
    if (ass.statut !== 'Annulée') {
      await prisma.assignation.update({
        where: { idAssignation },
        data: { statut: 'Annulée' },
      });
    }

    return NextResponse.json<AnnulationAssignationResponse>({ ok: true });
  } catch (err) {
    console.error('[assignations annulation POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
