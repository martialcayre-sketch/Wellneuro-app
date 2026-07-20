import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import {
  anthropic,
  CLAUDE_MODEL,
  SYSTEM_PROMPT_SYNTHESE,
  VERSION_CORPUS_SYNTHESE,
  VERSION_PROMPT_SYNTHESE,
  VERSION_SCHEMA_SYNTHESE,
  validateSyntheseSchema,
  sanitizeAuditError,
} from '@/lib/anthropic';
import { CORPUS_CLINIQUE_ACTIF } from '@/lib/anthropic';
import { CORPUS_CLINIQUE_METADATA, CORPUS_CLINIQUE_SHA256 } from '@/lib/clinical/corpusSyntheseV1';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { buildContexteClinique, extraireVigilanceDeterministe } from '@/lib/consultation/contexteClinique';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

type ReponseInput = {
  titre: string;
  date: string;
  scores: Record<string, unknown>;
  scorePrincipal: number | null;
  interpretation: string | null;
};

function buildUserMessage(reponses: ReponseInput[], prenom: string, nom: string, contexte: string): string {
  const filtered = reponses.map(r => ({
    titre: r.titre,
    date: r.date,
    scores: r.scores,
    scorePrincipal: r.scorePrincipal,
    interpretation: r.interpretation,
    miniSynthese: buildMiniSynthese(r.scores),
  }));
  const blocContexte = contexte
    ? `## Contexte anamnestique et signalétique du patient\n\n${contexte}`
    : '## Contexte anamnestique et signalétique du patient\n\nContexte anamnestique non renseigné pour ce patient.';
  return `Patient : ${prenom} ${nom}\nNombre de questionnaires complétés : ${filtered.length}\n\n${blocContexte}\n\n## Résultats des questionnaires\n\n${JSON.stringify(filtered, null, 2)}`;
}

// Fusionne les points de vigilance déterministes (garantis) en tête de ceux
// produits par le LLM, en dédupliquant de façon insensible à la casse.
function fusionnerVigilance(deterministes: string[], llm: string[]): string[] {
  const vus = new Set<string>();
  const out: string[] = [];
  for (const item of [...deterministes, ...llm]) {
    const cle = item.trim().toLowerCase();
    if (!cle || vus.has(cle)) continue;
    vus.add(cle);
    out.push(item.trim());
  }
  return out;
}

// GET /api/praticien/synthese?idPatient=PAT001
// Liste des synthèses d'un patient
export async function GET(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    logger.security({
      event: EVENT_CODES.AUTH_PRACTICIEN_UNAUTHORIZED,
      domain: 'AUTH',
      message: 'Accès synthèse sans session praticien',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();

  if (!idPatient) {
    return withCorrelationHeader(NextResponse.json({ syntheses: [] }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    // Scope par la relation patient : une synthèse d'un patient d'un autre
    // praticien ne remonte pas, plutôt que de remonter puis d'être filtrée.
    const syntheses = await prisma.syntheseIA.findMany({
      where: { idPatient, patient: filtrePatientsDuPraticien(emailSession) },
      orderBy: { dateGeneration: 'desc' },
      select: {
        idSynthese: true,
        idPatient: true,
        dateGeneration: true,
        modele: true,
        statut: true,
        dateValidation: true,
        notesPraticien: true,
        syntheseJson: true,
      },
    });

    return withCorrelationHeader(NextResponse.json({ syntheses }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.SYNTHESE_GET_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Échec lecture synthèses patient',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}

// POST /api/praticien/synthese
// Génère une nouvelle synthèse IA pour un patient
export async function POST(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    logger.security({
      event: EVENT_CODES.AUTH_PRACTICIEN_UNAUTHORIZED,
      domain: 'AUTH',
      message: 'Génération synthèse sans session praticien',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return withCorrelationHeader(NextResponse.json(
      { error: 'ANTHROPIC_API_KEY absente. Ajoutez-la dans web/.env.local.' },
      { status: 503 }
    ), requestContext);
  }

  let idPatient: string;
  try {
    const body = (await req.json()) as { idPatient?: string };
    idPatient = (body.idPatient ?? '').trim();
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  if (!idPatient || idPatient.length > 64 || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
    return withCorrelationHeader(NextResponse.json({ error: 'idPatient invalide.' }, { status: 400 }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  let idSynthese = '';
  try {
    // Garde d'appartenance avant tout appel au modèle : sans elle, générer une
    // synthèse enverrait les réponses d'un patient d'un autre praticien à
    // l'API Anthropic. Le patient d'un autre praticien est traité comme
    // introuvable — un message distinct confirmerait son existence.
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient) {
      return withCorrelationHeader(NextResponse.json({ error: 'Patient introuvable.' }, { status: 404 }), requestContext);
    }

    const reponses = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      orderBy: { dateReponse: 'desc' },
    });

    if (reponses.length === 0) {
      return withCorrelationHeader(NextResponse.json(
        { error: 'Aucun résultat de questionnaire disponible pour ce patient.' },
        { status: 422 }
      ), requestContext);
    }

    const reponsesInput: ReponseInput[] = reponses.map(r => ({
      titre: r.titre,
      date: r.dateReponse.toISOString().split('T')[0],
      scores: r.scoresJson as Record<string, unknown>,
      scorePrincipal: r.scorePrincipal,
      interpretation: r.interpretation,
    }));

    // Contexte clinique (fiche signalétique + anamnèse) — une seule anamnèse par
    // patient, portée par sa consultation. Best-effort : la synthèse fonctionne
    // avec les questionnaires seuls si aucune consultation renseignée.
    let contexteClinique = '';
    let vigilanceDeterministe: string[] = [];
    try {
      const consultation = await prisma.consultation.findFirst({
        where: { idPatient, NOT: { anamnese: { equals: Prisma.DbNull } } },
        orderBy: { createdAt: 'desc' },
      });
      if (consultation) {
        contexteClinique = buildContexteClinique(consultation.ficheSignaletique, consultation.anamnese);
        vigilanceDeterministe = extraireVigilanceDeterministe(consultation.anamnese);
      }
    } catch (ctxErr) {
      logger.warn({
        event: EVENT_CODES.SYNTHESE_POST_CONTEXT_UNAVAILABLE,
        domain: 'SYNTHESE_IA',
        message: 'Contexte clinique indisponible, fallback questionnaires seuls',
        context: finalizeLogContext(requestContext, { retryable: true }),
        error: ctxErr,
      });
    }

    const userMessage = buildUserMessage(reponsesInput, patient.prenom, patient.nom, contexteClinique);

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT_SYNTHESE, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    });

    const usage = (response.usage ?? {}) as {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    const metricsCache = {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    };

    if (response.stop_reason === 'max_tokens') {
      throw new Error('La synthèse IA a été tronquée (réponse trop longue). Réessayez.');
    }

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!text) throw new Error('Réponse vide de l\'API Claude.');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La réponse IA ne contient pas de JSON valide.');

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
      parsed = JSON.parse(cleaned);
    }

    const synthese = validateSyntheseSchema(parsed);
    // Garantit la présence des vigilances déterministes (signaux d'alerte,
    // traitements) en tête, même si le LLM les a omises.
    synthese.points_de_vigilance = fusionnerVigilance(vigilanceDeterministe, synthese.points_de_vigilance);
    idSynthese = createPublicId('SYN');

    const record = await prisma.syntheseIA.create({
      data: {
        idSynthese,
        idPatient,
        emailPatient: patient.email,
        modele: CLAUDE_MODEL,
        versionPrompt: VERSION_PROMPT_SYNTHESE,
        donneesEntree: {
          reponses: reponsesInput,
          contexteClinique,
          vigilanceDeterministe,
          metadonneesPrompt: {
            versionPrompt: VERSION_PROMPT_SYNTHESE,
            versionSchema: VERSION_SCHEMA_SYNTHESE,
            versionCorpus: VERSION_CORPUS_SYNTHESE,
            corpusSha256: CORPUS_CLINIQUE_SHA256,
            corpusActif: CORPUS_CLINIQUE_ACTIF,
            corpusValidationExterne: CORPUS_CLINIQUE_METADATA.validationExterne,
            corpusDateValidation: CORPUS_CLINIQUE_METADATA.dateValidation,
          },
          metriquesAnthropic: metricsCache,
        } as any,
        syntheseJson: synthese,
        statut: 'Brouillon_IA',
      },
    });

    await prisma.auditSynthese.create({
      data: {
        idSynthese,
        idPatient,
        modele: CLAUDE_MODEL,
        versionPrompt: VERSION_PROMPT_SYNTHESE,
        statut: 'OK',
      },
    });

    return withCorrelationHeader(NextResponse.json({
      success: true,
      idSynthese: record.idSynthese,
      synthese,
      modele: CLAUDE_MODEL,
      dateGeneration: record.dateGeneration.toISOString(),
    }), requestContext);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({
      event: EVENT_CODES.SYNTHESE_POST_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Erreur lors de la génération de synthèse IA',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });

    if (idSynthese) {
      await prisma.auditSynthese.create({
        data: {
          idSynthese,
          idPatient,
          modele: CLAUDE_MODEL,
          versionPrompt: VERSION_PROMPT_SYNTHESE,
          statut: 'Erreur',
          erreurCourte: sanitizeAuditError(msg),
        },
      }).catch(() => {});
    }

    return withCorrelationHeader(NextResponse.json(
      { error: 'Erreur lors de la génération de la synthèse. Réessayez.' },
      { status: 500 }
    ), requestContext);
  }
}

// PATCH /api/praticien/synthese
// Valider, rejeter ou annoter une synthèse
export async function PATCH(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);

  type PatchBody = {
    idSynthese?: string;
    action?: 'valider' | 'rejeter' | 'annoter';
    notes?: string;
  };

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const idSynthese = (body.idSynthese ?? '').trim();
  const action = body.action;
  const notes = (body.notes ?? '').trim().slice(0, 2000);

  if (!idSynthese || !action) {
    return withCorrelationHeader(NextResponse.json({ error: 'idSynthese et action sont requis.' }, { status: 400 }), requestContext);
  }

  try {
    const existing = await prisma.syntheseIA.findUnique({ where: { idSynthese } });
    if (!existing) {
      return withCorrelationHeader(NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 }), requestContext);
    }

    let statut = existing.statut;
    if (action === 'valider') {
      statut = 'Validee_Praticien';
    } else if (action === 'rejeter') {
      statut = 'Rejetee';
    } else if (action === 'annoter') {
      statut = existing.statut === 'Validee_Praticien' && notes ? 'Corrigee_Praticien' : existing.statut;
    } else {
      return withCorrelationHeader(NextResponse.json({ error: 'Action invalide.' }, { status: 400 }), requestContext);
    }

    await prisma.syntheseIA.update({
      where: { idSynthese },
      data: {
        statut,
        dateValidation: action === 'valider' ? new Date() : existing.dateValidation,
        notesPraticien: action === 'annoter' ? notes : existing.notesPraticien,
      },
    });

    return withCorrelationHeader(NextResponse.json({ success: true, statut }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.SYNTHESE_PATCH_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Erreur lors de la mise à jour de synthèse',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}
