import { describe, expect, it } from 'vitest';
import { lireIdentifiantRecherche } from './rechercheIdentifiant';

describe('lireIdentifiantRecherche — identifiant exact, jamais un motif', () => {
  it.each([
    ['WN-CL-0061-008', 'WN-CL-0061-008'],
    ['0061-008', 'WN-CL-0061-008'],
    ['wn-cl-0061-008', 'WN-CL-0061-008'],
    ['  0061-008  ', 'WN-CL-0061-008'],
    ['WN-CL-0059-010@v1.1', 'WN-CL-0059-010'],
    ['0059-010@1.0', 'WN-CL-0059-010'],
    ['wn-cl-0059-010@V1.1', 'WN-CL-0059-010'],
  ])('lit %j comme %s', (saisie, attendu) => {
    expect(lireIdentifiantRecherche(saisie)).toEqual({ ok: true, claimId: attendu });
  });

  it.each([
    '',
    '   ',
    'WN-CL-',
    'WN-CL-0061',
    '0061-08',
    '0061-00',
    '0061-0081',
    'WN-SRC-0061',
    '0061-008@x',
    '0061-008@',
    '0061-008@v1.1@v1.0',
    'WN-CL-0061-008 WN-CL-0061-009',
    '%0061-008',
  ])('refuse %j', (saisie) => {
    expect(lireIdentifiantRecherche(saisie)).toEqual({ ok: false });
  });
});
