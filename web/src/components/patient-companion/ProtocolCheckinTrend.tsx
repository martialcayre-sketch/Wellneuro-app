import { optionLibelle, type CheckinReponses, type PointEtape } from '@/lib/protocol/checkinDomain';

// Tendance FACTUELLE d'un rendez-vous de suivi (C2A LOT-04). Formulation
// positive et factuelle, jamais culpabilisante, JAMAIS de pourcentage
// d'observance (différé ferme du cadrage). Purement présentationnel.

export type PointEtat = {
  pointEtape: PointEtape;
  renseigne: boolean;
  reponses: CheckinReponses | null;
};

const LABEL_POINT: Record<PointEtape, string> = {
  J7: 'Semaine 1',
  J14: 'Semaine 2',
  J21: 'Semaine 3',
};

// Phrase factuelle positive pour l'adhésion (jamais « adhésion : x % »).
function phraseAdhesion(valeur: string): string {
  switch (valeur) {
    case 'tous_les_jours':
      return 'Vous avez pu réaliser cette action tous les jours cette semaine.';
    case 'plupart_des_jours':
      return 'Vous avez pu réaliser cette action la plupart des jours cette semaine.';
    case 'quelques_jours':
      return 'Vous avez pu réaliser cette action quelques jours cette semaine.';
    default:
      return "Vous n'avez pas encore pu réaliser cette action cette semaine.";
  }
}

export function ProtocolCheckinTrend({ points }: { points: PointEtat[] }) {
  const renseignes = points.filter((point) => point.renseigne && point.reponses);
  if (renseignes.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Vos rendez-vous de suivi</h3>
      <ul className="space-y-2.5">
        {renseignes.map((point) => {
          const reponses = point.reponses as CheckinReponses;
          return (
            <li key={point.pointEtape} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-sm font-medium text-foreground">{LABEL_POINT[point.pointEtape]}</p>
              <p className="text-sm text-muted-foreground mt-1">{phraseAdhesion(reponses.adhesion)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tolérance : {optionLibelle('tolerance', reponses.tolerance)} · Énergie :{' '}
                {optionLibelle('energie', reponses.energie)} · Sommeil : {optionLibelle('sommeil', reponses.sommeil)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
