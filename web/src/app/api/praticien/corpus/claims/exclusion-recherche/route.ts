import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { estSensExclusion, motifExclusion, MOTIF_EXCLUSION_MAX } from '@/lib/rag/claims/exclusionRecherche';
import { exclureDeLaRecherche } from '@/lib/rag/claims/revue';

// Exclusion de la recherche d'un claim (Atelier corpus, [[D-490]]).
//
// Un claim VALIDE est exclu de la recherche des rayons — ou y est rétabli —
// par un acte `exclusion_recherche` journalisé au nom du praticien en
// session, avec un motif obligatoire (la provenance). Ni statut, ni
// signataire, ni date de signature ne bougent, et le claim reste valide pour
// ce qui le cite explicitement (D-490 §2). Un claim déjà dans l'état visé
// n'ajoute aucun acte.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_CLAIM_RE = /^WN-CL-\d{4}-\d{3}@v?\d+\.\d+$/;

export type CorpusExclusionRechercheApiResponse =
  | { ok: true; claim: { id: string; excluRecherche: boolean }; inchange: boolean }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS = {
  claim_introuvable: { message: 'Claim introuvable.', status: 404 },
  claim_non_valide: {
    message: 'Seul un claim validé s’exclut de la recherche ou s’y rétablit — rechargez la liste.',
    status: 409,
  },
} as const;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusExclusionRechercheApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/corpus/claims/exclusion-recherche
//   { id: 'WN-CL-0000-000@v1.0', sens: 'exclure' | 'retablir', motif }
export async function POST(req: Request): Promise<NextResponse<CorpusExclusionRechercheApiResponse>> {
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const corps = body as { id?: unknown; sens?: unknown; motif?: unknown };

    const id = typeof corps.id === 'string' ? corps.id.trim() : '';
    if (!ID_CLAIM_RE.test(id)) return echec('id_invalide', 'Identifiant de claim invalide.', 400);
    if (!estSensExclusion(corps.sens)) return echec('sens_invalide', 'Sens inconnu : exclure ou rétablir.', 400);
    const motif = motifExclusion(corps.motif);
    if (!motif) {
      return echec(
        'motif_requis',
        `Un motif est obligatoire (au plus ${MOTIF_EXCLUSION_MAX} caractères) : la provenance de la décision.`,
        422,
      );
    }

    const resultat = await exclureDeLaRecherche({ id, sens: corps.sens, motif, validateur });
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec(resultat.raison, refus.message, refus.status);
    }
    return NextResponse.json<CorpusExclusionRechercheApiResponse>({
      ok: true,
      claim: resultat.claim,
      inchange: resultat.inchange,
    });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/exclusion-recherche POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
