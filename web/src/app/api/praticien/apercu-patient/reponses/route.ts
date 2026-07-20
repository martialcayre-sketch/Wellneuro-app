import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';

// Miroir patient-safe de /api/patient/reponses, pour la prévisualisation
// praticien (mécanisme PrévisualisationPatient, cf. CONTRATS_UX_P1.md §3).
// Gate NextAuth au lieu du cookie de session portail — ne jamais élargir le
// `select` ci-dessous (jamais scoresJson/scorePrincipal/interpretation).
export type ApercuPatientReponsesResponse =
  | { ok: true; titre: string; dateReponse: string; statutReponses: string }
  | { ok: false; reason: string; error: string };

// GET /api/praticien/apercu-patient/reponses?id=ASS...
export async function GET(req: Request): Promise<NextResponse<ApercuPatientReponsesResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Non authentifié.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }

    const emailSession = emailPraticien(session);
    if (!emailSession) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Non authentifié.' }, { status: 401 });
    }

    // L'assignation est le point d'entrée, mais l'appartenance se juge sur le
    // patient qu'elle désigne : une assignation d'un autre praticien est
    // « non reconnue », comme une assignation inexistante.
    const ass = await prisma.assignation.findFirst({
      where: { idAssignation, patient: filtrePatientsDuPraticien(emailSession) },
    });
    if (!ass) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Assignation non reconnue.' }, { status: 404 });
    }

    const reponse = await prisma.questionnaireReponse.findFirst({
      where: { idAssignation },
      orderBy: { dateReponse: 'desc' },
      select: { titre: true, dateReponse: true },
    });
    if (!reponse) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Aucune réponse enregistrée pour ce questionnaire.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      titre: reponse.titre,
      dateReponse: reponse.dateReponse.toISOString(),
      statutReponses: ass.statutReponses,
    });
  } catch (err) {
    console.error('[praticien/apercu-patient/reponses GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
