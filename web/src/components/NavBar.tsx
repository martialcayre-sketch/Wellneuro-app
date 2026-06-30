'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface NavBarProps {
  email: string;
}

export function NavBar({ email }: NavBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
          Wellneuro
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          Espace praticien — v2
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-800 transition"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/patients"
          className="text-sm text-gray-600 hover:text-gray-800 transition"
        >
          Patients
        </Link>
        <Link
          href="/dashboard/synthese"
          className="text-sm text-gray-600 hover:text-gray-800 transition"
        >
          Synthèse IA
        </Link>
        <span className="text-sm text-gray-600 hidden sm:block">{email}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}
