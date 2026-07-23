import { PatientsPanel } from '@/components/PatientsPanel';
import { isG4LienMagiqueEnabled } from '@/lib/portail/featureFlag';

// `force-dynamic` : le drapeau G4 se lit à la requête, pas au build. Sans lui,
// Next figerait ici la valeur du moment du build, et basculer la variable dans
// Vercel resterait sans effet jusqu'au déploiement suivant — un drapeau qu'il
// faut redéployer pour changer n'en est pas un. Même raison que sur
// `app/portail/lien/indisponible/page.tsx`, où le cas avait été attrapé par les E2E.
export const dynamic = 'force-dynamic';

export default function DashboardPatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Questionnaires &amp; packs</h2>
        <p className="text-base text-muted-foreground mt-1">
          Gestion administrative des dossiers : création de patients et de consultations, assignation de
          questionnaires et de packs. Le suivi clinique se lit dans « Fiche-trajectoire ».
        </p>
      </div>
      <PatientsPanel lienMagiqueActif={isG4LienMagiqueEnabled()} />
    </div>
  );
}
