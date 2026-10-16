import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { lireRayonFichesUsage, type RayonFichesUsage } from '@/lib/fiches-usage/lecture';
import { peutDeciderFichesUsage } from '@/lib/fiches-usage/responsable';
import { emailPraticien } from '@/lib/praticien/appartenance';

// Le rayon des fiches d'usage ([[D-314]] §3) : fiches et vocabulaire, avec
// leurs états, pour l'écran de VALIDATION du responsable. Rien n'est servi ici.
//
// AUCUN TEXTE NE VA AU JOURNAL ([[D-251]] §4) : en cas d'erreur, seuls le nom
// et le code sont journalisés.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type RayonFichesUsageApiResponse =
  | { ok: true; rayon: RayonFichesUsage; /** La session peut valider et retirer (le responsable seul). */ peutDecider: boolean }
  | { ok: false; reason: string; error: string };

export async function GET(): Promise<NextResponse<RayonFichesUsageApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !emailPraticien(session)) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      rayon: await lireRayonFichesUsage(),
      peutDecider: peutDeciderFichesUsage(emailPraticien(session)),
    });
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
    console.error('[praticien/fiches-usage GET]', err instanceof Error ? err.name : typeof err, code);
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
