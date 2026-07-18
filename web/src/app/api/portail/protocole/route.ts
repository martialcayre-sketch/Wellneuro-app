import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizePortail, resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { reconstructProtocolDraft, ProtocolPayloadIntegrityError } from '@/lib/protocol/fromPrisma';
import type { ProtocolActionType } from '@/lib/clinical-engine/types';
import type { ProtocolDiffusionApproval } from '@/lib/clinical-engine/types';
import { isC5Enabled } from '@/lib/food-compass/featureFlag';
import { resolvePatientFoodCompassView } from '@/lib/food-compass/patientReference';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import type { FoodCompassActionRef } from '@/lib/food-compass/types';

// Vue patient du protocole diffusé actif (C2A LOT-05, compagnon minimal). DÉRIVÉE
// À LA VOLÉE côté serveur (§8.3) : le patient ne lit jamais `protocol_drafts`.
// On n'expose qu'un sous-ensemble patient-safe (miroir de `PatientProtocolAction` :
// `title` + `minimalPlan` seulement — jamais `idealPlan`/`rescuePlan`/limitations
// internes/`therapeuticLoad`). Le `priorityLabel` du contrat
// `c1-patient-protocol-view-v1` est différé (issu de la DecisionCard NON persistée,
// §8.0) ; `purpose` sert de titre patient. Borné R8-lite : accueil du protocole
// ACTIF, jamais une « trajectoire » (= SP-SPI, Phase B). Aucun score.

type ErrorResponse = { ok: false; reason: string; error: string };

type ActionPrincipale = { type: ProtocolActionType; title: string; minimalPlan: string };

type VueProtocole = {
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  actionPrincipale: ActionPrincipale | null;
  boussoles: PatientFoodCompassSafeView[];
};

type GetResponse =
  | { ok: true; protocoleDiffuse: boolean; finDeCycle: boolean; vue: VueProtocole | null }
  | ErrorResponse;

const JOUR_MS = 24 * 60 * 60 * 1000;
// Fin de cycle = au-delà de la fenêtre du dernier point d'étape (J21 + tolérance
// ±3 j). Heuristique V1 déterministe : le modèle n'a pas de flag de cycle de vie.
const JOURS_FIN_DE_CYCLE = 24;

// GET — vue calme du protocole actif + état de cycle (sans check-in : le
// compagnon croise avec /api/portail/protocole/checkin pour l'état des RDV).
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const auth = await authorizePortail(req);
    if ('ok' in auth) {
      const status = auth.reason === 'unauthenticated' ? 401 : 404;
      return NextResponse.json(auth, { status });
    }

    const diffuse = await resolveProtocoleDiffuse(auth.idPatient);
    if (!diffuse) {
      return NextResponse.json({ ok: true, protocoleDiffuse: false, finDeCycle: false, vue: null });
    }

    const row = await prisma.protocolDraft.findUnique({
      where: { id: diffuse.protocolDraftId },
      select: { payload: true, inputHash: true },
    });
    if (!row) {
      // Approbation orpheline (ne devrait pas arriver) : dégradation propre.
      return NextResponse.json({ ok: true, protocoleDiffuse: false, finDeCycle: false, vue: null });
    }

    // Intégrité du payload re-vérifiée en lecture (défense en profondeur).
    const draft = reconstructProtocolDraft(row.payload, row.inputHash);
    const principale = draft.actions[0] ?? null;
    const approval: ProtocolDiffusionApproval = {
      decisionCardInputHash: diffuse.decisionCardInputHash,
      protocolDraftInputHash: diffuse.protocolDraftInputHash,
      approvedAt: diffuse.approvedAt.toISOString(),
      approvedBy: diffuse.approvedBy as 'practitioner',
      confirmation: diffuse.confirmation as 'content_approved_for_diffusion',
    };
    const seenFoodRefs = new Set<string>();
    const actionRefs = draft.actions
      .map(action => action.foodCompassRef)
      .filter((ref): ref is FoodCompassActionRef => {
        if (!ref || seenFoodRefs.has(ref.foodRef)) return false;
        seenFoodRefs.add(ref.foodRef);
        return true;
      });
    const boussoles = isC5Enabled(process.env.WN_C5_ENABLED)
      ? (await Promise.all(actionRefs.map(actionRef => resolvePatientFoodCompassView({
            idPatient: auth.idPatient,
            approvedDraft: draft,
            approval,
            actionRef,
          }))))
          .filter((view): view is PatientFoodCompassSafeView => view !== null)
      : [];

    const vue: VueProtocole = {
      purpose: draft.purpose,
      followUpCriterion: draft.followUpCriterion,
      adviceSheetRef: draft.adviceSheetRef,
      actionPrincipale: principale
        ? { type: principale.type, title: principale.title, minimalPlan: principale.minimalPlan }
        : null,
      boussoles,
    };

    const finDeCycle =
      (new Date().getTime() - diffuse.approvedAt.getTime()) / JOUR_MS > JOURS_FIN_DE_CYCLE;

    return NextResponse.json({ ok: true, protocoleDiffuse: true, finDeCycle, vue });
  } catch (err) {
    if (err instanceof ProtocolPayloadIntegrityError) {
      // Payload incohérent : ne rien exposer plutôt qu'une vue douteuse.
      return NextResponse.json(
        { ok: false, reason: 'integrity', error: 'Protocole indisponible.' },
        { status: 409 },
      );
    }
    console.error('[portail/protocole GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
