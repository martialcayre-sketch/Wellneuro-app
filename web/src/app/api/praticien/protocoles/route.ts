import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type {
  ConfirmedAssessmentEpisode,
  DecisionCard,
  ProtocolDraft,
} from '@/lib/clinical-engine/types';
import {
  deriveProtocolDraftId,
  resolveCycleId,
  toDraftCreateInput,
  toEpisodeCreateInput,
} from '@/lib/protocol/versioning';
import {
  emailPraticien,
  filtrePatientsDuPraticien,
  verifierAppartenancePatient,
} from '@/lib/praticien/appartenance';

// Persistance minimale C2A (LOT-02). Le praticien authentifié persiste un
// épisode CONFIRMÉ et un protocole RELU (practitioner_reviewed). Le snapshot,
// la review et la decision-card ne sont PAS persistés (recalculables) : seules
// leurs empreintes servent d'ancrage de provenance (spec §8.0/§8.2). Écritures
// idempotentes par identifiant de contrat (§8.6) ; corrections = nouvelle
// version (append-only, §8.5). Aucun accès inter-patient : la lecture est
// bornée à l'idPatient demandé, toujours derrière une session NextAuth.

type PersistBody = {
  episode?: ConfirmedAssessmentEpisode;
  decisionCard?: DecisionCard;
  draft?: ProtocolDraft;
};

type PersistResponse =
  | { ok: true; assessmentEpisodeId: string; protocolDraftId: string }
  | { ok: false; reason: string; error: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

// POST /api/praticien/protocoles — persiste { episode, decisionCard, draft }.
export async function POST(req: Request): Promise<NextResponse<PersistResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    let body: PersistBody;
    try {
      body = (await req.json()) as PersistBody;
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Corps de requête illisible.' },
        { status: 400 },
      );
    }

    const { episode, decisionCard, draft } = body;
    if (!episode || !decisionCard || !draft) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'episode, decisionCard et draft sont requis.' },
        { status: 400 },
      );
    }

    // Seuls les objets validés par le praticien sont persistés.
    if (episode.status !== 'confirmed' || !isNonEmptyString(episode.confirmedAt)) {
      return NextResponse.json(
        { ok: false, reason: 'not_confirmed', error: 'Seul un épisode confirmé peut être persisté.' },
        { status: 400 },
      );
    }
    if (draft.status !== 'practitioner_reviewed') {
      return NextResponse.json(
        { ok: false, reason: 'not_reviewed', error: 'Seul un protocole relu par le praticien peut être persisté.' },
        { status: 400 },
      );
    }

    // Cohérence de la chaîne d'intégrité (ancres de provenance, §8.2).
    if (
      draft.decisionCardId !== decisionCard.decisionCardId ||
      draft.decisionCardInputHash !== decisionCard.inputHash
    ) {
      return NextResponse.json(
        { ok: false, reason: 'provenance_mismatch', error: 'Le protocole ne correspond pas à sa carte de décision.' },
        { status: 400 },
      );
    }
    if (
      !isNonEmptyString(episode.patientId) ||
      !isNonEmptyString(episode.assessmentEpisodeId) ||
      !isNonEmptyString(draft.protocolDraftId)
    ) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiants de contrat manquants.' },
        { status: 400 },
      );
    }

    // Garde d'appartenance, AVANT toute écriture : sans elle, un praticien
    // pourrait persister un épisode et un protocole sur le patient d'un autre.
    const appartenance = await verifierAppartenancePatient(episode.patientId, emailPraticien(session));
    if (appartenance !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }

    // Identité de cycle (gate G2), résolue AVANT la transaction : un T0 ouvre son
    // cycle, un jalon postérieur rejoint le dernier T0 antérieur du patient.
    const cycleId = resolveCycleId({
      episode,
      t0Candidates:
        episode.milestone === 'T0'
          ? []
          : await prisma.assessmentEpisode.findMany({
              where: { idPatient: episode.patientId, milestone: 'T0' },
              select: { id: true, cycleId: true, confirmedAt: true },
            }),
    });

    // Transaction : épisode puis protocole, idempotents par identifiant de contrat.
    // Le versionnement append-only (supersedes) relève de la route /versions
    // (LOT-03) : ici l'id de ligne reste le protocolDraftId du contrat (LOT-02).
    await prisma.$transaction([
      prisma.assessmentEpisode.upsert({
        where: { id: episode.assessmentEpisodeId },
        create: toEpisodeCreateInput(episode, { cycleId }),
        update: {},
      }),
      prisma.protocolDraft.upsert({
        where: { id: draft.protocolDraftId },
        create: toDraftCreateInput({
          id: draft.protocolDraftId,
          draft,
          decisionCard,
          episode,
          supersedesDraftId: null,
        }),
        update: {},
      }),
    ]);

    return NextResponse.json({
      ok: true,
      assessmentEpisodeId: episode.assessmentEpisodeId,
      protocolDraftId: draft.protocolDraftId,
    });
  } catch (err) {
    console.error('[praticien/protocoles POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

type ListItem = {
  versionId: string;
  protocolDraftId: string;
  status: string;
  milestone: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type ListResponse =
  | { ok: true; protocoles: ListItem[] }
  | { ok: false; reason: string; error: string };

// GET /api/praticien/protocoles?idPatient=... — protocoles persistés d'un patient.
export async function GET(req: Request): Promise<NextResponse<ListResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const emailSession = emailPraticien(session);
    if (!emailSession) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    // Scope par la relation patient : les protocoles d'un patient d'un autre
    // praticien ne remontent pas — la liste est vide, comme pour un patient
    // sans protocole, sans révéler que celui-ci existe.
    const drafts = await prisma.protocolDraft.findMany({
      where: { idPatient, patient: filtrePatientsDuPraticien(emailSession) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        decisionCardId: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        episode: { select: { milestone: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      protocoles: drafts.map((d) => ({
        versionId: d.id,
        protocolDraftId: deriveProtocolDraftId(d.decisionCardId),
        status: d.status,
        milestone: d.episode?.milestone ?? null,
        createdAt: d.createdAt.toISOString(),
        reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
      })),
    });
  } catch (err) {
    console.error('[praticien/protocoles GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
