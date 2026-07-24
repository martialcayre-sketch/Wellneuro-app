// Évaluation IA d'une restitution (Atelier v2, voie rapide) — l'IA PROPOSE un
// verdict, le praticien confirme.
//
// Décision praticien du 2026-07-24 : la « réponse notebook » (produite par
// NotebookLM, qui n'a pas d'API) est COLLÉE À LA MAIN dans le questionnaire de
// restitution. Ce module ne rédige donc PAS la réponse ; il la CONFRONTE aux
// claims validables de la source et propose « conforme / non_conforme » avec une
// justification. Le verdict retenu reste un acte praticien (D-003) : cette
// évaluation ne signe rien, elle pré-remplit un choix que le praticien valide.

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

/** Bornes du contrat de sortie — mêmes ordres de grandeur que revue.ts. */
const JUSTIFICATION_MAX = 2000;
const CLAIMS_REFERENCE_MAX = 60;

const PROMPT_EVALUATION = `Tu es l'assistant d'un praticien qui valide un corpus de neuronutrition. On te donne UNE question de restitution, une RÉPONSE rédigée par un outil externe (un notebook nourri des mêmes sources), et les AFFIRMATIONS DE RÉFÉRENCE (« claims ») tirées du corpus validable de la source.

Juge si la réponse est CONFORME au corpus de référence :
- « conforme » : tout ce que la réponse affirme cliniquement est soutenu par les claims de référence (mécanismes, dosages, définitions, recommandations) ; elle ne contredit aucun claim et n'ajoute aucune affirmation clinique non soutenue.
- « non_conforme » : la réponse contredit un claim, invente un chiffre/dosage/mécanisme absent des claims, ou déforme une affirmation. Le moindre écart clinique (un dosage faux, une causalité inventée) suffit à rendre « non_conforme ».

Dans le doute, préfère « non_conforme ». Ne juge pas le style ni l'exhaustivité, seulement la FIDÉLITÉ clinique au corpus de référence.

Réponds UNIQUEMENT par un objet JSON : {"verdict": "conforme" | "non_conforme", "justification": "…"}. La justification, en français, est brève (1 à 3 phrases) et pointe l'écart précis si non_conforme.`;

export type EvaluationRestitution = {
  verdict: 'conforme' | 'non_conforme';
  justification: string;
};

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

/** Extraction JSON tolérante (fence markdown, préambule) — cf. questionnaire.ts. */
export function extraireJsonEvaluation(txt: string): unknown {
  let s = (txt || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  return JSON.parse(s);
}

/**
 * Valide la sortie du modèle en un contrat strict. Fonction PURE (testable sans
 * réseau) : un verdict hors énumération, une justification vide ou hors borne
 * font échouer — jamais de valeur « nettoyée » en silence, l'aide au praticien
 * doit être fidèle à ce que le modèle a réellement rendu.
 */
export function interpreterEvaluation(brut: unknown): EvaluationRestitution | null {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const element = brut as Record<string, unknown>;
  const verdict = element.verdict;
  if (verdict !== 'conforme' && verdict !== 'non_conforme') return null;
  const justification = typeof element.justification === 'string' ? element.justification.trim() : '';
  if (!justification || justification.length > JUSTIFICATION_MAX) return null;
  return { verdict, justification };
}

async function appelerJuge(
  apiKey: string,
  model: string,
  question: string,
  reponse: string,
  claimsReference: string[],
): Promise<EvaluationRestitution> {
  const reference = claimsReference.map((texte, i) => `${i + 1}. ${texte}`).join('\n');
  const contenu = `QUESTION :\n${question}\n\nRÉPONSE À JUGER (source externe) :\n${reponse}\n\nCLAIMS DE RÉFÉRENCE (corpus validable de la source) :\n${reference}`;
  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: PROMPT_EVALUATION,
      messages: [{ role: 'user', content: contenu }],
    }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as AnthropicMessageResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Échec évaluation HTTP ${response.status}.`);
  }
  const texte = (payload.content ?? [])
    .filter((bloc) => bloc.type === 'text')
    .map((bloc) => bloc.text ?? '')
    .join('\n');
  const evaluation = interpreterEvaluation(extraireJsonEvaluation(texte));
  if (!evaluation) throw new Error('Réponse du juge illisible.');
  return evaluation;
}

/**
 * Propose un verdict de conformité pour UNE restitution. La référence est
 * restreinte aux claims cités par la question (claimsCites) quand ils sont
 * fournis — c'est le périmètre que la question était censée couvrir ; à défaut,
 * tous les claims actifs de la source. Ne lit ni n'écrit aucun état de
 * validation : le verdict retenu reste posé par le praticien.
 */
export async function evaluerRestitution(params: {
  sourceId: string;
  question: string;
  reponse: string;
  claimsCites?: string[];
}): Promise<EvaluationRestitution> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY est absent.');
  const model = process.env.WN_CLAIMS_CLAUDE_MODEL?.trim() || 'claude-sonnet-5';

  // Import paresseux : le client Prisma se crée au chargement du module et exige
  // DATABASE_URL. Le différer ici garde les fonctions pures d'interprétation
  // (interpreterEvaluation, extraireJsonEvaluation) importables et testables sans base.
  const { prisma } = await import('@/lib/prisma');

  const cites = (params.claimsCites ?? []).filter((c) => typeof c === 'string' && c.length > 0);
  const lignes =
    cites.length > 0
      ? await prisma.$queryRaw<Array<{ texte_normalise: string }>>`
          SELECT c.texte_normalise
          FROM public.rag_corpus_claims c
          WHERE c.source_id = ${params.sourceId}
            AND c.active = true
            AND c.claim_id = ANY(${cites}::text[])
          ORDER BY c.claim_id, c.version_claim
          LIMIT ${CLAIMS_REFERENCE_MAX}
        `
      : await prisma.$queryRaw<Array<{ texte_normalise: string }>>`
          SELECT c.texte_normalise
          FROM public.rag_corpus_claims c
          WHERE c.source_id = ${params.sourceId}
            AND c.active = true
          ORDER BY c.claim_id, c.version_claim
          LIMIT ${CLAIMS_REFERENCE_MAX}
        `;

  if (lignes.length === 0) throw new Error('Aucun claim de référence pour cette source.');

  return appelerJuge(
    apiKey,
    model,
    params.question,
    params.reponse,
    lignes.map((l) => l.texte_normalise),
  );
}
