import { lireDecision } from '@/lib/doctrine/lireDecision';
import { describe, expect, it } from 'vitest';
import { PARAGRAPHES_ENCART_CONDUITE, TITRE_ENCART_CONDUITE } from './texteEncartConduite';

describe('texte accepté de l’encart « quand ralentir ou demander avis »', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la citation de D-349 §1, ligne à
  // ligne. Égalité stricte : un paragraphe tronqué, omis ou ajouté rougit, pas
  // seulement un mot changé.
  it('est la citation de D-349 §1, ni plus ni moins', () => {
    const section = lireDecision('D-349');
    const paragraphe1 = section.slice(section.indexOf('**§1'), section.indexOf('**§2'));
    const cite = paragraphe1
      .split('\n')
      .filter((ligne) => ligne.startsWith('>'))
      .map((ligne) => ligne.replace(/^>\s?/, ''))
      .filter((ligne) => ligne !== '');
    expect(cite).toEqual([TITRE_ENCART_CONDUITE, ...PARAGRAPHES_ENCART_CONDUITE]);
  });

  // PORTAIL SANS CHIFFRE : ni durée, ni dose, ni seuil — pas même un numéro,
  // ceux des urgences restant au pied de page.
  it('ne porte aucun chiffre', () => {
    for (const texte of [TITRE_ENCART_CONDUITE, ...PARAGRAPHES_ENCART_CONDUITE]) expect(texte).not.toMatch(/\d/);
  });
});
