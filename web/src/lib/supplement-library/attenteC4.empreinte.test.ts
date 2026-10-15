import { describe, expect, it } from 'vitest';

import { canonicalSha256 } from '../clinical-engine/canonical';
import { LIBELLE_ATTENTE_NON_TYPEE, estAttenteTypee } from '../clinical-engine/types';
import { lireConditionBiologique } from './decisionAvantBiologie';

// LE BANC D'EMPREINTE C4 DE [[D-305]] §2 et §6, qui n'existait pas.
//
// L'attente née d'une règle de compléments gagne le même champ facultatif que
// celle d'une action de protocole, avec le même lecteur tolérant ([[D-142]] :
// un seul lecteur par véhicule). La valeur figée ci-dessous est MESURÉE sur le
// code d'avant le champ (sonde jetable rejouée sur `origin/main` au 2026-10-15,
// 7a5969c3) : la lecture d'une condition sans codes rend la même forme, octet
// pour octet. Elle rougit si le champ fuit dans une lecture qui ne le porte pas.

const EMPREINTE_C4_SANS_CODES = 'a350148c058a99ace2b96ff066ea626f321db0c6c1f10e14953e01b0ebe29539';

const CONDITION_ENREGISTREE = {
  type: 'biologie',
  cible: 'ferritine',
  echeance: '2026-03-01T00:00:00.000Z',
};

describe('Attente C4 — banc d’empreinte (`D-305`)', () => {
  it('une condition enregistrée sans codes se lit comme avant, empreinte intacte', () => {
    const lue = lireConditionBiologique(CONDITION_ENREGISTREE);
    expect(canonicalSha256(lue)).toBe(EMPREINTE_C4_SANS_CODES);
    expect(lue).toEqual({ forme: 'biologie', waitFor: CONDITION_ENREGISTREE });
  });

  it('elle se lit « non typée » — l’atelier n’en saisit pas (arbitrage 2 A)', () => {
    const lue = lireConditionBiologique(CONDITION_ENREGISTREE);
    if (lue.forme !== 'biologie') throw new Error('lecture attendue');
    expect(estAttenteTypee(lue.waitFor)).toBe(false);
    expect(LIBELLE_ATTENTE_NON_TYPEE).toContain('aucun résultat ne la réveille');
  });

  it('des codes nuls se lisent comme absents — le lecteur tolérant', () => {
    const lue = lireConditionBiologique({ ...CONDITION_ENREGISTREE, analyteCodes: null });
    expect(canonicalSha256(lue)).toBe(EMPREINTE_C4_SANS_CODES);
  });

  it('la même condition, typée, change d’empreinte et se lit typée', () => {
    const lue = lireConditionBiologique({
      ...CONDITION_ENREGISTREE, analyteCodes: ['BIO_TSH', ' BIO_FERRITINE', 'BIO_TSH'],
    });
    expect(canonicalSha256(lue)).not.toBe(EMPREINTE_C4_SANS_CODES);
    if (lue.forme !== 'biologie') throw new Error('lecture attendue');
    expect(lue.waitFor.analyteCodes).toEqual(['BIO_FERRITINE', 'BIO_TSH']);
    expect(estAttenteTypee(lue.waitFor)).toBe(true);
  });

  // PRÉSENTS, LES CODES SONT BIEN FORMÉS OU LA CONDITION EST ILLISIBLE : une
  // liste malformée lue comme absente ferait taire en silence ce que la règle
  // voulait attendre — et une condition illisible est un refus, jamais une
  // règle inconditionnelle.
  it.each([
    ['liste vide', []],
    ['code vide', ['BIO_FERRITINE', '  ']],
    ['code non textuel', [42]],
    ['chaîne au lieu d’une liste', 'BIO_FERRITINE'],
  ])('une liste malformée rend la condition illisible (%s)', (_l, analyteCodes) => {
    expect(lireConditionBiologique({ ...CONDITION_ENREGISTREE, analyteCodes }))
      .toEqual({ forme: 'illisible' });
  });
});
