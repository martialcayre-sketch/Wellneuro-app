import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { ensureReponses, POINTS_ETAPE, type CheckinRow, type PointEtape } from '@/lib/protocol/checkinDomain';
import { lignesMeteoPatientele, type LigneMeteoPatient } from '@/lib/protocol/meteoPatientele';

export type MeteoAdhesionApiResponse = {
  ok: boolean;
  determinees: LigneMeteoPatient[];
  nbIndeterminees: number;
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<MeteoAdhesionApiResponse, 'error'> = {
  ok: false,
  determinees: [],
  nbIndeterminees: 0,
  unavailable: true,
};

// GET /api/praticien/meteo-adhesion — Météo d'adhésion de la patientèle
// active (accueil Observatoire LOT-02). Lecture seule, agrégat calculé en
// mémoire, JAMAIS persisté (invariants SP-MET). Praticien seul : cette route
// ne doit jamais être importée d'une surface portail/patient.
export async function GET(): Promise<NextResponse<MeteoAdhesionApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const patients = await prisma.patient.findMany({
      where: { actif: true, ...filtrePatientsDuPraticien(emailPraticien(session) ?? '') },
      select: { idPatient: true, prenom: true, nom: true },
      take: 200,
    });
    const ids = patients.map(p => p.idPatient);

    // Une seule requête pour tous les check-ins de la patientèle : le volume
    // est borné par construction (≤ 3 points d'étape + corrections/patient).
    const lignes = ids.length
      ? await prisma.protocolCheckin.findMany({
          where: { idPatient: { in: ids } },
          select: {
            id: true,
            idPatient: true,
            idAssignation: true,
            protocolDraftId: true,
            pointEtape: true,
            reponses: true,
            canal: true,
            supersedesCheckinId: true,
            soumisLe: true,
          },
        })
      : [];

    const checkinsParPatient = new Map<string, CheckinRow[]>();
    for (const ligne of lignes) {
      // Ligne illisible (contrat futur, donnée corrompue) : ignorée — le
      // patient reste « indéterminé » plutôt que deviné (abstention SP-MET).
      if (!POINTS_ETAPE.includes(ligne.pointEtape as PointEtape)) continue;
      let reponses;
      try {
        reponses = ensureReponses(ligne.reponses);
      } catch {
        continue;
      }
      const row: CheckinRow = {
        id: ligne.id,
        idPatient: ligne.idPatient,
        idAssignation: ligne.idAssignation,
        protocolDraftId: ligne.protocolDraftId,
        pointEtape: ligne.pointEtape as PointEtape,
        reponses,
        canal: ligne.canal,
        supersedesCheckinId: ligne.supersedesCheckinId,
        soumisLe: ligne.soumisLe.toISOString(),
      };
      const liste = checkinsParPatient.get(ligne.idPatient);
      if (liste) liste.push(row);
      else checkinsParPatient.set(ligne.idPatient, [row]);
    }

    const { determinees, nbIndeterminees } = lignesMeteoPatientele(
      patients.map(p => ({ idPatient: p.idPatient, nomComplet: `${p.prenom} ${p.nom}`.trim() })),
      checkinsParPatient,
    );
    return NextResponse.json({ ok: true, determinees, nbIndeterminees });
  } catch (err) {
    console.error('[meteo-adhesion GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
