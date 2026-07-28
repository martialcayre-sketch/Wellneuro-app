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
