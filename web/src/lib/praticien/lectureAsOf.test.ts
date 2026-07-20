import { describe, expect, it } from 'vitest';
import { construireReperes, resoudreAsOf, tronquerA, type Repere } from './lectureAsOf';

const episode = (milestone: string, iso: string) => ({ milestone, confirmedAt: new Date(iso) });
const reponse = (idQuestionnaire: string, iso: string) => ({ idQuestionnaire, dateReponse: new Date(iso) });

describe('construireReperes', () => {
  it('trie du plus récent au plus ancien, toutes sources confondues', () => {
    const reperes = construireReperes({
      episodes: [episode('T0', '2026-02-01T00:00:00.000Z')],
      reponses: [reponse('Q_A', '2026-01-01T00:00:00.000Z'), reponse('Q_B', '2026-03-01T00:00:00.000Z')],
    });
    expect(reperes.map((r) => r.source)).toEqual(['reponse', 'episode', 'reponse']);
    expect(reperes[0].date).toBe('2026-03-01T00:00:00.000Z');
  });

  it('à instant identique, l’épisode prime sur la réponse qui le nourrit', () => {
    const reperes = construireReperes({
      episodes: [episode('T0', '2026-02-01T00:00:00.000Z')],
      reponses: [reponse('Q_A', '2026-02-01T00:00:00.000Z')],
    });
    expect(reperes).toHaveLength(1);
    expect(reperes[0].source).toBe('episode');
  });

  it('écarte une date illisible plutôt que de la ranger en tête', () => {
    const reperes = construireReperes({
      episodes: [episode('T0', 'pas-une-date')],
      reponses: [reponse('Q_A', '2026-01-01T00:00:00.000Z')],
    });
    expect(reperes).toHaveLength(1);
    expect(reperes[0].source).toBe('reponse');
  });

  it('aucune donnée → aucun repère', () => {
    expect(construireReperes({ episodes: [], reponses: [] })).toEqual([]);
  });
});

describe('resoudreAsOf', () => {
  const reperes: Repere[] = [
    { date: '2026-02-01T00:00:00.000Z', source: 'episode', libelle: 'Épisode T0 confirmé' },
  ];

  it('paramètre absent → présent, comportement historique inchangé', () => {
    expect(resoudreAsOf(null, reperes)).toEqual({ mode: 'present' });
    expect(resoudreAsOf(undefined, reperes)).toEqual({ mode: 'present' });
    expect(resoudreAsOf('', reperes)).toEqual({ mode: 'present' });
  });

  it('repère connu → lecture passée à cet instant', () => {
    const resolution = resoudreAsOf('2026-02-01T00:00:00.000Z', reperes);
    expect(resolution).toMatchObject({ mode: 'passe' });
  });

  it('date arbitraire → refus, jamais un rabattement silencieux sur le présent', () => {
    expect(resoudreAsOf('2026-02-02T00:00:00.000Z', reperes)).toEqual({
      mode: 'refus',
      raison: 'hors_reperes',
    });
  });

  it('date illisible → refus explicite', () => {
    expect(resoudreAsOf('hier', reperes)).toEqual({ mode: 'refus', raison: 'invalide' });
  });

  it('sans repère connu, aucune date passée n’est acceptée', () => {
    expect(resoudreAsOf('2026-02-01T00:00:00.000Z', [])).toEqual({
      mode: 'refus',
      raison: 'hors_reperes',
    });
  });
});

describe('tronquerA', () => {
  const lignes = [
    { dateReponse: new Date('2026-01-01T00:00:00.000Z'), id: 'avant' },
    { dateReponse: new Date('2026-02-01T00:00:00.000Z'), id: 'pile' },
    { dateReponse: new Date('2026-03-01T00:00:00.000Z'), id: 'apres' },
  ];

  it('sans borne, la liste est rendue telle quelle', () => {
    expect(tronquerA(lignes, null)).toHaveLength(3);
  });

  it('la borne est inclusive : l’événement du jour lu en fait partie', () => {
    expect(tronquerA(lignes, new Date('2026-02-01T00:00:00.000Z')).map((l) => l.id)).toEqual([
      'avant',
      'pile',
    ]);
  });

  it('aucune donnée postérieure ne peut fuir dans un état passé', () => {
    expect(tronquerA(lignes, new Date('2026-01-15T00:00:00.000Z')).map((l) => l.id)).toEqual(['avant']);
  });

  it('une date illisible est omise plutôt qu’affichée dans un passé où elle n’existait pas', () => {
    const avecKo = [...lignes, { dateReponse: new Date('nawak'), id: 'ko' }];
    expect(tronquerA(avecKo, new Date('2026-03-01T00:00:00.000Z')).map((l) => l.id)).toEqual([
      'avant',
      'pile',
      'apres',
    ]);
  });
});
