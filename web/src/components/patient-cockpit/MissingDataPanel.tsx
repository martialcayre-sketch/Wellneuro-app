'use client';

import type { DiscordanceFinding, MissingDataFinding } from '@/lib/clinical-engine/types';
import type { ContradictionAffichee } from '@/lib/clinical/contradictionsService';
import { TwoLevelReading } from '@/components/ui/TwoLevelReading';

const PRIORITY_LABELS = {
  critical_for_decision: 'Critique pour décider',
  useful_not_urgent: 'Utile mais non urgente',
  optional: 'Optionnelle',
} as const;

export function MissingDataPanel({
  missingData,
  discordances,
  contradictions = [],
}: {
  missingData: MissingDataFinding[] | null;
  discordances: DiscordanceFinding[] | null;
  /**
   * Constats du moteur DÉTERMINISTE ([[D-048]]), distincts des `discordances`
   * ci-dessus, qui viennent de la revue clinique LLM. Liste vide tant que la
   * table n'est pas signée — le verrou est appliqué en amont, par
   * `contradictionsPourAffichage`, jamais ici.
   */
  contradictions?: ContradictionAffichee[];
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

        {contradictions.map(constat => (
          <TwoLevelReading
            key={constat.id}
            label="Voir le détail"
            summary={<span><span className="font-medium">Contradiction entre instruments :</span> {constat.description}</span>}
            detail={(
              <div className="space-y-2">
                <p><span className="font-medium">Ce qui est proposé :</span> {constat.actionSuggeree}</p>
                {constat.ecartPassations && (
                  <p><span className="font-medium">Ancienneté :</span> {constat.ecartPassations}</p>
                )}
                {constat.hypotheses.length > 0 && (
                  <div>
                    <p className="font-medium">Ce que cela pourrait signifier</p>
                    <ul className="list-disc pl-5">
                      {constat.hypotheses.map(hypothese => <li key={hypothese}>{hypothese}</li>)}
                    </ul>
                  </div>
                )}
                {/* Ce que le constat NE dit pas, jamais replié : `DC-14`,
                    `DC-25`, `DC-28`. */}
                {constat.limitations.length > 0 && (
                  <div>
                    <p className="font-medium">Limites</p>
                    <ul className="list-disc pl-5">
                      {constat.limitations.map(limite => <li key={limite}>{limite}</li>)}
                    </ul>
                  </div>
                )}
                {/* Pourquoi ce constat coexiste avec une suggestion
                    d'instrument portant sur le même axe ([[D-048]], `DC-37`).
                    Sans cette phrase, le praticien voit deux entrées voisines
                    sans savoir qu'elles ne disent pas la même chose. */}
                {constat.recoupementJustifie && (
                  <p className="text-muted-foreground">{constat.recoupementJustifie}</p>
                )}
                <p className="text-muted-foreground">Visible uniquement par le praticien.</p>
              </div>
            )}
          />
        ))}
      </div>
    </section>
  );
}
