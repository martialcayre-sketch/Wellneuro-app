import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import type { LectureDatee, TendanceMomentum } from '@/lib/equilibre/types';
import {
  resolveActiveCheckin,
  type CheckinReponses,
  type CheckinRow,
  type PointEtape,
} from './checkinDomain';

// Résumé J21 = « point de jonction » (arbitrage A1) : le SEUL objet croisant les
// deux lectures — le score a-t-il bougé (momentum.ts, jalons de mesure) ET
// l'action a-t-elle été tenue / tolérée (check-ins de pilotage). Objet DÉRIVÉ en
// lecture seule, jamais persisté, sans aucune interprétation diagnostique.
// `momentum.ts` reste l'unique propriétaire des jalons T0/J21/J42/J90, consommé
// via son API publique et jamais réimplémenté.

export type ResumeScore = { tendance: TendanceMomentum; delta: number } | null;

export type ResumePointEtape = {
  pointEtape: PointEtape;
  renseigne: boolean;
  reponses: CheckinReponses | null;
};

export type ResumeJ21 = {
  score: ResumeScore;
  points: ResumePointEtape[];
  pointsRenseignes: number;
};

export type ResumeJ21Input = {
  checkins: CheckinRow[];
  // Présent uniquement si un historique d'équilibre daté existe. Absent → score
  // null : le point de jonction reste honnête (aucune lecture inventée) et
  // l'action reste lue via les check-ins.
  momentum?: { dateT0: Date; lectures: LectureDatee[] } | null;
};

const ORDRE_POINTS: readonly PointEtape[] = ['J7', 'J14', 'J21'] as const;

export function buildResumeJ21(input: ResumeJ21Input): ResumeJ21 {
  const points: ResumePointEtape[] = ORDRE_POINTS.map((pointEtape) => {
    const actif = resolveActiveCheckin(input.checkins, pointEtape);
    return {
      pointEtape,
      renseigne: actif !== null,
      reponses: actif?.reponses ?? null,
    };
  });

  let score: ResumeScore = null;
  if (input.momentum) {
    const lectureT0 = resoudreLectureJalon(input.momentum.dateT0, 'T0', input.momentum.lectures);
    const lectureJ21 = resoudreLectureJalon(input.momentum.dateT0, 'J21', input.momentum.lectures);
    const resultat = calculerDeltaMomentum(lectureT0, lectureJ21);
    if (resultat) score = { tendance: resultat.tendance, delta: resultat.delta };
  }

  return {
    score,
    points,
    pointsRenseignes: points.filter((point) => point.renseigne).length,
  };
}
