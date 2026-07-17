'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CockpitRuntimeApiResponse } from '@/app/api/praticien/cockpit/route';
import type { ValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import type { ProtocolDraft } from '@/lib/clinical-engine/types';
import type { RelectureProtocoleSoumission } from './ProtocolMiniBuilder';
import { EpisodeConfirmationPanel } from './EpisodeConfirmationPanel';
import { MissingDataPanel } from './MissingDataPanel';
import { DecisionSummaryCard } from './DecisionSummaryCard';
import { ProtocolMiniBuilder } from './ProtocolMiniBuilder';
import { ProtocolConsultationPanel } from './ProtocolConsultationPanel';

type RuntimeError = 'session' | 'patient' | 'technical';

export function ClinicalRuntimeSection({
  idPatient,
  fixture,
  protocolDraft,
  onFixtureReviewed,
}: {
  idPatient: string;
  fixture: ValidationErgoC1Fixture | null;
  protocolDraft: ProtocolDraft | null;
  onFixtureReviewed: (submission: RelectureProtocoleSoumission) => void;
}) {
  const [runtime, setRuntime] = useState<CockpitRuntimeApiResponse | null>(null);
  const [loading, setLoading] = useState(!fixture);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<RuntimeError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProposal = useCallback(async (stale = false) => {
    if (fixture) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/praticien/cockpit?idPatient=${encodeURIComponent(idPatient)}&milestone=T0`);
      const payload = await response.json() as CockpitRuntimeApiResponse;
      if (!response.ok || payload.status === 'unavailable') {
        const reason = payload.status === 'unavailable' ? payload.reason : 'exception';
        setRuntime(null);
        setError(reason === 'unauthenticated' ? 'session' : reason === 'patient_not_found' ? 'patient' : 'technical');
        return;
      }
      setRuntime(payload);
      setNotice(stale ? 'Les réponses ont changé. La proposition a été rechargée et doit être confirmée à nouveau.' : null);
    } catch {
      setRuntime(null);
      setError('technical');
    } finally {
      setLoading(false);
    }
  }, [fixture, idPatient]);

  useEffect(() => {
    if (fixture) {
      setLoading(false);
      return;
    }
    void loadProposal();
  }, [fixture, loadProposal]);

  const confirm = async (includedResponseIds: string[]) => {
    if (!runtime || runtime.status !== 'proposal_required') return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/praticien/cockpit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          milestone: 'T0',
          includedResponseIds,
          proposalHash: runtime.proposalHash,
        }),
      });
      const payload = await response.json() as CockpitRuntimeApiResponse;
      if (response.status === 409 && payload.status === 'unavailable' && payload.reason === 'proposal_stale') {
        await loadProposal(true);
        return;
      }
      if (!response.ok || payload.status !== 'ready') {
        const reason = payload.status === 'unavailable' ? payload.reason : 'exception';
        setError(reason === 'unauthenticated' ? 'session' : reason === 'patient_not_found' ? 'patient' : 'technical');
        return;
      }
      setRuntime(payload);
      setNotice(null);
    } catch {
      setError('technical');
    } finally {
      setSubmitting(false);
    }
  };

  const review = fixture?.review ?? (runtime?.status === 'ready' ? runtime.review : null);
  const decisionCard = fixture?.decisionCard ?? (runtime?.status === 'ready' ? runtime.decisionCard : null);

  return (
    <>
      {!fixture && loading && (
        <div role="status" className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Chargement de la proposition d&apos;épisode T0…
        </div>
      )}
      {!fixture && notice && (
        <div role="status" className="rounded-xl border border-accent bg-orange-50 p-4 text-sm text-orange-800">{notice}</div>
      )}
      {!fixture && error && (
        <div role="alert" className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          {error === 'session'
            ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'
            : error === 'patient'
              ? 'Patient introuvable.'
              : 'Erreur technique lors de la préparation du cockpit clinique.'}
        </div>
      )}
      {!fixture && !loading && !error && runtime?.status === 'proposal_required' && (
        <EpisodeConfirmationPanel proposal={runtime.proposal} submitting={submitting} onConfirm={confirm} />
      )}
      {!fixture && runtime?.status === 'ready' && (
        <div role="status" className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Épisode T0 confirmé. Décision suspendue : l&apos;abstention clinique n&apos;est pas encore évaluée.
        </div>
      )}

      <MissingDataPanel missingData={review?.missingData ?? null} discordances={review?.discordances ?? null} />
      <DecisionSummaryCard decisionCard={decisionCard} />
      <ProtocolMiniBuilder decisionCard={decisionCard} onReviewed={fixture ? onFixtureReviewed : undefined} />
      <ProtocolConsultationPanel decisionCard={decisionCard} protocolDraft={fixture ? protocolDraft : null} />
    </>
  );
}
