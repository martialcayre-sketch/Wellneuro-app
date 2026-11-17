import { describe, expect, it } from 'vitest';
import {
  accepteSaisieSante,
  refusSaisieSante,
  RAISON_CIRCUIT_MINEUR,
  RAISON_DATE_NAISSANCE_REQUISE,
  statutAge,
  trancheMineur,
} from './gardeAge';

const LE_14_OCTOBRE_2026 = Date.UTC(2026, 9, 14, 12, 0, 0);

describe('statutAge — D-284 §3 et §4', () => {
  it('sans date, la date manque', () => {
    for (const valeur of [null, undefined, '', '   ']) {
      expect(statutAge(valeur, LE_14_OCTOBRE_2026), String(valeur)).toBe('date_manquante');
    }
  });

  it('★ une date illisible, irréelle ou future vaut une date manquante — jamais un majeur', () => {
    for (const valeur of ['14/03/1985', '1985-02-31', '2030-01-01', '85-03-14']) {
      expect(statutAge(valeur, LE_14_OCTOBRE_2026), valeur).toBe('date_manquante');
    }
  });

  it('★ 18 ans le jour même : majeur ; la veille de ses 18 ans : mineur', () => {
    expect(statutAge('2008-10-14', LE_14_OCTOBRE_2026)).toBe('majeur');
    expect(statutAge('2008-10-15', LE_14_OCTOBRE_2026)).toBe('mineur');
  });

  it('un adulte est majeur', () => {
    expect(statutAge('1985-03-14', LE_14_OCTOBRE_2026)).toBe('majeur');
  });
});

describe('trancheMineur — D-537 §4, plancher à 15 ans', () => {
  it('★ 15 ans le jour même : 15-17 ; la veille de ses 15 ans : moins de 15', () => {
    expect(trancheMineur('2011-10-14', LE_14_OCTOBRE_2026)).toBe('15_17');
    expect(trancheMineur('2011-10-15', LE_14_OCTOBRE_2026)).toBe('moins_15');
  });

  it('★ la veille de ses 18 ans : 15-17 ; un majeur ou une date illisible : aucune tranche', () => {
    expect(trancheMineur('2008-10-15', LE_14_OCTOBRE_2026)).toBe('15_17');
    expect(trancheMineur('2008-10-14', LE_14_OCTOBRE_2026)).toBeNull();
    for (const valeur of [null, undefined, '', '1985-02-31', '2030-01-01']) {
      expect(trancheMineur(valeur, LE_14_OCTOBRE_2026), String(valeur)).toBeNull();
    }
  });

  it('une tranche n’existe que pour un statut « mineur »', () => {
    for (const valeur of ['2015-01-01', '2010-06-30', '1985-03-14', null]) {
      expect(trancheMineur(valeur, LE_14_OCTOBRE_2026) !== null).toBe(
        statutAge(valeur, LE_14_OCTOBRE_2026) === 'mineur',
      );
    }
  });
});

describe('accepteSaisieSante et refusSaisieSante', () => {
  it('seul un majeur ouvre questionnaires et biologie', () => {
    expect(accepteSaisieSante('majeur')).toBe(true);
    expect(accepteSaisieSante('mineur')).toBe(false);
    expect(accepteSaisieSante('date_manquante')).toBe(false);
  });

  it('chaque cas fermé a sa raison, et le majeur n’en a aucune', () => {
    expect(refusSaisieSante('majeur')).toBeNull();
    expect(refusSaisieSante('date_manquante')?.reason).toBe(RAISON_DATE_NAISSANCE_REQUISE);
    expect(refusSaisieSante('mineur')?.reason).toBe(RAISON_CIRCUIT_MINEUR);
  });
});
