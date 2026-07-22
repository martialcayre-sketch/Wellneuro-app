import type { ReactNode } from 'react';

// Chip 5.0 (maquette cible 2026-07-18) — pastille d'état du bandeau
// trajectoire et des cartes. Quatre variantes :
// - neutre : information sans charge (fond muted)
// - delta  : observation de progression (menthe — toujours accompagnée de
//   texte, jamais porteuse seule)
// - due    : action attendue (solaire — texte en --solar-ink, règle de
//   relief A5-R1)
// - soon   : module différé / code campagne (bordure seule)
type ChipVariante = 'neutre' | 'delta' | 'due' | 'soon';

const STYLES: Record<ChipVariante, string> = {
  neutre: 'border-border bg-muted text-foreground',
  delta: 'border-mint-600/30 bg-mint-600/10 text-mint-ink',
  due: 'border-solar-500/45 bg-solar-500/[.14] font-semibold text-solar-ink',
  soon: 'border-border bg-transparent text-muted-foreground',
};

export function Chip({
  variante = 'neutre',
  className = '',
  children,
}: {
  variante?: ChipVariante;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-3 py-1 text-13 ${STYLES[variante]} ${className}`}
    >
      {children}
    </span>
  );
}
