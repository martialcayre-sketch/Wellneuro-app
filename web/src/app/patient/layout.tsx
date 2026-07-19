import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ReadingComfortControl } from '@/components/patient/ReadingComfortControl';

export const metadata: Metadata = {
  title: 'Wellneuro — Questionnaire patient',
};

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface flex flex-col">
      <header className="py-4 px-6 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between gap-3">
        <span className="text-primary font-semibold text-lg">Wellneuro</span>
        <ReadingComfortControl />
      </header>
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground/70">
        Ce questionnaire ne constitue pas un diagnostic médical. Les résultats sont transmis à votre praticien.
      </footer>
    </div>
  );
}
