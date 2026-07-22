import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { construireReperes, type Repere } from '@/lib/praticien/lectureAsOf';

// GET /api/praticien/reperes?idPatient= — repères datés navigables (SP-TT LOT-01).
//
// Ce sont les seules dates auxquelles la fiche peut être relue : épisodes
// confirmés et réponses reçues. La lecture du passé est ainsi une navigation
// entre événements réels, pas un curseur libre — une date arbitraire serait
// aussi un moyen de sonder l'historique par tâtonnement.
//
// Lecture seule, garde d'appartenance appliquée.

export type ReperesApiResponse =
  | { ok: true; reperes: Repere[] }
  | { ok: false; reason: string; error: string };

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/reperes';

export async function GET(req: Request): Promise<NextResponse<ReperesApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const [episodes, reponses] = await Promise.all([
      prisma.assessmentEpisode.findMany({
        where: { idPatient },
        select: { milestone: true, confirmedAt: true },
      }),
      prisma.questionnaireReponse.findMany({
        where: { idPatient },
        select: { idQuestionnaire: true, dateReponse: true },
      }),
    ]);

    return NextResponse.json({ ok: true, reperes: construireReperes({ episodes, reponses }) });
  } catch (err) {
    console.error('[praticien/reperes GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
