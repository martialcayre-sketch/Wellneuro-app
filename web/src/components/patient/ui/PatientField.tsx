import type { ReactNode } from 'react';

export const patientInputClassName =
  'w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

// Label + champ commun du portail patient — factorise labelCls/inputCls et le
// motif `{label}{requis && ' *'}` dupliqués à travers les écrans du portail
// avant HC-F LOT-04. Ne change aucune donnée collectée : purement présentationnel.
export function PatientField({
  label,
  requis = false,
  suffixe,
  children,
  className = '',
}: {
  label: string;
  requis?: boolean;
  suffixe?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
        {requis && ' *'}
        {suffixe && <span className="text-muted-foreground/70 font-normal"> ({suffixe})</span>}
      </label>
      {children}
    </div>
  );
}
