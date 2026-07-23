import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { chargerTrajectoiresCabinet } from '@/lib/praticien/chargementCabinet';
import { calculerMedianesCabinet, type MedianesCabinet } from '@/lib/protocol/cabinet';

// Repère de cabinet (A6-R2, SP-TRAJ LOT-03) — LECTURE SEULE, agrégat
// descriptif : médiane des momentums par jalon sur les cycles du cabinet de
// même versionScore que le cycle courant du patient lu. La réponse n'expose
// AUCUNE donnée individuelle d'un autre patient (médianes + effectifs seuls) ;
// l'accès journalisé (G-TRUST-04) est celui du dossier effectivement consulté
// — le patient de la fiche.

const ROUTE_JOURNAL = '/api/praticien/cabinet-momentum';

export type CabinetMomentumApiResponse =
  | { ok: true; cabinet: MedianesCabinet }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception'; error: string };

// GET /api/praticien/cabinet-momentum?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<CabinetMomentumApiResponse>> {
  const session = await getServerSession(authOptions);
  const email = session ? emailPraticien(session) : null;
  if (!session || !email) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' }, { status: 400 });
  }

  try {
    const appartenance = await verifierAppartenancePatient(idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json({ ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' }, { status: 403 });
    }

    const lignes = await chargerTrajectoiresCabinet(email);
    const patientLu = lignes.find((ligne) => ligne.idPatient === idPatient);
    const cycles = patientLu?.trajectoire.cycles ?? [];
    // Version de référence : celle du cycle COURANT du patient lu (dernier
    // T0 confirmé). Sans cycle ou version inconnue → null, médianes masquées.
    const versionScoreReference = cycles.length > 0 ? cycles[cycles.length - 1].versionScore : null;

    const cabinet = calculerMedianesCabinet(
      lignes.map((ligne) => ligne.trajectoire.cycles),
      versionScoreReference,
    );
    return NextResponse.json({ ok: true, cabinet });
  } catch (err) {
    console.error('[praticien/cabinet-momentum GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
