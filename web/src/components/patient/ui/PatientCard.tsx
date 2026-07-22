import type { ReactNode } from 'react';

const MAX_WIDTH: Record<'md' | '2xl', string> = {
  md: 'max-w-md',
  '2xl': 'max-w-2xl',
};

const PADDING: Record<'sm' | 'lg', string> = {
  sm: 'p-5',
  lg: 'p-8',
};

// Exporté pour les cartes répétées dans une liste (ex. items du hub), où
// englober chaque carte dans le wrapper `w-full max-w-2xl` de PatientCard
// n'a pas de sens (la largeur est déjà contrainte par le parent).
export function patientCardClassName(padding: 'sm' | 'lg' = 'lg', className = ''): string {
  return `bg-surface rounded-2xl shadow-card border border-border ${PADDING[padding]} ${className}`;
}

// Chrome de carte commun au portail patient — remplace les déclarations
// locales dupliquées de `bg-white rounded-2xl shadow-sm border border-border p-8`
// présentes dans chaque écran avant HC-F LOT-04. `padding="sm"` couvre le cas
// des listes compactes (hub) qui utilisaient `p-5` plutôt que `p-8`.
export function PatientCard({
  children,
  className = '',
  maxWidth = '2xl',
  padding = 'lg',
  as = 'div',
  onSubmit,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: 'md' | '2xl';
  padding?: 'sm' | 'lg';
  as?: 'div' | 'form';
  onSubmit?: (e: React.FormEvent) => void;
}) {
  const cardClassName = patientCardClassName(padding, className);
  return (
    <div className={`w-full ${MAX_WIDTH[maxWidth]}`}>
      {as === 'form' ? (
        <form onSubmit={onSubmit} className={cardClassName}>{children}</form>
      ) : (
        <div className={cardClassName}>{children}</div>
      )}
    </div>
  );
}
