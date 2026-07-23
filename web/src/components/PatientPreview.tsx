'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Eye, X } from 'lucide-react';
import { ConsultationScreen } from '@/components/patient/ConsultationScreen';

// Mécanisme PrévisualisationPatient (cf. CONTRATS_UX_P1.md §3) : réutilise le
// composant réel du portail patient (`ConsultationScreen`) en lecture seule,
// via la route practicien-authentifiée `api/praticien/apercu-patient/reponses`
// (miroir patient-safe de `api/patient/reponses`) — jamais l'API brute
// `api/praticien/reponses`.
export function PatientPreview({ assignationId }: { patientId: string; assignationId: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Eye aria-hidden="true" size={16} strokeWidth={2} />
          Voir ce que recevra le patient
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* data-theme requis : Radix portale hors de [data-theme="praticien"]
            posé par dashboard/layout.tsx (cf. note LOT-02, MobileBottomNav.tsx). */}
        <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content
          data-theme="praticien"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-xl focus:outline-none"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              Aperçu — vue patient
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fermer l'aperçu"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X aria-hidden="true" size={18} strokeWidth={2} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Aperçu en lecture seule de ce que le patient voit pour ce questionnaire.
          </Dialog.Description>

          <ConsultationScreen
            idAssignation={assignationId}
            statutReponses="verrouille"
            fetchUrl={`/api/praticien/apercu-patient/reponses?id=${encodeURIComponent(assignationId)}`}
            readOnlyPreview
            onVoirEquilibre={() => {}}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
