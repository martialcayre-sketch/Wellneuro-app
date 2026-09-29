import { describe, expect, it } from 'vitest';
import {
  dateDeRemise,
  MENTION_IA,
  MENTION_INDISPONIBLE,
  MENTION_PLUS_ACTUELLE,
  MENTION_RETIREE,
  mentionsDeLaFiche,
  titreDeLaFiche,
  TITRE_ESPACE,
} from './textesFiches';

// Les textes de l'espace de lecture ([[D-251]] §5, §8, lot 10). Deux d'entre
// eux sont fixés par décision, mot pour mot : ils se prouvent ici.

describe('les textes fixés par décision', () => {
  it('le nom de l’espace (§8)', () => {
    expect(TITRE_ESPACE).toBe('Fiches remises par mon praticien');
  });

  it('la mention d’IA de la page de lecture (§5)', () => {
    expect(MENTION_IA).toBe('Fiche adaptée avec l’aide d’une intelligence artificielle, relue et validée par votre praticien.');
  });

  it('la mention d’une assiette sortie du protocole (arbitrage du 2026-09-28)', () => {
    expect(MENTION_PLUS_ACTUELLE).toContain('ne fait plus partie de votre protocole actuel');
  });
});

describe('mentionsDeLaFiche', () => {
  it.each([
    ['servie', 'actuel', []],
    ['servie', 'inconnu', []],
    ['servie', 'plus_actuel', [MENTION_PLUS_ACTUELLE]],
    ['retiree', 'actuel', [MENTION_RETIREE]],
    ['retiree', 'plus_actuel', [MENTION_RETIREE, MENTION_PLUS_ACTUELLE]],
    ['indisponible', 'inconnu', [MENTION_INDISPONIBLE]],
  ] as const)('%s / %s', (etat, protocole, attendu) => {
    expect(mentionsDeLaFiche({ etat, protocole })).toEqual(attendu);
  });

  it('aucune mention ne dit qu’une fiche « fait partie » du protocole', () => {
    for (const etat of ['servie', 'retiree', 'indisponible'] as const) {
      for (const protocole of ['actuel', 'plus_actuel', 'inconnu'] as const) {
        for (const mention of mentionsDeLaFiche({ etat, protocole })) {
          expect(mention).not.toMatch(/(?<!ne )fait partie/);
        }
      }
    }
  });
});

describe('titreDeLaFiche et dateDeRemise', () => {
  it('le titre de la fiche quand son texte part, sinon le libellé de l’assiette', () => {
    expect(titreDeLaFiche({ libelle: 'Assiette A', contenu: { titre: 'Titre', precautions: [], sections: [] } })).toBe('Titre');
    expect(titreDeLaFiche({ libelle: 'Assiette A', contenu: null })).toBe('Assiette A');
  });

  it('la date se dit en toutes lettres, et une date illisible ne dit rien', () => {
    expect(dateDeRemise('2026-09-28T10:00:00.000Z')).toBe('Remise le 28 septembre 2026');
    expect(dateDeRemise('pas une date')).toBe('');
  });
});
