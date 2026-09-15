import { createAttentionBudget, createEpisode } from './episode';
import type { AttentionBudget, FoodObservationEpisode } from './types';
import type { ProtocolActionType } from '@/lib/clinical-engine/types';

/**
 * Dérivation de l'épisode JA depuis le protocole diffusé (lot 2, item 5).
 *
 * L'épisode était fabriqué en dur des deux côtés — le même petit-déjeuner
 * protéiné servi à tous les patients, une fenêtre de sept jours recalculée à
 * chaque montage, et deux `episodeId` différents pour le même patient. Il vient
 * désormais du dossier : l'hypothèse est la finalité du protocole approuvé,
 * l'action est celle que le carnet observe, la fenêtre part de la date de
 * diffusion.
 *
 * L'ACTION ALIMENTAIRE, ET PLUS « LA PREMIÈRE » ([[D-191]]). La vue patient ne
 * servait qu'une action sur trois, élue par l'ordre d'insertion : le carnet
 * prenait donc celle-là, quel que soit son type. Le défaut ne se voyait pas tant
 * que le constructeur posait `food` en dur sur toute action neuve ; depuis que le
 * type est un geste (`D-189`), la première action peut être une orientation
 * médecin — et le carnet alimentaire l'aurait affichée comme l'essai à observer.
 * Un journal alimentaire s'ancre sur une action alimentaire, ou sur rien.
 *
 * Sans protocole diffusé — ou sans action alimentaire — il n'y a rien à dériver,
 * et la fonction rend `null` plutôt que d'inventer un épisode.
 */

/** Fenêtre alignée sur les jalons `J7 | J14 | J21` (`persistence.ts`). */
export const DUREE_EPISODE_JOURS = 21;

/** Fenêtre du bilan de calibrage : 3 à 5 jours (A7-11 amendé, 2026-07-16). */
export const DUREE_CALIBRAGE_JOURS = 5;

/**
 * Bilan de calibrage : l'épisode d'AVANT le protocole (A7-11 amendé — « outil
 * de mesure pré-bilan/pré-protocole »).
 *
 * Sans protocole diffusé, le carnet n'avait rien à quoi rattacher une saisie :
 * les notes restaient locales, non transmissibles. Le calibrage donne à cet
 * état une identité — ancrée sur l'assignation du patient, pas sur un cycle de
 * protocole qui n'existe pas encore — et donc la possibilité d'être transmis.
 *
 * Il cède la place dès qu'un protocole est diffusé : à partir de là, l'épisode
 * vient du protocole et le régime devient `essai`.
 */
export function episodeIdCalibrage(idPatient: string, ancre: string): string {
  return `ja_${idPatient}_calibrage_${ancre}`;
}

export function buildEpisodeCalibrage(input: {
  idPatient: string;
  /** Identité stable du bilan — l'assignation, jamais la date. */
  ancre: string;
  /** Aujourd'hui, au sens du client. La fenêtre se ferme ici. */
  aujourdHui: string;
  budget?: AttentionBudget;
}): FoodObservationEpisode | null {
  if (!input.idPatient || !input.ancre) return null;
  // La fenêtre est les cinq jours qui SE TERMINENT aujourd'hui, non les cinq
  // jours qui suivent l'assignation : pour un patient assigné il y a trois
  // mois — le cas ordinaire quand il ouvre le carnet — cette seconde fenêtre
  // serait close avant sa première saisie. L'identité, elle, ne bouge pas :
  // elle tient à l'ancre, pas aux dates.
  const fin = input.aujourdHui.slice(0, 10);
  return createEpisode({
    episodeId: episodeIdCalibrage(input.idPatient, input.ancre),
    patientId: input.idPatient,
    startDate: ajouterJours(fin, -(DUREE_CALIBRAGE_JOURS - 1)),
    endDate: fin,
    budget: input.budget ?? createAttentionBudget(),
    content: {
      regime: 'calibrage',
      questionsBilan: {
        structureDesPrises: true,
        regulariteHoraires: true,
        presenceMarqueursPertinents: true,
      },
      // Aucun marqueur pertinent tant qu'aucun besoin n'est travaillé : le
      // sous-ensemble se choisit au regard du protocole, qui n'existe pas
      // encore. Une liste vide dit cela ; une liste par défaut l'inventerait.
      marqueursPertinents: [],
    },
  });
}

/**
 * `type` EST LE TYPE DU CONTRAT, plus un `string` ([[D-191]]). Il était libre, et
 * la fixture du banc posait `'alimentation'` — un type qui n'existe nulle part au
 * contrat, où l'alimentaire s'écrit `food`. Le banc passait au vert sur une
 * valeur que la production n'aurait jamais produite.
 */
export type ActionSourceEpisode = {
  type: ProtocolActionType;
  title: string;
  minimalPlan: string;
};

export type ProtocoleSourceEpisode = {
  purpose: string;
  /** LES actions du protocole diffusé, dans l'ordre relu — plus « la première ». */
  actions: ActionSourceEpisode[];
  cycleRef: string;
  debutCycle: string;
};

/** Le type d'action qu'un carnet alimentaire a vocation à observer. */
const TYPE_ALIMENTAIRE: ProtocolActionType = 'food';

/**
 * L'action alimentaire du protocole, ou `null`.
 *
 * La PREMIÈRE de ce type, et non « la seule » : rien au contrat n'interdit deux
 * actions alimentaires, et le carnet doit rester déterministe plutôt que de
 * refuser un protocole légitime.
 */
export function actionAlimentaire(actions: ActionSourceEpisode[]): ActionSourceEpisode | null {
  return actions.find(action => action.type === TYPE_ALIMENTAIRE) ?? null;
}

function ajouterJours(iso: string, jours: number): string {
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) throw new TypeError('Date de début de cycle invalide.');
  base.setUTCDate(base.getUTCDate() + jours);
  return base.toISOString().slice(0, 10);
}

/**
 * Identifiant d'épisode partagé par les deux surfaces (patient et praticien),
 * distinct d'un cycle à l'autre — `ja_${idPatient}` ne l'était pas et rendait
 * deux essais successifs indiscernables.
 */
export function episodeIdDepuisCycle(idPatient: string, cycleRef: string): string {
  return `ja_${idPatient}_${cycleRef}`;
}

export function buildEpisodeDepuisProtocole(input: {
  idPatient: string;
  protocole: ProtocoleSourceEpisode;
  budget?: AttentionBudget;
}): FoodObservationEpisode | null {
  const { idPatient, protocole } = input;
  const action = actionAlimentaire(protocole.actions ?? []);
  if (!idPatient || !action || !protocole.cycleRef) return null;

  const debut = protocole.debutCycle.slice(0, 10);

  return createEpisode({
    episodeId: episodeIdDepuisCycle(idPatient, protocole.cycleRef),
    patientId: idPatient,
    startDate: debut,
    endDate: ajouterJours(protocole.debutCycle, DUREE_EPISODE_JOURS - 1),
    budget: input.budget ?? createAttentionBudget(),
    content: {
      regime: 'essai',
      hypothese: protocole.purpose,
      action: {
        actionId: `action_protocole_${action.type}`,
        labelPatient: action.title,
        // Seul plan patient-safe servi par la vue du protocole : le plan
        // minimal. Aucune version « idéale » n'est reconstituée ici.
        simplePlan: action.minimalPlan,
      },
    },
  });
}
