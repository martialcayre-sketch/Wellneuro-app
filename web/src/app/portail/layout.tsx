import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ReadingComfortControl } from '@/components/patient/ReadingComfortControl';
import { PiedDePageInformations } from '@/components/patient/trust/PiedDePageInformations';

export const metadata: Metadata = {
  title: 'Wellneuro — Espace patient',
};

export default function PortailLayout({ children }: { children: ReactNode }) {
  return (
    // Canvas sable PLAT (maquette cible : les cartes crème flottent sur le
    // sable, pas de dégradé).
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-4 px-6 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between gap-3">
        <span className="font-display text-xl font-bold text-primary">Wellneuro</span>
        <ReadingComfortControl />
      </header>
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {children}
      </main>
      <footer className="py-4 px-4 text-center text-xs text-muted-foreground/70 space-y-1">
        <p>
          Cet espace ne constitue pas un diagnostic médical. Vos informations sont transmises à votre praticien.
        </p>
        <p>
          <PiedDePageInformations />
        </p>
      </footer>
    </div>
  );
}
