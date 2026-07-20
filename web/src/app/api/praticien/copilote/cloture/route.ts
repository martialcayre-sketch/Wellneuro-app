import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { resolveActiveVersion } from '@/lib/protocol/versioning';
import { resolveActiveApproval } from '@/lib/protocol/diffusion';
import { construireCloture, type Cloture } from '@/lib/copilote/minuteApres';

// GET /api/praticien/copilote/cloture?idPatient= — la minute d'après (SP-COP
// LOT-02). LECTURE SEULE : aucune écriture, aucune persistance, aucun envoi.
// L'état de clôture est recalculé à chaque appel, comme le pré-vol.
//
// Cette route ne réimplémente aucune règle : la tête de fil des versions et la
// tête de chaîne des approbations viennent de C2A (`resolveActiveVersion`,
// `resolveActiveApproval`), la composition vient de `lib/copilote/minuteApres`.
// Elle lit, elle assemble, elle transmet.
//
// Garde d'appartenance appliquée, comme sur /prevol, /reperes et /diffusion.

export type ClotureApiResponse =
  | { ok: true; cloture: Cloture }
  | { ok: false; reason: string; error: string };

export async function GET(req: Request): Promise<NextResponse<ClotureApiResponse>> {
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
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session));
    if (appartenance === 'introuvable') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const [versions, syntheses] = await Promise.all([
      prisma.protocolDraft.findMany({
        where: { idPatient },
        select: {
          id: true,
          inputHash: true,
          decisionCardId: true,
          decisionCardInputHash: true,
          selectedPriorityId: true,
          status: true,
          reviewedAt: true,
          supersedesDraftId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.syntheseIA.findMany({
        where: { idPatient },
        select: { statut: true, dateValidation: true },
      }),
    ]);

    // La clôture porte sur la consultation qu'on vient de terminer : le fil de
    // versions de la carte de décision la plus récente. Les fils antérieurs
    // restent consultables ailleurs — les mêler ici ferait apparaître comme
    // « à faire » des étapes déjà closes sur un protocole précédent.
    const filCourant = versions[0]?.decisionCardId ?? null;
    const versionsDuFil = filCourant
      ? versions.filter((version) => version.decisionCardId === filCourant)
      : [];
    const versionActive = resolveActiveVersion(versionsDuFil);

    const approbations = versionActive
      ? await prisma.protocolDiffusionApproval.findMany({
          where: { idPatient, decisionCardInputHash: versionActive.decisionCardInputHash },
          select: {
            id: true,
            protocolDraftInputHash: true,
            supersedesApprovalId: true,
            createdAt: true,
            approvedAt: true,
          },
        })
      : [];
    const approbationActive = resolveActiveApproval(approbations);

    const cloture = construireCloture({
      versionActive: versionActive
        ? {
            inputHash: versionActive.inputHash,
            selectedPriorityId: versionActive.selectedPriorityId,
            status: versionActive.status,
            reviewedAt: versionActive.reviewedAt,
            createdAt: versionActive.createdAt,
          }
        : null,
      approbationActive: approbationActive
        ? {
            protocolDraftInputHash: approbationActive.protocolDraftInputHash,
            approvedAt: approbationActive.approvedAt,
          }
        : null,
      syntheses,
    });

    return NextResponse.json({ ok: true, cloture });
  } catch (err) {
    console.error('[praticien/copilote/cloture GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
