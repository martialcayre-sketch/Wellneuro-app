import type { Metadata } from 'next';
import { IBM_Plex_Mono, Instrument_Sans, Inter, Lora, Sora } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

/* Polices A5-R1 « la Spirale » (docs/design-system-d1.md §8) — auto-hébergées
 * au build par next/font, aucune requête externe au runtime. Les rôles
 * (--font-display/--font-body/--font-mono) sont attribués par thème dans
 * globals.css : praticien = Sora / Instrument Sans / IBM Plex Mono ;
 * patient = Lora / Inter (provisoire jusqu'à la bascule « Forêt & cuivre »). */
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-plex-mono' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: 'Wellneuro — Espace praticien',
  description: 'Plateforme de neuronutrition clinique Wellneuro',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body
        className={`${sora.variable} ${instrumentSans.variable} ${plexMono.variable} ${inter.variable} ${lora.variable} font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
