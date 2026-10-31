// LES MOTIFS D'ABSENCE DU MOMENTUM ET LEURS TEXTES PRATICIEN ([[D-397]] §2, §4).
//
// CE MODULE N'IMPORTE RIEN, et c'est une propriété : les composants du cockpit
// qui les affichent sont `'use client'` (même contrainte que
// `provenanceChiffre.ts`). Le calcul vit dans `momentumDuCycle.ts` ; les textes
// patient, dans `natureIndiceGlobal.ts`.
//
// Textes validés mot pour mot par le responsable le 2026-10-31 (§7).

export type MotifAbsenceMomentum = 'sans_jour_zero' | 'sans_lecture_ancre' | 'sans_remesure';

/** Cockpit (trajectoire, onglet Équilibre) — C-1 à C-3. */
export function texteMotifMomentumCockpit(motif: MotifAbsenceMomentum, ancre: string | null): string {
  switch (motif) {
    case 'sans_jour_zero':
      return 'Momentum non calculé : aucun protocole n’est diffusé sur ce cycle, les jalons n’ont pas de jour 0.';
    case 'sans_lecture_ancre':
      return `Momentum non calculé : pas de lecture de l’indice à l’ancre ${ancre ?? ''}.`;
    case 'sans_remesure':
      return `Momentum non calculé : aucune passation nouvelle depuis l’ancre ${ancre ?? ''}. Ce n’est pas une stabilité.`;
  }
}

/** Carte du Fil — F-1 à F-3. */
export const TEXTE_MOTIF_MOMENTUM_FIL: Record<MotifAbsenceMomentum, string> = {
  sans_jour_zero: 'Momentum non calculé : aucun protocole diffusé.',
  sans_lecture_ancre: 'Momentum non calculé : pas de lecture à l’ancre.',
  sans_remesure: 'Momentum non calculé : aucune remesure depuis l’ancre.',
};
