import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { reconstructProtocolDraft, ProtocolPayloadIntegrityError } from '@/lib/protocol/fromPrisma';
import { rejouerCarteDecision } from '@/lib/clinical-engine/rejeuCarteDecision';
import { buildPatientProtocolView } from '@/lib/clinical-engine/patientProtocolView';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  LONGUEUR_CYCLE_REF,
  projeterSurLeFil,
  type VuePatientSurLeFil,
} from '@/lib/protocol/vuePatientSurLeFil';
import type { ProtocolDiffusionApproval } from '@/lib/clinical-engine/types';

// Cycle JA diffusé, vu du praticien (lot 2, item 5). Miroir exact de ce que
// `GET /api/portail/protocole` sert au patient, pour que les deux panneaux du
// carnet dérivent le MÊME épisode — et non deux gabarits aux identifiants
// divergents (`ja_${id}` d'un côté, `ja_praticien_${id}` de l'autre).
// Lecture seule ; aucune donnée nouvelle n'est exposée au praticien, qui a déjà
// accès au protocole complet.
//
// « MIROIR EXACT » L'ÉTAIT DEVENU FAUX ([[D-191]]). Cette route recopiait la
// projection manuelle du portail — `draft.actions[0]` comprise — au lieu de la
// partager : deux copies d'un même défaut, et rien pour les faire diverger
// bruyamment. Elle passe désormais par le MÊME rejeu de carte, le MÊME contrat
// `c1-patient-protocol-view-v2` et la MÊME projection. Le praticien voit donc
// aussi le refus quand le patient ne voit rien — c'est le seul endroit du dépôt
// où cette symétrie était promise en commentaire sans être tenue.

const ROUTE_JOURNAL = '/api/praticien/ja/cycle';

type ErrorResponse = { ok: false; reason: string; error: string };
type GetResponse =
  | { ok: true; protocoleDiffuse: boolean; vue: VuePatientSurLeFil | null }
  | ErrorResponse;

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
      select: { payload: true, inputHash: true, assessmentEpisodeId: true },
    });
    if (!row) {
      return NextResponse.json({ ok: true, protocoleDiffuse: false, vue: null });
    }

    const draft = reconstructProtocolDraft(row.payload, row.inputHash);
    const rejeu = await rejouerCarteDecision({
      idPatient,
      decisionCardId: diffuse.decisionCardId,
      assessmentEpisodeId: row.assessmentEpisodeId,
      decisionCardInputHash: diffuse.decisionCardInputHash,
    });
    if (!rejeu.ok) {
      // LE PRATICIEN VOIT CE QUE LE PATIENT VOIT — c'est-à-dire rien, et pour la
      // même raison. Servir ici un protocole que le portail refuse ferait croire
      // au praticien que son patient le lit.
      console.warn('[praticien/ja/cycle GET] protocole diffusé non servi :', rejeu.motif);
      return NextResponse.json({ ok: true, protocoleDiffuse: false, vue: null });
    }

    const approval: ProtocolDiffusionApproval = {
      decisionCardInputHash: diffuse.decisionCardInputHash,
      protocolDraftInputHash: diffuse.protocolDraftInputHash,
      approvedAt: diffuse.approvedAt.toISOString(),
      approvedBy: diffuse.approvedBy as 'practitioner',
      confirmation: diffuse.confirmation as 'content_approved_for_diffusion',
    };
    let vue: VuePatientSurLeFil;
    try {
      vue = projeterSurLeFil({
        vue: buildPatientProtocolView({
          decisionCard: rejeu.decisionCard,
          protocolDraft: draft,
          approval,
          patientLimitations: [],
        }),
        // Le carnet praticien ne rend aucune boussole : elles vivent sur la
        // surface patient, sous le drapeau C5.
        boussoles: [],
        cycleRef: diffuse.protocolDraftInputHash.slice(0, LONGUEUR_CYCLE_REF),
        debutCycle: diffuse.approvedAt.toISOString(),
      });
    } catch (erreur) {
      console.warn(
        '[praticien/ja/cycle GET] le contrat patient refuse ce protocole :',
        erreur instanceof Error ? erreur.message : String(erreur),
      );
      return NextResponse.json({ ok: true, protocoleDiffuse: false, vue: null });
    }

    return NextResponse.json({ ok: true, protocoleDiffuse: true, vue });
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
