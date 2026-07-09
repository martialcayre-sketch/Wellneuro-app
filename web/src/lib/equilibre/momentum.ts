import { JOURS_JALON, TOLERANCE_JOURS_JALON } from './constants';
import type { JalonMomentum, LectureDatee, ResultatMomentum } from './types';

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Résout quelle lecture datée représente un jalon donné (T0/J21/J42/J90),
 * glissant depuis la date T0 réelle du patient, avec une tolérance de
 * ±TOLERANCE_JOURS_JALON jours. En cas de plusieurs lectures valides dans la
 * fenêtre, celle la plus proche du centre du jalon est retenue.
 * Retourne null si aucune lecture ne tombe dans la fenêtre.
 */
export function resoudreLectureJalon(
  dateT0: Date,
  jalon: JalonMomentum,
  lectures: LectureDatee[]
): LectureDatee | null {
  const centreMs = dateT0.getTime() + JOURS_JALON[jalon] * JOUR_MS;
  const toleranceMs = TOLERANCE_JOURS_JALON * JOUR_MS;

  const candidates = lectures.filter(l => Math.abs(l.date.getTime() - centreMs) <= toleranceMs);
  if (candidates.length === 0) return null;

  return candidates.reduce((meilleure, courante) =>
    Math.abs(courante.date.getTime() - centreMs) < Math.abs(meilleure.date.getTime() - centreMs)
      ? courante
      : meilleure
  );
}

/**
 * Delta entre deux lectures résolues (ex. indice global à T0 et à J21).
 * Affichage différencié par audience laissé au consommateur : patient =
 * tendance seule, praticien = tendance + `Math.abs(delta)`.
 */
export function calculerDeltaMomentum(
  lectureDepart: LectureDatee | null,
  lectureArrivee: LectureDatee | null
): ResultatMomentum | null {
  if (!lectureDepart || !lectureArrivee) return null;

  const delta = Math.round((lectureArrivee.valeur - lectureDepart.valeur) * 100) / 100;
  const tendance = delta > 0 ? 'hausse' : delta < 0 ? 'baisse' : 'stable';

  return { delta, tendance };
}
