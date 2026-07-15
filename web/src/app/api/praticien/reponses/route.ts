import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSubScoreRanges, type ScoreRange } from '@/lib/scoring/ranges';

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

  try {
    const pgReponses = await prisma.questionnaireReponse.findMany({
      where: { emailPatient: email },
      orderBy: { dateReponse: 'desc' },
    });

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
