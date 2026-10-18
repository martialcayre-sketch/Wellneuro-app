import { RayonComplementsPanel } from '@/components/complements/RayonComplementsPanel';
import { getC4DisabledMessage, isC4Enabled } from '@/lib/supplement-library/featureFlag';
import { EnTeteRayon } from '../EnTeteRayon';

export const metadata = { title: 'Wellneuro — Compléments alimentaires' };
// Le rayon lit son drapeau à la requête : rendu dynamique.
export const dynamic = 'force-dynamic';

// Rayon compléments (D-324 §4), servi derrière WN_C4_ENABLED (fail-closed,
// modèle C5) : instrument « à tiroir » consultable quand le drapeau est levé,
// simple bannière d'indisponibilité sinon — le panneau n'est alors pas monté
// et sa route répond 404 de son côté.
export default function ComplementsPage() {
  const rayonActif = isC4Enabled();
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon
        surtitre="Bibliothèque · qualité intrinsèque et compatibilité"
        titre="Compléments alimentaires"
      >
        Un instrument de consultation : provenance, statut, dimensions de qualité et compatibilité
        avec le protocole — présentés côte à côte, jamais résumés en une note.
      </EnTeteRayon>

      {rayonActif ? (
        <RayonComplementsPanel />
      ) : (
        <div
          role="status"
          className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
        >
          {getC4DisabledMessage()} Le catalogue et les fiches justificatives s&apos;afficheront ici dès
          son ouverture — rien n&apos;est perdu, le référentiel reste intact.
        </div>
      )}
    </div>
  );
}
