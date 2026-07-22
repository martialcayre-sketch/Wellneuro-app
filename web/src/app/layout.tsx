import type { Metadata } from 'next';
import { Albert_Sans, Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans, Sora } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

/* Polices A5-R1 « la Spirale » (docs/design-system-d1.md §8) — auto-hébergées
 * au build par next/font, aucune requête externe au runtime. Les rôles
 * (--font-display/--font-body/--font-mono) sont attribués par thème dans
 * globals.css : praticien = Sora / Instrument Sans / IBM Plex Mono ;
 * patient = Bricolage Grotesque / Albert Sans / IBM Plex Mono. */
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-plex-mono' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' });
const albertSans = Albert_Sans({ subsets: ['latin'], variable: '--font-albert' });

export const metadata: Metadata = {
  title: 'Wellneuro — Espace praticien',
  description: 'Plateforme de neuronutrition clinique Wellneuro',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Les variables next/font DOIVENT vivre sur <html>, pas sur <body> : les
     * rôles --font-body/--font-display sont déclarés sur :root en les
     * référençant, et une custom property se calcule là où elle est déclarée.
     * Posées sur <body>, var(--font-albert) était introuvable au niveau de
     * :root → --font-body devenait « guaranteed-invalid », héritée invalide
     * partout → font-family retombait sur le défaut navigateur (Times).
     * Diagnostiqué par sonde getComputedStyle le 2026-07-22 (audit visuel). */
    <html
      lang="fr"
      className={`${sora.variable} ${instrumentSans.variable} ${plexMono.variable} ${bricolage.variable} ${albertSans.variable}`}
    >
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
