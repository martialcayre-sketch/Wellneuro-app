import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
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

// Volontairement RÉDUIT à `{ id, titre }` — pas de `categorie`, pas de
// métadonnées fonctionnelles, pas de `phase`. Un instrument suspendu n'est pas
// assignable : la forme incomplète est le garde structurel qui empêche de le
// fondre par erreur dans une liste d'instruments proposables. Ne pas la
// « compléter ».
type QuestionnaireSuspendu = {
  id: string;
  titre: string;
};

export type QuestionnairesApiResponse = {
  questionnaires: Questionnaire[];
  // Ce que le praticien peut RETIRER d'un pack, jamais y ajouter. Le tableau
  // `questionnaires` ci-dessus reste la seule source des instruments actifs.
  suspendus: QuestionnaireSuspendu[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export async function GET(): Promise<NextResponse<QuestionnairesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { questionnaires: [], suspendus: [], unavailable: true, reason: 'unauthenticated' },
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

    // Dérivé de `IDS_SUSPENDUS`, pas d'un second `!q.actif` : c'est le MÊME
    // ensemble que consulte le 409 de `api/praticien/packs` sur les qids
    // ajoutés. Deux définitions du mot « suspendu » dans deux fichiers finiraient
    // par diverger, et l'écran proposerait un retrait que la route refuse — ou
    // l'inverse.
    const suspendus = QUESTIONNAIRES_CATALOG
      .filter(q => IDS_SUSPENDUS.has(q.id))
      .map(q => ({ id: q.id, titre: q.titre }));

    return NextResponse.json({ questionnaires, suspendus });
  } catch {
    return NextResponse.json({
      questionnaires: [],
      suspendus: [],
      unavailable: true,
      reason: 'exception',
    });
  }
}
