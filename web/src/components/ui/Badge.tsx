import type { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  danger: 'bg-status-danger/10 text-status-danger',
  info: 'bg-primary/10 text-primary',
};

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      // `data-variant` expose la COULEUR aux bancs. Sans lui, un badge ne
      // s'assère que par son texte — et un `variant="success"` codé en dur
      // rendrait « Scoring non vérifié » en vert sans qu'aucun test ne rougisse
      // (relevé en revue adversariale au LOT-02). L'alternative serait d'asserter
      // la classe Tailwind, qui lie les bancs à la feuille de style.
      data-variant={variant}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
