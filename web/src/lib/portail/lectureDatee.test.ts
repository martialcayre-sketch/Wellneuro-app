import { describe, expect, it } from 'vitest';
import { LU_SANS_DATE, TEXTE_LECTURE_DATEE, TITRE_LECTURE_DATEE, jourIso, libelleLecture } from './lectureDatee';

describe('le texte patient de D-297 §4', () => {
  it('est celui validé tel quel le 2026-10-14', () => {
    expect(TITRE_LECTURE_DATEE).toBe('Votre lecture est datée');
    expect(TEXTE_LECTURE_DATEE).toBe(
      'La première fois que vous ouvrez un document remis par votre praticien, le jour de cette lecture est enregistré et votre praticien le voit. Les ouvertures suivantes ne sont pas enregistrées. Cela ne déclenche aucune relance et ne dit pas quand vous êtes connecté.',
    );
  });
});

describe('ce que lit le praticien (D-297 §5)', () => {
  it('rien pour une version non ouverte — l’absence n’a pas de libellé', () => {
    expect(libelleLecture({ lu: false, luLe: null })).toBeNull();
    expect(libelleLecture({ lu: false, luLe: '2026-10-18' })).toBeNull();
  });

  it('« Lu, date non enregistrée » pour une lecture antérieure à la migration', () => {
    expect(libelleLecture({ lu: true, luLe: null })).toBe(LU_SANS_DATE);
    expect(LU_SANS_DATE).toBe('Lu, date non enregistrée');
  });

  it('« Lu le JJ/MM/AAAA » relit le jour posé par la base, sans décalage de fuseau', () => {
    expect(libelleLecture({ lu: true, luLe: '2026-10-18' })).toBe('Lu le 18/10/2026');
    expect(libelleLecture({ lu: true, luLe: '2026-01-01' })).toBe('Lu le 01/01/2026');
  });

  it('un jour illisible ne s’invente pas : il se lit « date non enregistrée »', () => {
    expect(libelleLecture({ lu: true, luLe: 'pas-un-jour' })).toBe(LU_SANS_DATE);
  });

  it('jourIso rend le jour d’une colonne DATE (minuit UTC) tel quel', () => {
    expect(jourIso(new Date('2026-10-18T00:00:00Z'))).toBe('2026-10-18');
    expect(jourIso(null)).toBeNull();
    expect(jourIso(new Date('invalide'))).toBeNull();
  });
});
