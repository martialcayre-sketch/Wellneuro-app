import { describe, expect, it } from 'vitest';
import {
  construirePlancheBiologie,
  construirePlanchePassations,
  type PassationLuePlanche,
} from './plancheEvolution';

const p = (idReponse: string, idQuestionnaire: string, iso: string, extra: Partial<PassationLuePlanche> = {}) => ({
  idReponse,
  idQuestionnaire,
  titre: idQuestionnaire === 'Q_B' ? 'Bêta' : 'Alpha',
  dateReponse: new Date(iso),
  statutValidite: 'VALID',
  scorePrincipal: 10,
  interpretation: 'Libellé',
  nonInterpretable: null,
  ...extra,
});

describe('construirePlanchePassations (OF-2, D-560)', () => {
  const episodes = [
    { id: 'e0', milestone: 'T0' as const, confirmedAt: new Date('2026-01-01T10:00:00Z'), idsReponsesIncluses: ['a1', 'b1'] },
    { id: 'e1', milestone: 'J21' as const, confirmedAt: new Date('2026-02-01T10:00:00Z'), idsReponsesIncluses: ['a2'] },
  ];

  it('une colonne par épisode, une ligne par instrument ; case vide = jalon non mesuré', () => {
    const planche = construirePlanchePassations(episodes, [
      p('a1', 'Q_A', '2025-12-30T10:00:00Z'),
      p('b1', 'Q_B', '2025-12-30T11:00:00Z'),
      p('a2', 'Q_A', '2026-01-30T10:00:00Z', { scorePrincipal: 7 }),
    ]);
    expect(planche.colonnes.map((c) => c.milestone)).toEqual(['T0', 'J21']);
    expect(planche.lignes.map((l) => l.titre)).toEqual(['Alpha', 'Bêta']);
    expect(planche.lignes[0].cases.map((c) => c.map((x) => x.score))).toEqual([[10], [7]]);
    // Bêta n'a rien à J21 : un tableau vide, jamais un 0.
    expect(planche.lignes[1].cases[1]).toEqual([]);
    expect(planche.introuvablesParColonne).toEqual([0, 0]);
  });

  it('aucun champ d’écart, de tendance ni de qualification n’est produit', () => {
    const planche = construirePlanchePassations(episodes, [
      p('a1', 'Q_A', '2025-12-30T10:00:00Z'),
      p('a2', 'Q_A', '2026-01-30T10:00:00Z', { scorePrincipal: 3 }),
    ]);
    expect(JSON.stringify(planche)).not.toMatch(/ecart|delta|tendance|stable|amelior/i);
  });

  it('une passation non interprétable perd score et libellé, garde son motif', () => {
    const planche = construirePlanchePassations(episodes, [
      p('a1', 'Q_A', '2025-12-30T10:00:00Z', { nonInterpretable: 'motif' }),
    ]);
    expect(planche.lignes[0].cases[0][0]).toMatchObject({ score: null, interpretation: null, nonInterpretable: 'motif' });
  });

  it('une passation hors raisonnement est montrée, marquée par son statut nommé, jamais cachée', () => {
    const planche = construirePlanchePassations(episodes, [
      p('a1', 'Q_A', '2025-12-30T10:00:00Z', { statutValidite: 'SUPERSEDED' }),
      p('a2', 'Q_A', '2026-01-30T10:00:00Z', { statutValidite: 'AMBIGUOUS' }),
    ]);
    expect(planche.lignes[0].cases[0][0]).toMatchObject({ statutExclu: 'SUPERSEDED', ambigue: false });
    expect(planche.lignes[0].cases[1][0]).toMatchObject({ statutExclu: null, ambigue: true });
  });

  it('deux cycles : les colonnes se suivent par date de confirmation, chacune sous son nom', () => {
    const planche = construirePlanchePassations(
      [
        ...episodes,
        { id: 'e2', milestone: 'T1' as const, confirmedAt: new Date('2026-05-01T10:00:00Z'), idsReponsesIncluses: ['a3'] },
        { id: 'e3', milestone: 'J21' as const, confirmedAt: new Date('2026-06-01T10:00:00Z'), idsReponsesIncluses: [] },
      ],
      [p('a1', 'Q_A', '2025-12-30T10:00:00Z'), p('a2', 'Q_A', '2026-01-30T10:00:00Z'), p('a3', 'Q_A', '2026-04-30T10:00:00Z')],
    );
    expect(planche.colonnes.map((c) => c.milestone)).toEqual(['T0', 'J21', 'T1', 'J21']);
    expect(planche.lignes[0].cases.map((c) => c.length)).toEqual([1, 1, 1, 0]);
  });

  it('une passation retenue mais absente du dossier est comptée, pas comblée', () => {
    const planche = construirePlanchePassations(episodes, [p('a1', 'Q_A', '2025-12-30T10:00:00Z')]);
    expect(planche.introuvablesParColonne).toEqual([1, 1]);
    expect(planche.lignes).toHaveLength(1);
  });
});

describe('construirePlancheBiologie (D-560, question 20261125-1435-a-2)', () => {
  const libelles = new Map([
    ['FER', 'Ferritine'],
    ['VITD', 'Vitamine D'],
  ]);

  it('une ligne par analyte et par unité, ordonnée par date de prélèvement, jamais convertie', () => {
    const lignes = construirePlancheBiologie(
      [
        {
          analyteCode: 'VITD',
          points: [
            { idResultat: 'v2', valeur: '75', unite: 'nmol/L', preleveLe: '2026-03-01T08:00:00Z' },
            { idResultat: 'v1', valeur: '30', unite: 'µg/L', preleveLe: '2026-01-01T08:00:00Z' },
            { idResultat: 'v3', valeur: '80', unite: 'nmol/L', preleveLe: '2026-02-01T08:00:00Z' },
          ],
        },
        { analyteCode: 'FER', points: [{ idResultat: 'f1', valeur: '50', unite: 'µg/L', preleveLe: '2026-01-01T08:00:00Z' }] },
      ],
      libelles,
    );
    expect(lignes.every((l) => l.motifs.length === 0)).toBe(true);
    expect(lignes.map((l) => [l.libelle, l.unite, l.unitesMelees, l.points.map((x) => x.valeur)])).toEqual([
      ['Ferritine', 'µg/L', false, ['50']],
      ['Vitamine D', 'nmol/L', true, ['80', '75']],
      ['Vitamine D', 'µg/L', true, ['30']],
    ]);
  });

  it('les motifs de la série sont repris sur chaque ligne, hors « unités différentes »', () => {
    const lignes = construirePlancheBiologie(
      [
        {
          analyteCode: 'FER',
          motifs: ['unites_differentes', 'laboratoires_differents', 'contexte_non_renseigne'],
          points: [
            { idResultat: 'f1', valeur: '50', unite: 'µg/L', preleveLe: '2026-01-01T08:00:00Z' },
            { idResultat: 'f2', valeur: '60', unite: 'ng/mL', preleveLe: '2026-02-01T08:00:00Z' },
          ],
        },
      ],
      libelles,
    );
    expect(lignes.map((l) => l.motifs)).toEqual([
      ['laboratoires_differents', 'contexte_non_renseigne'],
      ['laboratoires_differents', 'contexte_non_renseigne'],
    ]);
  });

  it('une unité non renseignée forme sa propre ligne', () => {
    const lignes = construirePlancheBiologie(
      [
        {
          analyteCode: 'FER',
          points: [
            { idResultat: 'f1', valeur: '50', unite: 'µg/L', preleveLe: '2026-01-01T08:00:00Z' },
            { idResultat: 'f2', valeur: '60', unite: null, preleveLe: '2026-02-01T08:00:00Z' },
          ],
        },
      ],
      libelles,
    );
    expect(lignes.map((l) => l.unite)).toEqual([null, 'µg/L']);
    expect(lignes.every((l) => l.unitesMelees)).toBe(true);
  });
});
