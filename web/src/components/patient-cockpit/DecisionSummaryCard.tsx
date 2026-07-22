'use client';

import type { DecisionCard } from '@/lib/clinical-engine/types';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';

export function DecisionSummaryCard({ decisionCard }: { decisionCard: DecisionCard | null }) {
  if (!decisionCard) {
    return (
      <section aria-labelledby="decision-summary-title">
        <h3 id="decision-summary-title" className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
          Décision clinique
        </h3>
        {/* Carte de décision 5.0 : liseré primaire (maquette cible). */}
        <div className="rounded-xl border border-border border-l-4 border-l-primary bg-surface p-4 shadow-card">
          <p className="text-base font-semibold text-foreground">Décision clinique non préparée</p>
          <p className="mt-1 text-base text-muted-foreground">
            Les données doivent être qualifiées et la décision validée par le praticien avant toute recommandation.
          </p>
        </div>
      </section>
    );
  }

  const proposed = decisionCard.priorityCandidates.find(
    candidate => candidate.candidateId === decisionCard.proposedMainPriorityId
  );
  const selected = decisionCard.priorityCandidates.find(
    candidate => candidate.candidateId === decisionCard.selectedMainPriority?.candidateId
  );
  const current = selected ?? proposed ?? null;
  const status = decisionCard.abstention.status === 'required'
    ? 'Décision suspendue — revue praticien requise'
    : current ? current.label : 'Aucune priorité proposée';

  return (
    <section aria-labelledby="decision-summary-title">
      <h3 id="decision-summary-title" className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3">
        Décision clinique
      </h3>
      <TwoLevelReading
        label="Voir les sources et limites"
        className="border-l-4 border-l-primary shadow-card"
        summary={(
          <div>
            <p className="text-base font-semibold">{status}</p>
            {current && <p className="mt-1 font-mono text-xs text-muted-foreground">Statut : {current.confidence}</p>}
          </div>
        )}
        detail={(
          <div className="space-y-3">
            {current && <p>{current.rationale}</p>}
            <p className="text-muted-foreground">
              {decisionCard.priorityCandidates.length} candidat(s), {decisionCard.counterfactuals.length} contre-factuel(s).
            </p>
            {decisionCard.limitations.length > 0 && (
              <ul className="list-disc pl-5 text-muted-foreground">
                {decisionCard.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}
              </ul>
            )}
          </div>
        )}
      />
    </section>
  );
}
