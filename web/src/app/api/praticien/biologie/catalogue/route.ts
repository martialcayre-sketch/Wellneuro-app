import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  listerCatalogueBiologie,
  type CatalogueBiologieResult,
} from '@/lib/biology-library/catalogue';

// Service du catalogue documentaire biologie (CB-08) — PRATICIEN SEUL, patron
// exact de /api/praticien/complements (C4). Le référentiel est global au
// cabinet : la garde est la session NextAuth (domaine @wellneuro.fr), aucune
// donnée patient ne vit dans ces tables (étage 1 documentaire, verrou HDS).
//
// Fail-closed : derrière WN_CB_ENABLED. Flag éteint = 404, la surface n'est
// jamais entrouverte. Pas de paramètre de requête : le catalogue niveau 1
// (47 analytes, 15 panels) se sert entier, le tri et la recherche restent à
// l'écran.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CatalogueBiologieApiResponse =
  | ({ ok: true } & CatalogueBiologieResult)
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CatalogueBiologieApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/biologie/catalogue
export async function GET(): Promise<NextResponse<CatalogueBiologieApiResponse>> {
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) {
      return echec(access.reason, access.error, access.status);
    }

    const catalogue = await listerCatalogueBiologie();
    return NextResponse.json({ ok: true, ...catalogue });
  } catch (err) {
    console.error('[praticien/biologie/catalogue GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
