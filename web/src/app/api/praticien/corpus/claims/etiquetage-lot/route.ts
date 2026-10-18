import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  lireLigneEtiquetage,
  MAX_LIGNES_ETIQUETAGE_LOT,
  type LigneEtiquetageLot,
} from '@/lib/rag/claims/etiquetageLot';
import { etiqueterClaimsLot, type RefusEtiquetageLot } from '@/lib/rag/claims/revue';

// Étiquetage en lot (Atelier corpus, [[D-325]], amende [[D-321]] §6).
//
// UN geste du praticien sur une liste qu'il a relue à l'écran : chaque ligne
// pose ou corrige les clés `besoins` et `rubrique` d'un claim DÉJÀ VALIDE, un
// acte `etiquetage` par claim au journal, le praticien en session pour
// validateur. Tout ou rien : une ligne illisible (422) ou un claim refusé
// (409, chaque claim nommé) et rien n'est écrit. Aucun statut ni aucune
// signature ne bouge ; la validation par lot (voie rapide) ne pose toujours
// aucune clé.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CorpusEtiquetageLotApiResponse =
  | { ok: true; n: number; inchanges: number }
  | { ok: false; reason: 'claims_refuses'; error: string; refus: RefusEtiquetageLot[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusEtiquetageLotApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/corpus/claims/etiquetage-lot
//   { lignes: [{ claimId, versionClaim?, besoins, rubrique }, …] }
export async function POST(req: Request): Promise<NextResponse<CorpusEtiquetageLotApiResponse>> {
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
    const brutes =
      body && typeof body === 'object' && !Array.isArray(body) ? (body as { lignes?: unknown }).lignes : undefined;
    if (!Array.isArray(brutes) || brutes.length === 0) {
      return echec('lignes_invalides', 'La liste à étiqueter est vide.', 422);
    }
    if (brutes.length > MAX_LIGNES_ETIQUETAGE_LOT) {
      return echec(
        'lignes_invalides',
        `Au plus ${MAX_LIGNES_ETIQUETAGE_LOT} claims par geste — scindez la liste.`,
        422,
      );
    }

    const lignes: LigneEtiquetageLot[] = [];
    const vus = new Set<string>();
    for (const brute of brutes) {
      const ligne = lireLigneEtiquetage(brute);
      if (!ligne || vus.has(ligne.claimId)) {
        return echec(
          'lignes_invalides',
          'Une ligne est illisible ou en double : identifiant, besoins (de 1 à 12) et rubrique (une des dix des fiches d’usage) sont requis.',
          422,
        );
      }
      vus.add(ligne.claimId);
      lignes.push(ligne);
    }

    const resultat = await etiqueterClaimsLot({ lignes, validateur });
    if (!resultat.ok) {
      if (resultat.raison === 'claims_refuses') {
        return NextResponse.json<CorpusEtiquetageLotApiResponse>(
          {
            ok: false,
            reason: 'claims_refuses',
            error: 'Des claims ne peuvent pas être étiquetés : rien n’a été écrit.',
            refus: resultat.refus,
          },
          { status: 409 },
        );
      }
      return echec(
        'etat_divergent',
        'Un claim a changé pendant l’étiquetage : rien n’a été écrit, rechargez et recommencez.',
        409,
      );
    }
    return NextResponse.json<CorpusEtiquetageLotApiResponse>({ ok: true, n: resultat.n, inchanges: resultat.inchanges });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/etiquetage-lot POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
