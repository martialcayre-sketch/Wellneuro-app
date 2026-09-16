'use client';

import { useState } from 'react';
import { apercuContenuPatient } from '@/lib/clinical-engine/contenuPatientProtocole';
import type { DecisionCard, ProtocolDraft } from '@/lib/clinical-engine/types';
import { ApercuPatientProtocole } from './ApercuPatientProtocole';

// Clôture de consultation sur FIXTURE : résumé praticien, validation locale, et
// aperçu de ce que le patient lira. La validation n'écrit rien et ne transmet
// rien — elle ne déverrouille que l'aperçu.
//
// L'APERÇU PASSE PAR LE CONTRAT ([[D-200]] dette 1). Il était construit ici à la
// main depuis `ProtocolDraft`, et la liste des conditions de validation y était
// recopiée condition par condition. Deux conséquences, toutes deux vues :
// `interventionStatus` n'était pas rendu — une intervention suspendue se lisait
// comme un conseil ferme — et les deux descriptions pouvaient diverger sans que
// `tsc` bronche. Le verdict d'éligibilité EST désormais celui du contrat, et le
// motif de son refus est affiché tel quel : c'est ce que le praticien a à lever.

const LOAD_LABELS: Record<ProtocolDraft['therapeuticLoad']['level'], string> = {
  light: 'Léger', moderate: 'Modéré', loaded: 'Chargé', excessive: 'Excessif',
};

export function ProtocolConsultationPanel({
  decisionCard,
  protocolDraft,
  apercuEnDiffusion = false,
}: {
  decisionCard: DecisionCard | null;
  protocolDraft: ProtocolDraft | null;
  /**
   * Hors fixture, ce panneau n'a JAMAIS de protocole — il reste monté pour son
   * état prudent, et l'aperçu réel vit dans la sous-vue « Diffusion », sur la
   * version active du dossier. Sans ce renvoi, l'écran promet un aperçu que ni
   * la relecture ni la validation ne feront apparaître ICI : la promesse est
   * exactement ce que [[D-200]] reprochait à cette surface.
   */
  apercuEnDiffusion?: boolean;
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
          {apercuEnDiffusion && (
            <p className="mt-2 text-base text-muted-foreground">
              L’aperçu de ce que votre patient lira se trouve en sous-vue « Diffusion », sur la version active.
            </p>
          )}
        </div>
      </section>
    );
  }

  const selected = decisionCard.priorityCandidates.find(
    candidate => candidate.candidateId === decisionCard.selectedMainPriority?.candidateId
  );
  // LE CONTRAT TRANCHE, l'écran n'ajoute aucune condition. Un refus porte son
  // motif, et c'est ce motif qui est rendu au praticien.
  const apercu = apercuContenuPatient({ decisionCard, protocolDraft });
  const fingerprint = `${decisionCard.inputHash}:${protocolDraft.inputHash}`;
  const approved = apercu.ok && approvedFingerprint === fingerprint;

  const approve = () => {
    if (!apercu.ok) return;
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
          <button type="button" onClick={approve} disabled={!apercu.ok} className="mt-4 min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            Valider pour diffusion
          </button>
        )}
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {approved
            ? 'Validation locale enregistrée pour cette version — contenu non transmis.'
            : apercu.ok ? 'La validation déverrouille uniquement l’aperçu local.' : apercu.detail}
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
            {previewOpen && apercu.ok && (
              <div id="patient-protocol-preview-content" className="mt-4">
                <ApercuPatientProtocole contenu={apercu.contenu} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
