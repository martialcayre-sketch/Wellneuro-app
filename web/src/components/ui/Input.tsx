import type { InputHTMLAttributes } from 'react';

// 44 px de cible et anneau de focus (PRA-3b Q8 a), comme `Button`.
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${className}`}
    />
  );
}
