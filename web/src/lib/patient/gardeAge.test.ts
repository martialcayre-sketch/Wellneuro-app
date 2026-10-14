import { describe, expect, it } from 'vitest';
import {
  accepteSaisieSante,
  refusSaisieSante,
  RAISON_CIRCUIT_MINEUR,
  RAISON_DATE_NAISSANCE_REQUISE,
  statutAge,
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
