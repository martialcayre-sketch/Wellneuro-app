import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  chercherActeNabm,
  type ActeNabmAffiche,
} from '@/lib/biology-library/correspondancesNabm';
import { signature } from '@/lib/biology-library/saisieMessages';

// Lecture d'un acte de la nomenclature par son CODE EXACT, dans le millésime
// courant (M-3, F54) — PRATICIEN SEUL, derrière WN_CB_ENABLED. Le praticien
// tape le code qu'il a choisi — ou le prend dans sa recherche par libellé
// (`nabm/recherche`, D-320 §1) — et l'écran lui rend l'acte pour qu'il
// vérifie avant de signer. Aucun rapprochement par libellé sans son geste
// (arbitrage du 2026-10-05).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ActeNabmApiResponse =
  | { ok: true; millesime: string; acte: ActeNabmAffiche | null }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ActeNabmApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/biologie/nabm/acte?code=1208
export async function GET(req: Request): Promise<NextResponse<ActeNabmApiResponse>> {
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) return echec(access.reason, access.error, access.status);

    const code = (new URL(req.url).searchParams.get('code') ?? '').trim();
    const resultat = await chercherActeNabm(code);
    if (!resultat.ok) {
      return resultat.raison === 'code_invalide'
        ? echec('code_invalide', 'Un code d’acte compte quatre chiffres.', 400)
        : echec('millesime_absent', 'La nomenclature n’est pas importée : aucun acte à lire.', 409);
    }
    return NextResponse.json({ ok: true, millesime: resultat.millesime, acte: resultat.acte });
  } catch (err) {
    console.error('[praticien/biologie/nabm/acte GET]', signature(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
