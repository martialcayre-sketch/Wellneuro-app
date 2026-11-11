import type { Metadata } from 'next';
import { IBM_Plex_Mono, Instrument_Sans, Lora, Sora } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

/* Polices A5-R3 « Lien — Empreinte » ([[D-481]]) — auto-hébergées au build
 * par next/font, aucune requête externe au runtime. Les rôles
 * (--font-display/--font-body/--font-mono) sont attribués par thème dans
 * globals.css : praticien = Sora / Instrument Sans / IBM Plex Mono ;
 * patient = Lora / Instrument Sans / IBM Plex Mono. Lora porte aussi le nom
 * de la marque (EmpreinteMarque). Bricolage Grotesque et Albert Sans
 * (patient A5-R1) ne sont plus chargées : aucun écran ne les citait. */
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-plex-mono' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: 'Wellneuro — Espace praticien',
  description: 'Plateforme de neuronutrition clinique Wellneuro',
  // Petit format de la marque Empreinte (sans graine ni arc), kit v2.0.0.
  icons: {
    icon: [
      { url: '/wellneuro-lien/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/wellneuro-lien/brand/favicon.ico', sizes: 'any' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Les variables next/font DOIVENT vivre sur <html>, pas sur <body> : les
     * rôles --font-body/--font-display sont déclarés sur :root en les
     * référençant, et une custom property se calcule là où elle est déclarée.
     * Posées sur <body>, la variable de police était introuvable au niveau de
     * :root → --font-body devenait « guaranteed-invalid », héritée invalide
     * partout → font-family retombait sur le défaut navigateur (Times).
     * Diagnostiqué par sonde getComputedStyle le 2026-07-22 (audit visuel). */
    <html
      lang="fr"
      className={`${sora.variable} ${instrumentSans.variable} ${plexMono.variable} ${lora.variable}`}
    >
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
