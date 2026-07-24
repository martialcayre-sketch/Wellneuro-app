import { prisma } from '@/lib/prisma';

// Génération SERVEUR du questionnaire de restitution (Atelier v2, voie
// rapide) — le pendant in-app de tools/corpus/claims/questionnaire.mjs.
//
// La procédure actée exige un questionnaire « généré depuis les claims,
// couverture de chaque chunk garantie » : ici, UNE question par chunk
// atteignable de la source (un chunk cité par au moins un claim actif),
// rédigée par Sonnet 5 depuis les seuls claims de ce chunk. La couverture est
// structurelle — 1 question ↔ 1 chunk — et reste revérifiée à la signature.
// La conformité de chaque restitution demeure un verdict praticien.

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

const PROMPT_QUESTION = `Tu génères UNE question de restitution pour un praticien qui valide un corpus de neuronutrition. On te donne les affirmations cliniques (« claims ») tirées d'UN même extrait de cours.

Rédige UNE seule question, en français, qui :
- porte sur le CONTENU CLINIQUE central de ces claims (ce qu'ils affirment : mécanisme, dosage, définition, recommandation) ;
- est assez précise pour qu'une bonne réponse DOIVE mobiliser ces claims, pas des généralités ;
- reste ouverte (pas un oui/non), pour tester la restitution réelle du corpus.

Ne cite aucun numéro de claim. N'invente rien au-delà des claims. Réponds UNIQUEMENT par un objet JSON : {"question": "…"}.`;

export type QuestionGeneree = {
  chunkId: string;
  question: string;
  claimsCitesAttendus: string[];
};

export type QuestionnaireGenere = {
  sourceId: string;
  couvertureComplete: boolean;
  chunksSansQuestion: string[];
  questions: QuestionGeneree[];
};

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

function parseJsonLache(txt: string): { question?: unknown } {
  let s = (txt || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  return JSON.parse(s) as { question?: unknown };
}

async function genererQuestion(
  apiKey: string,
  model: string,
  claims: Array<{ claimId: string; texte: string }>,
  signal?: AbortSignal,
): Promise<string> {
  const liste = claims.map((c, i) => `${i + 1}. ${c.texte}`).join('\n');
  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system: PROMPT_QUESTION,
      messages: [{ role: 'user', content: `CLAIMS D'UN MÊME EXTRAIT :\n${liste}` }],
    }),
    cache: 'no-store',
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as AnthropicMessageResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Échec génération HTTP ${response.status}.`);
  }
  const texte = (payload.content ?? [])
    .filter((bloc) => bloc.type === 'text')
    .map((bloc) => bloc.text ?? '')
    .join('\n');
  const question = String(parseJsonLache(texte).question ?? '').trim();
  if (!question) throw new Error('Question vide.');
  return question;
}

/**
 * Génère le questionnaire d'une source : une question par chunk atteignable,
 * depuis les claims actifs qui le citent. Un chunk dont la génération échoue
 * est SIGNALÉ (couvertureComplete = false) — jamais passé sous silence : un
 * questionnaire troué ne permettra pas la signature (garde serveur de
 * deciderLot), et l'écran doit pouvoir le dire.
 */
export async function genererQuestionnaireSource(
  sourceId: string,
  // `signal` (transport SSE Scalingo) borne le travail : à l'expiration du délai
  // ou à la déconnexion du client, les appels LLM en vol sont annulés. Absent en
  // JSON (Vercel) → comportement inchangé.
  options?: { signal?: AbortSignal },
): Promise<QuestionnaireGenere> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY est absent.');
  const model = process.env.WN_CLAIMS_CLAUDE_MODEL?.trim() || 'claude-sonnet-5';

  const lignes = await prisma.$queryRaw<Array<{
    chunk_id: string;
    claim_id: string;
    texte_normalise: string;
  }>>`
    SELECT s.chunk_id, c.claim_id, c.texte_normalise
    FROM public.rag_corpus_claim_sources s
    JOIN public.rag_corpus_claims c ON c.id = s.claim_pk
    WHERE c.source_id = ${sourceId}
      AND c.active = true
    ORDER BY s.chunk_id, c.claim_id
  `;

  const parChunk = new Map<string, Array<{ claimId: string; texte: string }>>();
  for (const ligne of lignes) {
    const liste = parChunk.get(ligne.chunk_id) ?? [];
    liste.push({ claimId: ligne.claim_id, texte: ligne.texte_normalise });
    parChunk.set(ligne.chunk_id, liste);
  }

  // Générations en parallèle : une source pilote porte ~2-7 chunks, chacun un
  // appel court — le tout tient largement dans la fenêtre de la fonction.
  const resultats = await Promise.all(
    [...parChunk.entries()].map(async ([chunkId, claims]) => {
      try {
        const question = await genererQuestion(apiKey, model, claims, options?.signal);
        return { chunkId, question, claimsCitesAttendus: claims.map((c) => c.claimId) };
      } catch (error) {
        console.error(
          `[corpus/questionnaire] ${sourceId}/${chunkId} :`,
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    }),
  );

  // Une annulation (timeout/déconnexion en SSE) fait échouer chaque chunk et
  // ressortirait en « aucune question » — trompeur. On la remonte en erreur.
  if (options?.signal?.aborted) {
    throw new Error('Génération interrompue (délai dépassé).');
  }

  const questions = resultats.filter((r): r is QuestionGeneree => r !== null);
  const chunksSansQuestion = [...parChunk.keys()].filter(
    (chunkId) => !questions.some((q) => q.chunkId === chunkId),
  );

  return {
    sourceId,
    couvertureComplete: parChunk.size > 0 && chunksSansQuestion.length === 0,
    chunksSansQuestion,
    questions,
  };
}
