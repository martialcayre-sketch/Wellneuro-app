'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface NavBarProps {
  email: string;
  buildLabel: string;
}

export function NavBar({ email, buildLabel }: NavBarProps) {
  return (
    <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-accent">
          Wellneuro
        </span>
        <Badge variant="neutral">Espace praticien — v2</Badge>
        <Badge variant="warning">{buildLabel}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/patients"
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Patients
        </Link>
        <Link
          href="/dashboard/synthese"
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Synthèse IA
        </Link>
        <Link
          href="/dashboard/parametres"
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Paramètres
        </Link>
        <span className="text-sm text-muted-foreground hidden sm:block">{email}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
