import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import {
  AUCUN_COURRIER_COMPLEMENT,
  ligneDestinataire,
  MENTION_INDISPONIBLE_COMPLEMENT,
  PHRASE_COURRIER_COMPLEMENT,
  TITRE_COURRIER_COMPLEMENT,
} from './textesCourrierComplement';

// [[D-345]], J3-12h lot 4. Le titre et la phrase sont ARBITRÉS (2026-10-25) et
// consignés dans la décision du lot : ils sont relus dans `docs/DECISIONS.md`,
// au caractère près. Toute la prose patient de la surface passe la garde de
// registre ([[D-189]] §4) — le courrier, lui, en est exempté (D-358 §1).

// Le registre coupe ses lignes : les blancs se replient en une espace, et les
// apostrophes se normalisent (courbes à l'écran, droites ou courbes au registre).
const DECISIONS = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8')
  .replace(/’/g, "'")
  .replace(/\s+/g, ' ');

describe('Textes du courrier complément au portail (D-345, J3-12h lot 4)', () => {
  it.each([TITRE_COURRIER_COMPLEMENT, PHRASE_COURRIER_COMPLEMENT])(
    'consigné dans la décision du lot, au caractère près : « %s »',
    texte => expect(DECISIONS).toContain(texte.replace(/’/g, "'")),
  );

  it.each([
    TITRE_COURRIER_COMPLEMENT,
    PHRASE_COURRIER_COMPLEMENT,
    MENTION_INDISPONIBLE_COMPLEMENT,
    AUCUN_COURRIER_COMPLEMENT,
    ligneDestinataire('Médecin traitant'),
  ])('passe la garde de registre : « %s »', texte => expect(termeAnxiogene(texte)).toBeNull());

  it('le destinataire est recopié sans ajout', () => {
    expect(ligneDestinataire('Médecin traitant')).toBe('À remettre à : Médecin traitant');
  });
});
