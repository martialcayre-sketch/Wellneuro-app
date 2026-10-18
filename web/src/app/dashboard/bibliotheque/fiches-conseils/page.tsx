import { RayonFichesConseilsPanel } from '@/components/fiches-assiette/RayonFichesConseilsPanel';

export const metadata = { title: 'Wellneuro — Fiches conseils' };

// Rayon Fiches conseils (D-251 lot 6) : relecture et validation des fiches
// d'assiette. Onglet de la page unique jusqu'au 2026-10-18, entrée du menu
// depuis D-324 §4. Le panneau porte son propre en-tête (titre, surtitre,
// phrase d'usage) : la page n'en ajoute pas un second.
export default function FichesConseilsPage() {
  return (
    <div className="flex flex-col gap-6">
      <RayonFichesConseilsPanel />
    </div>
  );
}
