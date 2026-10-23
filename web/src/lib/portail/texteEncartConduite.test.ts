import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PARAGRAPHES_ENCART_CONDUITE, TITRE_ENCART_CONDUITE } from './texteEncartConduite';

describe('texte accepté de l’encart « quand ralentir ou demander avis »', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la citation de D-349 §1, ligne à
  // ligne. Égalité stricte : un paragraphe tronqué, omis ou ajouté rougit, pas
  // seulement un mot changé.
  it('est la citation de D-349 §1, ni plus ni moins', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const debut = decisions.indexOf('### D-349');
    const fin = decisions.indexOf('### D-348');
    expect(debut).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(debut);
    const section = decisions.slice(debut, fin);
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
