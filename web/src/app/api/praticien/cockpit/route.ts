import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { construireReperes, resoudreAsOf, tronquerA } from '@/lib/praticien/lectureAsOf';
import { filtrerPassationsExploitables } from '@/lib/scoring/validite';
import { confirmAssessmentEpisode } from '@/lib/clinical-engine/assessmentEpisode';
import { construireChaineC1, type PlainteDominante } from '@/lib/clinical-engine/chaineC1';
import {
  adaptRuntimeInputs,
  isRuntimeMilestone,
  proposeRuntimeEpisode,
} from '@/lib/clinical-engine/runtimeFromPrisma';
import {
  messageRefusPreconditions,
  type PreconditionsT0,
} from '@/lib/clinical-engine/preconditionsT0';
import { preconditionsT0PourPatient } from '@/lib/clinical-engine/preconditionsT0Prisma';
import type {
  ClinicalReview,
  ClinicalSnapshot,
  DecisionCard,
  PreconditionOverride,
  ProposedAssessmentEpisode,
} from '@/lib/clinical-engine/types';
import {
  contradictionsPourPatient,
  type ContradictionAffichee,
} from '@/lib/clinical/contradictionsService';
import type { JalonMomentum } from '@/lib/equilibre/types';

type CockpitUnavailableReason =
  | 'unauthenticated'
  | 'invalid_payload'
  | 'patient_not_found'
  | 'proposal_stale'
  | 'preconditions_non_remplies'
  | 'motif_contournement_manquant'
  | 'exception';

export type CockpitRuntimeApiResponse =
  | {
      status: 'proposal_required';
      proposal: ProposedAssessmentEpisode;
      proposalHash: string;
      /**
       * Checklist de confirmation T0 ([[D-052]]) : conditions dures bloquantes,
       * souples contournables avec motif.
       *
       * ABSENTE EN LECTURE D'UN ÉTAT PASSÉ, délibérément : présenter un verdict
       * calculé sur le dossier d'aujourd'hui à côté d'une lecture datée d'hier
       * mêlerait deux instants dans le même écran. Le mode passé ne confirme
       * rien de toute façon (le POST y est refusé).
       */
      preconditions?: PreconditionsT0;
      // Instant de lecture quand la fiche est relue à une date passée (SP-TT).
      // `null` ou absent = état présent, comportement historique.
      asOf?: string | null;
    }
  | {
      status: 'ready';
      snapshot: ClinicalSnapshot;
      review: ClinicalReview;
      decisionCard: DecisionCard;
      /**
       * Constats du moteur DÉTERMINISTE de contradictions ([[D-050]]), à côté
       * des `discordances` de `review`, qui viennent de la revue clinique LLM.
       *
       * Ce champ n'entre PAS dans `ClinicalReview` : ce type est celui du moteur
       * clinique historique, dont `DiscordanceFinding` porte un `confidence` que
       * le garde de [[D-041]] interdit à un constat déterministe. Les deux
       * familles voyagent donc côte à côte, sans conversion de l'une vers
       * l'autre.
       *
       * Liste vide tant que la table n'est pas signée — le verrou est appliqué
       * dans le service, jamais ici ni chez le client.
       */
      contradictions: ContradictionAffichee[];
      /**
       * Le domaine de plainte que le patient déclare le plus intensément
       * ([[D-054]]), ou `null` si le canal de plainte n'est pas mesurable sur
       * l'épisode confirmé.
       *
       * PAS DERRIÈRE LE VERROU DE SIGNATURE, contrairement aux candidats : ce
       * n'est pas une sortie de règle, mais la restitution d'une bande déjà
       * publiée par un instrument certifié. Elle voyage à côté de la carte de
       * décision plutôt qu'à l'intérieur : la carte est hachée et persistée, et
       * y ajouter un champ d'affichage déplacerait toutes les empreintes.
       */
      plainteDominante: PlainteDominante | null;
    }
  | {
      status: 'unavailable';
      reason: CockpitUnavailableReason;
      error: string;
    };

export type ConfirmCockpitEpisodePayload = {
  idPatient?: string;
  milestone?: JalonMomentum;
  includedResponseIds?: string[];
  proposalHash?: string;
  /**
   * Contournements des conditions souples : la condition et son motif, rien de
   * plus. L'auteur et l'horodatage sont posés par le serveur ([[D-052]]).
   */
  overrides?: { conditionId?: string; motif?: string }[];
};

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/cockpit';

function unavailable(reason: CockpitUnavailableReason, error: string, status: number) {
  return NextResponse.json<CockpitRuntimeApiResponse>({ status: 'unavailable', reason, error }, { status });
}

// `emailPraticien` scope la lecture au praticien connecté : un patient d'un
// autre praticien est traité comme introuvable, ce qui évite d'en révéler
// l'existence. Point de passage unique du GET comme du POST.
// `asOfBrut` : lecture d'un état passé (SP-TT). Absent ⇒ présent, comportement
// strictement inchangé. Présent ⇒ doit correspondre à un repère réel du patient,
// sinon la lecture est refusée — jamais silencieusement ramenée au présent.
async function loadRuntimeInputs(idPatient: string, emailPraticien: string, asOfBrut?: string | null) {
  const patient = await prisma.patient.findFirst({
    where: { idPatient, ...filtrePatientsDuPraticien(emailPraticien) },
    select: { idPatient: true, createdAt: true },
  });
  if (!patient) return null;

  const [responses, consultation] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: [{ dateReponse: 'asc' }, { idReponse: 'asc' }],
    }),
    prisma.consultation.findFirst({
      where: { idPatient, statut: 'validee' },
      select: { anamnese: true },
      orderBy: [{ dateValidation: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const episodes = asOfBrut
    ? await prisma.assessmentEpisode.findMany({
        where: { idPatient },
        select: { milestone: true, confirmedAt: true },
      })
    : [];
  const resolution = resoudreAsOf(asOfBrut, construireReperes({ episodes, reponses: responses }));
  if (resolution.mode === 'refus') return { refus: resolution.raison } as const;

  const asOf = resolution.mode === 'passe' ? resolution.date : null;
  // Le passé est RECALCULÉ depuis les données brutes tronquées, jamais relu
  // depuis un snapshot : aucune donnée postérieure ne peut fuir dans la lecture.
  //
  // Filtre de validité (LOT-00, drapeau éteint par défaut) sur les entrées du
  // runtime clinique SEULEMENT : les repères as-of, eux, restent calculés sur
  // la liste complète — un repère est un fait administratif, pas une mesure.
  return {
    ...adaptRuntimeInputs(patient, filtrerPassationsExploitables(tronquerA(responses, asOf)), consultation),
    asOf: asOf ? asOf.toISOString() : null,
  };
}

// Ancre du cycle courant pour un jalon post-T0 : `confirmedAt` du T0 confirmé
// le plus récent — la même ancre que la trajectoire et `resoudreJalonDu`
// (LOT-08 A8-1 ; revue LOT-07 B2 : deux ancres rendaient les fenêtres du
// client et du serveur disjointes). T0 lui-même reste ancré sur la première
// réponse du dossier : aucun cycle confirmé ne le précède. En lecture datée
// (`asOf`), seuls les T0 confirmés à cette date comptent — un épisode
// postérieur ne doit pas fuir dans une lecture du passé.
async function ancreCycleCourant(
  idPatient: string,
  milestone: JalonMomentum,
  asOf: string | null,
): Promise<string | null> {
  if (milestone === 'T0') return null;
  const t0 = await prisma.assessmentEpisode.findFirst({
    where: { idPatient, milestone: 'T0', ...(asOf ? { confirmedAt: { lte: new Date(asOf) } } : {}) },
    orderBy: { confirmedAt: 'desc' },
    select: { confirmedAt: true },
  });
  return t0?.confirmedAt.toISOString() ?? null;
}

// GET /api/praticien/cockpit?idPatient=PAT001&milestone=T0
export async function GET(req: Request): Promise<NextResponse<CockpitRuntimeApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return unavailable('unauthenticated', 'Non authentifié.', 401);

  const searchParams = new URL(req.url).searchParams;
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  const milestoneRaw = searchParams.get('milestone') ?? 'T0';
  const asOfBrut = searchParams.get('asOf');
  if (!idPatient || !isRuntimeMilestone(milestoneRaw)) {
    return unavailable('invalid_payload', 'Patient ou jalon invalide.', 400);
  }

  try {
    const email = emailPraticien(session) ?? '';
    const inputs = await loadRuntimeInputs(idPatient, email, asOfBrut);
    if (!inputs) return unavailable('patient_not_found', 'Patient introuvable.', 404);
    // Journalisé ICI et non dans loadRuntimeInputs : le helper sert aussi le
    // POST, et GD-1 ne porte que sur les lectures de dossier nommé par un GET.
    // (Une rédaction antérieure invoquait la dispense « une écriture laisse
    // déjà sa trace » : elle ne s'applique pas, ce POST n'écrit rien — voir le
    // commentaire de la confirmation plus bas.) AVANT le refus `asOf` : le
    // dossier a été résolu et ses données lues — même principe que booklet et
    // documents avec leur 422.
    await journaliserAccesDossier({ idPatient, praticienEmail: email, route: ROUTE_JOURNAL, methode: 'GET' });
    if ('refus' in inputs) {
      // Une date hors repères n'est jamais ramenée au présent en silence : la
      // lecture serait alors présentée comme passée tout en étant actuelle.
      return unavailable('invalid_payload', 'Date de lecture inconnue pour ce patient.', 400);
    }
    const { proposal, proposalHash } = proposeRuntimeEpisode(
      inputs,
      milestoneRaw,
      await ancreCycleCourant(idPatient, milestoneRaw, inputs.asOf),
    );
    // Après `loadRuntimeInputs`, donc après la vérification d'appartenance.
    // T0 SEULEMENT : les jalons de suivi (J21, J42, J90) ne sont pas gouvernés
    // par cette porte — le lot pose les préconditions du point d'entrée, il ne
    // touche pas aux jalons ([[D-052]]).
    const preconditions = inputs.asOf || milestoneRaw !== 'T0'
      ? undefined
      : await preconditionsT0PourPatient(idPatient);
    return NextResponse.json({
      status: 'proposal_required',
      proposal,
      proposalHash,
      asOf: inputs.asOf,
      ...(preconditions ? { preconditions } : {}),
    });
  } catch (error) {
    console.error('[cockpit GET]', error instanceof Error ? error.message : String(error));
    return unavailable('exception', 'Erreur technique.', 500);
  }
}

// POST /api/praticien/cockpit — confirme en mémoire puis calcule la chaîne C1.
export async function POST(req: Request): Promise<NextResponse<CockpitRuntimeApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return unavailable('unauthenticated', 'Non authentifié.', 401);

  // Le mode passé est strictement en lecture : on ne confirme jamais un épisode
  // depuis un état qui n'est plus celui du patient (SP-TT).
  if (new URL(req.url).searchParams.get('asOf')) {
    return unavailable('invalid_payload', 'Aucune écriture possible en lecture d’un état passé.', 400);
  }

  let payload: ConfirmCockpitEpisodePayload;
  try {
    payload = await req.json() as ConfirmCockpitEpisodePayload;
  } catch {
    return unavailable('invalid_payload', 'JSON invalide.', 400);
  }
  const idPatient = (payload.idPatient ?? '').trim();
  const includedResponseIds = payload.includedResponseIds;
  const proposalHash = (payload.proposalHash ?? '').trim();
  if (
    !idPatient
    || !isRuntimeMilestone(payload.milestone)
    || !Array.isArray(includedResponseIds)
    || includedResponseIds.some(id => typeof id !== 'string' || !id.trim())
    || !proposalHash
  ) {
    return unavailable('invalid_payload', 'Confirmation d’épisode invalide.', 400);
  }

  try {
    const inputs = await loadRuntimeInputs(idPatient, emailPraticien(session) ?? '');
    if (!inputs) return unavailable('patient_not_found', 'Patient introuvable.', 404);
    if ('refus' in inputs) return unavailable('invalid_payload', 'Date de lecture inconnue pour ce patient.', 400);
    const current = proposeRuntimeEpisode(
      inputs,
      payload.milestone,
      await ancreCycleCourant(idPatient, payload.milestone, null),
    );
    if (current.proposalHash !== proposalHash) {
      return unavailable('proposal_stale', 'Les réponses ont changé. Rechargez la proposition.', 409);
    }

    const now = new Date().toISOString();

    // PRÉCONDITIONS T0 ([[D-052]]), recalculées DEPUIS LA BASE et jamais lues
    // dans le corps de requête. Ce POST n'écrit rien : le refus posé ici est un
    // pré-refus d'ergonomie, qui évite au praticien de composer un protocole
    // sur un épisode que les points de persistance rejetteront. La porte qui
    // garde vraiment la base est dans `protocoles` et `protocoles/versions`,
    // où le même calcul est rejoué.
    const preconditionOverrides: PreconditionOverride[] = [];
    if (payload.milestone === 'T0') {
      const preconditions = await preconditionsT0PourPatient(idPatient);
      if (preconditions.bloquant) {
        return unavailable('preconditions_non_remplies', messageRefusPreconditions(preconditions), 422);
      }
      const motifsRecus = new Map(
        (payload.overrides ?? [])
          .filter(o => typeof o?.conditionId === 'string' && typeof o?.motif === 'string')
          .map(o => [o.conditionId as string, (o.motif as string).trim()]),
      );
      for (const conditionId of preconditions.contournementsRequis) {
        const motif = motifsRecus.get(conditionId);
        if (!motif) {
          return unavailable(
            'motif_contournement_manquant',
            'Un motif est requis pour passer outre un avertissement.',
            422,
          );
        }
        // Auteur et horodatage posés ICI, côté serveur : l'épisode voyage par
        // le navigateur avant d'être persisté, et tracer un auteur choisi par
        // le client ne trace rien.
        preconditionOverrides.push({
          conditionId,
          motif: motif.slice(0, 2000),
          decidePar: emailPraticien(session) ?? '',
          decideLe: now,
        });
      }
    }

    const episode = confirmAssessmentEpisode(
      current.proposal,
      includedResponseIds,
      now,
      preconditionOverrides,
    );
    const idSuffix = `${payload.milestone}-${proposalHash.slice(0, 16)}`;
    // UN SEUL CHEMIN DE CONSTRUCTION, partagé avec le recalcul des deux points
    // de persistance ([[D-054]], arbitrage 6) : deux constructions divergentes
    // rendraient 409 sur une carte que ce POST vient d'émettre.
    //
    // UN SEUL HORODATAGE (`now`) pour l'épisode, le snapshot, la revue et la
    // carte : `createdAt` et `asOf` entrent dans les empreintes, et le
    // vérificateur les réutilise tels qu'ils ont été soumis.
    const { snapshot, review, decisionCard, plainteDominante } = construireChaineC1({
      snapshotId: `runtime-snapshot-${idSuffix}`,
      reviewId: `runtime-review-${idSuffix}`,
      decisionCardId: `runtime-decision-${idSuffix}`,
      patientId: idPatient,
      horodatage: now,
      episode,
      patientContext: inputs.patientContext,
      responses: inputs.responses,
      // Une confirmation d'épisode ne sélectionne RIEN : la sélection d'une
      // priorité est un geste praticien distinct, hors périmètre du LOT-04.
      selectionPraticien: null,
    });
    // Après `loadRuntimeInputs`, donc après que l'appartenance du patient au
    // praticien a été vérifiée — un patient d'un autre praticien est sorti en
    // 404 bien avant cette ligne. Le service ne pose ni authentification, ni
    // contrôle d'appartenance, ni journal : c'est l'appelant qui les porte.
    //
    // Ce POST ne journalise pas, et cette seconde lecture n'y change rien :
    // c'est le même praticien, le même dossier et la même requête déjà
    // autorisée, dans un POST qui n'écrit rien (`confirmAssessmentEpisode` est
    // en mémoire). Le dire plutôt que d'invoquer la dispense d'écriture de
    // GD-1, qui ne s'applique justement pas ici.
    //
    // PÉRIMÈTRE DIFFÉRENT DE CELUI DE `review`, et c'est nommé plutôt que
    // supposé : `snapshot`/`review` sont calculés sur les réponses INCLUSES
    // dans l'épisode T0 confirmé, alors que les contradictions sont évaluées
    // sur le dossier entier. Un constat peut donc reposer sur une passation que
    // le praticien a laissée hors de l'épisode. Les constats portent leurs
    // passations datées, ce qui rend l'écart lisible à l'écran ; réduire le
    // moteur au périmètre de l'épisode est un arbitrage clinique qui n'a pas
    // été rendu ([[D-050]]).
    const contradictions = await contradictionsPourPatient(idPatient);
    return NextResponse.json({
      status: 'ready', snapshot, review, decisionCard, contradictions, plainteDominante,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return unavailable('invalid_payload', error.message, 400);
    }
    console.error('[cockpit POST]', error instanceof Error ? error.message : String(error));
    return unavailable('exception', 'Erreur technique.', 500);
  }
}
