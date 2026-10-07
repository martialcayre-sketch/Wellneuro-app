import { NextResponse } from 'next/server';
import { isDeadlineExpired } from '@/lib/patient-access';
import {
  authorizeAgendaPortail,
  dateJourParis,
  type AgendaAuthError,
} from '@/lib/agenda-sommeil/portail';
import { listNuits, saveNuit } from '@/lib/agenda-sommeil/persistence';
import {
  calculerFenetre,
  ensureNuitReponses,
  estDateSaisissable,
  resolveNuitsActives,
  type FenetreAgenda,
  type NuitReponses,
} from '@/lib/agenda-sommeil/persistence';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';

// Agenda du sommeil patient (Q_SOM_09). Écriture UNIQUEMENT via session portail
// (chemin legacy email-gate exclu, §8.4). GET → frise + saisies BRUTES du
// patient (jamais un agrégat : réserve R1, aucun score renvoyé au patient).
// POST → une nuit (aujourd'hui ou correction de la veille), append-only chaîné.
//
// Journalisation des refus alignée sur le jumeau `agenda-alimentaire` : un code
// d'événement par nature de refus (`EVENT_CODES.AGENDA_SOMMEIL_*`), jamais la
// saisie du patient (`reponses`), jamais d'identifiant ni de nom en `metadata` —
// le motif suffit à compter, le `correlationId` relie le reste. Les statuts et
// les corps de réponse sont INCHANGÉS.

type ErrorResponse = { ok: false; reason: string; error: string };

type GetResponse =
  | {
      ok: true;
      fenetre: FenetreAgenda;
      nuits: { dateNuit: string; reponses: NuitReponses }[];
      derniereNuit: NuitReponses | null;
      statutReponses: string;
      aujourdHui: string;
    }
  | ErrorResponse;

type PostResponse = { ok: true; nuitId: string } | ErrorResponse;

/**
 * Refus d'ACCÈS (barrières d'autorisation de `authorizeAgendaPortail`) : journalisé
 * en `SECURITY`, puis rendu TEL QUEL (le corps reste l'objet d'erreur complet,
 * comme avant). `metadata` ne porte AUCUN identifiant : une énumération
 * d'`idAssignation` se compte par motif, sans que le journal ne la recopie.
 * `domain` porte la NATURE de l'événement (`SECURITY`), pas le préfixe du code —
 * même convention que le jumeau alimentaire.
 */
function refuserAcces(auth: AgendaAuthError, requestContext: RequestContext): NextResponse<ErrorResponse> {
  logger.security({
    event: EVENT_CODES.AGENDA_SOMMEIL_PORTAIL_FORBIDDEN,
    domain: 'SECURITY',
    message: 'Accès agenda du sommeil refusé',
    context: finalizeLogContext(requestContext, { statusCode: auth.status, retryable: false }),
    metadata: { motif: auth.reason },
  });
  return NextResponse.json(auth, { status: auth.status });
}

/**
 * Refus d'écriture APRÈS authentification (agenda clôturé, période terminée, date
 * hors fenêtre). `WARN` : volume borné par le nombre de patients authentifiés.
 */
function refuserEcriture(
  reason: string,
  error: string,
  status: number,
  requestContext: RequestContext,
): NextResponse<ErrorResponse> {
  logger.warn({
    event: EVENT_CODES.AGENDA_SOMMEIL_NUIT_REJETEE,
    domain: 'PORTAIL_PATIENT',
    message: 'Saisie de nuit du sommeil refusée',
    context: finalizeLogContext(requestContext, { statusCode: status, retryable: false }),
    metadata: { motif: reason },
  });
  return NextResponse.json({ ok: false, reason, error }, { status });
}

/**
 * Trace d'erreur du chemin d'ÉCRITURE : la CLASSE de l'erreur, son `code` s'il en
 * a un, et RIEN D'AUTRE. Jamais `err` tel quel : un `PrismaClientValidationError`
 * levé par le `create` recopie l'invocation fautive dans son message, `reponses`
 * COMPRISE (données de santé), et `sanitizeError` ne fait que tronquer à 300
 * caractères et masquer e-mails et longs identifiants. Même précaution que le
 * jumeau alimentaire (`traceErreur`) : on passe au logger une `Error`
 * neutralisée — `name` de l'originale, message fixe, pas de pile.
 */
function traceErreur(err: unknown): { error: Error; metadata?: Record<string, unknown> } {
  const neutralisee = new Error('Message d’erreur non journalisé (peut citer la saisie du patient).');
  neutralisee.name = err instanceof Error ? err.name || 'Error' : 'UnknownError';
  delete neutralisee.stack;
  const code = err instanceof Error ? (err as Error & { code?: unknown }).code : undefined;
  return {
    error: neutralisee,
    ...(typeof code === 'string' ? { metadata: { erreurCode: code } } : {}),
  };
}

// GET ?id=ASS…
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  const requestContext = createRequestContext(req);
  try {
    const { searchParams } = new URL(req.url);
    const auth = await authorizeAgendaPortail(req, searchParams.get('id'));
    if ('ok' in auth) return refuserAcces(auth, requestContext);

    const nuitsActives = resolveNuitsActives(
      await listNuits(auth.idPatient, auth.assignation.idAssignation),
    );
    const aujourdHui = dateJourParis();
    const fenetre = calculerFenetre(nuitsActives, aujourdHui);
    // Saisies brutes du patient (ses propres réponses) — jamais un agrégat.
    const nuits = nuitsActives.map((n) => ({ dateNuit: n.dateNuit, reponses: n.reponses }));
    const derniere = nuitsActives.length > 0 ? nuitsActives[nuitsActives.length - 1].reponses : null;

    return NextResponse.json({
      ok: true,
      fenetre,
      nuits,
      derniereNuit: derniere,
      statutReponses: auth.assignation.statutReponses,
      aujourdHui,
    });
  } catch (err) {
    // La lecture ne passe à Prisma que des identifiants (`idPatient`,
    // `idAssignation`), jamais les réponses : son message ne peut pas les citer.
    logger.error({
      event: EVENT_CODES.AGENDA_SOMMEIL_PORTAIL_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Erreur technique à la lecture de l’agenda du sommeil',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}

// POST { idAssignation, dateNuit?, reponses, supersedesNuitId? }
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  const requestContext = createRequestContext(req);
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // `DEBUG` : un client mal câblé produit ce 400 en série et le statut HTTP
      // dit déjà tout (même arbitrage que le jumeau alimentaire).
      logger.debug({
        event: EVENT_CODES.AGENDA_SOMMEIL_FORME_REJETEE,
        domain: 'PORTAIL_PATIENT',
        message: 'Corps de requête refusé avant authentification',
        context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
        metadata: { motif: 'invalid' },
      });
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Corps de requête illisible.' }, { status: 400 });
    }

    const auth = await authorizeAgendaPortail(req, typeof body.idAssignation === 'string' ? body.idAssignation : null);
    if ('ok' in auth) return refuserAcces(auth, requestContext);

    const ass = auth.assignation;
    // Agenda clôturé : plus aucune saisie (verrou identique à submit).
    if (ass.statutReponses === 'verrouille') {
      return refuserEcriture('locked', 'Cet agenda est clôturé.', 409, requestContext);
    }
    // Date limite (facultative) : bloque la saisie une fois dépassée, jamais la
    // consultation d'un agenda déjà clôturé (déjà géré ci-dessus).
    if (isDeadlineExpired(ass.dateLimite)) {
      return refuserEcriture('expired', 'La période de recueil est terminée.', 410, requestContext);
    }

    const aujourdHui = dateJourParis();
    // Date par défaut = aujourd'hui (le matin, on note la nuit passée) ; la veille
    // est acceptée pour une correction. Au-delà : refus (anti-fabrication).
    const dateNuit = typeof body.dateNuit === 'string' && body.dateNuit.trim() ? body.dateNuit.trim() : aujourdHui;
    if (!estDateSaisissable(dateNuit, aujourdHui)) {
      return refuserEcriture(
        'date_hors_fenetre',
        'Vous ne pouvez noter que la nuit dernière ou celle de la veille.',
        409,
        requestContext,
      );
    }

    const reponses = ensureNuitReponses(body.reponses, { exigerObligatoires: true });
    const supersedesNuitId = typeof body.supersedesNuitId === 'string' ? body.supersedesNuitId : undefined;

    const created = await saveNuit({
      idPatient: auth.idPatient,
      idAssignation: ass.idAssignation,
      dateNuit,
      reponses,
      supersedesNuitId,
    });

    logger.info({
      event: EVENT_CODES.AGENDA_SOMMEIL_NUIT_ENREGISTREE,
      domain: 'PORTAIL_PATIENT',
      message: 'Nuit d’agenda du sommeil enregistrée',
      context: finalizeLogContext(requestContext, { statusCode: 201, retryable: false }),
      metadata: { correction: Boolean(supersedesNuitId) },
    });

    return NextResponse.json({ ok: true, nuitId: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof TypeError) {
      // `motif` reste énumérable (`invalid`, comme les autres refus) ; `detail`
      // porte le message du contrat de domaine. Il est SÛR : les `TypeError` de
      // `nuit.ts` / `persistence.ts` ne citent que des noms de champs ou des
      // phrases fixes, jamais une valeur saisie. Il part déjà tel quel dans la
      // réponse HTTP (inchangée).
      logger.warn({
        event: EVENT_CODES.AGENDA_SOMMEIL_NUIT_REJETEE,
        domain: 'PORTAIL_PATIENT',
        message: 'Nuit du sommeil refusée par le contrat de domaine',
        context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
        metadata: { motif: 'invalid', detail: err.message },
      });
      return NextResponse.json({ ok: false, reason: 'invalid', error: err.message }, { status: 400 });
    }
    logger.error({
      event: EVENT_CODES.AGENDA_SOMMEIL_PORTAIL_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Erreur technique à l’enregistrement d’une nuit du sommeil',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      // Ce chemin porte le risque nommé dans `traceErreur` : voir ce helper.
      ...traceErreur(err),
    });
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
