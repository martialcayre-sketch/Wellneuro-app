import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { reconstructProtocolDraft, ProtocolPayloadIntegrityError } from '@/lib/protocol/fromPrisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';

// Cycle JA diffusé, vu du praticien (lot 2, item 5). Miroir exact de ce que
// `GET /api/portail/protocole` sert au patient, pour que les deux panneaux du
// carnet dérivent le MÊME épisode — et non deux gabarits aux identifiants
// divergents (`ja_${id}` d'un côté, `ja_praticien_${id}` de l'autre).
// Lecture seule ; aucune donnée nouvelle n'est exposée au praticien, qui a déjà
// accès au protocole complet.

const ROUTE_JOURNAL = '/api/praticien/ja/cycle';
const LONGUEUR_CYCLE_REF = 16;

type ErrorResponse = { ok: false; reason: string; error: string };
type CycleVue = {
  purpose: string;
  actionPrincipale: { type: string; title: string; minimalPlan: string } | null;
  cycleRef: string;
  debutCycle: string;
};
type GetResponse = { ok: true; protocoleDiffuse: boolean; vue: CycleVue | null } | ErrorResponse;

function sanitizePatientId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification praticien requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = sanitizePatientId(searchParams.get('idPatient'));
    if (!idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (verdict !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const diffuse = await resolveProtocoleDiffuse(idPatient);
    if (!diffuse) {
      return NextResponse.json({ ok: true, protocoleDiffuse: false, vue: null });
    }

    const row = await prisma.protocolDraft.findUnique({
      where: { id: diffuse.protocolDraftId },
      select: { payload: true, inputHash: true },
    });
    if (!row) {
      return NextResponse.json({ ok: true, protocoleDiffuse: false, vue: null });
    }

    const draft = reconstructProtocolDraft(row.payload, row.inputHash);
    const principale = draft.actions[0] ?? null;

    return NextResponse.json({
      ok: true,
      protocoleDiffuse: true,
      vue: {
        purpose: draft.purpose,
        actionPrincipale: principale
          ? { type: principale.type, title: principale.title, minimalPlan: principale.minimalPlan }
          : null,
        cycleRef: diffuse.protocolDraftInputHash.slice(0, LONGUEUR_CYCLE_REF),
        debutCycle: diffuse.approvedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ProtocolPayloadIntegrityError) {
      return NextResponse.json(
        { ok: false, reason: 'integrity', error: 'Protocole indisponible.' },
        { status: 409 },
      );
    }
    console.error('[praticien/ja/cycle GET]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
