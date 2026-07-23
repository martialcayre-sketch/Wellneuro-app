import { TrajectoiresPanel } from '@/components/trajectoires/TrajectoiresPanel';

// Porte d'entrée « Fiche-trajectoire » du rail (SP-TRAJ LOT-04) : la liste
// des patients orientée trajectoire — l'entrée 5.0, distincte de la page
// héritage « Questionnaires & packs » (/dashboard/patients) qui garde la
// gestion administrative (création, consultations, assignations).

export default function DashboardTrajectoiresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Fiche-trajectoire</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Chaque patient, sa Spirale : épisode en cours, dernier jalon mesuré, prochaine échéance. Ouvrir une ligne
          affiche la fiche sur l’onglet Trajectoire.
        </p>
      </div>
      <TrajectoiresPanel />
    </div>
  );
}
