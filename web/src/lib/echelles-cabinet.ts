// Échelles nommées des instruments du cabinet — module SANS import Prisma :
// il est partagé entre le serveur (import d'instruments, resolver) et le
// panneau client de la Bibliothèque (éditeur de questionnaire), qui ne peut
// pas embarquer `@/lib/instruments` (dépendance Prisma côté serveur).

export type OptionCabinet = { v: number; l: string };

export const ECHELLES_NOMMEES: Record<
  'frequence_0_4' | 'intensite_0_3' | 'oui_non',
  { libelle: string; options: OptionCabinet[] }
> = {
  frequence_0_4: {
    libelle: 'Fréquence (0–4)',
    options: [
      { v: 0, l: 'Jamais' },
      { v: 1, l: 'Rarement' },
      { v: 2, l: 'Parfois' },
      { v: 3, l: 'Souvent' },
      { v: 4, l: 'Très souvent' },
    ],
  },
  intensite_0_3: {
    libelle: 'Intensité (0–3)',
    options: [
      { v: 0, l: 'Pas du tout' },
      { v: 1, l: 'Un peu' },
      { v: 2, l: 'Beaucoup' },
      { v: 3, l: 'Extrêmement' },
    ],
  },
  oui_non: {
    libelle: 'Oui / Non',
    options: [
      { v: 0, l: 'Non' },
      { v: 1, l: 'Oui' },
    ],
  },
};

export type EchelleNommee = keyof typeof ECHELLES_NOMMEES;

export function estEchelleNommee(valeur: unknown): valeur is EchelleNommee {
  return typeof valeur === 'string' && valeur in ECHELLES_NOMMEES;
}
