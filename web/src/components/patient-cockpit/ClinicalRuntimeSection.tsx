'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CockpitRuntimeApiResponse } from '@/app/api/praticien/cockpit/route';
import type { ValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import type { ProtocolDraft } from '@/lib/clinical-engine/types';
import type { ProtocolSaveState, RelectureProtocoleSoumission } from './ProtocolMiniBuilder';
import { EpisodeConfirmationPanel } from './EpisodeConfirmationPanel';
import { MissingDataPanel } from './MissingDataPanel';
import { DecisionSummaryCard } from './DecisionSummaryCard';
import { ProtocolMiniBuilder } from './ProtocolMiniBuilder';
import { ProtocolConsultationPanel } from './ProtocolConsultationPanel';
import { ProtocolVersionHistory, type ProtocolVersionItem } from './ProtocolVersionHistory';
import { ProtocolDiffusionPanel, type DiffusionState } from './ProtocolDiffusionPanel';
import { J21DecisionPanel } from './J21DecisionPanel';
import { TrajectoirePanel } from './TrajectoirePanel';
import type { ResumeJ21 } from '@/lib/protocol/resumeJ21';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import type { FoodCompassActionRef } from '@/lib/food-compass/types';
import { PractitionerFoodCompassObservatory } from './PractitionerFoodCompassObservatory';
import { useC5Enabled } from './C5FeatureProvider';

type VersionsApiResponse = {
  ok: boolean;
  active: { versionId: string } | null;
  history: ProtocolVersionItem[];
  error?: string;
};

type DiffusionApiResponse = {
  ok: boolean;
  approval: { protocolDraftInputHash: string; approvedAt: string } | null;
  stale: boolean;
};

type RuntimeError = 'session' | 'patient' | 'technical';

// Phases du cycle clinique 3.x (A6-R1). Le poste de pilotage n'affiche qu'une
// phase à la fois ; `'tout'` (défaut) conserve l'empilement historique et reste
// le comportement de référence hors cockpit.
export type PhaseCycleClinique =
  | 'tout'
  | 'aucune'
  | 'donnees'
  | 'comprehension'
  | 'decision'
  | 'actions'
  | 'suivi'
  | 'reevaluation';

// État observable du runtime, remonté au poste de pilotage pour que le rail
// des phases reflète l'état réel (et non un statut inventé). Lecture seule :
// aucun de ces champs ne modifie le comportement du runtime.
export type EtatRuntimeClinique = {
  chargement: boolean;
  erreur: RuntimeError | null;
  episodeConfirme: boolean;
  nombreVersions: number;
  suiviRenseigne: boolean;
  nombreCyclesTrajectoire: number;
};

export function ClinicalRuntimeSection({
  idPatient,
  fixture,
  protocolDraft,
  onFixtureReviewed,
  phase = 'tout',
  onAjusterProtocole,
  onEtatChange,
}: {
  idPatient: string;
  fixture: ValidationErgoC1Fixture | null;
  protocolDraft: ProtocolDraft | null;
  onFixtureReviewed: (submission: RelectureProtocoleSoumission) => void;
  phase?: PhaseCycleClinique;
  onAjusterProtocole?: () => void;
  onEtatChange?: (etat: EtatRuntimeClinique) => void;
}) {
  const c5Enabled = useC5Enabled();
  const [runtime, setRuntime] = useState<CockpitRuntimeApiResponse | null>(null);
  const [loading, setLoading] = useState(!fixture);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<RuntimeError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Versionnement persistant (C2A LOT-03) — actif hors mode fixture uniquement.
  const [versions, setVersions] = useState<ProtocolVersionItem[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<ProtocolSaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  // Validation « pour diffusion » (C2A LOT-03 Part B).
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [approvalStale, setApprovalStale] = useState(false);
  const [diffusionState, setDiffusionState] = useState<DiffusionState>('idle');
  const [diffusionError, setDiffusionError] = useState<string | null>(null);
  // Résumé J21 « point de jonction » (C2A LOT-04) — lecture seule.
  const [resumeJ21, setResumeJ21] = useState<ResumeJ21 | null>(null);
  const [trajectoire, setTrajectoire] = useState<Trajectoire | null>(null);
  const [foodCompassSelection, setFoodCompassSelection] = useState<{
    foodLabel: string;
    actionRef: FoodCompassActionRef;
  } | null>(null);

  const loadTrajectoire = useCallback(async () => {
    try {
      const response = await fetch(`/api/praticien/trajectoire?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await response.json()) as { ok: boolean; trajectoire?: Trajectoire };
      if (!response.ok || !payload.ok) return;
      setTrajectoire(payload.trajectoire ?? null);
    } catch {
      // La fiche-trajectoire est indicative : un échec de lecture ne bloque pas le cockpit.
    }
  }, [idPatient]);

  const loadCheckins = useCallback(async (decisionCardId: string) => {
    try {
      const response = await fetch(
        `/api/praticien/protocoles/checkins?idPatient=${encodeURIComponent(idPatient)}&decisionCardId=${encodeURIComponent(decisionCardId)}`,
      );
      const payload = (await response.json()) as { ok: boolean; resume?: ResumeJ21 };
      if (!response.ok || !payload.ok) return;
      setResumeJ21(payload.resume ?? null);
    } catch {
      // Le résumé est indicatif : un échec de lecture ne bloque pas le cockpit.
    }
  }, [idPatient]);

  const loadDiffusion = useCallback(async (decisionCardId: string) => {
    try {
      const response = await fetch(
        `/api/praticien/protocoles/diffusion?idPatient=${encodeURIComponent(idPatient)}&decisionCardId=${encodeURIComponent(decisionCardId)}`,
      );
      const payload = (await response.json()) as DiffusionApiResponse;
      if (!response.ok || !payload.ok) return;
      setApprovedAt(payload.approval?.approvedAt ?? null);
      setApprovalStale(payload.stale);
    } catch {
      // L'état de diffusion est indicatif : un échec de lecture ne bloque pas.
    }
  }, [idPatient]);

  const loadVersions = useCallback(async (decisionCardId: string) => {
    try {
      const response = await fetch(
        `/api/praticien/protocoles/versions?idPatient=${encodeURIComponent(idPatient)}&decisionCardId=${encodeURIComponent(decisionCardId)}`,
      );
      const payload = (await response.json()) as VersionsApiResponse;
      if (!response.ok || !payload.ok) return;
      setVersions(payload.history);
      setActiveVersionId(payload.active?.versionId ?? null);
    } catch {
      // L'historique est indicatif : un échec de lecture ne bloque pas la saisie.
    }
  }, [idPatient]);

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

  // Charge l'historique des versions et l'état de diffusion dès que le runtime
  // réel est prêt.
  const readyDecisionCardId =
    !fixture && runtime?.status === 'ready' ? runtime.decisionCard.decisionCardId : null;
  useEffect(() => {
    if (readyDecisionCardId) {
      void loadVersions(readyDecisionCardId);
      void loadDiffusion(readyDecisionCardId);
      void loadCheckins(readyDecisionCardId);
      void loadTrajectoire();
    }
  }, [readyDecisionCardId, loadVersions, loadDiffusion, loadCheckins, loadTrajectoire]);

  useEffect(() => {
    setFoodCompassSelection(null);
  }, [readyDecisionCardId, activeVersionId]);

  // Remontée de l'état observable (rail des phases). Dépendances primitives
  // uniquement : aucune boucle de rendu.
  const nombreCyclesTrajectoire = trajectoire?.cycles.length ?? 0;
  const suiviRenseigne = resumeJ21 !== null;
  const nombreVersions = versions.length;
  useEffect(() => {
    onEtatChange?.({
      chargement: loading,
      erreur: error,
      episodeConfirme: readyDecisionCardId !== null,
      nombreVersions,
      suiviRenseigne,
      nombreCyclesTrajectoire,
    });
  }, [
    onEtatChange,
    loading,
    error,
    readyDecisionCardId,
    nombreVersions,
    suiviRenseigne,
    nombreCyclesTrajectoire,
  ]);

  // Enregistrement EXPLICITE d'une version relue (jamais silencieux, jamais
  // d'envoi patient). Anti-écrasement via baseVersionId → 409 version_stale.
  const saveVersion = async (submission: RelectureProtocoleSoumission) => {
    if (fixture || !runtime || runtime.status !== 'ready') return;
    const episode = runtime.snapshot.assessmentEpisode;
    const decisionCard = runtime.decisionCard;
    setSaveState('saving');
    setSaveError(null);
    try {
      const response = await fetch('/api/praticien/protocoles/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode, decisionCard, submission, baseVersionId: activeVersionId }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (response.status === 409) {
        setSaveState('stale');
        await loadVersions(decisionCard.decisionCardId);
        return;
      }
      if (!response.ok || !payload.ok) {
        setSaveState('error');
        setSaveError(payload.error ?? 'Échec de l’enregistrement.');
        return;
      }
      setSaveState('saved');
      // Une nouvelle version rend l'approbation précédente caduque : recharger.
      await loadVersions(decisionCard.decisionCardId);
      await loadDiffusion(decisionCard.decisionCardId);
    } catch {
      setSaveState('error');
      setSaveError('Erreur technique lors de l’enregistrement.');
    }
  };

  // Validation explicite « pour diffusion » de la version active relue. Jamais
  // d'envoi patient : l'approbation ne fait qu'attester le contenu.
  const approveForDiffusion = async () => {
    if (fixture || !readyDecisionCardId) return;
    const activeVersion = versions.find((version) => version.isActive);
    if (!activeVersion || activeVersion.status !== 'practitioner_reviewed') return;
    setDiffusionState('saving');
    setDiffusionError(null);
    try {
      const response = await fetch('/api/praticien/protocoles/diffusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          decisionCardId: readyDecisionCardId,
          protocolDraftInputHash: activeVersion.inputHash,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setDiffusionState('error');
        setDiffusionError(payload.error ?? 'Échec de la validation.');
        return;
      }
      setDiffusionState('idle');
      await loadDiffusion(readyDecisionCardId);
    } catch {
      setDiffusionState('error');
      setDiffusionError('Erreur technique lors de la validation.');
    }
  };

  const review = fixture?.review ?? (runtime?.status === 'ready' ? runtime.review : null);
  const decisionCard = fixture?.decisionCard ?? (runtime?.status === 'ready' ? runtime.decisionCard : null);
  const activeReviewedVersion = versions.find(
    (version) => version.isActive && version.status === 'practitioner_reviewed',
  );

  // Filtre d'affichage par phase — purement présentationnel : les chargements,
  // les états et les actions restent strictement identiques quelle que soit la
  // phase affichée (aucun contrat d'API ni règle clinique n'est touché).
  const affiche = (phaseInstrument: Exclude<PhaseCycleClinique, 'tout' | 'aucune'>) =>
    phase === 'tout' || phase === phaseInstrument;

  return (
    <>
      {/* Chargement, avis de rechargement et erreurs : JAMAIS filtrés par
          phase — une session expirée doit être lisible même si le praticien
          se trouve sur la phase Actions (sinon il saisit un protocole dans un
          formulaire qui ne pourra pas s'enregistrer). */}
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
      {affiche('decision') && !fixture && !loading && !error && runtime?.status === 'proposal_required' && (
        <EpisodeConfirmationPanel proposal={runtime.proposal} submitting={submitting} onConfirm={confirm} />
      )}
      {affiche('decision') && !fixture && runtime?.status === 'ready' && (
        <div role="status" className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Épisode T0 confirmé. Décision suspendue : l&apos;abstention clinique n&apos;est pas encore évaluée.
        </div>
      )}

      {affiche('donnees') && (
        <MissingDataPanel missingData={review?.missingData ?? null} discordances={review?.discordances ?? null} />
      )}
      {affiche('decision') && <DecisionSummaryCard decisionCard={decisionCard} />}
      {/* Boussole alimentaire : montée dès que les gardes métier sont
          satisfaites, puis seulement MASQUÉE hors phase Actions — la démonter
          rejouerait son chargement et réinitialiserait l'aliment sélectionné. */}
      {c5Enabled && !fixture && readyDecisionCardId && (
        <div hidden={!affiche('actions')}>
          <PractitionerFoodCompassObservatory
            idPatient={idPatient}
            decisionCardId={readyDecisionCardId}
            onInsert={setFoodCompassSelection}
          />
        </div>
      )}
      <div id="protocol-version-builder" hidden={!affiche('actions')}>
        <ProtocolMiniBuilder
          decisionCard={decisionCard}
          onReviewed={fixture ? onFixtureReviewed : undefined}
          onSaveVersion={fixture ? undefined : saveVersion}
          saveState={saveState}
          saveError={saveError}
          foodCompassSelection={foodCompassSelection}
          onClearFoodCompassSelection={() => setFoodCompassSelection(null)}
        />
      </div>
      {affiche('actions') && (
        <ProtocolConsultationPanel decisionCard={decisionCard} protocolDraft={fixture ? protocolDraft : null} />
      )}
      {affiche('actions') && !fixture && <ProtocolVersionHistory versions={versions} />}
      {affiche('actions') && !fixture && versions.length > 0 && (
        <ProtocolDiffusionPanel
          canApprove={Boolean(activeReviewedVersion)}
          approved={approvedAt !== null}
          stale={approvalStale}
          approvedAt={approvedAt}
          state={diffusionState}
          error={diffusionError}
          onApprove={approveForDiffusion}
        />
      )}
      {affiche('suivi') && !fixture && readyDecisionCardId && (
        <J21DecisionPanel
          resume={resumeJ21}
          onAjuster={
            onAjusterProtocole ??
            (() => document.getElementById('protocol-version-builder')?.scrollIntoView({ behavior: 'smooth' }))
          }
        />
      )}
      {affiche('reevaluation') && !fixture && readyDecisionCardId && (
        <TrajectoirePanel trajectoire={trajectoire} />
      )}
    </>
  );
}
