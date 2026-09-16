import { RayonPatientsPanel } from '@/components/dossier/RayonPatientsPanel';
import { isG4LienMagiqueEnabled } from '@/lib/portail/featureFlag';

// LE RAYON PATIENTS (2026-09-16) — cette page était « Questionnaires & packs »,
// dans l'héritage 4.0, et réunissait deux métiers sans rapport : la gestion des
// dossiers et l'assignation de questionnaires. Les seconds sont passés en rayon
// de la Bibliothèque ; ce qui reste ici est le dossier.
//
// L'URL NE BOUGE PAS, et c'est le point : la fiche vit en sous-route
// (`/dashboard/patients/PAT007`). Elle a désormais, au-dessus d'elle, la liste
// à laquelle elle appartient — ce qui n'était pas le cas quand ce chemin
// s'intitulait « Questionnaires & packs ».
//
// `force-dynamic` : le drapeau G4 se lit à la requête, pas au build. Sans lui,
// Next figerait ici la valeur du moment du build, et basculer la variable
// resterait sans effet jusqu'au déploiement suivant — un drapeau qu'il faut
// redéployer pour changer n'en est pas un. Même raison que sur
// `app/portail/lien/indisponible/page.tsx`, où le cas avait été attrapé par les E2E.
export const dynamic = 'force-dynamic';

export default function DashboardPatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Patients</h2>
        <p className="text-base text-muted-foreground mt-1">
          Les dossiers du cabinet : création, coordonnées, accès au portail et fin de parcours. Ouvrir une
          ligne mène à sa fiche ; le suivi clinique se lit dans « Fiche-trajectoire », et l’assignation de
          questionnaires dans la « Bibliothèque ».
        </p>
      </div>
      <RayonPatientsPanel lienMagiqueActif={isG4LienMagiqueEnabled()} />
    </div>
  );
}
