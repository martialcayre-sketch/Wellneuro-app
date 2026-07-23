import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type PatientButtonVariant = 'primary' | 'ghost' | 'neutral' | 'danger-text';

// Mesures pbtn de la maquette cible : 16 px semibold, cible ≥ 48 px,
// radius 12 px. `neutral`/`danger-text` restent des actions secondaires.
const VARIANT_CLASSES: Record<PatientButtonVariant, string> = {
  primary: 'min-h-12 inline-flex items-center justify-center py-3 px-[22px] bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-opacity',
  ghost: 'min-h-12 inline-flex items-center justify-center py-3 px-[22px] bg-transparent text-primary border border-primary/30 rounded-xl font-semibold text-base hover:bg-primary/10 disabled:opacity-50 transition-colors',
  neutral: 'min-h-11 inline-flex items-center justify-center py-2 px-4 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors',
  // min-h + inline-flex : l'apparence reste celle d'un lien texte, mais la
  // cible tactile respecte les 44 px du référentiel (SP-CONV LOT-05).
  'danger-text': 'min-h-11 inline-flex items-center text-13 text-status-danger hover:underline',
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
