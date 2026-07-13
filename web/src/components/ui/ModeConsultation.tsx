import type { ReactNode } from 'react';
import { X } from 'lucide-react';

// Enveloppe de bascule de mise en page pour l'entretien clinique. Aucune
// logique clinique propre : l'état est contrôlé par l'appelant, le contenu
// instancié est fourni par l'appelant (cf. CONTRATS_UX_P1.md §1). Quand actif,
// resserre la mise en page et ajoute un moyen de sortir du mode directement
// depuis l'enveloppe (en plus du bouton d'activation dans l'en-tête appelant).
export function ModeConsultation({
  active,
  onToggle,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (!active) {
    return <>{children}</>;
  }

  return (
    <div data-mode-consultation="actif" className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
        <span>Mode consultation</span>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <X size={14} strokeWidth={2} />
          Quitter
        </button>
      </div>
      {children}
    </div>
  );
}
