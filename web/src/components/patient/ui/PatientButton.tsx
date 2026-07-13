import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type PatientButtonVariant = 'primary' | 'ghost' | 'neutral' | 'danger-text';

const VARIANT_CLASSES: Record<PatientButtonVariant, string> = {
  primary: 'py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity',
  ghost: 'py-2.5 px-4 bg-surface text-primary border border-primary/30 rounded-lg font-medium text-sm hover:bg-primary/10 disabled:opacity-50 transition-colors',
  neutral: 'py-2 px-4 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors',
  'danger-text': 'text-xs text-status-danger hover:underline',
};

// Exporté pour les éléments non-<button> (ex. <a> de navigation dans le hub)
// qui doivent partager exactement le même habillage visuel qu'un PatientButton.
export function patientButtonClassName(variant: PatientButtonVariant, className = ''): string {
  return `${VARIANT_CLASSES[variant]} ${className}`;
}

// Bouton commun du portail patient — factorise les variantes primary/ghost/
// neutral/danger-text dupliquées à travers les écrans avant HC-F LOT-04.
// `loading` remplace uniformément le libellé par `loadingLabel` et désactive
// le bouton, comme le faisait chaque écran individuellement.
export function PatientButton({
  variant = 'primary',
  loading = false,
  loadingLabel,
  children,
  className = '',
  ...rest
}: {
  variant?: PatientButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={rest.type ?? 'button'}
      {...rest}
      disabled={rest.disabled || loading}
      className={patientButtonClassName(variant, className)}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
