import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wellneuro — Questionnaire patient',
};

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="py-4 px-6 border-b border-blue-100 bg-white/80 backdrop-blur">
        <span className="text-blue-900 font-semibold text-lg">Wellneuro</span>
      </header>
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-gray-400">
        Ce questionnaire ne constitue pas un diagnostic médical. Les résultats sont transmis à votre praticien.
      </footer>
    </div>
  );
}
