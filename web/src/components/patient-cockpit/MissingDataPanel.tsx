'use client';

import type { DiscordanceFinding, MissingDataFinding } from '@/lib/clinical-engine/types';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';

const PRIORITY_LABELS = {
  critical_for_decision: 'Critique pour décider',
  useful_not_urgent: 'Utile mais non urgente',
  optional: 'Optionnelle',
} as const;

export function MissingDataPanel({
  missingData,
  discordances,
}: {
  missingData: MissingDataFinding[] | null;
  discordances: DiscordanceFinding[] | null;
}) {
  return (
    <section aria-labelledby="missing-data-title">
      <h3 id="missing-data-title" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Données manquantes
      </h3>
      <div className="flex flex-col gap-3">
        {missingData === null ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
            Données manquantes non évaluées. Une revue clinique doit être préparée par le praticien.
          </div>
        ) : missingData.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
            Aucune donnée manquante qualifiée à ce stade.
          </div>
        ) : missingData.map(finding => (
          <article key={finding.findingId} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">Ce que nous ne savons pas encore</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {finding.priority ? PRIORITY_LABELS[finding.priority] : 'À documenter'}
              </span>
            </div>
            <p className="mt-2 text-base text-foreground">{finding.uncertaintyExplanation}</p>
            <p className="mt-1 text-base text-muted-foreground">{finding.potentialDecisionImpact}</p>
          </article>
        ))}

        {(discordances ?? []).map(finding => (
          <TwoLevelReading
            key={finding.findingId}
            label="Voir le détail"
            summary={<span><span className="font-medium">Signal à explorer :</span> {finding.signal}</span>}
            detail={(
              <div className="space-y-2">
                <p><span className="font-medium">Question à poser :</span> {finding.questionToExplore}</p>
                <p><span className="font-medium">Impact possible :</span> {finding.possibleProtocolImpact}</p>
                <p className="text-muted-foreground">Visible uniquement par le praticien.</p>
              </div>
            )}
          />
        ))}
      </div>
    </section>
  );
}
