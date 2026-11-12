import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { listeBibliotheque, type BibliothequeEntree } from '@/lib/bibliotheque';
import { listeInstrumentsCabinet, resumeInstrumentCabinet } from '@/lib/instruments';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { cabinetEnvoyable, declarationRequiseAvantEnvoi } from '@/lib/securite/declarationSuicideCabinet';

export type BibliothequeApiResponse = {
  entrees: BibliothequeEntree[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<BibliothequeApiResponse>(
      { entrees: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 },
    );
  }
  try {
    // Catalogue en code + instruments du cabinet du praticien : jamais
    // certifiés, assignables seulement une fois publiés (grille relue).
    const cabinet = await listeInstrumentsCabinet(emailSession);
    const entreesCabinet: BibliothequeEntree[] = cabinet.map(row => {
      const resume = resumeInstrumentCabinet(row);
      return {
        id: row.idInstrument,
        titre: row.titre,
        categorie: row.categorie,
        duree: null,
        description: row.description,
        nbQuestions: resume.nbQuestions,
        scoreMax: resume.scoreMax,
        certifie: false,
        statutCertification: 'non_certifie',
        // NF-7, P2-1 : drapeau allumé, un publié non déclaré reste visible mais
        // ne s'ajoute plus à la file (même prédicat que l'envoi).
        assignable: cabinetEnvoyable(row),
        aliasVers: null,
        passationPraticien: false,
        cabinet: {
          statutRelecture: row.statutRelecture,
          ...(declarationRequiseAvantEnvoi(row) ? { declarationRequise: true as const } : {}),
        },
      };
    });
    return NextResponse.json<BibliothequeApiResponse>({
      entrees: [...listeBibliotheque(), ...entreesCabinet],
    });
  } catch {
    return NextResponse.json<BibliothequeApiResponse>(
      { entrees: [], unavailable: true, reason: 'exception' },
      { status: 500 },
    );
  }
}
