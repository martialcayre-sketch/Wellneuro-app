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

const AUCUNE_QUESTION =
  'Aucune question générée — la source n’a aucun chunk atteignable, ou la génération a échoué.';

// Résultat de génération → payload terminal, partagé par les deux transports.
// 0 question = échec métier (`ok: false`), pas une exception.
function payloadGeneration(questionnaire: QuestionnaireGenere): CorpusQuestionnaireApiResponse {
  if (questionnaire.questions.length === 0) {
    return { ok: false, reason: 'aucune_question', error: AUCUNE_QUESTION };
  }
  return { ok: true, questionnaire };
}

// POST /api/praticien/corpus/claims/questionnaire — { sourceId }
export async function POST(req: Request): Promise<Response> {
  let sourceId: string;
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

    sourceId = (body.sourceId ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) {
      return echec('source_invalide', 'Identifiant de source invalide.', 400);
    }
  } catch (err) {
    // Exception AVANT toute génération (lecture de session/corps) : réponse JSON.
    console.error(
      '[praticien/corpus/claims/questionnaire POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }

  // Transport JSON historique (défaut, y compris Vercel) — inchangé : la
  // génération est courte en pratique, le 409/500 reste un vrai code HTTP.
  if (process.env.WN_CLAIMS_QUESTIONNAIRE_STREAM !== 'true') {
    try {
      const questionnaire = await genererQuestionnaireSource(sourceId);
      const payload = payloadGeneration(questionnaire);
      return NextResponse.json(payload, { status: payload.ok ? 200 : 409 });
    } catch (err) {
      console.error(
        '[praticien/corpus/claims/questionnaire POST]',
        err instanceof Error ? err.message : String(err),
      );
      return echec('exception', 'Erreur technique.', 500);
    }
  }

  // Transport SSE (Scalingo) : un octet précoce passe le seuil « premier octet »
  // de 30 s du routeur, les heartbeats tiennent la fenêtre 59 s pendant les
  // appels LLM parallèles, puis un événement terminal `done`/`error`. Toutes les
  // gardes qui rendent un code d'erreur (401/400) sont AU-DESSUS, avant
  // l'ouverture du flux : une fois les en-têtes partis, le statut est figé à 200
  // et tout passe in-band (y compris le cas métier « aucune question »).
  const encoder = new TextEncoder();
  // Borne le travail (~2 min) ET annule les appels LLM en vol si le client se
  // déconnecte (`cancel`) : sans maxDuration serverless sur un conteneur
  // persistant, une génération oubliée pendrait indéfiniment sinon.
  const abort = new AbortController();
  const flux = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* flux déjà fermé (client parti) */
        }
      };
      enqueue(': ouverture\n\n');
      const battement = setInterval(() => enqueue(': battement\n\n'), 10_000);
      const limite = setTimeout(() => abort.abort(), 120_000);
      try {
        const questionnaire = await genererQuestionnaireSource(sourceId, { signal: abort.signal });
        enqueue(`event: done\ndata: ${JSON.stringify(payloadGeneration(questionnaire))}\n\n`);
      } catch (err) {
        console.error(
          '[praticien/corpus/claims/questionnaire POST/SSE]',
          err instanceof Error ? err.message : String(err),
        );
        const payload: CorpusQuestionnaireApiResponse = {
          ok: false,
          reason: 'exception',
          error: 'Erreur technique.',
        };
        enqueue(`event: error\ndata: ${JSON.stringify(payload)}\n\n`);
      } finally {
        clearInterval(battement);
        clearTimeout(limite);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      }
    },
    // Client déconnecté avant la fin : annule la génération en vol (le `finally`
    // du `start` nettoie ensuite battement, borne et flux).
    cancel() {
      abort.abort();
    },
  });

  return new Response(flux, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
