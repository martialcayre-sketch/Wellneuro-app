'use client';

import { optionLibelle, type PointEtape } from '@/lib/protocol/checkinDomain';
import type { ResumeJ21 } from '@/lib/protocol/resumeJ21';

// Panneau décisionnel du point d'étape J21 (C2A LOT-04) — LECTURE SEULE. Il
// affiche le « résumé J21 » (point de jonction A1 : le score a-t-il bougé ?
// l'action a-t-elle été tenue / tolérée ?) et présente les 6 labels de décision
// comme ACTIONS GUIDÉES. Le label n'est PAS persisté (décision de cadrage) :
// l'ajustement clinique passe par le versionnement existant (« Enregistrer la
// version »), continuer/explorer/stopper restent des orientations documentées.
// Aucun score prédictif, aucune interprétation diagnostique.

const LABEL_POINT: Record<PointEtape, string> = { J7: 'J7', J14: 'J14', J21: 'J21' };

const LABEL_TENDANCE: Record<'hausse' | 'stable' | 'baisse', string> = {
  hausse: 'en hausse',
  stable: 'stable',
  baisse: 'en baisse',
};

const AJUSTEMENTS: { titre: string; description: string }[] = [
  { titre: 'Alléger', description: "Réduire la charge de l'action principale." },
  { titre: 'Densifier', description: 'Renforcer ou ajouter une action.' },
  { titre: 'Pivoter', description: "Changer d'axe prioritaire." },
];

const AUTRES: { titre: string; description: string }[] = [
  { titre: 'Continuer', description: 'Poursuivre le protocole tel quel (aucun changement).' },
  { titre: 'Explorer', description: 'Investiguer avant de décider.' },
  { titre: 'Stopper', description: 'Arrêter le protocole.' },
];

export function J21DecisionPanel({
  resume,
  onAjuster,
}: {
  resume: ResumeJ21 | null;
  // Renvoie vers le flux de versionnement existant (« Enregistrer la version »).
  onAjuster?: () => void;
}) {
  return (
    <section aria-labelledby="j21-decision-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="j21-decision-title" className="text-sm font-semibold text-foreground">
        Point d’étape J21 — résumé et décision
      </h3>

      {/* Point de jonction : score (momentum) + action (check-ins). */}
      <div className="mt-3 space-y-1 text-base">
        <p className="text-foreground">
          Score « Mon équilibre » :{' '}
          {resume?.score ? (
            <span className="font-medium">{LABEL_TENDANCE[resume.score.tendance]}</span>
          ) : (
            <span className="text-muted-foreground">non disponible pour l’instant</span>
          )}
        </p>
        <ul className="mt-1 space-y-1">
          {(resume?.points ?? []).map((point) => (
            <li key={point.pointEtape} className="text-muted-foreground">
              <span className="font-medium text-foreground">{LABEL_POINT[point.pointEtape]}</span>{' '}
              {point.renseigne && point.reponses ? (
                <>
                  · action : {optionLibelle('adhesion', point.reponses.adhesion)} · tolérance :{' '}
                  {optionLibelle('tolerance', point.reponses.tolerance)} · énergie :{' '}
                  {optionLibelle('energie', point.reponses.energie)} · sommeil :{' '}
                  {optionLibelle('sommeil', point.reponses.sommeil)}
                </>
              ) : (
                <>· en attente du patient</>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Décision : ajuster (via versionnement) vs orientations documentées. */}
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ajuster le protocole</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AJUSTEMENTS.map((item) => (
              <button
                key={item.titre}
                type="button"
                onClick={onAjuster}
                title={item.description}
                className="rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                {item.titre}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Un ajustement crée une nouvelle version du protocole (« Enregistrer la version » ci-dessus). Rien n’est
            envoyé au patient sans votre validation « pour diffusion ».
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Autres décisions</p>
          <ul className="mt-2 space-y-1 text-base text-muted-foreground">
            {AUTRES.map((item) => (
              <li key={item.titre}>
                <span className="font-medium text-foreground">{item.titre}</span> — {item.description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
