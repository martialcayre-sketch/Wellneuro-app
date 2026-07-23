import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { deciderClaim, estClaimStatut, type ClaimStatut } from '@/lib/rag/claims/revue';

// Décision praticien sur un claim (Atelier corpus, D-003).
//
// C'est LA route qui pose la signature : statut → VALIDE (validateur = e-mail
// de session, valide_at = présent posé par la base), REJETE (décision
// attribuée), ou retour EN_ATTENTE_VALIDATION (annulation, signature effacée).
// L'ingestion ne peut pas poser ces statuts (refus 422 côté
// /api/internal/rag/claims/ingest) ; cette route ne peut pas en créer — les
// deux voies sont disjointes par construction.
//
// `statutAttendu` est obligatoire : la décision est prise SUR un état vu à
// l'écran. S'il a bougé entre-temps (autre onglet, replay), la lib répond
// etat_divergent et rien n'est écrit — jamais d'écrasement silencieux.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_CLAIM_RE = /^WN-CL-\d{4}-\d{3}@v?\d+\.\d+$/;

export type CorpusClaimDecisionApiResponse =
  | {
      ok: true;
      claim: { id: string; statut: ClaimStatut; validateur: string | null; valideAt: string | null };
    }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, { message: string; status: number }> = {
  transition_invalide: {
    message: 'Cette transition de statut n’est pas permise.',
    status: 409,
  },
  claim_introuvable: { message: 'Claim introuvable.', status: 404 },
  etat_divergent: {
    message: 'Le statut du claim a changé depuis l’affichage — rechargez la liste.',
    status: 409,
  },
  sources_absentes: {
    message: 'Ce claim ne cite aucun verbatim source — validation impossible.',
    status: 409,
  },
  source_derivee: {
    message:
      'Un verbatim cité a été modifié depuis son rattachement — validation refusée tant que la dérive n’est pas instruite.',
    status: 409,
  },
  motif_requis: {
    message: 'Un rejet exige un motif.',
    status: 422,
  },
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusClaimDecisionApiResponse>({ ok: false, reason, error }, { status });
}

type PostBody = {
  id?: string;
  decision?: string;
  statutAttendu?: string;
  motif?: string;
};

// POST /api/praticien/corpus/claims/decision — { id, decision, statutAttendu, motif? }
// `motif` est obligatoire pour un REJET (dette v1) ; il est journalisé avec
// l'acte (rag_corpus_claim_decisions), jamais écrit sur le claim lui-même.
export async function POST(req: Request): Promise<NextResponse<CorpusClaimDecisionApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    // La signature exige une identité : session sans e-mail = refus, jamais un
    // validateur vide en base (la contrainte valide_signe le refuserait aussi).
    const validateur = emailPraticien(session);
    if (!validateur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const id = (body.id ?? '').trim();
    const decision = (body.decision ?? '').trim();
    const statutAttendu = (body.statutAttendu ?? '').trim();

    if (!ID_CLAIM_RE.test(id)) {
      return echec('id_invalide', 'Identifiant de claim invalide.', 400);
    }
    if (!estClaimStatut(decision) || !estClaimStatut(statutAttendu)) {
      return echec('decision_invalide', 'Décision ou statut attendu inconnu.', 400);
    }

    const motif = typeof body.motif === 'string' ? body.motif : undefined;
    const resultat = await deciderClaim({ id, decision, statutAttendu, validateur, motif });
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec(resultat.raison, refus.message, refus.status);
    }

    return NextResponse.json({ ok: true, claim: resultat.claim });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/decision POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
