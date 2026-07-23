import { describe, expect, it } from 'vitest';

import { FORMULATIONS_PATIENT, LIBELLES_COURTS_PATIENT } from './formulations';

// Garde D7 (SP-CONV LOT-01) — les formulations patient du contrat ne portent
// jamais : un chiffre ou pourcentage (pas de score, pas de « 3 jours »), un
// délai promis, ni le vocabulaire proscrit (dégradation, gamification —
// complément structurel de `lib/gamification-patient.guard.test.ts`, réserve
// R2 arbitrée le 2026-07-21).

const TOUTES = [
  ...Object.values(FORMULATIONS_PATIENT),
  ...Object.values(LIBELLES_COURTS_PATIENT),
];

const MOTIFS_PROSCRITS: { motif: RegExp; raison: string }[] = [
  { motif: /\d/, raison: 'aucun chiffre — ni score, ni délai chiffré' },
  { motif: /%/, raison: 'aucun pourcentage' },
  { motif: /score|point|niveau|classement|série/i, raison: 'vocabulaire de jeu proscrit' },
  { motif: /bravo|félicitation/i, raison: 'jamais de récompense' },
  { motif: /baisse|dégrad|retard|échec|chute/i, raison: 'construction, jamais dégradation' },
  { motif: /sous \d|d'ici|avant le|dans les/i, raison: 'aucun délai promis' },
];

describe('formulations patient du contrat (garde D7)', () => {
  it('chaque formulation est non vide et en français simple', () => {
    for (const phrase of TOUTES) {
      expect(phrase.trim().length).toBeGreaterThan(0);
    }
  });

  for (const { motif, raison } of MOTIFS_PROSCRITS) {
    it(`aucune formulation ne contient ${String(motif)} (${raison})`, () => {
      for (const phrase of TOUTES) {
        expect(phrase).not.toMatch(motif);
      }
    });
  }
});
