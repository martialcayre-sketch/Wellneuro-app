'use client';

import { useEffect, useState } from 'react';
import type { ProposedAssessmentEpisode } from '@/lib/clinical-engine/types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export function EpisodeConfirmationPanel({
  proposal,
  submitting,
  onConfirm,
}: {
  proposal: ProposedAssessmentEpisode;
  submitting: boolean;
  onConfirm: (includedResponseIds: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(proposal.inWindowResponseIds);

  useEffect(() => {
    setSelectedIds(proposal.inWindowResponseIds);
  }, [proposal.assessmentEpisodeId, proposal.inWindowResponseIds]);

  const toggle = (responseId: string) => {
    setSelectedIds(current => current.includes(responseId)
      ? current.filter(id => id !== responseId)
      : [...current, responseId]);
  };

  return (
    <section aria-labelledby="episode-confirmation-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="episode-confirmation-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Confirmation de l’épisode T0
      </h3>
      <p className="mt-2 text-base text-muted-foreground">
        Vérifiez les questionnaires à inclure. Cette confirmation reste en mémoire et ne modifie aucune donnée.
      </p>

      {proposal.candidateResponses.length === 0 ? (
        <div role="status" className="mt-3 rounded-lg border border-border bg-muted p-3 text-base text-muted-foreground">
          Aucune réponse disponible. Confirmez explicitement pour produire une revue prudente des données manquantes.
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {proposal.candidateResponses.map(response => {
            const inWindow = proposal.inWindowResponseIds.includes(response.responseId);
            return (
              <label key={response.responseId} className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(response.responseId)}
                  onChange={() => toggle(response.responseId)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="min-w-0">
                  <span className="block break-words font-medium text-foreground">{response.questionnaireId}</span>
                  <span className="block text-muted-foreground">
                    {formatDate(response.observedAt)} · {inWindow ? 'dans la fenêtre T0' : 'hors fenêtre T0'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => onConfirm(selectedIds)}
        className="mt-4 min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {submitting ? 'Confirmation en cours…' : 'Confirmer l’épisode T0'}
      </button>
    </section>
  );
}
