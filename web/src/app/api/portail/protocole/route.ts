import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ancreDepuisAssignation,
  authorizePortail,
  resolveProtocoleDiffuse,
} from '@/lib/protocol/portailProtocol';
import { calendrierDuProtocoleDiffuse } from '@/lib/protocol/calendriersPersistes';
import { reconstructProtocolDraft, ProtocolPayloadIntegrityError } from '@/lib/protocol/fromPrisma';
import { servirAuPatient } from '@/lib/protocol/servirAuPatientServeur';
import { pausesParReference, type ElementEnPause } from '@/lib/trust/pauseEffetIndesirable';
import { pausesServies } from '@/lib/trust/pauseEffetIndesirableServeur';
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
import { lectureProtocoleOuverte } from '@/lib/portail/lectureProtocole';
import { encartConduiteOuvert } from '@/lib/portail/encartConduite';
import {
  creeeSousGardeEtendue,
  troisPlansOuverts,
  troisPlansServis,
  type TroisPlansAction,
} from '@/lib/portail/troisPlans';

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
      /**
       * LES ÉLÉMENTS EN PAUSE sur effet indésirable ([[D-281]] §3), HORS de la
       * vue signée (`c1-patient-protocol-view-v2`, inchangée). Vide tant que
       * la règle amendée n'est pas signée : d'ici là, capture et notification
       * seulement (§6).
       */
      pauses?: ElementEnPause[];
      /**
       * LES LECTURES DE LA BOUSSOLE DONT L'ALIMENT EST PORTÉ PAR UN ÉLÉMENT EN
       * PAUSE, par `foodRef` de la lecture servie. Elles restent servies et
       * marquées « en pause » avec le texte signé (D-281 §2, arbitrage du
       * 2026-10-16). Vide avant la signature, comme `pauses`.
       */
      boussolesEnPause?: { foodRef: string; texte: ElementEnPause['texte'] }[];
      /**
       * LE JOURNAL DE LECTURE DU PROTOCOLE ([[D-315]], CC-8). Présent seulement
       * quand `WN_PORTAIL_LECTURE_PROTOCOLE` est ouvert et qu'une vue est
       * servie : l'accueil replie alors le détail tant que `dejaOuvert` est
       * faux. Absent, l'accueil sert le protocole déplié, comme avant.
       */
      lectureDuDetail?: { dejaOuvert: boolean };
      /**
       * L'ENCART « QUAND RALENTIR OU DEMANDER AVIS » ([[D-349]], lettre bd).
       * Présent seulement quand `WN_PORTAIL_ENCART_CONDUITE` est ouvert et
       * qu'une vue est servie. Absent, l'accueil ne le rend pas.
       */
      encartConduite?: true;
      /**
       * « VALIDÉ PAR VOTRE PRATICIEN LE … » ([[D-369]], lettre ba) : l'instant
       * de l'approbation de diffusion de la version servie, en ISO. Présent
       * seulement quand une vue est servie ; une nouvelle version approuvée
       * porte sa propre date ([[D-368]] §4). L'accueil le dit en toutes lettres.
       */
      valideLe?: string;
      /**
       * LES PLANS IDÉAL ET DE SECOURS des actions fermes ([[D-384]] §2-§4),
       * HORS de la vue signée (`c1-patient-protocol-view-v2`, inchangée), comme
       * `pauses`. Présent seulement quand `WN_PORTAIL_TROIS_PLANS` est ouvert,
       * que la version servie a été créée sous la garde étendue ([[D-386]] §2)
       * et qu'au moins une action ferme les porte. Absent, l'accueil sert le
       * plan minimal seul, comme avant.
       */
      troisPlans?: TroisPlansAction[];
    }
  | ErrorResponse;

/**
 * Cette diffusion a-t-elle déjà été ouverte par ce patient ? Lu sur sa propre
 * trace (`portail_lectures_patient`, espèce `protocole`) : c'est le portail qui
 * lit, jamais une surface praticien. Une lecture en échec rend « non ouverte » :
 * le détail se présente replié, ce qui ne cache rien — un clic le déplie.
 */
async function detailDejaOuvert(idPatient: string, approbationId: string): Promise<boolean> {
  try {
    const ligne = await prisma.portailLecturePatient.findUnique({
      where: { idPatient_espece_idObjet: { idPatient, espece: 'protocole', idObjet: approbationId } },
      select: { idObjet: true },
    });
    return ligne !== null;
  } catch (err) {
    console.warn('[portail/protocole GET] lecture du détail illisible', err instanceof Error ? err.name : 'inconnu');
    return false;
  }
}

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
      select: { payload: true, inputHash: true, assessmentEpisodeId: true, createdAt: true },
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
    // La référence de l'action reste attachée à sa lecture : c'est par elle
    // qu'une lecture se marque en pause, plus bas.
    const lectures = isC5Enabled(process.env.WN_C5_ENABLED)
      ? await Promise.all(actionRefs.map(async actionRef => ({
          actionRef,
          view: await resolvePatientFoodCompassView({
            idPatient: auth.idPatient,
            approvedDraft: draft,
            approval,
            actionRef,
          }),
        })))
      : [];
    const boussoles = lectures
      .map(lecture => lecture.view)
      .filter((view): view is PatientFoodCompassSafeView => view !== null);

    // Le cycle se compte depuis son jour 0, pas depuis la dernière
    // rediffusion ([[D-255]]).
    const { jourZero } = await calendrierDuProtocoleDiffuse(auth.idPatient, diffuse);
    const finDeCycle =
      (new Date().getTime() - jourZero.getTime()) / JOUR_MS > JOURS_FIN_DE_CYCLE;

    // LA CARTE, REJOUÉE, PUIS LE CONTRAT. Si elle a dérivé, ou si le contrat
    // refuse ce que le payload contient, rien n'est servi — et l'écran le DIT.
    // Le repli sur l'ancienne projection serait pire que le vide : il servirait
    // un protocole que la garde de fraîcheur vient d'écarter, sous une forme qui
    // ne sait pas dire qu'une intervention n'est pas ferme. Les deux marches
    // sont composées par `servirAuPatient`, partagé avec le miroir praticien de
    // la diffusion et la désignation du signalement ([[D-200]]).
    const service = await servirAuPatient({
      idPatient: auth.idPatient,
      decisionCardId: diffuse.decisionCardId,
      assessmentEpisodeId: row.assessmentEpisodeId,
      protocolDraft: draft,
      approval,
    });
    if (!service.ok) {
      if (service.marche === 'carte') {
        console.warn('[portail/protocole GET] protocole diffusé non servi :', service.motif);
      } else {
        console.warn('[portail/protocole GET] le contrat patient refuse ce protocole :', service.detail);
      }
      return NextResponse.json({
        ok: true, protocoleDiffuse: true, finDeCycle, vue: null, indisponible: true, calibrage: null,
      });
    }

    const vue = projeterSurLeFil({
      vue: service.vue,
      boussoles,
      cycleRef: diffuse.protocolDraftInputHash.slice(0, LONGUEUR_CYCLE_REF),
      debutCycle: jourZero.toISOString(),
    });

    const pauses = await pausesServies(auth.idPatient, diffuse.protocolDraftId, draft.actions);
    const pauseParAliment = pausesParReference(draft.actions, pauses, action => action.foodCompassRef?.foodRef);
    const boussolesEnPause = lectures.flatMap(({ actionRef, view }) => {
      const texte = view ? pauseParAliment.get(actionRef.foodRef) : undefined;
      return view && texte ? [{ foodRef: view.foodRef, texte }] : [];
    });
    const lectureDuDetail = lectureProtocoleOuverte()
      ? { dejaOuvert: await detailDejaOuvert(auth.idPatient, diffuse.approbationId) }
      : undefined;
    // LA MARQUE EST LA COLONNE DE LA LIGNE ([[D-386]] §2), jamais le `createdAt`
    // du payload, hérité d'une version à l'autre. Avant l'instant, ou dans le
    // doute : plan minimal seul (§3).
    const troisPlans = troisPlansOuverts() && creeeSousGardeEtendue(row.createdAt)
      ? troisPlansServis({ actionsServies: vue.actions, actionsDuProtocole: draft.actions, pauses })
      : [];

    return NextResponse.json({
      ok: true, protocoleDiffuse: true, finDeCycle, vue, indisponible: false, calibrage: null, pauses, boussolesEnPause,
      valideLe: diffuse.approvedAt.toISOString(),
      ...(lectureDuDetail ? { lectureDuDetail } : {}),
      ...(encartConduiteOuvert() ? { encartConduite: true as const } : {}),
      ...(troisPlans.length > 0 ? { troisPlans } : {}),
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
