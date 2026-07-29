import { createAttentionBudget, createEpisode } from './episode';
import type { AttentionBudget, FoodObservationEpisode } from './types';

/**
 * Dérivation de l'épisode JA depuis le protocole diffusé (lot 2, item 5).
 *
 * L'épisode était fabriqué en dur des deux côtés — le même petit-déjeuner
 * protéiné servi à tous les patients, une fenêtre de sept jours recalculée à
 * chaque montage, et deux `episodeId` différents pour le même patient. Il vient
 * désormais du dossier : l'hypothèse est la finalité du protocole approuvé,
 * l'action est l'action principale telle qu'elle a été décidée en consultation,
 * la fenêtre part de la date de diffusion.
 *
 * Sans protocole diffusé — ou sans action principale — il n'y a rien à dériver,
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
  ancre: string;
  debut: string;
  budget?: AttentionBudget;
}): FoodObservationEpisode | null {
  if (!input.idPatient || !input.ancre) return null;
  const debut = input.debut.slice(0, 10);
  return createEpisode({
    episodeId: episodeIdCalibrage(input.idPatient, input.ancre),
    patientId: input.idPatient,
    startDate: debut,
    // Trois à cinq jours (A7-11 amendé) : un bilan borné se remplit, un journal
    // de trois semaines s'abandonne.
    endDate: ajouterJours(input.debut, DUREE_CALIBRAGE_JOURS - 1),
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

export type ProtocoleSourceEpisode = {
  purpose: string;
  actionPrincipale: { type: string; title: string; minimalPlan: string } | null;
  cycleRef: string;
  debutCycle: string;
};

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
  if (!idPatient || !protocole.actionPrincipale || !protocole.cycleRef) return null;

  const debut = protocole.debutCycle.slice(0, 10);
  const action = protocole.actionPrincipale;

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
