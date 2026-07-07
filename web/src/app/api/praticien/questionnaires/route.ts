import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import { getQuestionnaireFunctionalMetadata } from '@/lib/questionnaires-functional';

type Questionnaire = {
  id: string;
  titre: string;
  categorie: string;
  duree: string;
  categorieFonctionnellePrincipale: string;
  categoriesFonctionnellesSecondaires: string[];
  packsRecommandes: string[];
  phase: 'mvp' | 'phase_2';
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
      .map(q => {
        const functional = getQuestionnaireFunctionalMetadata(q.id, q.categorie);
        return {
          id: q.id,
          titre: q.titre,
          categorie: q.categorie,
          duree: q.duree,
          categorieFonctionnellePrincipale: functional.categoriePrincipale,
          categoriesFonctionnellesSecondaires: functional.categoriesSecondaires,
          packsRecommandes: functional.packsRecommandes,
          phase: functional.phase,
        };
      });

    return NextResponse.json({ questionnaires });
  } catch {
    return NextResponse.json({
      questionnaires: [],
      unavailable: true,
      reason: 'exception',
    });
  }
}
