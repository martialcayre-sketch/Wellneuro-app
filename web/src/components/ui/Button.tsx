import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  outline: 'text-foreground border border-border hover:bg-muted',
  danger: 'text-status-danger border border-border hover:bg-status-danger/10',
};

// forwardRef requis par les usages Radix `asChild` (Dialog.Trigger du tiroir
// d'action, SP-TRAJ LOT-05) : sans ref, Radix ne peut ni gérer ni RENDRE le
// focus au déclencheur à la fermeture — attrapé par l'E2E du tiroir.
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function Button({ variant = 'primary', className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
});
