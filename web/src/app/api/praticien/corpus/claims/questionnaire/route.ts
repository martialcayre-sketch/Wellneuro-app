import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  genererQuestionnaireSource,
  type QuestionnaireGenere,
} from '@/lib/rag/claims/questionnaire';

// Génération du questionnaire de restitution d'une source — PRATICIEN SEUL.
//
// Une question par chunk atteignable, rédigée par Sonnet 5 depuis les claims
// de ce chunk (couverture structurelle 1 question ↔ 1 chunk). La génération
// n'écrit RIEN : les questions ne comptent qu'une fois jouées sur le corpus
// et jugées conformes par le praticien, et la couverture est revérifiée par
// le serveur à la signature du lot.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Plusieurs appels LLM en parallèle : on s'accorde la marge, la génération
// d'une source pilote (~2-7 chunks) tient en pratique sous les 30 s.
export const maxDuration = 120;

const SOURCE_RE = /^WN-SRC-\d{4}$/;

export type CorpusQuestionnaireApiResponse =
  | { ok: true; questionnaire: QuestionnaireGenere }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusQuestionnaireApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/corpus/claims/questionnaire — { sourceId }
export async function POST(req: Request): Promise<NextResponse<CorpusQuestionnaireApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!emailPraticien(session)) {
      return echec('unauthenticated', 'Session praticien sans e-mail.', 401);
    }

    let body: { sourceId?: string };
    try {
      body = (await req.json()) as { sourceId?: string };
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const sourceId = (body.sourceId ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) {
      return echec('source_invalide', 'Identifiant de source invalide.', 400);
    }

    const questionnaire = await genererQuestionnaireSource(sourceId);
    if (questionnaire.questions.length === 0) {
      return echec(
        'aucune_question',
        'Aucune question générée — la source n’a aucun chunk atteignable, ou la génération a échoué.',
        409,
      );
    }

    return NextResponse.json({ ok: true, questionnaire });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/questionnaire POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
