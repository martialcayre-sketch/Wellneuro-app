import type { SelectHTMLAttributes } from 'react';

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground ${className}`}
    >
      {children}
    </select>
  );
}
