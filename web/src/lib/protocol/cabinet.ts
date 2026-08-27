import type { JalonMomentum } from '@/lib/equilibre/types';
import { estJalonMesure, JALONS_MESURE } from '@/lib/protocol/cycles';
import type { TrajectoireCycle } from '@/lib/protocol/trajectoire';

// Repère de cabinet (A6-R2, décision utilisateur 2026-07-23) — médiane
// DESCRIPTIVE des momentums par jalon, sur les cycles du cabinet de même
// versionScore que le cycle lu (A8-3 étendu à l'agrégat : une version
// différente ou inconnue n'entre jamais dans la cohorte). `n=` toujours
// exposé ; sous SEUIL_COHORTE_CABINET cycles comparables, les médianes sont
// masquées (A6-2 conservé). Un repère, jamais une prédiction ni un objectif.

export const SEUIL_COHORTE_CABINET = 5;

const JALONS_MOMENTUM: readonly JalonMomentum[] = JALONS_MESURE;

export type MedianeJalon = { jalon: JalonMomentum; mediane: number; n: number };

export type MedianesCabinet = {
  versionScoreReference: string | null;
  // Cycles comparables du cabinet : même versionScore ET ancre mesurée.
  nTotal: number;
  // nTotal < seuil (ou version de référence inconnue) → aucune médiane servie.
  masque: boolean;
  parJalon: MedianeJalon[];
};

function mediane(valeurs: number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 === 1 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
}

export function calculerMedianesCabinet(
  cyclesParPatient: readonly (readonly TrajectoireCycle[])[],
  versionScoreReference: string | null,
): MedianesCabinet {
  // Version de référence inconnue : on ne sait pas à quoi comparer — aucune
  // cohorte, jamais une version supposée (A8-3).
  if (versionScoreReference === null) {
    return { versionScoreReference: null, nTotal: 0, masque: true, parJalon: [] };
  }

  const deltasParJalon = new Map<JalonMomentum, number[]>();
  let nTotal = 0;

  for (const cycles of cyclesParPatient) {
    for (const cycle of cycles) {
      if (cycle.versionScore !== versionScoreReference) continue;
      // La référence est l'ancre DE CE CYCLE, lue par son nom. Chercher `T0`
      // dans les jalons d'un cycle ancré en `T1` n'aurait rien trouvé : le
      // cycle serait sorti de la cohorte en silence, et la médiane du cabinet
      // aurait rétréci sans que rien ne le dise.
      const ancre = cycle.jalons.find((jalon) => jalon.jalon === cycle.ancre);
      if (!ancre || !ancre.mesure || ancre.valeur === null) continue;
      nTotal += 1;
      for (const lecture of cycle.jalons) {
        if (!estJalonMesure(lecture.jalon) || !lecture.mesure || lecture.valeur === null) continue;
        const liste = deltasParJalon.get(lecture.jalon) ?? [];
        liste.push(lecture.valeur - ancre.valeur);
        deltasParJalon.set(lecture.jalon, liste);
      }
    }
  }

  const masque = nTotal < SEUIL_COHORTE_CABINET;
  const parJalon = masque
    ? []
    : JALONS_MOMENTUM.filter((jalon) => (deltasParJalon.get(jalon) ?? []).length > 0).map((jalon) => {
        const valeurs = deltasParJalon.get(jalon)!;
        return { jalon, mediane: mediane(valeurs), n: valeurs.length };
      });

  return { versionScoreReference, nTotal, masque, parJalon };
}
