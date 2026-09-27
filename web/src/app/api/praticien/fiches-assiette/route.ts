import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { lireRayonFichesConseils, type LigneRayonFiche } from '@/lib/fiches-assiette/lecture';
import { emailPraticien } from '@/lib/praticien/appartenance';

// Le rayon « Fiches conseils » de la Bibliothèque ([[D-251]], lot 6) : les
// douze assiettes d'indication et l'état de leur fiche. Lecture seule ; rien
// n'y est servi à un patient.
//
// Pas de drapeau : `WN_FICHES_ASSIETTE` garde l'ÉMISSION, pas la relecture
// (§7) — et il ne s'ouvre qu'une fois des fiches validées ici (§10).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type RayonFichesApiResponse =
  | { ok: true; assiettes: LigneRayonFiche[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<RayonFichesApiResponse>({ ok: false, reason, error }, { status });
}

export async function GET(): Promise<NextResponse<RayonFichesApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !emailPraticien(session)) return echec('unauthenticated', 'Authentification requise.', 401);
    return NextResponse.json({ ok: true, assiettes: await lireRayonFichesConseils() });
  } catch (err) {
    console.error('[praticien/fiches-assiette GET]', err instanceof Error ? err.name : typeof err);
    return echec('exception', 'Erreur technique.', 500);
  }
}
