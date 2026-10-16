import { TrustPanel } from '@/components/TrustPanel';
import { EnvoiConditionsPanel } from '@/components/EnvoiConditionsPanel';
import { conditionsUtilisationOuvertes } from '@/lib/trust/conditionsUtilisation';

// Le drapeau se lit à la requête, pas au build.
export const dynamic = 'force-dynamic';

// « Confiance & droits » (TRUST LOT-03/04) : visibilité praticien sur les
// signalements, incidents et demandes d'exercice de droits des patients.
export default function DroitsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Confiance &amp; droits</h2>
        <p className="text-base text-muted-foreground mt-1">
          Signalements d’effets indésirables, incidents de confidentialité et demandes de droits
          déposés par vos patients. Rien ne se supprime : les statuts évoluent.
        </p>
      </div>
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[.06em] mb-3">
          File des signalements et demandes
        </h3>
        <TrustPanel />
      </section>
      {/* [[D-292]] §3 — absente drapeau fermé : le cockpit reste celui d'avant. */}
      {conditionsUtilisationOuvertes() && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[.06em] mb-3">
            Conditions d’utilisation — e-mail aux patients suivis
          </h3>
          <EnvoiConditionsPanel />
        </section>
      )}
    </div>
  );
}
