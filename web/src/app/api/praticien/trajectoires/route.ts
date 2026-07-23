import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { chargerTrajectoiresCabinet, type LigneCabinet } from '@/lib/praticien/chargementCabinet';

// Porte d'entrée « Trajectoires » (SP-TRAJ LOT-04) — LECTURE SEULE : les
// trajectoires de tous les patients du praticien, en 3 requêtes plates
// (chargerTrajectoiresCabinet). La présentation (résumé, Spirale miniature)
// est dérivée côté client par les libs pures — la route ne transforme rien.
// Liste du cabinet entier (pas un dossier particulier) : pas de ligne de
// journal par patient — le journal trace l'ouverture d'une fiche, pas le
// survol de la liste (même doctrine que GET /api/praticien/patients).

export type TrajectoiresApiResponse =
  | { ok: true; lignes: LigneCabinet[] }
  | { ok: false; reason: 'unauthenticated' | 'exception'; error: string };

// GET /api/praticien/trajectoires
export async function GET(): Promise<NextResponse<TrajectoiresApiResponse>> {
  const session = await getServerSession(authOptions);
  const email = session ? emailPraticien(session) : null;
  if (!session || !email) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    const lignes = await chargerTrajectoiresCabinet(email);
    return NextResponse.json({ ok: true, lignes });
  } catch (err) {
    console.error('[praticien/trajectoires GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
