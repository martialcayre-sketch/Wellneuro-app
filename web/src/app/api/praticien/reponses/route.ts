import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSubScoreRanges, type ScoreRange } from '@/lib/scoring/ranges';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/reponses';

export type ReponseQuestionnaire = {
  idReponse: string;
  idPatient: string;
  emailPatient: string;
  idAssignation: string;
  idQuestionnaire: string;
  titre: string;
  dateSoumission: string;
  scoresParsed: Record<string, unknown> | null;
  scorePrincipal: number | null;
  interpretation: string;
  /* Bornes d'interprétation par sous-score, lues du catalogue côté serveur
   * (A5-R1, affichage ScoreZones) — additif, null si non applicables. */
  subScoreRanges: Record<string, ScoreRange[]> | null;
};

export type ReponsesApiResponse = {
  reponses: ReponseQuestionnaire[];
  error?: string;
};

// GET /api/praticien/reponses?email=<email_du_patient>
export async function GET(req: Request): Promise<NextResponse<ReponsesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ reponses: [], error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ reponses: [], error: 'email requis.' }, { status: 400 });
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return NextResponse.json({ reponses: [], error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    // La route s'interroge par e-mail patient — une valeur devinable. Le scope
    // passe donc par la relation patient : un e-mail qui ne désigne pas un
    // patient du praticien rend une liste vide, comme un e-mail inconnu.
    const pgReponses = await prisma.questionnaireReponse.findMany({
      where: { emailPatient: email, patient: filtrePatientsDuPraticien(emailSession) },
      orderBy: { dateReponse: 'desc' },
    });

    if (pgReponses.length > 0) {
      // Liste non vide = appartenance prouvée ; l'idPatient vient de la ligne
      // (l'e-mail seul ne nomme pas un dossier). Liste vide = rien
      // (anti-oracle) — limite assumée (LOT-00).
      await journaliserAccesDossier({ idPatient: pgReponses[0].idPatient, praticienEmail: emailSession, route: ROUTE_JOURNAL, methode: 'GET' });
    }

    const reponses: ReponseQuestionnaire[] = pgReponses.map(pg => ({
      idReponse: pg.idReponse,
      idPatient: pg.idPatient,
      emailPatient: pg.emailPatient,
      idAssignation: pg.idAssignation ?? '',
      idQuestionnaire: pg.idQuestionnaire,
      titre: pg.titre,
      dateSoumission: pg.dateReponse.toISOString(),
      scoresParsed: (pg.scoresJson as Record<string, unknown>) ?? null,
      scorePrincipal: pg.scorePrincipal ?? null,
      interpretation: pg.interpretation ?? '',
      subScoreRanges: getSubScoreRanges(pg.idQuestionnaire),
    }));

    return NextResponse.json({ reponses });
  } catch (err) {
    console.error('[reponses GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ reponses: [], error: 'Erreur technique.' }, { status: 500 });
  }
}
