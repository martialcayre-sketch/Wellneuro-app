import { Clock } from 'lucide-react';
import type { ReactNode } from 'react';

// Bannière « Module différé » (maquettes 4.0/5.0) : les écrans réservés
// fixent l'intention d'intégration, pas un calendrier de livraison. Aucune
// logique, aucune donnée — un cadre visuel unique pour tous les modules du
// registre des différés.
export function BanniereDiffere({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-accent bg-status-warning/15 px-4 py-3 text-base text-status-warning shadow-card"
    >
      <Clock aria-hidden="true" size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
      <p className="min-w-0">
        <span className="font-semibold">Module différé. </span>
        {children}
      </p>
    </div>
  );
}
