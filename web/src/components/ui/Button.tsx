import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  outline: 'text-foreground border border-border hover:bg-muted',
  danger: 'text-status-danger border border-border hover:bg-status-danger/10',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
