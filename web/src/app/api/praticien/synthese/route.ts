import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import {
  anthropic,
  CLAUDE_MODEL,
  SYSTEM_PROMPT_SYNTHESE,
  VERSION_CORPUS_SYNTHESE,
  VERSION_PROMPT_SYNTHESE,
  VERSION_SCHEMA_SYNTHESE,
  analyserSortieSynthese,
  validateSyntheseSchema,
  sanitizeAuditError,
} from '@/lib/anthropic';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { CORPUS_CLINIQUE_ACTIF } from '@/lib/anthropic';
import { CORPUS_CLINIQUE_METADATA, CORPUS_CLINIQUE_SHA256 } from '@/lib/clinical/corpusSyntheseV1';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { filtrerPassationsExploitables, statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
import { reponsesLisiblesPourPrompt } from '@/lib/scoring/reponsesLisibles';
import {
  avertissementSyntheseAnterieure,
  motifNonInterpretable,
} from '@/lib/scoring/passationsNonInterpretables';
import { buildContexteClinique, extraireVigilanceDeterministe } from '@/lib/consultation/contexteClinique';
import {
  MODELE_REDACTION_PRATICIEN,
  VERSION_SYNTHESE_PRATICIEN,
  nouveauBrouillonPraticien,
  validerBrouillonPraticien,
} from '@/lib/synthese-praticien';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';
import { instrumentAFormeVariable } from '@/lib/questionnaires/alimentaire';
import {
  evaluerOrientationPourPatient,
  type ResultatOrientation,
} from '@/lib/clinical/orientationService';
import {
  derniereReponseParQuestionnaire,
  type ReponseOrientation,
} from '@/lib/clinical/orientationEngine';
import {
  formaterEcarts,
  verifierRestitutionComplements,
  verifierRestitutionDiscordances,
  verifierRestitutionOrientation,
} from '@/lib/clinical/verifierRestitutionOrientation';
import { chargerVocabulaireIngredients } from '@/lib/supplement-library/vocabulaire';
import {
  constatsContradictionsPourDossier,
  contradictionsActives,
  discordancesPourGardeRestitution,
  vigilancesDiscordancePourSynthese,
} from '@/lib/clinical/contradictionsService';
import { CONTRADICTIONS_METADATA, CONTRADICTIONS_RULES_SHA256 } from '@/lib/clinical/contradictionsV1';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';
import {
  preparerGeneration,
  genererSynthesePersistee,
  logErreurGeneration,
  auditErreurGeneration,
  MAX_TOKENS_SYNTHESE,
} from '@/lib/synthese/generation';
import type { GenererArgs, DonePayload } from '@/lib/synthese/generation';
const MESSAGE_ERREUR_GENERATION = 'Erreur lors de la génération de la synthèse. Réessayez.';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/synthese';

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

    if (syntheses.length > 0) {
      // Liste non vide = appartenance prouvée par la relation. Liste vide =
      // rien (anti-oracle) — limite assumée (LOT-00) : dossier possédé sans
      // synthèse non journalisé.
      await journaliserAccesDossier({ idPatient, praticienEmail: emailSession, route: ROUTE_JOURNAL, methode: 'GET' });
    }

    // Synthèses rédigées AVANT le retrait d'interprétation : elles ont pu
    // s'appuyer sur une mesure qui n'en était pas une, et elles restent la
    // seule source des documents patient et médecin. On ne les réécrit pas —
    // on dit ce qu'elles valent, à la lecture. Une seule requête, et seulement
    // s'il y a quelque chose à qualifier.
    const syntheseAvecAvertissement = syntheses.length === 0 ? [] : await (async () => {
      const passations = await prisma.questionnaireReponse.findMany({
        where: { idPatient },
        select: { idQuestionnaire: true },
      });
      const ids = passations.map(p => p.idQuestionnaire);
      return syntheses.map(s => ({
        ...s,
        avertissementMesureRetiree: avertissementSyntheseAnterieure(ids, s.dateGeneration),
      }));
    })();

    return withCorrelationHeader(
      NextResponse.json({ syntheses: syntheseAvecAvertissement }),
      requestContext,
    );
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

    // LA MATIÈRE EST ASSEMBLÉE PAR LE MODULE, pas ici (`lib/synthese/generation`).
    // La route garde ce qui lui appartient : la session, l'appartenance —
    // vérifiée juste au-dessus —, les codes HTTP et les deux transports.
    const preparation = await preparerGeneration(idPatient, patient.email, requestContext);
    if (!preparation.ok) {
      return withCorrelationHeader(NextResponse.json(
        { error: 'Aucun résultat de questionnaire disponible pour ce patient.' },
        { status: 422 }
      ), requestContext);
    }
    const genererArgs = preparation.args;

    // Transport JSON historique (défaut, y compris Vercel) — inchangé.
    if (process.env.WN_SYNTHESE_STREAM !== 'true') {
      const state = { idSynthese: '' };
      try {
        const payload = await genererSynthesePersistee(genererArgs, state);
        return withCorrelationHeader(NextResponse.json(payload), requestContext);
      } catch (err) {
        logErreurGeneration(err, requestContext);
        await auditErreurGeneration(err, idPatient, state.idSynthese);
        return withCorrelationHeader(
          NextResponse.json({ error: MESSAGE_ERREUR_GENERATION }, { status: 500 }),
          requestContext,
        );
      }
    }

    // Transport SSE (Scalingo) : un octet précoce passe le seuil « premier
    // octet » de 30 s du routeur, les heartbeats tiennent la fenêtre 59 s, puis
    // un événement terminal `done`/`error`. Toutes les gardes qui rendent un
    // code d'erreur (401/404/422/503) sont AU-DESSUS, avant l'ouverture du flux :
    // une fois les en-têtes partis, le statut est figé à 200 et toute erreur
    // passe in-band par `event: error`.
    const encoder = new TextEncoder();
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
        const state = { idSynthese: '' };
        try {
          // Le heartbeat tient le routeur ; on borne quand même le travail à
          // ~4 min + une reprise (défaut SDK : 10 min, 2 reprises), pour ne pas
          // laisser une requête pendre après une déconnexion client.
          const payload = await genererSynthesePersistee(genererArgs, state, {
            timeout: 240_000,
            maxRetries: 1,
          });
          enqueue(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch (err) {
          logErreurGeneration(err, requestContext);
          await auditErreurGeneration(err, idPatient, state.idSynthese);
          enqueue(`event: error\ndata: ${JSON.stringify({ error: MESSAGE_ERREUR_GENERATION })}\n\n`);
        } finally {
          clearInterval(battement);
          try {
            controller.close();
          } catch {
            /* déjà fermé */
          }
        }
      },
    });

    return withCorrelationHeader(
      new Response(flux, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      }),
      requestContext,
    );
  } catch (err) {
    // Erreurs AVANT l'ouverture du flux (lectures DB patient/réponses/contexte) :
    // aucun id de synthèse n'existe encore, réponse d'erreur JSON classique.
    logErreurGeneration(err, requestContext);
    return withCorrelationHeader(
      NextResponse.json({ error: MESSAGE_ERREUR_GENERATION }, { status: 500 }),
      requestContext,
    );
  }
}

// PUT /api/praticien/synthese
// Crée un brouillon rédigé par le praticien, sans appel à un modèle d'IA.
export async function PUT(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  let body: { idPatient?: string; synthese?: unknown };
  try {
    body = (await req.json()) as { idPatient?: string; synthese?: unknown };
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const idPatient = (body.idPatient ?? '').trim();
  if (!idPatient || idPatient.length > 64 || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
    return withCorrelationHeader(NextResponse.json({ error: 'idPatient invalide.' }, { status: 400 }), requestContext);
  }

  const validation = validerBrouillonPraticien(body.synthese);
  if (!validation.ok) {
    return withCorrelationHeader(NextResponse.json({ error: validation.error }, { status: 400 }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient) {
      return withCorrelationHeader(NextResponse.json({ error: 'Patient introuvable.' }, { status: 404 }), requestContext);
    }

    const idSynthese = createPublicId('SYN');
    const record = await prisma.syntheseIA.create({
      data: {
        idSynthese,
        idPatient,
        emailPatient: patient.email,
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        donneesEntree: {
          source: 'praticien',
          versionSchema: VERSION_SYNTHESE_PRATICIEN,
        },
        syntheseJson: validation.synthese,
        statut: 'Brouillon_Praticien',
      },
    });

    await prisma.auditSynthese.create({
      data: {
        idSynthese,
        idPatient,
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        statut: 'Brouillon_Praticien_Cree',
      },
    });

    await journaliserAccesDossier({
      idPatient,
      praticienEmail: emailSession,
      route: ROUTE_JOURNAL,
      methode: 'PUT',
    });

    return withCorrelationHeader(NextResponse.json({
      success: true,
      synthese: {
        idSynthese: record.idSynthese,
        idPatient: record.idPatient,
        dateGeneration: record.dateGeneration,
        modele: record.modele,
        statut: record.statut,
        dateValidation: record.dateValidation,
        notesPraticien: record.notesPraticien,
        syntheseJson: record.syntheseJson,
      },
    }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.SYNTHESE_POST_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Erreur lors de la création du brouillon praticien',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}

// PATCH /api/praticien/synthese
// Enregistrer, valider, rejeter, annoter ou vider une synthèse.
export async function PATCH(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);

  type PatchBody = {
    idSynthese?: string;
    action?: 'enregistrer' | 'valider' | 'rejeter' | 'annoter' | 'effacer';
    notes?: string;
    synthese?: unknown;
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

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    const existing = await prisma.syntheseIA.findFirst({
      where: { idSynthese, patient: filtrePatientsDuPraticien(emailSession) },
    });
    if (!existing) {
      return withCorrelationHeader(NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 }), requestContext);
    }

    let statut = existing.statut;
    let syntheseJson: Prisma.InputJsonValue | undefined;
    let dateValidation: Date | null | undefined = existing.dateValidation;
    let notesPraticien: string | null | undefined = existing.notesPraticien;
    let modele: string | undefined;
    let versionPrompt: string | undefined;
    let donneesEntree: Prisma.InputJsonValue | undefined;
    if (action === 'enregistrer') {
      const estBrouillonPraticien = existing.statut === 'Brouillon_Praticien' && existing.modele === MODELE_REDACTION_PRATICIEN;
      const estBrouillonIA = existing.statut === 'Brouillon_IA';
      if (!estBrouillonPraticien && !estBrouillonIA) {
        return withCorrelationHeader(NextResponse.json(
          { error: 'Seul un brouillon (IA ou praticien) non encore validé peut être modifié.' },
          { status: 409 },
        ), requestContext);
      }
      if (estBrouillonPraticien) {
        const validation = validerBrouillonPraticien(body.synthese);
        if (!validation.ok) {
          return withCorrelationHeader(NextResponse.json({ error: validation.error }, { status: 400 }), requestContext);
        }
        syntheseJson = validation.synthese as Prisma.InputJsonValue;
      } else {
        // Brouillon IA : mêmes règles de coercion que celles appliquées à la
        // génération (`validateSyntheseSchema`), pas celles du brouillon
        // praticien. Les deux schémas ne sont pas interchangeables :
        // `validerBrouillonPraticien` borne des longueurs pensées pour la saisie
        // manuelle (narratif à 12000 car., 3 axes max...) et écrase toujours
        // `limites` par son propre texte — l'appliquer ici rejetterait une
        // édition triviale d'un contenu IA déjà plus long, et remplacerait
        // silencieusement la mention de limites générée par le modèle.
        syntheseJson = validateSyntheseSchema(body.synthese) as unknown as Prisma.InputJsonValue;
      }
    } else if (action === 'valider') {
      if (existing.statut === 'Brouillon_Praticien' || existing.modele === MODELE_REDACTION_PRATICIEN) {
        const validation = validerBrouillonPraticien(existing.syntheseJson);
        if (!validation.ok) {
          return withCorrelationHeader(NextResponse.json({ error: validation.error }, { status: 400 }), requestContext);
        }
        syntheseJson = validation.synthese as Prisma.InputJsonValue;
      }
      statut = 'Validee_Praticien';
      dateValidation = new Date();
    } else if (action === 'rejeter') {
      statut = 'Rejetee';
    } else if (action === 'annoter') {
      statut = existing.statut === 'Validee_Praticien' && notes ? 'Corrigee_Praticien' : existing.statut;
      notesPraticien = notes;
    } else if (action === 'effacer') {
      const bookletEnvoye = await prisma.bookletEnvoi.findFirst({
        where: { idSynthese, statut: 'Envoye' },
        select: { id: true },
      });
      if (bookletEnvoye) {
        return withCorrelationHeader(NextResponse.json(
          { error: 'Impossible de vider une synthèse dont le booklet a déjà été envoyé.' },
          { status: 409 },
        ), requestContext);
      }
      statut = 'Brouillon_Praticien';
      syntheseJson = nouveauBrouillonPraticien() as Prisma.InputJsonValue;
      dateValidation = null;
      notesPraticien = null;
      modele = MODELE_REDACTION_PRATICIEN;
      versionPrompt = VERSION_SYNTHESE_PRATICIEN;
      donneesEntree = {
        source: 'effacement_praticien',
        ancienModele: existing.modele,
        ancienStatut: existing.statut,
        versionSchema: VERSION_SYNTHESE_PRATICIEN,
      };
    } else {
      return withCorrelationHeader(NextResponse.json({ error: 'Action invalide.' }, { status: 400 }), requestContext);
    }

    const record = await prisma.syntheseIA.update({
      where: { idSynthese },
      data: {
        statut,
        dateValidation,
        notesPraticien,
        ...(modele ? { modele } : {}),
        ...(versionPrompt ? { versionPrompt } : {}),
        ...(donneesEntree ? { donneesEntree } : {}),
        ...(syntheseJson ? { syntheseJson } : {}),
      },
    });

    if (action === 'effacer') {
      await prisma.auditSynthese.create({
        data: {
          idSynthese,
          idPatient: existing.idPatient,
          modele: MODELE_REDACTION_PRATICIEN,
          versionPrompt: VERSION_SYNTHESE_PRATICIEN,
          statut: 'Brouillon_Efface_Praticien',
        },
      });
    }

    await journaliserAccesDossier({
      idPatient: existing.idPatient,
      praticienEmail: emailSession,
      route: ROUTE_JOURNAL,
      methode: 'PATCH',
    });

    return withCorrelationHeader(NextResponse.json({
      success: true,
      statut,
      syntheseJson: record.syntheseJson,
      modele: record.modele,
      dateValidation: record.dateValidation,
      notesPraticien: record.notesPraticien,
    }), requestContext);
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
