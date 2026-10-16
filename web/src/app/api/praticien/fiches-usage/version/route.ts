import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ID_RE } from '@/lib/fiches-usage/actesHttp';
import { lireVersionFicheUsage, type DetailVersionUsage } from '@/lib/fiches-usage/lecture';
import { peutDeciderFichesUsage } from '@/lib/fiches-usage/responsable';
import { emailPraticien } from '@/lib/praticien/appartenance';

// Une version de fiche d'usage, rubrique par rubrique, pour la relecture
// ([[D-314]] §3) : texte, empreinte, état et jeton de chaque rubrique.
//
// AUCUN TEXTE NE VA AU JOURNAL ([[D-251]] §4).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type VersionFicheUsageApiResponse =
  | { ok: true; version: DetailVersionUsage; /** La session peut valider et retirer (le responsable seul). */ peutDecider: boolean }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<VersionFicheUsageApiResponse>({ ok: false, reason, error }, { status });
}

export async function GET(req: Request): Promise<NextResponse<VersionFicheUsageApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !emailPraticien(session)) return echec('unauthenticated', 'Authentification requise.', 401);

    const id = new URL(req.url).searchParams.get('id') ?? '';
    if (!ID_RE.test(id)) return echec('id_invalide', 'Identifiant de version invalide.', 400);

    const version = await lireVersionFicheUsage(id);
    if (!version) return echec('version_introuvable', 'Version introuvable.', 404);
    return NextResponse.json({ ok: true, version, peutDecider: peutDeciderFichesUsage(emailPraticien(session)) });
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
    console.error('[praticien/fiches-usage/version GET]', err instanceof Error ? err.name : typeof err, code);
    return echec('exception', 'Erreur technique.', 500);
  }
}
