import { describe, expect, it, vi } from 'vitest';

// L'entrée publiée de BioFlow ré-exporte du code serveur qui ouvre un client
// Prisma au chargement : aucune base ici, le module testé est pur.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
import { isSyntheseBiologieEnabled } from './syntheseBiologieDrapeau';

// [[D-513]] §2 (arbitrage `20261113-2300-b`) : un drapeau propre au flux,
// éteint par défaut, qui exige aussi l'étage des résultats.

describe('WN_SYNTHESE_BIOLOGIE_ENABLED', () => {
  it('seule la chaîne exacte « true », avec l’étage des résultats et le rayon, ouvre le flux', () => {
    expect(isSyntheseBiologieEnabled('true', 'true', 'true')).toBe(true);
  });

  it('absent, vide ou autre valeur que « true » : éteint', () => {
    for (const v of [undefined, '', '1', 'TRUE', 'True', ' true', 'yes', 'on']) {
      expect(isSyntheseBiologieEnabled(v, 'true', 'true'), String(v)).toBe(false);
    }
  });

  it('l’étage des résultats ou le rayon éteint ferme le flux, drapeau du flux posé', () => {
    expect(isSyntheseBiologieEnabled('true', undefined, 'true')).toBe(false);
    expect(isSyntheseBiologieEnabled('true', 'false', 'true')).toBe(false);
    expect(isSyntheseBiologieEnabled('true', 'true', undefined)).toBe(false);
  });

  it('l’environnement de test ne le pose pas : éteint par défaut', () => {
    expect(process.env.WN_SYNTHESE_BIOLOGIE_ENABLED).toBeUndefined();
    expect(isSyntheseBiologieEnabled()).toBe(false);
  });
});
