import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import { AUCUN_COURRIER, MENTION_INDISPONIBLE, MENTION_RETIREE, PHRASE_ACCOMPAGNEMENT, TITRE_LETTRE } from './textesLettre';

// [[D-262]], LOT-03a. La phrase d'accompagnement est SIGNÉE (cadrage §4) : elle
// est relue dans le cadrage et doit y figurer au caractère près. Toute la prose
// patient de la surface passe la garde de registre ([[D-189]] §4) — la lettre,
// elle, en est exemptée par décision (cadrage §3.4).

const CADRAGE = readFileSync(
  path.join(process.cwd(), '..', 'docs', 'claude', 'campagnes', 'CADRAGE_LETTRE_ADRESSAGE_PATIENT_2026-10-03.md'),
  'utf8',
);

/** Le §4 du cadrage, citation markdown dépliée en une ligne. */
function citationSignee(): { titre: string; phrase: string } {
  const section = CADRAGE.slice(CADRAGE.indexOf('## 4.'), CADRAGE.indexOf('## 5.'));
  const lignes = section.split('\n').filter(l => l.startsWith('>')).map(l => l.replace(/^>\s?/, ''));
  const titre = lignes.find(l => l.startsWith('**'))!.replace(/\*\*/g, '');
  const phrase = lignes.filter(l => l && !l.startsWith('**')).join(' ');
  return { titre, phrase };
}

describe('Textes du courrier pour le médecin (D-262, LOT-03a)', () => {
  it('le titre et la phrase sont ceux signés au cadrage, au caractère près', () => {
    const signee = citationSignee();
    expect(TITRE_LETTRE).toBe(signee.titre);
    expect(PHRASE_ACCOMPAGNEMENT.replace(/’/g, "'")).toBe(signee.phrase.replace(/’/g, "'"));
  });

  it.each([TITRE_LETTRE, PHRASE_ACCOMPAGNEMENT, MENTION_RETIREE, MENTION_INDISPONIBLE, AUCUN_COURRIER])(
    'passe la garde de registre : « %s »',
    texte => expect(termeAnxiogene(texte)).toBeNull(),
  );
});
