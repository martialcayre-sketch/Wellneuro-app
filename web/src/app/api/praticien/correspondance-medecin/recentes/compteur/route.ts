import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien } from '@/lib/praticien/appartenance';

export type CorrespondanceCompteurApiResponse = {
  ok: boolean;
  /** Consignations des 7 derniers jours — alimente le badge du rail. */
  nbRecentes7j: number;
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<CorrespondanceCompteurApiResponse, 'error'> = {
  ok: false,
  nbRecentes7j: 0,
  unavailable: true,
};

const JOUR_MS = 24 * 60 * 60 * 1000;

// GET /api/praticien/correspondance-medecin/recentes/compteur — le nombre, et
// RIEN d'autre.
//
// POURQUOI UNE ROUTE POUR UN ENTIER. Le badge du rail lisait `nbRecentes7j` sur
// `recentes`, qui sert cinq lignes nommées ; le rail JETAIT ces lignes
// (`SidebarRail.tsx`, seul `nbRecentes7j` est retenu). Chaque montage du rail —
// donc chaque chargement du cockpit, et chaque ouverture du tiroir tablette,
// qui monte une seconde instance — résolvait cinq noms de patients et lisait
// leur texte consigné pour afficher un entier.
//
// Ici, `count` ne traverse aucune table d'identité : la réponse ne peut
// structurellement pas porter de donnée patient. C'est une garantie de forme,
// pas une discipline de rendu — et c'est ce qui la rend opposable.
//
// Le filtre `praticienEmail` reste, bien qu'il ne restreigne rien aujourd'hui
// (cabinet mono-praticien) : il est la condition de réouverture écrite d'un
// second compte, et le retirer ferait du compteur un total de cabinet le jour
// où ce compte existerait.
export async function GET(): Promise<NextResponse<CorrespondanceCompteurApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const email = emailPraticien(session) ?? '';
    const seuil7j = new Date(Date.now() - 7 * JOUR_MS);
    const nbRecentes7j = await prisma.correspondanceMedecin.count({
      where: { praticienEmail: email, consigneLe: { gte: seuil7j } },
    });
    return NextResponse.json({ ok: true, nbRecentes7j });
  } catch (err) {
    console.error(
      '[correspondance recentes compteur GET]',
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
