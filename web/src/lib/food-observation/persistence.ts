import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { prisma } from '@/lib/prisma';
import type {
  ActionCareer,
  FoodObservationEpisode,
  IntraEpisodeSolution,
  JourneeRepere,
  MinimalPlanEvent,
  PatientPauseEvent,
  TrialTrace,
} from '@/lib/food-observation/types';
import { readFoodObservationEpisode } from '@/lib/food-observation/episode';
import { readJourneeRepere } from '@/lib/food-observation/journee';
import {
  JA_FOOD_OBSERVATION_CONTRACT_VERSION,
  JA_SELECTED_PRIORITY_ID,
} from '@/lib/food-observation/contract';

export { JA_FOOD_OBSERVATION_CONTRACT_VERSION } from '@/lib/food-observation/contract';

export type JaObservationSnapshotInput = {
  idPatient: string;
  episode: FoodObservationEpisode;
  traces: TrialTrace[];
  pauses: PatientPauseEvent[];
  plans: MinimalPlanEvent[];
  solutions: IntraEpisodeSolution[];
  actionCareer: ActionCareer[];
  /**
   * Journées repères du bilan de calibrage (lot 3). Facultatif : les
   * instantanés d'avant ce lot n'en portent pas, et un épisode en régime
   * `essai` n'en produit aucune.
   */
  journees?: JourneeRepere[];
  supersedesDraftId?: string;
  actor: 'praticien' | 'patient';
};

/**
 * Contenu d'UN instantané, pour la lecture praticien.
 *
 * Distinct de `JaObservationSnapshot`, qui ne porte que des comptes : la liste
 * en rend jusqu'à cinquante, et y charger les payloads ferait payer à chaque
 * ouverture de fiche le contenu que le praticien n'a pas demandé.
 *
 * Les listes sont rendues TELLES QUE LE PATIENT LES A ÉCRITES, mots libres
 * compris (arbitrage du 2026-07-30). Elles sont en base depuis le lot 2 : ce
 * détail n'ajoute aucune donnée, il ouvre une surface de lecture.
 */
export type JaObservationSnapshotDetail = JaObservationSnapshot & {
  traces: TrialTrace[];
  pauses: PatientPauseEvent[];
  plans: MinimalPlanEvent[];
  solutions: IntraEpisodeSolution[];
  journees: JourneeRepere[];
};

export type JaObservationSnapshot = {
  draftId: string;
  idPatient: string;
  episodeId: string;
  createdAt: string;
  supersedesDraftId: string | null;
  actor: 'praticien' | 'patient';
  tracesCount: number;
  pausesCount: number;
  plansCount: number;
  solutionsCount: number;
  careersCount: number;
  journeesCount: number;
};

export type JaMilestone = 'J7' | 'J14' | 'J21';
export type JaChargePercue = 'faible' | 'moderee' | 'elevee';

export type JaActivationInput = {
  idPatient: string;
  draftId: string;
  milestone: JaMilestone;
  deltaDecision: string;
  feedbackPatient: string;
  chargePercue: JaChargePercue;
  budgetChargeGlobal: number;
};

export type JaActivationSummary = {
  draftId: string;
  sourceDraftId: string;
  idPatient: string;
  episodeId: string;
  milestone: JaMilestone;
  deltaDecision: string;
  feedbackPatient: string;
  chargePercue: JaChargePercue;
  budgetChargeGlobal: number;
  reviewedAt: string;
};

function ensurePatientId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError('Identifiant patient invalide.');
  }
  return trimmed;
}

function ensureDraftId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(trimmed)) {
    throw new TypeError('Identifiant de version invalide.');
  }
  return trimmed;
}

function buildDecisionCardId(episodeId: string): string {
  return `JA_DECISION_${episodeId}`;
}

function buildDraftId(episodeId: string, atIso: string): string {
  const shortHash = canonicalSha256({ episodeId, atIso }).slice(0, 16);
  return `JA_DRAFT_${shortHash}`;
}

function isJaMilestone(value: string): value is JaMilestone {
  return value === 'J7' || value === 'J14' || value === 'J21';
}

function isChargePercue(value: string): value is JaChargePercue {
  return value === 'faible' || value === 'moderee' || value === 'elevee';
}

function buildActivationDraftId(episodeId: string, atIso: string): string {
  const shortHash = canonicalSha256({ episodeId, atIso, scope: 'activation' }).slice(0, 16);
  return `JA_ACT_${shortHash}`;
}

export async function saveJaObservationSnapshot(input: JaObservationSnapshotInput): Promise<JaObservationSnapshot> {
  const idPatient = ensurePatientId(input.idPatient);
  const episode = readFoodObservationEpisode(input.episode);
  if (episode.patientId !== idPatient) {
    throw new TypeError('L’épisode JA n’appartient pas au patient demandé.');
  }
  // Cohérence trace ↔ épisode. Une trace saisie sous un autre épisode — cycle
  // précédent restauré du brouillon local, ou saisie faite avant que le cycle
  // soit résolu — serait persistée sous le cycle courant, puis rejetée en
  // silence à la lecture (`buildPublishedJaFeasibility` lève, et
  // `getLatestPublishedJaFeasibility` avale l'exception) : la faisabilité JA
  // disparaîtrait de la boussole praticien sans le moindre message.
  // Borne de volume. Le lot 2 branche le premier client d'une route d'écriture
  // jusqu'ici dormante : le contenu vient d'un navigateur patient, et rien
  // d'autre ne limite ce qui entre dans `protocol_drafts.payload`. Le budget
  // d'attention plafonne à 7 traces/semaine sur une fenêtre de 21 jours ;
  // 200 éléments par liste laissent une marge large et ferment l'écriture non
  // bornée.
  const MAX_ELEMENTS_PAR_LISTE = 200;

  // Relues plutôt que crues : sans cela, un `typeJournee` inconnu, un nombre de
  // prises absurde ou une `localDate` qui n'en est pas une entreraient tels
  // quels dans `protocol_drafts.payload` — toutes les bornes du domaine ne
  // vivraient que dans le navigateur.
  const journees = (input.journees ?? []).map(readJourneeRepere);
  const evenements: { evenements: { episodeId: string }[]; nom: string }[] = [
    { evenements: input.traces, nom: 'traces' },
    { evenements: input.pauses, nom: 'pauses' },
    { evenements: input.plans, nom: 'plans' },
    { evenements: input.solutions, nom: 'solutions' },
    { evenements: journees, nom: 'journées' },
  ];
  for (const { evenements: liste, nom } of evenements) {
    if (liste.length > MAX_ELEMENTS_PAR_LISTE) {
      throw new TypeError(`Instantané JA hors bornes : trop de ${nom}.`);
    }
    if (liste.some(item => item.episodeId !== episode.episodeId)) {
      throw new TypeError(`Instantané JA incohérent : des ${nom} relèvent d’un autre épisode.`);
    }
  }
  // Une journée par date : sans cette garde, deux descriptions du même mardi
  // compteraient deux fois et la couverture par types redeviendrait un volume —
  // exactement le défaut retiré au lot 1 côté traces.
  const datesJournees = new Set(journees.map(j => j.localDate));
  if (datesJournees.size !== journees.length) {
    throw new TypeError('Instantané JA incohérent : deux journées repères portent la même date.');
  }
  if (input.actionCareer.length > MAX_ELEMENTS_PAR_LISTE) {
    throw new TypeError('Instantané JA hors bornes : trop d’éléments de carrière d’action.');
  }

  const capturedAt = new Date().toISOString();
  const payload = {
    actor: input.actor,
    capturedAt,
    episode,
    traces: input.traces,
    pauses: input.pauses,
    plans: input.plans,
    solutions: input.solutions,
    actionCareer: input.actionCareer,
    journees,
  };

  const draftId = buildDraftId(episode.episodeId, capturedAt);
  const payloadHash = canonicalSha256(payload);
  const supersedesDraftId = input.supersedesDraftId ? ensureDraftId(input.supersedesDraftId) : null;

  const row = await prisma.protocolDraft.create({
    data: {
      id: draftId,
      idPatient,
      assessmentEpisodeId: null,
      decisionCardId: buildDecisionCardId(input.episode.episodeId),
      decisionCardInputHash: payloadHash,
      snapshotInputHash: payloadHash,
      reviewInputHash: payloadHash,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'draft',
      payload: payload as unknown as object,
      inputHash: payloadHash,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      supersedesDraftId,
      reviewedAt: null,
    },
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      createdAt: true,
      payload: true,
    },
  });

  const data = row.payload as {
    actor: 'praticien' | 'patient';
    episode?: { episodeId?: string };
    traces?: unknown[];
    pauses?: unknown[];
    plans?: unknown[];
    solutions?: unknown[];
    actionCareer?: unknown[];
    journees?: unknown[];
  };

  return {
    draftId: row.id,
    idPatient: row.idPatient,
    episodeId: data.episode?.episodeId ?? episode.episodeId,
    createdAt: row.createdAt.toISOString(),
    supersedesDraftId: row.supersedesDraftId,
    actor: data.actor,
    tracesCount: Array.isArray(data.traces) ? data.traces.length : 0,
    pausesCount: Array.isArray(data.pauses) ? data.pauses.length : 0,
    plansCount: Array.isArray(data.plans) ? data.plans.length : 0,
    solutionsCount: Array.isArray(data.solutions) ? data.solutions.length : 0,
    careersCount: Array.isArray(data.actionCareer) ? data.actionCareer.length : 0,
    journeesCount: Array.isArray(data.journees) ? data.journees.length : 0,
  };
}

/**
 * `actor` filtre **en base**, pas après coup. Un filtrage côté client sur une
 * fenêtre de `limit` lignes tous acteurs confondus fait disparaître les
 * transmissions du patient dès que quelques activations praticien les
 * précèdent — chaque activation écrivant deux lignes JA — et la surface qui les
 * affiche conclut alors « aucune transmission » alors qu'il y en a.
 */
export async function listJaObservationSnapshots(
  idPatientRaw: string,
  limit = 10,
  actor?: 'praticien' | 'patient',
): Promise<JaObservationSnapshot[]> {
  const idPatient = ensurePatientId(idPatientRaw);
  const max = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 10;

  const rows = await prisma.protocolDraft.findMany({
    where: {
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      ...(actor ? { payload: { path: ['actor'], equals: actor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: max,
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      createdAt: true,
      payload: true,
    },
  });

  return rows.map((row: { id: string; idPatient: string; supersedesDraftId: string | null; createdAt: Date; payload: unknown }) => {
    const data = row.payload as {
      actor?: 'praticien' | 'patient';
      episode?: { episodeId?: string };
      traces?: unknown[];
      pauses?: unknown[];
      plans?: unknown[];
      solutions?: unknown[];
      actionCareer?: unknown[];
      journees?: unknown[];
    };

    return {
      draftId: row.id,
      idPatient: row.idPatient,
      episodeId: data.episode?.episodeId ?? 'episode_inconnu',
      createdAt: row.createdAt.toISOString(),
      supersedesDraftId: row.supersedesDraftId,
      actor: data.actor === 'patient' ? 'patient' : 'praticien',
      tracesCount: Array.isArray(data.traces) ? data.traces.length : 0,
      pausesCount: Array.isArray(data.pauses) ? data.pauses.length : 0,
      plansCount: Array.isArray(data.plans) ? data.plans.length : 0,
      solutionsCount: Array.isArray(data.solutions) ? data.solutions.length : 0,
      careersCount: Array.isArray(data.actionCareer) ? data.actionCareer.length : 0,
      journeesCount: Array.isArray(data.journees) ? data.journees.length : 0,
    };
  });
}

/**
 * Lecture du CONTENU d'un instantané, pour la fiche praticien.
 *
 * Le filtre porte sur `idPatient` autant que sur `draftId` : un identifiant seul
 * laisserait lire l'instantané d'un autre patient à qui saurait le deviner. Rend
 * `null` quand la ligne n'existe pas OU n'appartient pas à ce patient — la route
 * en fait un 404, jamais un 200 vide, qui se lirait « ce patient n'a rien écrit ».
 *
 * Les listes sont relues élément par élément et les éléments illisibles sont
 * ÉCARTÉS plutôt que de faire échouer la lecture entière : une ligne écrite par
 * un client antérieur ne doit pas rendre muette une transmission par ailleurs
 * lisible. Le décompte, lui, reste celui du payload — l'écart entre les deux se
 * voit.
 */
export async function readJaObservationSnapshot(
  idPatientRaw: string,
  draftId: string,
): Promise<JaObservationSnapshotDetail | null> {
  const idPatient = ensurePatientId(idPatientRaw);
  if (typeof draftId !== 'string' || draftId.trim() === '') return null;

  const row = await prisma.protocolDraft.findFirst({
    where: {
      id: draftId,
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
    },
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      createdAt: true,
      payload: true,
    },
  });
  if (!row) return null;

  const data = (row.payload ?? {}) as {
    actor?: 'praticien' | 'patient';
    episode?: { episodeId?: string };
    traces?: unknown[];
    pauses?: unknown[];
    plans?: unknown[];
    solutions?: unknown[];
    actionCareer?: unknown[];
    journees?: unknown[];
  };

  const lisibles = <T>(brut: unknown, lire: (v: unknown) => T): T[] => {
    if (!Array.isArray(brut)) return [];
    const out: T[] = [];
    for (const element of brut) {
      try {
        out.push(lire(element));
      } catch {
        // Élément illisible : écarté, jamais deviné.
      }
    }
    return out;
  };

  return {
    draftId: row.id,
    idPatient: row.idPatient,
    episodeId: data.episode?.episodeId ?? 'episode_inconnu',
    createdAt: row.createdAt.toISOString(),
    supersedesDraftId: row.supersedesDraftId,
    actor: data.actor === 'patient' ? 'patient' : 'praticien',
    tracesCount: Array.isArray(data.traces) ? data.traces.length : 0,
    pausesCount: Array.isArray(data.pauses) ? data.pauses.length : 0,
    plansCount: Array.isArray(data.plans) ? data.plans.length : 0,
    solutionsCount: Array.isArray(data.solutions) ? data.solutions.length : 0,
    careersCount: Array.isArray(data.actionCareer) ? data.actionCareer.length : 0,
    journeesCount: Array.isArray(data.journees) ? data.journees.length : 0,
    traces: lisibles(data.traces, (v) => v as TrialTrace),
    pauses: lisibles(data.pauses, (v) => v as PatientPauseEvent),
    plans: lisibles(data.plans, (v) => v as MinimalPlanEvent),
    solutions: lisibles(data.solutions, (v) => v as IntraEpisodeSolution),
    journees: lisibles(data.journees, readJourneeRepere),
  };
}

export async function activateJaObservationSnapshot(input: JaActivationInput): Promise<JaActivationSummary> {
  const idPatient = ensurePatientId(input.idPatient);
  const sourceDraftId = ensureDraftId(input.draftId);
  const deltaDecision = input.deltaDecision.trim();
  const feedbackPatient = input.feedbackPatient.trim();
  const budgetChargeGlobal = Number(input.budgetChargeGlobal);

  if (!isJaMilestone(input.milestone)) {
    throw new TypeError('Jalon invalide. Valeurs attendues: J7, J14, J21.');
  }
  if (!isChargePercue(input.chargePercue)) {
    throw new TypeError('Charge perçue invalide. Valeurs attendues: faible, moderee, elevee.');
  }
  if (deltaDecision.length < 10) {
    throw new TypeError('Le delta de décision doit contenir au moins 10 caractères.');
  }
  if (feedbackPatient.length < 10) {
    throw new TypeError('Le retour patient doit contenir au moins 10 caractères.');
  }
  if (!Number.isFinite(budgetChargeGlobal) || budgetChargeGlobal < 1 || budgetChargeGlobal > 21) {
    throw new TypeError('Le budget de charge global doit être compris entre 1 et 21.');
  }

  const source = await prisma.protocolDraft.findFirst({
    where: {
      id: sourceDraftId,
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
    },
    select: {
      id: true,
      idPatient: true,
      payload: true,
    },
  });

  if (!source) {
    throw new TypeError('Snapshot JA introuvable pour ce patient.');
  }

  const sourcePayload = source.payload as {
    episode?: { episodeId?: string };
    actor?: 'praticien' | 'patient';
    traces?: unknown[];
    pauses?: unknown[];
    plans?: unknown[];
    solutions?: unknown[];
    actionCareer?: unknown[];
    activation?: unknown;
  };
  const episodeId = sourcePayload.episode?.episodeId;
  if (!episodeId) {
    throw new TypeError('Snapshot JA invalide: épisode manquant.');
  }
  if (sourcePayload.actor !== 'praticien') {
    throw new TypeError('Activation JA réservée aux snapshots praticien.');
  }

  const reviewedAt = new Date().toISOString();
  const nextPayload = {
    ...sourcePayload,
    activation: {
      milestone: input.milestone,
      reviewedAt,
      deltaDecision,
      feedbackPatient,
      chargePercue: input.chargePercue,
      budgetChargeGlobal,
    },
  };

  const nextHash = canonicalSha256(nextPayload);
  const nextDraftId = buildActivationDraftId(episodeId, reviewedAt);

  const created = await prisma.protocolDraft.create({
    data: {
      id: nextDraftId,
      idPatient,
      assessmentEpisodeId: null,
      decisionCardId: buildDecisionCardId(episodeId),
      decisionCardInputHash: nextHash,
      snapshotInputHash: nextHash,
      reviewInputHash: nextHash,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'practitioner_reviewed',
      payload: nextPayload as unknown as object,
      inputHash: nextHash,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      supersedesDraftId: sourceDraftId,
      reviewedAt: new Date(reviewedAt),
    },
    select: {
      id: true,
      idPatient: true,
      payload: true,
      reviewedAt: true,
    },
  });

  const activation = (created.payload as { activation?: JaActivationSummary }).activation;
  if (!activation || !created.reviewedAt) {
    throw new TypeError('Activation JA invalide après persistance.');
  }

  return {
    draftId: created.id,
    sourceDraftId,
    idPatient: created.idPatient,
    episodeId,
    milestone: activation.milestone,
    deltaDecision: activation.deltaDecision,
    feedbackPatient: activation.feedbackPatient,
    chargePercue: activation.chargePercue,
    budgetChargeGlobal: activation.budgetChargeGlobal,
    reviewedAt: created.reviewedAt.toISOString(),
  };
}

export async function getLatestJaActivation(idPatientRaw: string): Promise<JaActivationSummary | null> {
  const idPatient = ensurePatientId(idPatientRaw);

  const row = await prisma.protocolDraft.findFirst({
    where: {
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'practitioner_reviewed',
    },
    orderBy: { reviewedAt: 'desc' },
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      reviewedAt: true,
      payload: true,
    },
  });

  if (!row) return null;
  const payload = row.payload as {
    episode?: { episodeId?: string };
    activation?: {
      milestone?: string;
      deltaDecision?: string;
      feedbackPatient?: string;
      chargePercue?: string;
      budgetChargeGlobal?: number;
    };
  };

  const episodeId = payload.episode?.episodeId;
  const activation = payload.activation;
  if (!episodeId || !activation || !row.reviewedAt) return null;
  if (!activation.milestone || !activation.deltaDecision || !activation.feedbackPatient || !activation.chargePercue) {
    return null;
  }
  if (!isJaMilestone(activation.milestone) || !isChargePercue(activation.chargePercue)) {
    return null;
  }

  return {
    draftId: row.id,
    sourceDraftId: row.supersedesDraftId ?? row.id,
    idPatient: row.idPatient,
    episodeId,
    milestone: activation.milestone,
    deltaDecision: activation.deltaDecision,
    feedbackPatient: activation.feedbackPatient,
    chargePercue: activation.chargePercue,
    budgetChargeGlobal: Number(activation.budgetChargeGlobal ?? 0),
    reviewedAt: row.reviewedAt.toISOString(),
  };
}
