import { SynthesePanel } from '@/components/SynthesePanel';

export default function DashboardSynthesePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Synthèse IA & Booklet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Génération IA à partir des résultats questionnaires — validation praticien obligatoire avant envoi
        </p>
      </div>
      <SynthesePanel />
    </div>
  );
}
