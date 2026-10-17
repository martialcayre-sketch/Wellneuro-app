import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  chercherActesNabmParLibelle,
  RECHERCHE_NABM_MAX,
  RECHERCHE_NABM_MIN,
  type ActeNabmAffiche,
} from '@/lib/biology-library/correspondancesNabm';
import { signature } from '@/lib/biology-library/saisieMessages';

// Recherche d'actes de la nomenclature par LIBELLÉ, dans le millésime courant
// (D-320 §1) — PRATICIEN SEUL, derrière WN_CB_ENABLED. Une aide à la lecture :
// le praticien choisit un résultat, le relit par son code (`nabm/acte`), puis
// signe. Rien n'est rapproché ni proposé sans son geste.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type RechercheNabmApiResponse =
  | { ok: true; millesime: string; total: number; actes: ActeNabmAffiche[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<RechercheNabmApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/biologie/nabm/recherche?q=homocysteine
export async function GET(req: Request): Promise<NextResponse<RechercheNabmApiResponse>> {
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) return echec(access.reason, access.error, access.status);

    const saisie = new URL(req.url).searchParams.get('q') ?? '';
    const resultat = await chercherActesNabmParLibelle(saisie);
    if (!resultat.ok) {
      return resultat.raison === 'saisie_invalide'
        ? echec(
            'saisie_invalide',
            `Une recherche compte de ${RECHERCHE_NABM_MIN} à ${RECHERCHE_NABM_MAX} caractères, dont au moins une lettre ou un chiffre.`,
            400,
          )
        : echec('millesime_absent', 'La nomenclature n’est pas importée : aucun acte à chercher.', 409);
    }
    return NextResponse.json({
      ok: true,
      millesime: resultat.millesime,
      total: resultat.total,
      actes: resultat.actes,
    });
  } catch (err) {
    console.error('[praticien/biologie/nabm/recherche GET]', signature(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
