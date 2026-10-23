import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PARAGRAPHES_ENCART_CONDUITE, TITRE_ENCART_CONDUITE } from './texteEncartConduite';

describe('texte accepté de l’encart « quand ralentir ou demander avis »', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la décision qui accepte le texte.
  it('est celui de D-348 §1, mot pour mot', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const debut = decisions.indexOf('### D-348');
    const fin = decisions.indexOf('### D-347');
    expect(debut).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(debut);
    const aplati = decisions.slice(debut, fin).replace(/\n>\s?/g, ' ').replace(/\s+/g, ' ');
    expect(aplati).toContain(TITRE_ENCART_CONDUITE);
    for (const paragraphe of PARAGRAPHES_ENCART_CONDUITE) expect(aplati).toContain(paragraphe);
  });

  // PORTAIL SANS CHIFFRE : ni durée, ni dose, ni seuil — pas même un numéro,
  // ceux des urgences restant au pied de page.
  it('ne porte aucun chiffre', () => {
    for (const texte of [TITRE_ENCART_CONDUITE, ...PARAGRAPHES_ENCART_CONDUITE]) expect(texte).not.toMatch(/\d/);
  });
});
