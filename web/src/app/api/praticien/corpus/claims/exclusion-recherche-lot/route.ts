import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  estSensExclusion,
  lireLigneExclusion,
  MAX_LIGNES_EXCLUSION_LOT,
  type LigneExclusionLot,
} from '@/lib/rag/claims/exclusionRecherche';
import { exclureDeLaRechercheLot, type RefusExclusionLot } from '@/lib/rag/claims/revue';

// Exclusion de la recherche en lot (Atelier corpus, [[D-490]] §3 et §6, au
// patron de l'étiquetage en lot de [[D-325]]).
//
// UN geste du praticien sur une liste qu'il a relue à l'écran : chaque ligne
// nomme un claim VALIDE et son motif, un acte `exclusion_recherche` par claim
// au journal, le praticien en session pour validateur. Tout ou rien : une
// ligne illisible (422) ou un claim refusé (409, chaque claim nommé) et rien
// n'est écrit. Aucun statut ni aucune signature ne bouge.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CorpusExclusionRechercheLotApiResponse =
  | { ok: true; n: number; inchanges: number }
  | { ok: false; reason: 'claims_refuses'; error: string; refus: RefusExclusionLot[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusExclusionRechercheLotApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/corpus/claims/exclusion-recherche-lot
//   { sens: 'exclure' | 'retablir', lignes: [{ claimId, versionClaim?, motif }, …] }
export async function POST(req: Request): Promise<NextResponse<CorpusExclusionRechercheLotApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    const validateur = emailPraticien(session);
    if (!validateur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const corps =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { sens?: unknown; lignes?: unknown })
        : {};
    if (!estSensExclusion(corps.sens)) return echec('sens_invalide', 'Sens inconnu : exclure ou rétablir.', 400);
    const brutes = corps.lignes;
    if (!Array.isArray(brutes) || brutes.length === 0) {
      return echec('lignes_invalides', 'La liste est vide.', 422);
    }
    if (brutes.length > MAX_LIGNES_EXCLUSION_LOT) {
      return echec(
        'lignes_invalides',
        `Au plus ${MAX_LIGNES_EXCLUSION_LOT} claims par geste — scindez la liste.`,
        422,
      );
    }

    const lignes: LigneExclusionLot[] = [];
    const vus = new Set<string>();
    for (const brute of brutes) {
      const ligne = lireLigneExclusion(brute);
      if (!ligne || vus.has(ligne.claimId)) {
        return echec(
          'lignes_invalides',
          'Une ligne est illisible ou en double : identifiant de claim et motif sont requis.',
          422,
        );
      }
      vus.add(ligne.claimId);
      lignes.push(ligne);
    }

    const resultat = await exclureDeLaRechercheLot({ lignes, sens: corps.sens, validateur });
    if (!resultat.ok) {
      if (resultat.raison === 'claims_refuses') {
        return NextResponse.json<CorpusExclusionRechercheLotApiResponse>(
          {
            ok: false,
            reason: 'claims_refuses',
            error: 'Des claims ne peuvent pas recevoir ce geste : rien n’a été écrit.',
            refus: resultat.refus,
          },
          { status: 409 },
        );
      }
      return echec(
        'etat_divergent',
        'Un claim a changé pendant le geste : rien n’a été écrit, rechargez et recommencez.',
        409,
      );
    }
    return NextResponse.json<CorpusExclusionRechercheLotApiResponse>({
      ok: true,
      n: resultat.n,
      inchanges: resultat.inchanges,
    });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/exclusion-recherche-lot POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
