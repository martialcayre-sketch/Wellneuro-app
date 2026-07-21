'use client';

import { useState } from 'react';
import type { DecisionCard, ProtocolDraft } from '@/lib/clinical-engine/types';

const LOAD_LABELS: Record<ProtocolDraft['therapeuticLoad']['level'], string> = {
  light: 'Léger', moderate: 'Modéré', loaded: 'Chargé', excessive: 'Excessif',
};

export function ProtocolConsultationPanel({
  decisionCard,
  protocolDraft,
}: {
  decisionCard: DecisionCard | null;
  protocolDraft: ProtocolDraft | null;
}) {
  const [approvedFingerprint, setApprovedFingerprint] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!decisionCard || !protocolDraft) {
    return (
      <section aria-labelledby="patient-protocol-preview-title">
        <h3 id="patient-protocol-preview-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Clôture et aperçu patient
        </h3>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-base font-semibold text-foreground">Aperçu du protocole indisponible — protocole relu et validation pour diffusion requis</p>
          <p className="mt-1 text-base text-muted-foreground">Aucun contenu n’est transmis au patient.</p>
        </div>
      </section>
    );
  }

  const selected = decisionCard.priorityCandidates.find(
    candidate => candidate.candidateId === decisionCard.selectedMainPriority?.candidateId
  );
  const eligible = protocolDraft.status === 'practitioner_reviewed'
    && protocolDraft.review !== null
    && selected !== undefined
    && decisionCard.abstention.status === 'not_required'
    && decisionCard.safetyFindingIds.length === 0
    && protocolDraft.decisionCardId === decisionCard.decisionCardId
    && protocolDraft.decisionCardInputHash === decisionCard.inputHash
    && protocolDraft.selectedPriorityId === selected.candidateId;
  const fingerprint = `${decisionCard.inputHash}:${protocolDraft.inputHash}`;
  const approved = eligible && approvedFingerprint === fingerprint;

  const approve = () => {
    if (!eligible) return;
    setApprovedFingerprint(fingerprint);
    setPreviewOpen(false);
  };

  return (
    <div className="grid gap-6">
      <section aria-labelledby="consultation-close-title" className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="consultation-close-title" className="text-sm font-semibold text-foreground">Résumé de clôture praticien</h3>
            <p className="mt-1 text-sm text-muted-foreground">{selected?.label ?? 'Priorité praticien indisponible'}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-border px-2 py-1">{protocolDraft.status === 'practitioner_reviewed' ? 'Relu par le praticien' : 'Brouillon'}</span>
            <span className="rounded-full border border-border px-2 py-1">{approved ? 'Validé pour diffusion' : 'Non validé pour diffusion'}</span>
            <span className="rounded-full border border-border px-2 py-1">Non transmis</span>
          </div>
        </div>
        <p className="mt-4 text-base"><span className="font-medium">Raison d’être :</span> {protocolDraft.purpose}</p>
        <p className="mt-2 text-base"><span className="font-medium">Critère J21 :</span> {protocolDraft.followUpCriterion}</p>
        <p className="mt-2 text-base"><span className="font-medium">Charge déclarée :</span> {LOAD_LABELS[protocolDraft.therapeuticLoad.level]}</p>
        <ol className="mt-4 grid gap-3">
          {protocolDraft.actions.map((action, index) => (
            <li key={action.actionId} className="rounded-lg border border-border p-3 text-base">
              <p className="font-medium">{index + 1}. {action.title}</p>
              <p className="mt-2"><span className="font-medium">Plan idéal :</span> {action.idealPlan}</p>
              <p className="mt-1"><span className="font-medium">Plan minimal :</span> {action.minimalPlan}</p>
              <p className="mt-1"><span className="font-medium">Plan de secours :</span> {action.rescuePlan}</p>
            </li>
          ))}
        </ol>
        {!approved && (
          <button type="button" onClick={approve} disabled={!eligible} className="mt-4 min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            Valider pour diffusion
          </button>
        )}
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {approved
            ? 'Validation locale enregistrée pour cette version — contenu non transmis.'
            : eligible ? 'La validation déverrouille uniquement l’aperçu local.' : 'Le protocole doit être relu et sans bloqueur avant validation.'}
        </p>
      </section>

      <section aria-labelledby="patient-protocol-preview-title" className="rounded-xl border border-border bg-surface p-4">
        <h3 id="patient-protocol-preview-title" className="text-sm font-semibold text-foreground">Aperçu du protocole — vue patient</h3>
        {!approved ? (
          <p className="mt-2 text-base text-muted-foreground">Aperçu verrouillé — validation pour diffusion requise.</p>
        ) : (
          <>
            <button type="button" onClick={() => setPreviewOpen(open => !open)} aria-expanded={previewOpen} aria-controls="patient-protocol-preview-content" className="mt-3 min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {previewOpen ? 'Fermer l’aperçu patient' : 'Ouvrir l’aperçu patient'}
            </button>
            {previewOpen && (
              <div id="patient-protocol-preview-content" className="mt-4 rounded-lg bg-muted p-4 text-base">
                <p className="font-semibold">Votre priorité actuelle</p>
                <p className="mt-1">{selected?.label}</p>
                <p className="mt-4 font-semibold">Ce que nous mettons en place</p>
                <p className="mt-1">{protocolDraft.purpose}</p>
                <ol className="mt-3 list-decimal space-y-3 pl-5">
                  {protocolDraft.actions.map(action => (
                    <li key={action.actionId}>
                      <span className="font-medium">{action.title}</span>
                      <p>Plan minimal : {action.minimalPlan}</p>
                    </li>
                  ))}
                </ol>
                {protocolDraft.adviceSheetRef && <p className="mt-4">Fiche conseil : {protocolDraft.adviceSheetRef}</p>}
                <p className="mt-4"><span className="font-semibold">Point à observer à J21 :</span> {protocolDraft.followUpCriterion}</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
