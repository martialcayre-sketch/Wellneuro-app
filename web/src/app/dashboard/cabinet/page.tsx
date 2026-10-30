import { ComptesCabinetPanel } from '@/components/cabinet/ComptesCabinetPanel';

// Les comptes du cabinet ([[D-385]], J3-cabinet) : combien de dossiers à chaque
// étape, et où en est leur protocole. Agrégats internes, pour le praticien
// seul (§5) : la page compte, elle ne liste ni n'ouvre aucun dossier.

export default function DashboardCabinetPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Comptes du cabinet</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Combien de dossiers à chaque étape, et où en est leur protocole. La page compte, elle ne nomme aucun dossier.
        </p>
      </div>
      <ComptesCabinetPanel />
    </div>
  );
}
