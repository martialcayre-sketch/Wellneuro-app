import type { MomentumDuCycle } from '@/lib/equilibre/momentumDuCycle';
import type { TendanceMomentum } from '@/lib/equilibre/types';
import {
  etatFenetrePointEtape,
  resolveActiveCheckin,
  type CheckinReponses,
  type CheckinRow,
  type PointEtape,
} from './checkinDomain';
import { jourDuCycle } from './jourDuCycle';

// Résumé J21 = « point de jonction » (arbitrage A1) : le SEUL objet croisant les
// deux lectures — le score a-t-il bougé (momentum.ts, jalons de mesure) ET
// l'action a-t-elle été tenue / tolérée (check-ins de pilotage). Objet DÉRIVÉ en
// lecture seule, jamais persisté, sans aucune interprétation diagnostique.
// Le score est le momentum du cycle courant tel que `momentumDuCycle.ts` le
// calcule ([[D-397]]), reçu tout fait et jamais recomposé ici.

export type ResumeScore = { tendance: TendanceMomentum; delta: number } | null;

// Marque E4 d'un point d'étape (`D-334` §2) : répondu, ou, sans réponse, l'état
// de sa fenêtre. `null` sans jour 0 : aucun point ne court, aucune marque.
export type MarquePointEtape = 'repondu' | 'en_cours' | 'a_venir' | 'pas_de_reponse';

export type ResumePointEtape = {
  pointEtape: PointEtape;
  renseigne: boolean;
  reponses: CheckinReponses | null;
  /** ISO du check-in courant de ce point, `null` sans réponse. */
  soumisLe: string | null;
  marque: MarquePointEtape | null;
};

/** Le jour du cycle courant (J2-jourN, H52), `null` sans jour 0. */
export type ResumeSuivi = { jourZero: string; jour: number } | null;

export type ResumeJ21 = {
  score: ResumeScore;
  points: ResumePointEtape[];
  pointsRenseignes: number;
  suivi: ResumeSuivi;
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
  // Le jour 0 du calendrier du cycle courant ([[D-255]]), le même que celui du
  // momentum ci-dessus : absent ou null, ni jour du cycle ni marque E4.
  jourZero?: Date | null;
  // L'horloge du SERVEUR, jamais celle du client (`dateParis.ts`).
  maintenant?: Date;
};

const ORDRE_POINTS: readonly PointEtape[] = ['J7', 'J14', 'J21'] as const;

const MARQUE_PAR_FENETRE = { a_venir: 'a_venir', ouverte: 'en_cours', passee: 'pas_de_reponse' } as const;

export function buildResumeJ21(input: ResumeJ21Input): ResumeJ21 {
  const jourZero = input.jourZero ?? null;
  const maintenant = input.maintenant ?? new Date();
  const points: ResumePointEtape[] = ORDRE_POINTS.map((pointEtape) => {
    const actif = resolveActiveCheckin(input.checkins, pointEtape);
    // E4 : une réponse fait la marque ; sinon, la fenêtre telle que le portail
    // l'ouvre (`etatFenetrePointEtape`) — jamais un niveau par défaut (DC-24).
    const marque: MarquePointEtape | null = !jourZero
      ? null
      : actif
        ? 'repondu'
        : MARQUE_PAR_FENETRE[etatFenetrePointEtape(pointEtape, jourZero, maintenant)];
    return {
      pointEtape,
      renseigne: actif !== null,
      reponses: actif?.reponses ?? null,
      soumisLe: actif?.soumisLe ?? null,
      marque,
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
    suivi: jourZero ? { jourZero: jourZero.toISOString(), jour: jourDuCycle(jourZero, maintenant) } : null,
  };
}
