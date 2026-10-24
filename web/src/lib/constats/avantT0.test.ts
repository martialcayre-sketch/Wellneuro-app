import { describe, expect, it } from 'vitest';
import { agregerConstatAvantT0, type DossierSansT0 } from './avantT0';

const dossier = (manquantes: string[], ancienneteJours: number | null = 10): DossierSansT0 => ({ manquantes, ancienneteJours });
const n = (nombre: number, fabrique: () => DossierSansT0) => Array.from({ length: nombre }, fabrique);

describe('agregerConstatAvantT0 (H07, D-298)', () => {
  it('un zéro reste affiché : il ne décrit personne', () => {
    expect(agregerConstatAvantT0(0, [])).toEqual({
      effectif: 0, avecT0: 0, sansT0: 0, bloques: 0, prets: 0, parCondition: {}, ancienneteBloques: 'masqué',
    });
  });

  it('l’effectif reste affiché, chaque part de un à quatre dossiers est masquée', () => {
    const constat = agregerConstatAvantT0(3, [dossier(['rideau_t0']), dossier([])]);
    expect(constat.effectif).toBe(5);
    expect(constat).toMatchObject({ avecT0: 'masqué', sansT0: 'masqué', bloques: 'masqué', prets: 'masqué' });
    expect(constat.parCondition).toEqual({ rideau_t0: 'masqué' });
  });

  it('au-dessus du seuil, tout est servi, et un dossier compte une fois par condition', () => {
    const constat = agregerConstatAvantT0(6, [
      ...n(6, () => dossier(['rideau_t0', 'rideau_t0', 'synthese_validee'])),
      ...n(5, () => dossier([])),
    ]);
    expect(constat).toMatchObject({ effectif: 17, avecT0: 6, sansT0: 11, bloques: 6, prets: 5 });
    expect(constat.parCondition).toEqual({ rideau_t0: 6, synthese_validee: 6 });
  });

  it('une condition rare est masquée seule quand la partition est servie', () => {
    const constat = agregerConstatAvantT0(5, [...n(6, () => dossier(['rideau_t0'])), dossier(['anamnese_consignee', 'rideau_t0']), ...n(5, () => dossier([]))]);
    expect(constat.parCondition).toEqual({ anamnese_consignee: 'masqué', rideau_t0: 7 });
  });

  it('une part masquée masque l’autre : elle se déduirait par soustraction', () => {
    const constat = agregerConstatAvantT0(8, [...n(7, () => dossier(['rideau_t0'])), ...n(3, () => dossier([]))]);
    expect(constat.sansT0).toBe(10);
    expect(constat).toMatchObject({ bloques: 'masqué', prets: 'masqué' });
    // Un motif partagé par tous les bloqués rendrait leur nombre exact.
    expect(constat.parCondition).toEqual({ rideau_t0: 'masqué' });
  });

  it('sans T0 masqué, bloqués et prêts le sont aussi : leur somme le rendrait', () => {
    const constat = agregerConstatAvantT0(2, [...n(6, () => dossier(['rideau_t0'])), ...n(6, () => dossier([]))]);
    expect(constat).toMatchObject({ avecT0: 'masqué', sansT0: 'masqué', bloques: 'masqué', prets: 'masqué' });
    expect(constat.parCondition).toEqual({ rideau_t0: 'masqué' });
  });

  it('l’ancienneté des bloqués se décrit par ses quartiles, masquée sous cinq dossiers datés', () => {
    const constat = agregerConstatAvantT0(5, [
      ...[0, 5, 10, 20, 40, 80].map(j => dossier(['rideau_t0'], j)),
      dossier(['rideau_t0'], null),
      ...n(5, () => dossier([])),
    ]);
    expect(constat.ancienneteBloques).toEqual({ q1: 5, mediane: 10, q3: 40 });
    const peu = agregerConstatAvantT0(5, [...[1, 2, 3, 4].map(j => dossier(['rideau_t0'], j)), ...n(3, () => dossier(['rideau_t0'], null)), ...n(5, () => dossier([]))]);
    expect(peu.ancienneteBloques).toBe('masqué');
  });
});
