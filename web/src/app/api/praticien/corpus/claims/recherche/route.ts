import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { jouerQuestionRestitution, type ClaimRestitution } from '@/lib/rag/claims/recherche';

// Restitution en mode revue (Atelier v2, voie rapide) — PRATICIEN SEUL.
//
// Joue une question du questionnaire contre les claims d'UNE source en cours
// de revue (EN_ATTENTE compris : c'est l'objet même de l'évaluation). Ce
// n'est PAS la barrière patient — match_wellneuro_rag_claims reste la seule
// voie de récupération côté patient (D-003).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_RE = /^WN-SRC-\d{4}$/;
const QUESTION_MAX = 500;

export type CorpusRechercheApiResponse =
  | { ok: true; claims: ClaimRestitution[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusRechercheApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/corpus/claims/recherche — { sourceId, question }
export async function POST(req: Request): Promise<NextResponse<CorpusRechercheApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!emailPraticien(session)) {
      return echec('unauthenticated', 'Session praticien sans e-mail.', 401);
    }

    let body: { sourceId?: string; question?: string };
    try {
      body = (await req.json()) as { sourceId?: string; question?: string };
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const sourceId = (body.sourceId ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) {
      return echec('source_invalide', 'Identifiant de source invalide.', 400);
    }
    const question = (body.question ?? '').trim();
    if (question.length < 3 || question.length > QUESTION_MAX) {
      return echec('question_invalide', `La question doit faire entre 3 et ${QUESTION_MAX} caractères.`, 400);
    }

    const claims = await jouerQuestionRestitution({ sourceId, question });
    return NextResponse.json({ ok: true, claims });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/recherche POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
