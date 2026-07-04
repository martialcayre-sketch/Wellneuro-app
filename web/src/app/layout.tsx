import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' });

export const metadata: Metadata = {
  title: 'Wellneuro — Espace praticien',
  description: 'Plateforme de neuronutrition clinique Wellneuro',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${lora.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
