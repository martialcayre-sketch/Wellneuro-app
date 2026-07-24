import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { evaluerRestitution, type EvaluationRestitution } from '@/lib/rag/claims/evaluation';

// Évaluation IA d'une restitution — PRATICIEN SEUL.
//
// Confronte la « réponse notebook » (collée par le praticien) aux claims
// validables de la source et PROPOSE un verdict de conformité + justification.
// N'écrit RIEN : le verdict retenu est posé par le praticien à la signature du
// lot (D-003). Un seul appel LLM court, mais on garde la marge de maxDuration.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SOURCE_RE = /^WN-SRC-\d{4}$/;
const QUESTION_MAX = 4000;
const REPONSE_MAX = 4000;
const CLAIMS_CITES_MAX = 60;

export type CorpusEvaluationApiResponse =
  | { ok: true; evaluation: EvaluationRestitution }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusEvaluationApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/corpus/claims/evaluation — { sourceId, question, reponse, claimsCites? }
export async function POST(req: Request): Promise<NextResponse<CorpusEvaluationApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!emailPraticien(session)) {
      return echec('unauthenticated', 'Session praticien sans e-mail.', 401);
    }

    let body: { sourceId?: string; question?: string; reponse?: string; claimsCites?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const sourceId = (body.sourceId ?? '').trim();
    const question = (body.question ?? '').trim();
    const reponse = (body.reponse ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) return echec('source_invalide', 'Identifiant de source invalide.', 400);
    if (!question || question.length > QUESTION_MAX) return echec('question_invalide', 'Question absente ou trop longue.', 400);
    if (!reponse || reponse.length > REPONSE_MAX) {
      return echec('reponse_invalide', 'Collez la réponse du notebook (non vide) avant d’évaluer.', 400);
    }
    const claimsCites = Array.isArray(body.claimsCites)
      ? body.claimsCites.filter((c): c is string => typeof c === 'string' && c.length > 0).slice(0, CLAIMS_CITES_MAX)
      : undefined;

    const evaluation = await evaluerRestitution({ sourceId, question, reponse, claimsCites });
    return NextResponse.json({ ok: true, evaluation });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/evaluation POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique pendant l’évaluation.', 500);
  }
}
