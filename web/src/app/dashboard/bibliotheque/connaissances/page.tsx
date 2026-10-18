import { RechercheCorpusRayonPanel } from '@/components/corpus/RechercheCorpusRayonPanel';
import {
  getRechercheCorpusDisabledMessage,
  isRechercheCorpusEnabled,
} from '@/lib/supplement-library/featureFlag';
import { EnTeteRayon } from '../EnTeteRayon';

export const metadata = { title: 'Wellneuro — Connaissances' };
// Le drapeau se lit à la requête : rendu dynamique.
export const dynamic = 'force-dynamic';

// « Connaissances » (D-310 §2, D-324 §4) : lire et chercher dans le corpus.
// Rien ne s'y signe — la signature reste à l'atelier, entrée suivante du menu.
// C'était la section « Recherche corpus » de la page unique.
export default function ConnaissancesPage() {
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon
        surtitre="Bibliothèque · cognition, douleurs chroniques, axe intestin-cerveau"
        titre="Connaissances"
      >
        Claims validés du corpus, filtrés par rayon — statut et date de validation affichés quand
        ils sont connus.
      </EnTeteRayon>

      {isRechercheCorpusEnabled() ? (
        <RechercheCorpusRayonPanel />
      ) : (
        <div
          role="status"
          className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
        >
          {getRechercheCorpusDisabledMessage()}
        </div>
      )}
    </div>
  );
}
