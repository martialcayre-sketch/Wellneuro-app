import { describe, expect, it } from 'vitest';
import { ouverturesMesEchanges } from './mesEchangesDrapeau';

// t14 : le jour d'ouverture se pose avec le drapeau ; un jour illisible ou à
// venir ne produit aucune mention.

const MAINTENANT = new Date('2026-10-19T09:00:00Z');

describe('ouverturesMesEchanges', () => {
  it('sans variable : aucune ouverture', () => {
    expect(ouverturesMesEchanges({}, MAINTENANT)).toEqual({});
  });

  it('chaque drapeau date sa propre espèce', () => {
    expect(ouverturesMesEchanges({ WN_FICHES_ASSIETTE_LECTURE_OUVERT_LE: '2026-10-02' }, MAINTENANT)).toEqual({
      fiche_assiette: '2026-10-02',
    });
    expect(ouverturesMesEchanges({ WN_LETTRE_ADRESSAGE_PATIENT_OUVERT_LE: '2026-10-19' }, MAINTENANT)).toEqual({
      lettre_adressage: '2026-10-19',
    });
  });

  it('un jour à venir (posé d’avance, coquille d’année) est ignoré', () => {
    expect(
      ouverturesMesEchanges(
        { WN_FICHES_ASSIETTE_LECTURE_OUVERT_LE: '2026-10-20', WN_LETTRE_ADRESSAGE_PATIENT_OUVERT_LE: '2062-10-02' },
        MAINTENANT,
      ),
    ).toEqual({});
  });

  it('« aujourd’hui » se juge en heure de Paris', () => {
    // 22 h 30 UTC le 19 = 0 h 30 à Paris le 20.
    expect(
      ouverturesMesEchanges({ WN_FICHES_ASSIETTE_LECTURE_OUVERT_LE: '2026-10-20' }, new Date('2026-10-19T22:30:00Z')),
    ).toEqual({ fiche_assiette: '2026-10-20' });
  });
});
