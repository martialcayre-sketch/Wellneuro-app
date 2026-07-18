import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveProtocolDraftId, deriveVersionId, resolveActiveVersion } from '@/lib/protocol/versioning';
import {
  DIFFUSION_CONFIRMATION,
  isApprovalStale,
  resolveActiveApproval,
  validateDiffusionApproval,
} from '@/lib/protocol/diffusion';

// Validation « pour diffusion » du protocole (C2A LOT-03 Part B). Persiste
// l'approbation praticien (contrat ProtocolDiffusionApproval), distincte de la
// relecture, ANCRÉE sur une version précise (caduque dès qu'une nouvelle version
// est enregistrée). Append-only chaîné. N'entraîne AUCUN envoi patient : la
// transmission relève d'un lot ultérieur (LOT-05).

const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

type PostBody = {
  idPatient?: string;
  decisionCardId?: string;
  protocolDraftInputHash?: string;
};

type PostResponse =
  | { ok: true; unchanged: boolean; approvalId: string; protocolDraftInputHash: string; approvedAt: string }
  | { ok: false; reason: string; error: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

// POST — approuve pour diffusion la version identifiée par son protocolDraftInputHash.
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    const { idPatient, decisionCardId, protocolDraftInputHash } = body;
    if (!isNonEmptyString(idPatient) || !isNonEmptyString(decisionCardId) || !isNonEmptyString(protocolDraftInputHash)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'idPatient, decisionCardId et protocolDraftInputHash sont requis.' },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient }, select: { praticienEmail: true },
    });
    if (!patient || patient.praticienEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const versionId = deriveVersionId(deriveProtocolDraftId(decisionCardId), protocolDraftInputHash);
    const version = await prisma.protocolDraft.findUnique({
      where: { id: versionId },
      select: { idPatient: true, inputHash: true, decisionCardInputHash: true, status: true, reviewedAt: true },
    });
    if (!version || version.idPatient !== idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'not_found', error: 'Version de protocole introuvable.' },
        { status: 404 },
      );
    }

    const approvedAt = new Date().toISOString();
    const approval = {
      decisionCardInputHash: version.decisionCardInputHash,
      protocolDraftInputHash,
      approvedAt,
      approvedBy: 'practitioner',
      confirmation: DIFFUSION_CONFIRMATION,
    };
    const check = validateDiffusionApproval({ version, approval });
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, reason: check.reason, error: 'Approbation de diffusion invalide.' },
        { status: 400 },
      );
    }

    // Chaînage append-only sur le fil d'approbations de cette décision.
    const rows = await prisma.protocolDiffusionApproval.findMany({
      where: { idPatient, decisionCardInputHash: version.decisionCardInputHash },
      select: { id: true, protocolDraftInputHash: true, supersedesApprovalId: true, createdAt: true },
    });
    const activeApproval = resolveActiveApproval(rows);

    // Idempotence : la version active est déjà approuvée → no-op.
    if (activeApproval && activeApproval.protocolDraftInputHash === protocolDraftInputHash) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        approvalId: activeApproval.id,
        protocolDraftInputHash,
        approvedAt,
      });
    }

    const created = await prisma.protocolDiffusionApproval.create({
      data: {
        idPatient,
        protocolDraftId: versionId,
        decisionCardInputHash: version.decisionCardInputHash,
        protocolDraftInputHash,
        approvedAt: new Date(approvedAt),
        approvedBy: 'practitioner',
        confirmation: DIFFUSION_CONFIRMATION,
        supersedesApprovalId: activeApproval?.id ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      unchanged: false,
      approvalId: created.id,
      protocolDraftInputHash,
      approvedAt,
    });
  } catch (err) {
    console.error('[praticien/protocoles/diffusion POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

type GetResponse =
  | {
      ok: true;
      approval: { approvalId: string; protocolDraftInputHash: string; approvedAt: string } | null;
      stale: boolean;
    }
  | { ok: false; reason: string; error: string };

// GET ?idPatient=&decisionCardId= — approbation active + indicateur de caducité.
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    const patient = await prisma.patient.findUnique({
      where: { idPatient }, select: { praticienEmail: true },
    });
    if (!patient || patient.praticienEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const versions = await prisma.protocolDraft.findMany({
      where: { idPatient, decisionCardId },
      select: { id: true, inputHash: true, decisionCardInputHash: true, supersedesDraftId: true, createdAt: true },
    });
    if (versions.length === 0) {
      return NextResponse.json({ ok: true, approval: null, stale: false });
    }
    const decisionCardInputHash = versions[0].decisionCardInputHash;
    const activeVersion = resolveActiveVersion(versions);

    const approvals = await prisma.protocolDiffusionApproval.findMany({
      where: { idPatient, decisionCardInputHash },
      select: { id: true, protocolDraftInputHash: true, supersedesApprovalId: true, createdAt: true, approvedAt: true },
    });
    const active = resolveActiveApproval(approvals);

    return NextResponse.json({
      ok: true,
      approval: active
        ? {
            approvalId: active.id,
            protocolDraftInputHash: active.protocolDraftInputHash,
            approvedAt: (approvals.find((a) => a.id === active.id)?.approvedAt ?? new Date()).toISOString(),
          }
        : null,
      stale: isApprovalStale(active, activeVersion?.inputHash ?? null),
    });
  } catch (err) {
    console.error('[praticien/protocoles/diffusion GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
