import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';

type Questionnaire = {
  id: string;
  titre: string;
  categorie: string;
  duree: string;
};

export type QuestionnairesApiResponse = {
  questionnaires: Questionnaire[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export async function GET(): Promise<NextResponse<QuestionnairesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { questionnaires: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  try {
    const questionnaires = QUESTIONNAIRES_CATALOG
      .filter(q => q.actif)
      .map(q => ({
        id: q.id,
        titre: q.titre,
        categorie: q.categorie,
        duree: q.duree,
      }));

    return NextResponse.json({ questionnaires });
  } catch {
    return NextResponse.json({
      questionnaires: [],
      unavailable: true,
      reason: 'exception',
    });
  }
}
