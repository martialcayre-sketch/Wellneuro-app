import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ancreDepuisAssignation,
  authorizePortail,
  resolveProtocoleDiffuse,
} from '@/lib/protocol/portailProtocol';
import { reconstructProtocolDraft, ProtocolPayloadIntegrityError } from '@/lib/protocol/fromPrisma';
import { rejouerCarteDecision } from '@/lib/clinical-engine/rejeuCarteDecision';
import { vuePatientOuRefus } from '@/lib/protocol/servirAuPatient';
import type { ProtocolDiffusionApproval } from '@/lib/clinical-engine/types';
import {
  LONGUEUR_CYCLE_REF,
  projeterSurLeFil,
  type VuePatientSurLeFil,
} from '@/lib/protocol/vuePatientSurLeFil';
import { isC5Enabled } from '@/lib/food-compass/featureFlag';
import { resolvePatientFoodCompassView } from '@/lib/food-compass/patientReference';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import type { FoodCompassActionRef } from '@/lib/food-compass/types';

// Vue patient du protocole diffusé actif (C2A LOT-05, compagnon minimal). DÉRIVÉE
// À LA VOLÉE côté serveur (§8.3) : le patient ne lit jamais `protocol_drafts`.
// Borné R8-lite : accueil du protocole ACTIF, jamais une « trajectoire »
// (= SP-SPI, Phase B). Aucun score.
//
// LE CONTRAT EST LE PRODUCTEUR, ET PLUS CETTE ROUTE ([[D-191]]). Jusqu'ici la
// projection patient était écrite À LA MAIN ici : elle servait `draft.actions[0]`
// — UNE action sur les trois que le constructeur fait saisir, élue par l'ordre
// d'insertion et par rien d'autre —, ne rendait aucun libellé d'axe, et laissait
// `followUpCriterion` traverser le JSON sans qu'aucun écran ne l'affiche. Cinq
// descriptions de « ce que le patient lit » coexistaient dans le dépôt.
// `buildPatientProtocolView` (`c1-patient-protocol-view-v2`) est désormais seul à
// décider, et il REFUSE ce qu'il ne sait pas dire — un statut d'intervention
// inconnu n'est pas servi en silence.
//
// LA CARTE EST RECOMPOSÉE, PAS PERSISTÉE. Le contrat exige une `DecisionCard`
// entière ; aucune table ne la porte. `rejouerCarteDecision` la rejoue depuis la
// base à l'horodatage de confirmation de l'épisode, et refuse si son empreinte
// n'est plus celle qu'a approuvée le praticien. Ce refus est un CONSTAT DE
// FRAÎCHEUR : ce qui est servi au patient repose encore sur le dossier que le
// praticien avait sous les yeux quand il a validé.
//
// CE QUI PART SUR LE FIL reste un sous-ensemble : le contrat porte les
// identifiants d'enveloppe et les trois empreintes, qui n'ont rien à faire dans
// un navigateur patient — `cycleRef`, opaque et tronqué, est la seule référence
// de cycle qu'il reçoit. Ce n'est pas une sixième description : c'est la
// projection DU contrat, écrite en un seul endroit, sous les yeux de la garde.

type ErrorResponse = { ok: false; reason: string; error: string };

/**
 * L'ancre est l'assignation du patient, réduite aux caractères sûrs : elle est
 * stable tant que le suivi l'est, et le serveur peut la recalculer pour vérifier
 * une transmission — le client ne choisit pas l'identité de son épisode.
 */
async function ancreCalibrage(idAssignation: string): Promise<AncreCalibrage> {
  // Le début vient de l'assignation, pas de l'horloge : un début recalculé
  // chaque jour ferait glisser la fenêtre du bilan sous les pieds du patient.
  const assignation = await prisma.assignation.findUnique({
    where: { idAssignation },
    select: { dateAssignation: true },
  });
  return {
    ancre: ancreDepuisAssignation(idAssignation),
    debut: (assignation?.dateAssignation ?? new Date()).toISOString().slice(0, 10),
  };
}

/**
 * Ancre du bilan de calibrage : servie UNIQUEMENT tant qu'aucun protocole n'est
 * diffusé. Elle donne au carnet une identité d'épisode avant le protocole, sans
 * quoi la saisie du patient reste locale et intransmissible.
 */
type AncreCalibrage = { ancre: string; debut: string };

type GetResponse =
  | {
      ok: true;
      protocoleDiffuse: boolean;
      finDeCycle: boolean;
      vue: VuePatientSurLeFil | null;
      /**
       * UN PROTOCOLE EST DIFFUSÉ ET NE PEUT PAS ÊTRE SERVI. Distinct de
       * `protocoleDiffuse: false`, qui dit une attente paisible : ici il y a
       * quelque chose, et le patient a le droit de savoir qu'il ne le voit pas.
       * Le motif ne traverse jamais — le patient lit une indisponibilité, pas un
       * diagnostic — et le praticien, lui, le lit sur son écran de diffusion.
       */
      indisponible: boolean;
      calibrage: AncreCalibrage | null;
    }
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
      return NextResponse.json({
        ok: true,
        protocoleDiffuse: false,
        finDeCycle: false,
        vue: null,
        indisponible: false,
        calibrage: await ancreCalibrage(auth.idAssignation),
      });
    }

    const row = await prisma.protocolDraft.findUnique({
      where: { id: diffuse.protocolDraftId },
      select: { payload: true, inputHash: true, assessmentEpisodeId: true },
    });
    if (!row) {
      // Approbation orpheline (ne devrait pas arriver) : dégradation propre.
      return NextResponse.json({
        ok: true,
        protocoleDiffuse: false,
        finDeCycle: false,
        vue: null,
        indisponible: false,
        calibrage: await ancreCalibrage(auth.idAssignation),
      });
    }

    // Intégrité du payload re-vérifiée en lecture (défense en profondeur).
    const draft = reconstructProtocolDraft(row.payload, row.inputHash);
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

    const finDeCycle =
      (new Date().getTime() - diffuse.approvedAt.getTime()) / JOUR_MS > JOURS_FIN_DE_CYCLE;

    // LA CARTE, REJOUÉE. Si elle a dérivé, ou si le contrat refuse ce que le
    // payload contient, rien n'est servi — et l'écran le DIT. Le repli sur
    // l'ancienne projection serait pire que le vide : il servirait un protocole
    // que la garde de fraîcheur vient d'écarter, sous une forme qui ne sait pas
    // dire qu'une intervention n'est pas ferme.
    const rejeu = await rejouerCarteDecision({
      idPatient: auth.idPatient,
      decisionCardId: diffuse.decisionCardId,
      assessmentEpisodeId: row.assessmentEpisodeId,
      decisionCardInputHash: diffuse.decisionCardInputHash,
    });
    if (!rejeu.ok) {
      console.warn('[portail/protocole GET] protocole diffusé non servi :', rejeu.motif);
      return NextResponse.json({
        ok: true, protocoleDiffuse: true, finDeCycle, vue: null, indisponible: true, calibrage: null,
      });
    }

    // LE CONTRAT ACCEPTE-T-IL ? La question est posée par `vuePatientOuRefus`,
    // partagé avec le miroir praticien de la diffusion — deux descriptions de
    // la même règle auraient dérivé ([[D-200]]).
    const service = vuePatientOuRefus({
      decisionCard: rejeu.decisionCard,
      protocolDraft: draft,
      approval,
      // AUCUNE LIMITATION PATIENT AUJOURD'HUI, et c'est une absence, pas un
      // vide : celles de la carte sont écrites POUR LE PRATICIEN (« aucune
      // priorité ne peut être proposée avant… »). Les traduire serait fabriquer
      // du texte patient ; les recopier serait lui servir un raisonnement
      // interne. Dette nommée au dossier de campagne.
      patientLimitations: [],
    });
    if (!service.ok) {
      console.warn('[portail/protocole GET] le contrat patient refuse ce protocole :', service.detail);
      return NextResponse.json({
        ok: true, protocoleDiffuse: true, finDeCycle, vue: null, indisponible: true, calibrage: null,
      });
    }

    const vue = projeterSurLeFil({
      vue: service.vue,
      boussoles,
      cycleRef: diffuse.protocolDraftInputHash.slice(0, LONGUEUR_CYCLE_REF),
      debutCycle: diffuse.approvedAt.toISOString(),
    });

    return NextResponse.json({
      ok: true, protocoleDiffuse: true, finDeCycle, vue, indisponible: false, calibrage: null,
    });
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
