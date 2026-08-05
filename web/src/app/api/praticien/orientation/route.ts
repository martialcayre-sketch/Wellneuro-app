import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  evaluerOrientationPourPatient,
  orientationActive,
  resultatInactif,
  type RecommandationServie,
} from '@/lib/clinical/orientationService';

// Orientation des explorations NNPP2 (campagne certification corpus, lot 7) —
// LECTURE SEULE. Évalue la table de règles signée sur les scores déjà stockés
// du patient et propose des packs d'exploration au praticien. Rien n'est
// jamais auto-assigné : l'assignation reste le geste manuel existant.
//
// Depuis le LOT-06, l'évaluation elle-même vit dans
// `lib/clinical/orientationService.ts` — la synthèse IA en est un second
// consommateur, et le double verrou fail-closed ne doit exister qu'à un seul
// endroit. Cette route n'est plus qu'un enveloppeur HTTP : session,
// validation d'entrée, appartenance, traduction du résultat en réponse.

const ROUTE_JOURNAL = '/api/praticien/orientation';

export type OrientationApiResponse =
  | {
      ok: true;
      actif: false;
      version: string;
      message: string;
    }
  | {
      ok: true;
      actif: true;
      version: string;
      sha256: string;
      recommandations: RecommandationServie[];
    }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception'; error: string };

// GET /api/praticien/orientation?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<OrientationApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' }, { status: 400 });
  }

  try {
    // Verrou AVANT le contrôle d'appartenance, et non seulement avant les
    // lectures cliniques : `verifierAppartenancePatient` journalise l'accès au
    // dossier. Tant que la table n'est pas signée et le flag posé, la route
    // n'ouvre rien — et ne consigne donc pas un accès qui n'a pas eu lieu.
    if (!orientationActive()) {
      const inactif = resultatInactif();
      return NextResponse.json({ ok: true, actif: false, version: inactif.version, message: inactif.message });
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json({ ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' }, { status: 403 });
    }

    const resultat = await evaluerOrientationPourPatient(idPatient);
    if (!resultat.actif) {
      return NextResponse.json({ ok: true, actif: false, version: resultat.version, message: resultat.message });
    }

    return NextResponse.json({
      ok: true,
      actif: true,
      version: resultat.version,
      sha256: resultat.sha256,
      recommandations: resultat.recommandations,
    });
  } catch (err) {
    // Trace serveur seulement (patron de la route trajectoire) : le corps de
    // réponse ne porte aucun détail technique.
    console.error('[praticien/orientation GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: "Impossible d'évaluer l'orientation pour ce patient." },
      { status: 500 }
    );
  }
}
