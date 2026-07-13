import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground ${className}`}
    />
  );
}
