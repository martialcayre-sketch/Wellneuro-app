import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type PatientButtonVariant = 'primary' | 'ghost' | 'link' | 'neutral' | 'danger-text';

// Formes des planches validées du portail patient (prototypes PAT-4 à PAT-6),
// retenues en bloc par la question 20261121-1633-d (F1a, F2a) : 16 px
// semibold, cible ≥ 48 px, rayon 18 px (`rounded-lg`).
// `ghost` porte la forme « secondaire » : bord `control-border` (3,35:1, une
// limite de contrôle perceptible), fond surface. Survol au texte courant : le
// vert sur sa teinte de survol tombait à 4,09:1 sur le fond beige.
// `link` : la forme « fantôme » (sans bord, soulignée), posée aux seuls
// emplacements que montrent les planches. `neutral`/`danger-text` restent des
// actions secondaires ; `neutral` en 8 px de rayon, comme la planche.
const VARIANT_CLASSES: Record<PatientButtonVariant, string> = {
  primary: 'min-h-12 inline-flex items-center justify-center py-3 px-[22px] bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-opacity',
  ghost: 'min-h-12 inline-flex items-center justify-center py-3 px-[22px] bg-surface text-primary border border-control-border rounded-lg font-semibold text-base hover:bg-primary/10 hover:text-foreground disabled:opacity-50 transition-colors',
  link: 'min-h-12 inline-flex items-center justify-center py-3 px-[22px] bg-transparent text-primary underline underline-offset-[3px] rounded-lg font-semibold text-base hover:text-foreground disabled:opacity-50 transition-colors',
  neutral: 'min-h-11 inline-flex items-center justify-center py-2 px-4 text-sm font-medium text-muted-foreground bg-surface border border-control-border rounded-[0.5rem] hover:bg-muted transition-colors',
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
// neutral/danger-text dupliquées à travers les écrans avant HC-F LOT-04
// (`link` ajoutée par PAT-7i).
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
