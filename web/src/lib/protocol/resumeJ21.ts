import type { MomentumDuCycle } from '@/lib/equilibre/momentumDuCycle';
import type { TendanceMomentum } from '@/lib/equilibre/types';
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
// Le score est le momentum du cycle courant tel que `momentumDuCycle.ts` le
// calcule ([[D-397]]), reçu tout fait et jamais recomposé ici.

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
  // Le momentum du cycle courant, celui du portail, de l'onglet Équilibre et
  // du fil ([[D-397]], contre-revue Codex P1-2). Le résumé gardait sa propre
  // paire ancre → J21, sans la règle de remesure : il pouvait annoncer une
  // tendance que les autres surfaces déclarent absente. Absent, ou motif
  // d'absence → score null : aucune lecture inventée, et l'action reste lue
  // via les check-ins.
  momentum?: MomentumDuCycle | null;
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

  const score: ResumeScore =
    input.momentum?.statut === 'disponible'
      ? { tendance: input.momentum.tendance, delta: input.momentum.delta }
      : null;

  return {
    score,
    points,
    pointsRenseignes: points.filter((point) => point.renseigne).length,
  };
}
