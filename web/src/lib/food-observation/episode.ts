import { VERSION_REGISTRE_FRICTIONS, VERSION_SCHEMA_FOOD_OBSERVATION } from './types';
import type {
  AttentionBudget,
  EpisodeRegime,
  EpisodeStatut,
  FoodObservationEpisode,
  RegimeContent,
} from './types';
import { localDate, nonEmpty } from './validation';
import { assertCurrentRecommendedPlateRef } from '@/lib/food-compass/plates';

/**
 * Budget d'attention (amendement terrain n° 3) : 2 à 7 traces/semaine,
 * fourchette réelle du panel JA-0T. Jamais quotidien par défaut — défaut
 * 3/semaine, cohérent avec la politique focalisée (D2).
 */
export const BUDGET_MIN_TRACES_PAR_SEMAINE = 2;
export const BUDGET_MAX_TRACES_PAR_SEMAINE = 7;
export const BUDGET_DEFAUT_TRACES_PAR_SEMAINE = 3;

export function createAttentionBudget(tracesParSemaine?: number): AttentionBudget {
  const value = tracesParSemaine ?? BUDGET_DEFAUT_TRACES_PAR_SEMAINE;
  if (
    !Number.isInteger(value)
    || value < BUDGET_MIN_TRACES_PAR_SEMAINE
    || value > BUDGET_MAX_TRACES_PAR_SEMAINE
  ) {
    throw new TypeError(
      `Le budget d’attention doit être un entier entre ${BUDGET_MIN_TRACES_PAR_SEMAINE} et ${BUDGET_MAX_TRACES_PAR_SEMAINE} traces par semaine.`
    );
  }
  return { tracesParSemaine: value };
}

function validateContent(content: RegimeContent): RegimeContent {
  if (!content || !['essai', 'calibrage', 'silence'].includes(content.regime)) {
    throw new TypeError('Régime JA invalide.');
  }
  if (content.regime === 'essai') {
    nonEmpty(content.hypothese, 'hypothese');
    nonEmpty(content.action.actionId, 'action.actionId');
    nonEmpty(content.action.labelPatient, 'action.labelPatient');
    nonEmpty(content.action.idealPlan, 'action.idealPlan');
    nonEmpty(content.action.simplePlan, 'action.simplePlan');
    if (content.action.recommendedPlateRef !== undefined) {
      content.action.recommendedPlateRef = assertCurrentRecommendedPlateRef(
        content.action.recommendedPlateRef,
      );
    }
  }
  if (content.regime === 'silence' && (content.observationPrescrite as boolean) !== false) {
    throw new TypeError('En régime silence, aucune observation n’est prescrite.');
  }
  if (content.regime === 'calibrage'
    && (!content.questionsBilan
      || content.questionsBilan.structureDesPrises !== true
      || content.questionsBilan.regulariteHoraires !== true
      || content.questionsBilan.presenceMarqueursPertinents !== true
      || !Array.isArray(content.marqueursPertinents))) {
    throw new TypeError('Contenu de calibrage JA invalide.');
  }
  return content;
}

/**
 * Adaptateur borné des épisodes persistés/reçus. Une action JA V1 sans
 * RecommendedPlateRef reste lisible ; une référence V2 doit appartenir au
 * catalogue C5B courant. Aucune donnée historique n'est réécrite.
 */
export function readFoodObservationEpisode(value: unknown): FoodObservationEpisode {
  if (!value || typeof value !== 'object') throw new TypeError('Épisode JA invalide.');
  const episode = value as Partial<FoodObservationEpisode>;
  nonEmpty(episode.episodeId ?? '', 'episodeId');
  nonEmpty(episode.patientId ?? '', 'patientId');
  localDate(episode.startDate ?? '', 'startDate');
  localDate(episode.endDate ?? '', 'endDate');
  if (episode.endDate! < episode.startDate!) throw new TypeError('Période JA invalide.');
  if (!episode.content || !episode.budget
    || episode.schemaVersion !== VERSION_SCHEMA_FOOD_OBSERVATION
    || episode.frictionsVersion !== VERSION_REGISTRE_FRICTIONS) {
    throw new TypeError('Contrat d’épisode JA invalide ou inconnu.');
  }
  if (!['prepare', 'actif', 'suspendu', 'clos'].includes(episode.statut ?? '')) {
    throw new TypeError('Statut d’épisode JA invalide.');
  }
  createAttentionBudget(episode.budget.tracesParSemaine);
  validateContent(episode.content);
  return episode as FoodObservationEpisode;
}

export function createEpisode(input: {
  episodeId: string;
  patientId: string;
  startDate: string;
  endDate: string;
  content: RegimeContent;
  budget?: AttentionBudget;
}): FoodObservationEpisode {
  nonEmpty(input.episodeId, 'episodeId');
  nonEmpty(input.patientId, 'patientId');
  localDate(input.startDate, 'startDate');
  localDate(input.endDate, 'endDate');
  if (input.endDate < input.startDate) {
    throw new TypeError('endDate doit être postérieure ou égale à startDate.');
  }
  return {
    episodeId: input.episodeId,
    patientId: input.patientId,
    startDate: input.startDate,
    endDate: input.endDate,
    statut: 'prepare',
    content: validateContent(input.content),
    budget: input.budget ?? createAttentionBudget(),
    schemaVersion: VERSION_SCHEMA_FOOD_OBSERVATION,
    frictionsVersion: VERSION_REGISTRE_FRICTIONS,
  };
}

/**
 * Transitions de régime autorisées (A7-11 amendé) :
 * calibrage → essai (le profil produit calibre l'essai) ;
 * essai ⇄ silence (droit au silence, puis reprise).
 */
const TRANSITIONS_REGIME: Record<EpisodeRegime, EpisodeRegime[]> = {
  calibrage: ['essai'],
  essai: ['silence'],
  silence: ['essai'],
};

export function changeRegime(
  episode: FoodObservationEpisode,
  content: RegimeContent
): FoodObservationEpisode {
  if (episode.statut === 'clos') {
    throw new TypeError('Un épisode clos ne change plus de régime.');
  }
  const from = episode.content.regime;
  const to = content.regime;
  if (!TRANSITIONS_REGIME[from].includes(to)) {
    throw new TypeError(`Transition de régime interdite : ${from} → ${to}.`);
  }
  return { ...episode, content: validateContent(content) };
}

const TRANSITIONS_STATUT: Record<EpisodeStatut, EpisodeStatut[]> = {
  prepare: ['actif', 'clos'],
  actif: ['suspendu', 'clos'],
  suspendu: ['actif', 'clos'],
  clos: [],
};

function changeStatut(episode: FoodObservationEpisode, statut: EpisodeStatut): FoodObservationEpisode {
  if (!TRANSITIONS_STATUT[episode.statut].includes(statut)) {
    throw new TypeError(`Transition de statut interdite : ${episode.statut} → ${statut}.`);
  }
  return { ...episode, statut };
}

export function activerEpisode(episode: FoodObservationEpisode): FoodObservationEpisode {
  return changeStatut(episode, 'actif');
}

/**
 * Suspension immédiate (JA-00 A4) : un geste, par le praticien ou le patient,
 * sans justification. Aucun motif n'est accepté ni demandé — la suspension ne
 * produit aucun signal négatif ni relance.
 */
export function suspendreEpisode(episode: FoodObservationEpisode): FoodObservationEpisode {
  return changeStatut(episode, 'suspendu');
}

export function reprendreEpisode(episode: FoodObservationEpisode): FoodObservationEpisode {
  return changeStatut(episode, 'actif');
}

export function cloreEpisode(episode: FoodObservationEpisode): FoodObservationEpisode {
  return changeStatut(episode, 'clos');
}
