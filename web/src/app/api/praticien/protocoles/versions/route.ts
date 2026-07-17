import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type {
  ConfirmedAssessmentEpisode,
  DecisionCard,
  ProtocolAction,
  TherapeuticLoad,
} from '@/lib/clinical-engine/types';
import {
  deriveProtocolDraftId,
  deriveVersionId,
  isClinicalChange,
  resolveActiveVersion,
  toDraftCreateInput,
  toEpisodeCreateInput,
} from '@/lib/protocol/versioning';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';

// Versionnement du protocole 21 jours (C2A LOT-03). Chaque enregistrement
// explicite d'un CHANGEMENT CLINIQUE crée une ligne append-only chaînée
// (`supersedes_draft_id` = version active précédente) ; un contenu clinique
// identique est un no-op (jamais de doublon). L'horodatage de la validation
// praticien est `reviewed_at`. La construction du `ProtocolDraft` (validations
// + hash `node:crypto`) reste serveur. Aucun envoi automatique : ce lot s'arrête
// à la version relue ; la diffusion patient relève d'un lot ultérieur.
//
// NB déviation §8.6 : l'id de ligne est `${protocolDraftId}#${inputHash}` (le
// contrat réutilise `protocolDraftId` d'une révision à l'autre) — voir
// lib/protocol/versioning.ts. Additive-only, aucune migration.

type Submission = {
  purpose?: string;
  followUpCriterion?: string;
  actions?: ProtocolAction[];
  therapeuticLoad?: TherapeuticLoad;
  adviceSheetRef?: string | null;
  limitations?: string[];
};

type PostBody = {
  episode?: ConfirmedAssessmentEpisode;
  decisionCard?: DecisionCard;
  submission?: Submission;
  baseVersionId?: string | null;
};

type PostResponse =
  | {
      ok: true;
      unchanged: boolean;
      versionId: string;
      protocolDraftId: string;
      status: string;
      supersedesDraftId: string | null;
    }
  | { ok: false; reason: string; error: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

// POST — enregistre explicitement une version du protocole (relue par le praticien).
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Corps de requête illisible.' },
        { status: 400 },
      );
    }

    const { episode, decisionCard, submission } = body;
    if (!episode || !decisionCard || !submission) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'episode, decisionCard et submission sont requis.' },
        { status: 400 },
      );
    }
    if (episode.status !== 'confirmed' || !isNonEmptyString(episode.confirmedAt)) {
      return NextResponse.json(
        { ok: false, reason: 'not_confirmed', error: 'Seul un épisode confirmé peut porter un protocole.' },
        { status: 400 },
      );
    }
    if (!isNonEmptyString(episode.patientId) || !isNonEmptyString(decisionCard.decisionCardId)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiants de contrat manquants.' },
        { status: 400 },
      );
    }

    const idPatient = episode.patientId;
    const decisionCardId = decisionCard.decisionCardId;
    const protocolDraftId = deriveProtocolDraftId(decisionCardId);

    // Fil de versions de ce protocole logique (borné au patient).
    const rows = await prisma.protocolDraft.findMany({
      where: { idPatient, decisionCardId },
      select: { id: true, inputHash: true, supersedesDraftId: true, createdAt: true, payload: true },
    });
    const active = resolveActiveVersion(rows);

    // Anti-écrasement optimiste : le praticien construit sur une version connue.
    const baseVersionId = body.baseVersionId ?? null;
    if (baseVersionId !== null && (active?.id ?? null) !== baseVersionId) {
      return NextResponse.json(
        { ok: false, reason: 'version_stale', error: 'La version active a changé ; rechargez l’historique.' },
        { status: 409 },
      );
    }

    let activeDraft = null;
    if (active) {
      activeDraft = reconstructProtocolDraft(active.payload, active.inputHash);
    }

    // Construction serveur : validations + hash du moteur clinique.
    const now = new Date().toISOString();
    let draft;
    try {
      draft = buildProtocolDraft({
        protocolDraftId,
        decisionCard,
        createdAt: activeDraft ? activeDraft.createdAt : now,
        updatedAt: now,
        purpose: submission.purpose ?? '',
        followUpCriterion: submission.followUpCriterion ?? '',
        adviceSheetRef: submission.adviceSheetRef ?? null,
        actions: submission.actions ?? [],
        therapeuticLoad: submission.therapeuticLoad as TherapeuticLoad,
        limitations: submission.limitations ?? [],
        review: { reviewedAt: now, reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
      });
    } catch (err) {
      return NextResponse.json(
        { ok: false, reason: 'draft_invalid', error: err instanceof Error ? err.message : 'Protocole invalide.' },
        { status: 400 },
      );
    }

    // Pas de changement clinique → no-op (jamais de version en double).
    if (active && activeDraft && !isClinicalChange(activeDraft, draft)) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        versionId: active.id,
        protocolDraftId,
        status: activeDraft.status,
        supersedesDraftId: active.supersedesDraftId,
      });
    }

    const versionId = deriveVersionId(protocolDraftId, draft.inputHash);
    const supersedesDraftId = active?.id ?? null;

    await prisma.$transaction([
      prisma.assessmentEpisode.upsert({
        where: { id: episode.assessmentEpisodeId },
        create: toEpisodeCreateInput(episode),
        update: {},
      }),
      prisma.protocolDraft.upsert({
        where: { id: versionId },
        create: toDraftCreateInput({ id: versionId, draft, decisionCard, episode, supersedesDraftId }),
        update: {},
      }),
    ]);

    return NextResponse.json({
      ok: true,
      unchanged: false,
      versionId,
      protocolDraftId,
      status: draft.status,
      supersedesDraftId,
    });
  } catch (err) {
    console.error('[praticien/protocoles/versions POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

type HistoryItem = {
  versionId: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  inputHash: string;
  supersedesDraftId: string | null;
  isActive: boolean;
};

type GetResponse =
  | {
      ok: true;
      protocolDraftId: string | null;
      active: { versionId: string; status: string; createdAt: string; reviewedAt: string | null } | null;
      history: HistoryItem[];
    }
  | { ok: false; reason: string; error: string };

// GET ?idPatient=&decisionCardId= — version active + historique d'un fil.
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const decisionCardId = (searchParams.get('decisionCardId') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }
    if (!decisionCardId || !ID_PATTERN.test(decisionCardId) || decisionCardId.length > 200) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant de carte de décision invalide.' },
        { status: 400 },
      );
    }

    const rows = await prisma.protocolDraft.findMany({
      where: { idPatient, decisionCardId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        inputHash: true,
        supersedesDraftId: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    const active = resolveActiveVersion(rows);

    return NextResponse.json({
      ok: true,
      protocolDraftId: rows.length > 0 ? deriveProtocolDraftId(decisionCardId) : null,
      active: active
        ? {
            versionId: active.id,
            status: active.status,
            createdAt: active.createdAt.toISOString(),
            reviewedAt: active.reviewedAt ? active.reviewedAt.toISOString() : null,
          }
        : null,
      history: rows.map((row) => ({
        versionId: row.id,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
        inputHash: row.inputHash,
        supersedesDraftId: row.supersedesDraftId,
        isActive: active ? row.id === active.id : false,
      })),
    });
  } catch (err) {
    console.error('[praticien/protocoles/versions GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
