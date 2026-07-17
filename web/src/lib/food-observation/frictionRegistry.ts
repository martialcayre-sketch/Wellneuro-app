import { VERSION_REGISTRE_FRICTIONS } from './types';
import type { FrictionCode } from './types';

/**
 * Registre de frictions v1 (JA-00 A2, validé praticien le 2026-07-17).
 * Catégories fermées, libellés patient en français, ancrées dans les
 * verbatims JA-0T. Toute évolution se fait par ajout — jamais de suppression
 * ni de renumérotation pendant un épisode en cours.
 */
export const REGISTRE_FRICTIONS_VERSION = VERSION_REGISTRE_FRICTIONS;

export const FRICTIONS: Record<FrictionCode, string> = {
  F1: 'Pas le temps, journée trop chargée',
  F2: 'Trop de fatigue ce jour-là',
  F3: 'Repas hors de chez moi / avec d’autres',
  F4: 'L’aliment n’était pas là (courses, stock)',
  F5: 'Trop compliqué à préparer ou organiser',
  F6: 'Pas envie ce jour-là',
  F7: 'Un imprévu (déplacement, santé, famille)',
  F8: 'Autre',
};

/** Seul F8 (« Autre ») invite un mot libre — court et toujours optionnel. */
export const FRICTION_AVEC_MOT_LIBRE: FrictionCode = 'F8';

/** Borne du mot libre court (jamais de texte long obligatoire — JA-0T P4/P5). */
export const LONGUEUR_MAX_MOT_LIBRE = 80;

export function isFrictionCode(value: string): value is FrictionCode {
  return Object.prototype.hasOwnProperty.call(FRICTIONS, value);
}
