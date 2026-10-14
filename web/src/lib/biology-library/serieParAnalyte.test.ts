import { describe, expect, it } from 'vitest';
import { positionDansLeSuivi, serieParAnalyte, type JourZeroDeSuivi, type LigneDeSerie } from './serieParAnalyte';

// BP-03 : la série des mesures qui font foi. Fixtures neutres — elles prouvent
// le mécanisme, pas un parcours (`D-125`).

function ligne(p: Partial<LigneDeSerie> & { id: string }): LigneDeSerie {
  return {
    analyteCode: 'BIO_FERRITINE',
    preleveLe: '2026-09-01T06:00:00.000Z',
    saisiLe: '2026-09-02T08:00:00.000Z',
    supersedesResultatId: null,
    valeur: '42.5',
    unite: 'µg/L',
    laboratoire: 'Laboratoire A',
    ...p,
  };
}

const AUCUNE = new Map<string, unknown>();
const SANS_DIFFUSION: JourZeroDeSuivi[] = [];

function ids(series: ReturnType<typeof serieParAnalyte>, code = 'BIO_FERRITINE'): string[] {
  return series.find(s => s.analyteCode === code)?.points.map(p => p.ligne.id) ?? [];
}

describe('serieParAnalyte — une tête par fil, les fils annulés exclus', () => {
  it('la tête seule sort, avec sa date de correction ; l’entrée au dossier est celle de la racine', () => {
    const [serie] = serieParAnalyte([
      ligne({ id: 'r', saisiLe: '2026-09-02T08:00:00.000Z' }),
      ligne({ id: 'c1', valeur: '45', saisiLe: '2026-09-03T08:00:00.000Z', supersedesResultatId: 'r' }),
      ligne({ id: 'c2', valeur: '46', saisiLe: '2026-09-04T08:00:00.000Z', supersedesResultatId: 'c1' }),
    ], AUCUNE, SANS_DIFFUSION);
    expect(serie.points).toHaveLength(1);
    expect(serie.points[0]).toMatchObject({
      ligne: { id: 'c2', valeur: '46', preleveLe: '2026-09-01T06:00:00.000Z' },
      entreeLe: '2026-09-02T08:00:00.000Z',
      correctionLe: '2026-09-04T08:00:00.000Z',
    });
  });

  it('une saisie jamais corrigée n’a pas de date de correction', () => {
    const [serie] = serieParAnalyte([ligne({ id: 'r' })], AUCUNE, SANS_DIFFUSION);
    expect(serie.points[0]).toMatchObject({ entreeLe: '2026-09-02T08:00:00.000Z', correctionLe: null });
  });

  it('un fil annulé est absent ; révoqué (l’annulation n’est plus active), il revient', () => {
    const lignes = [
      ligne({ id: 'a', preleveLe: '2026-08-01T06:00:00.000Z' }),
      ligne({ id: 'b', preleveLe: '2026-09-01T06:00:00.000Z' }),
      ligne({ id: 'b2', preleveLe: '2026-09-01T06:00:00.000Z', saisiLe: '2026-09-05T08:00:00.000Z', supersedesResultatId: 'b' }),
    ];
    // Annulation portée par une ligne DÉPASSÉE du fil : tout le fil sort.
    expect(ids(serieParAnalyte(lignes, new Map([['b', { id: 'ann' }]]), SANS_DIFFUSION))).toEqual(['a']);
    expect(ids(serieParAnalyte(lignes, AUCUNE, SANS_DIFFUSION))).toEqual(['a', 'b2']);
  });

  it('une clé qui porte un fil annulé et un fil vivant ne rend que le vivant', () => {
    const lignes = [
      ligne({ id: 'annulee', valeur: '420' }),
      ligne({ id: 'neuve', valeur: '42', saisiLe: '2026-09-06T08:00:00.000Z' }),
    ];
    const [serie] = serieParAnalyte(lignes, new Map([['annulee', { id: 'ann' }]]), SANS_DIFFUSION);
    expect(serie.points.map(p => p.ligne.id)).toEqual(['neuve']);
  });

  it('toutes les mesures d’un analyte annulées : l’analyte n’a pas de série', () => {
    expect(serieParAnalyte([ligne({ id: 'a' })], new Map([['a', {}]]), SANS_DIFFUSION)).toEqual([]);
  });

  it('une fourche ne rend qu’UNE tête, celle de `correctionsParLigne`', () => {
    const [serie] = serieParAnalyte([
      ligne({ id: 'r' }),
      ligne({ id: 'f1', saisiLe: '2026-09-03T08:00:00.000Z', supersedesResultatId: 'r' }),
      ligne({ id: 'f2', saisiLe: '2026-09-04T08:00:00.000Z', supersedesResultatId: 'r' }),
    ], AUCUNE, SANS_DIFFUSION);
    expect(serie.points.map(p => p.ligne.id)).toEqual(['f2']);
    expect(serie.points[0].entreeLe).toBe('2026-09-02T08:00:00.000Z');
  });

  it('ordre : prélèvement, puis saisie, puis identifiant — quel que soit l’ordre d’entrée', () => {
    const lignes = [
      ligne({ id: 'z', preleveLe: '2026-09-01T06:00:00.000Z', saisiLe: '2026-09-02T08:00:00.000Z' }),
      ligne({ id: 'y', preleveLe: '2026-09-01T06:00:00.000Z', saisiLe: '2026-09-02T08:00:00.000Z' }),
      ligne({ id: 'x', preleveLe: '2026-09-01T06:00:00.000Z', saisiLe: '2026-09-01T09:00:00.000Z' }),
      ligne({ id: 'w', preleveLe: '2026-06-01T06:00:00.000Z', saisiLe: '2026-10-01T08:00:00.000Z' }),
    ];
    expect(ids(serieParAnalyte(lignes, AUCUNE, SANS_DIFFUSION))).toEqual(['w', 'x', 'y', 'z']);
    expect(ids(serieParAnalyte([...lignes].reverse(), AUCUNE, SANS_DIFFUSION))).toEqual(['w', 'x', 'y', 'z']);
  });

  it('une série par analyte, dans l’ordre des codes', () => {
    const series = serieParAnalyte([
      ligne({ id: 'a', analyteCode: 'BIO_VITD' }),
      ligne({ id: 'b', analyteCode: 'BIO_CRP_US' }),
    ], AUCUNE, SANS_DIFFUSION);
    expect(series.map(s => s.analyteCode)).toEqual(['BIO_CRP_US', 'BIO_VITD']);
  });

  it('la valeur sort telle que la base la porte, sans arrondi', () => {
    const [serie] = serieParAnalyte([ligne({ id: 'a', valeur: '0.30000000000000004' })], AUCUNE, SANS_DIFFUSION);
    expect(serie.points[0].ligne.valeur).toBe('0.30000000000000004');
  });

  it('aucune donnée numérique n’est dérivée : ni écart, ni tendance', () => {
    const [serie] = serieParAnalyte([
      ligne({ id: 'a', preleveLe: '2026-08-01T06:00:00.000Z', valeur: '30' }),
      ligne({ id: 'b', valeur: '60' }),
    ], AUCUNE, SANS_DIFFUSION);
    expect(Object.keys(serie).sort()).toEqual(['analyteCode', 'motifs', 'points']);
    for (const point of serie.points) {
      expect(Object.keys(point).sort()).toEqual(['correctionLe', 'entreeLe', 'ligne', 'position']);
    }
  });
});

describe('serieParAnalyte — motifs de non-comparabilité, comparés à l’identique', () => {
  const motifs = (lignes: LigneDeSerie[]) => serieParAnalyte(lignes, AUCUNE, SANS_DIFFUSION)[0].motifs;
  const deux = (b: Partial<LigneDeSerie> = {}) => [
    ligne({ id: 'a', preleveLe: '2026-08-01T06:00:00.000Z' }),
    ligne({ id: 'b', ...b }),
  ];

  it('un point seul', () => {
    expect(motifs([ligne({ id: 'a' })])).toEqual(['point_unique', 'contexte_non_renseigne']);
  });

  it('même unité, même laboratoire : reste le contexte, toujours non renseigné', () => {
    expect(motifs(deux())).toEqual(['contexte_non_renseigne']);
  });

  it('deux graphies d’une même unité sont deux unités', () => {
    expect(motifs(deux({ unite: 'ng/mL' }))).toEqual(['unites_differentes', 'contexte_non_renseigne']);
  });

  it('une unité absente diffère d’une unité présente', () => {
    expect(motifs(deux({ unite: null }))).toEqual(['unites_differentes', 'contexte_non_renseigne']);
  });

  it('laboratoire non identifié (saisie manuelle, ou import sans laboratoire lu)', () => {
    expect(motifs(deux({ laboratoire: null }))).toEqual(['laboratoire_non_identifie', 'contexte_non_renseigne']);
  });

  it('laboratoires différents, textes lus comparés tels quels', () => {
    expect(motifs(deux({ laboratoire: 'laboratoire a' }))).toEqual(['laboratoires_differents', 'contexte_non_renseigne']);
  });

  it('motifs combinés', () => {
    expect(motifs([
      ligne({ id: 'a', preleveLe: '2026-07-01T06:00:00.000Z' }),
      ligne({ id: 'b', preleveLe: '2026-08-01T06:00:00.000Z', laboratoire: 'Laboratoire B', unite: 'ng/mL' }),
      ligne({ id: 'c', laboratoire: null }),
    ])).toEqual(['unites_differentes', 'laboratoire_non_identifie', 'laboratoires_differents', 'contexte_non_renseigne']);
  });
});

describe('positionDansLeSuivi — jour n, en jours calendaires de Paris', () => {
  const J0 = { jourZero: new Date('2026-09-01T08:00:00.000Z'), approbationId: 'a' };
  const PIVOT = { jourZero: new Date('2026-09-20T08:00:00.000Z'), approbationId: 'b' };

  it('aucune diffusion : aucun jour n', () => {
    expect(positionDansLeSuivi('2026-09-10T06:00:00.000Z', [])).toEqual({ type: 'aucune_diffusion' });
  });

  it('le jour de la diffusion, même avant l’heure, est le jour 0', () => {
    expect(positionDansLeSuivi('2026-09-01T05:00:00.000Z', [J0])).toEqual({
      type: 'jour',
      jour: 0,
      jourZero: '2026-09-01T08:00:00.000Z',
    });
  });

  it('antérieur à la première diffusion', () => {
    expect(positionDansLeSuivi('2026-08-31T06:00:00.000Z', [J0, PIVOT])).toEqual({
      type: 'anterieur',
      jourZero: '2026-09-01T08:00:00.000Z',
    });
  });

  it('un pivot ne recompte pas un prélèvement antérieur : il se date par la diffusion d’alors', () => {
    expect(positionDansLeSuivi('2026-09-10T06:00:00.000Z', [J0, PIVOT])).toMatchObject({ jour: 9, jourZero: J0.jourZero.toISOString() });
    expect(positionDansLeSuivi('2026-09-25T06:00:00.000Z', [J0, PIVOT])).toMatchObject({ jour: 5, jourZero: PIVOT.jourZero.toISOString() });
  });

  it('fin de journée à Paris : le jour civil de Paris fait foi, pas celui d’UTC', () => {
    // Diffusion le 1er octobre à 23 h 30 à Paris ; prélèvement le 2 à 7 h :
    // sept heures et demie plus tard, mais le lendemain.
    const tardive = { jourZero: new Date('2026-10-01T21:30:00.000Z'), approbationId: 't' };
    expect(positionDansLeSuivi('2026-10-02T05:00:00.000Z', [tardive])).toMatchObject({ jour: 1 });
    // Diffusion à 0 h 30 à Paris le 2 (encore le 1er en UTC) ; prélèvement à
    // 1 h, le 2 aussi : même jour civil de Paris.
    const nocturne = { jourZero: new Date('2026-10-01T22:30:00.000Z'), approbationId: 'n' };
    expect(positionDansLeSuivi('2026-10-01T23:00:00.000Z', [nocturne])).toMatchObject({ jour: 0 });
  });

  it('la série porte la position de chaque point, jours 0 non triés compris', () => {
    const [serie] = serieParAnalyte([
      ligne({ id: 'avant', preleveLe: '2026-08-15T06:00:00.000Z' }),
      ligne({ id: 'apres', preleveLe: '2026-09-22T06:00:00.000Z' }),
    ], AUCUNE, [PIVOT, J0]);
    expect(serie.points.map(p => p.position)).toEqual([
      { type: 'anterieur', jourZero: '2026-09-01T08:00:00.000Z' },
      { type: 'jour', jour: 2, jourZero: '2026-09-20T08:00:00.000Z' },
    ]);
  });
});
