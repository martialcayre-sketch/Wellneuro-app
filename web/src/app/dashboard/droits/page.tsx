import { TrustPanel } from '@/components/TrustPanel';

// « Confiance & droits » (TRUST LOT-03/04) : visibilité praticien sur les
// signalements, incidents et demandes d'exercice de droits des patients.
export default function DroitsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Confiance &amp; droits</h2>
        <p className="text-base text-muted-foreground mt-1">
          Signalements d’effets indésirables, incidents de confidentialité et demandes de droits
          déposés par vos patients. Rien ne se supprime : les statuts évoluent.
        </p>
      </div>
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          File des signalements et demandes
        </h3>
        <TrustPanel />
      </section>
    </div>
  );
}
