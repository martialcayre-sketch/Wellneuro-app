import { DocumentsPanel } from '@/components/patient-cockpit/DocumentsPanel';

export default function DashboardDocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Documents contextuels</h2>
        <p className="text-base text-muted-foreground mt-1">
          Composer un document multi-destinataires (patient, médecin, praticien) à partir d’une synthèse validée —
          aperçu par destinataire et impression HTML
        </p>
      </div>
      <DocumentsPanel />
    </div>
  );
}
