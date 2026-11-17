import { SynthesePanel } from '@/components/SynthesePanel';

export default async function DashboardSynthesePage({
  searchParams,
}: {
  searchParams?: Promise<{ idPatient?: string }>;
}) {
  const parametres = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Synthèse IA & Booklet</h1>
        <p className="text-base text-muted-foreground mt-1">
          Génération IA à partir des résultats questionnaires — validation praticien obligatoire avant envoi
        </p>
      </div>
      <SynthesePanel initialPatientId={parametres?.idPatient ?? ''} />
    </div>
  );
}
