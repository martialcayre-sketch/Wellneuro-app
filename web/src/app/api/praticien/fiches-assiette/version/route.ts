import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { lireVersionFiche, type DetailVersionFiche } from '@/lib/fiches-assiette/lecture';
import { emailPraticien } from '@/lib/praticien/appartenance';

// Une version de fiche d'assiette, pour la relecture côte à côte ([[D-251]],
// lot 6) : texte source, contenu adapté, claims cités et contrôles rejoués.
//
// LE TEXTE D'UNE FICHE MY NE VA JAMAIS AU JOURNAL (§4) : en cas d'erreur, seuls
// son nom et son code sont journalisés — le message d'une erreur Prisma peut
// recopier une ligne lue.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_VERSION_RE = /^[a-z0-9]{8,64}$/i;

export type VersionFicheApiResponse =
  | { ok: true; version: DetailVersionFiche }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<VersionFicheApiResponse>({ ok: false, reason, error }, { status });
}

export async function GET(req: Request): Promise<NextResponse<VersionFicheApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !emailPraticien(session)) return echec('unauthenticated', 'Authentification requise.', 401);

    const id = new URL(req.url).searchParams.get('id') ?? '';
    if (!ID_VERSION_RE.test(id)) return echec('id_invalide', 'Identifiant de version invalide.', 400);

    const version = await lireVersionFiche(id);
    if (!version) return echec('version_introuvable', 'Version introuvable.', 404);
    return NextResponse.json({ ok: true, version });
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
    console.error('[praticien/fiches-assiette/version GET]', err instanceof Error ? err.name : typeof err, code);
    return echec('exception', 'Erreur technique.', 500);
  }
}
