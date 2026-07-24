import { SynthesePanel } from '@/components/SynthesePanel';

export default function DashboardSynthesePage({
  searchParams,
}: {
  searchParams?: { idPatient?: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Synthèse IA & Booklet</h2>
        <p className="text-base text-muted-foreground mt-1">
          Génération IA à partir des résultats questionnaires — validation praticien obligatoire avant envoi
        </p>
      </div>
      <SynthesePanel initialPatientId={searchParams?.idPatient ?? ''} />
    </div>
  );
}
