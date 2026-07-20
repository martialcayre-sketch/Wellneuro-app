import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BESOINS } from '@/lib/equilibre/constants';
import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  resoudreDateT0,
} from '@/lib/equilibre/depuisPrisma';
import { calculerNiveauxPreuveTousLesBesoins } from '@/lib/equilibre/evidence';
import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import { calculerObjetsCliniques } from '@/lib/equilibre/objetsCliniques';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import type { JalonMomentum, NiveauPreuveBesoin, ResultatMomentum, StrateCode } from '@/lib/equilibre/types';

export type PrioriteBesoin = {
  besoin: number;
  libellePraticien: string;
  strate: StrateCode; // CORPS | ANCRAGE | ESPRIT — pour la viz cercles concentriques
  couverture: number | null; // 0-100, plus haut = mieux
  niveauPreuve: NiveauPreuveBesoin;
};

export type ObjetsCliniquesReponse = {
  indiceGlobal: number | null; // 0-100
  stabiliteMetabolique: number | null; // 0-100
  reserveAdaptation: number | null; // 0-100
  clarte: number | null; // 0-100
  momentum: ResultatMomentum | null;
};

export type EquilibreApiResponse =
  | {
      patient: { idPatient: string; prenom: string; nom: string; email: string };
      objetsCliniques: ObjetsCliniquesReponse;
      priorites: PrioriteBesoin[];
    }
  | { unavailable: true; reason: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'exception' };

// 0-1 (couverture) -> 0-100 arrondi, en préservant null (jamais 0 par défaut).
function versCent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 100);
}

// GET /api/praticien/equilibre?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<EquilibreApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient) {
    return NextResponse.json({ unavailable: true, reason: 'invalid_payload' }, { status: 400 });
  }

  const email = emailPraticien(session);
  if (!email) {
    return NextResponse.json({ unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }

  try {
    // Garde d'appartenance : le patient d'un autre praticien est traité comme
    // introuvable, pas comme interdit — un 403 confirmerait son existence.
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(email) },
    });
    if (!patient) {
      return NextResponse.json({ unavailable: true, reason: 'patient_not_found' }, { status: 404 });
    }

    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: { dateReponse: 'asc' },
    });

    const reponses = construireReponsesParQuestionnaire(reponsesDb);
    const objets = calculerObjetsCliniques(reponses);
    const niveauxPreuve = calculerNiveauxPreuveTousLesBesoins(reponses);

    // Momentum : delta entre T0 et le jalon le plus avancé déjà atteint.
    const dateT0 = resoudreDateT0(reponsesDb);
    let momentum: ResultatMomentum | null = null;
    if (dateT0) {
      const historique = construireHistoriqueEquilibre(reponsesDb);
      const lectureT0 = resoudreLectureJalon(dateT0, 'T0', historique);
      const jalonsDecroissants: JalonMomentum[] = ['J90', 'J42', 'J21'];
      const dernierJalonAtteint = jalonsDecroissants.find(
        jalon => resoudreLectureJalon(dateT0, jalon, historique) !== null
      );
      const lectureRecente = dernierJalonAtteint
        ? resoudreLectureJalon(dateT0, dernierJalonAtteint, historique)
        : null;
      momentum = calculerDeltaMomentum(lectureT0, lectureRecente);
    }

    const couverturesParBesoin = new Map(
      objets.indiceGlobal.strates.flatMap(s => s.besoins).map(b => [b.besoin, b.couverture])
    );

    const priorites: PrioriteBesoin[] = BESOINS.map(b => ({
      besoin: b.id,
      libellePraticien: b.libellePraticien,
      strate: b.strate,
      couverture: versCent(couverturesParBesoin.get(b.id) ?? null),
      niveauPreuve: niveauxPreuve[b.id],
    })).sort((a, b) => {
      // Non mesurés en dernier ; sinon couverture croissante (creux d'abord).
      if (a.couverture === null && b.couverture === null) return 0;
      if (a.couverture === null) return 1;
      if (b.couverture === null) return -1;
      return a.couverture - b.couverture;
    });

    return NextResponse.json({
      patient: { idPatient: patient.idPatient, prenom: patient.prenom, nom: patient.nom, email: patient.email },
      objetsCliniques: {
        indiceGlobal: objets.indiceGlobal.scoreGlobal,
        stabiliteMetabolique: versCent(objets.stabiliteMetabolique),
        reserveAdaptation: versCent(objets.reserveAdaptation),
        clarte: versCent(objets.clarte),
        momentum,
      },
      priorites,
    });
  } catch (err) {
    console.error('[equilibre GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ unavailable: true, reason: 'exception' }, { status: 500 });
  }
}
