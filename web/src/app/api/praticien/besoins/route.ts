import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BESOINS } from '@/lib/equilibre/constants';
import { construireReponsesParQuestionnaire } from '@/lib/equilibre/depuisPrisma';
import { calculerNiveauxPreuveTousLesBesoins, listerSourcesPreuveBesoin } from '@/lib/equilibre/evidence';
import { calculerCouverturesTousLesBesoins } from '@/lib/equilibre/score';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import type { NiveauPreuveBesoin, StrateCode } from '@/lib/equilibre/types';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/besoins';

const TITRE_PAR_QUESTIONNAIRE = new Map(QUESTIONNAIRES_CATALOG.map(q => [q.id, q.titre]));

export type SourcePreuveAffichee = { idQuestionnaire: string; titre: string };

export type BesoinDetail = {
  id: number;
  libellePraticien: string;
  strate: StrateCode;
  couverture: number | null; // 0-100, plus haut = mieux
  niveauPreuve: NiveauPreuveBesoin;
  sources: SourcePreuveAffichee[];
};

export type BesoinsApiResponse =
  | { patient: { idPatient: string; prenom: string; nom: string }; besoins: BesoinDetail[] }
  | { unavailable: true; reason: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'exception' };

function versCent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 100);
}

// GET /api/praticien/besoins?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<BesoinsApiResponse>> {
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
    // Garde d'appartenance : « pas à vous » se rabat sur le 404 existant,
    // sans confirmer l'existence du patient à un autre praticien.
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(email) },
    });
    if (!patient) {
      return NextResponse.json({ unavailable: true, reason: 'patient_not_found' }, { status: 404 });
    }

    // Requête scopée réussie = appartenance prouvée : journaliser la lecture.
    await journaliserAccesDossier({ idPatient, praticienEmail: email, route: ROUTE_JOURNAL, methode: 'GET' });

    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: { dateReponse: 'asc' },
    });

    const reponses = construireReponsesParQuestionnaire(reponsesDb);
    const couvertures = calculerCouverturesTousLesBesoins(reponses);
    const niveauxPreuve = calculerNiveauxPreuveTousLesBesoins(reponses);

    const besoinsDetail: BesoinDetail[] = BESOINS.map(b => ({
      id: b.id,
      libellePraticien: b.libellePraticien,
      strate: b.strate,
      couverture: versCent(couvertures[b.id] ?? null),
      niveauPreuve: niveauxPreuve[b.id],
      sources: listerSourcesPreuveBesoin(b.id, reponses).map(s => ({
        idQuestionnaire: s.idQuestionnaire,
        titre: TITRE_PAR_QUESTIONNAIRE.get(s.idQuestionnaire) ?? s.idQuestionnaire,
      })),
    }));

    return NextResponse.json({
      patient: { idPatient: patient.idPatient, prenom: patient.prenom, nom: patient.nom },
      besoins: besoinsDetail,
    });
  } catch (err) {
    console.error('[besoins GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ unavailable: true, reason: 'exception' }, { status: 500 });
  }
}
