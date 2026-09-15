import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  ESPECES_MESUREES,
  estEspeceMesuree,
  jourDeMesure,
  tauxOuverture,
} from './ouvertureSources';

describe('le vocabulaire du compteur « Voir les sources et limites »', () => {
  it('LES DEUX ESPÈCES VONT PAR PAIRE — le dénominateur d’abord', () => {
    // CE CAS GARDE UNE DÉCISION, PAS UNE ORTHOGRAPHE. Servir `ouverture` seule
    // produirait le nombre sans dénominateur que cette campagne poursuit depuis
    // son premier lot : « 40 ouvertures » ne distingue pas une surface consultée
    // systématiquement d'une surface ignorée 99 fois sur 100.
    expect(ESPECES_MESUREES).toEqual(['affichage', 'ouverture']);
  });

  it('l’espèce forgée est refusée, et le `CHECK` de la base n’est pas le seul rempart', () => {
    for (const espece of ESPECES_MESUREES) expect(estEspeceMesuree(espece)).toBe(true);
    for (const forge of ['connexion', 'duree', 'AFFICHAGE', '', null, undefined, 3, {}]) {
      expect(estEspeceMesuree(forge)).toBe(false);
    }
  });

  it('LE TAUX EST `null` SANS AFFICHAGE, JAMAIS ZÉRO (`DC-24`)', () => {
    // Zéro se lit « personne n'ouvre » ; l'absence de mesure se lit « on ne sait
    // pas ». Rendre `0` ferait porter à la surface un désintérêt qui vient de
    // l'absence de dénominateur — lire une absence comme une normalité.
    expect(tauxOuverture({ affichage: 0, ouverture: 0 })).toBeNull();
    expect(tauxOuverture({ affichage: 0, ouverture: 5 })).toBeNull();
    expect(tauxOuverture({ affichage: -1, ouverture: 0 })).toBeNull();
  });

  it('LE TAUX EST `null` QUAND LES OUVERTURES DÉPASSENT LES AFFICHAGES', () => {
    // Ce n'est pas un taux de 120 %, c'est une mesure cassée — un montage non
    // compté, un double envoi. Lui donner un chiffre le rendrait crédible.
    expect(tauxOuverture({ affichage: 10, ouverture: 11 })).toBeNull();
  });

  it('le taux se calcule quand les deux termes le permettent', () => {
    expect(tauxOuverture({ affichage: 10, ouverture: 0 })).toBe(0);
    expect(tauxOuverture({ affichage: 10, ouverture: 4 })).toBe(0.4);
    expect(tauxOuverture({ affichage: 10, ouverture: 10 })).toBe(1);
  });

  it('un terme non fini ne rend aucun taux', () => {
    expect(tauxOuverture({ affichage: Number.NaN, ouverture: 1 })).toBeNull();
    expect(tauxOuverture({ affichage: 10, ouverture: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it('LE JOUR EST UTC, et une fin de journée locale ne glisse pas', () => {
    // Deux quotients faux au lieu d'un : l'incrément partirait sur le jour
    // suivant côté serveur et le précédent côté banc.
    expect(jourDeMesure(new Date('2026-09-15T23:59:59.999Z')).toISOString())
      .toBe('2026-09-15T00:00:00.000Z');
    expect(jourDeMesure(new Date('2026-09-16T00:00:00.000Z')).toISOString())
      .toBe('2026-09-16T00:00:00.000Z');
  });

  it('MODULE-FEUILLE : il n’importe rien', () => {
    // Le composant client le lit pour nommer ce qu'il envoie. Un import de
    // `prisma` ou `auth` ici le rendrait inimportable depuis le navigateur —
    // contrainte de bundle déjà payée deux fois dans ce dépôt.
    const source = readFileSync(
      new URL('./ouvertureSources.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});
