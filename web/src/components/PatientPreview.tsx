'use client';

import { Eye } from 'lucide-react';
import { ConsultationScreen } from '@/components/patient/ConsultationScreen';
import { PanneauSuperpose } from '@/components/ui/PanneauSuperpose';

// Mécanisme PrévisualisationPatient (cf. CONTRATS_UX_P1.md §3) : réutilise le
// composant réel du portail patient (`ConsultationScreen`) en lecture seule,
// via la route practicien-authentifiée `api/praticien/apercu-patient/reponses`
// (miroir patient-safe de `api/patient/reponses`) — jamais l'API brute
// `api/praticien/reponses`.
//
// C'est ce panneau qui a servi de patron à `PanneauSuperpose` (audit du
// 2026-09-02, lot 2) ; il en est désormais un APPELANT. L'overlay, le correctif
// `data-theme` et le bouton de fermeture viennent de la primitive.
//
// THÈME PRATICIEN, ET C'EST BIEN CE QU'IL FAUT malgré le contenu patient : le
// dialogue s'ouvre DANS le cockpit, et son cadre appartient au praticien qui le
// consulte. Seul le corps rendu est celui du portail.
export function PatientPreview({ assignationId }: { patientId: string; assignationId: string }) {
  return (
    <PanneauSuperpose
      variante="modale"
      titre="Aperçu — vue patient"
      description="Aperçu en lecture seule de ce que le patient voit pour ce questionnaire."
      declencheur={
        <button
          type="button"
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Eye aria-hidden="true" size={16} strokeWidth={2} />
          Voir ce que recevra le patient
        </button>
      }
    >
      <ConsultationScreen
        idAssignation={assignationId}
        statutReponses="verrouille"
        fetchUrl={`/api/praticien/apercu-patient/reponses?id=${encodeURIComponent(assignationId)}`}
        readOnlyPreview
        onVoirEquilibre={() => {}}
      />
    </PanneauSuperpose>
  );
}
