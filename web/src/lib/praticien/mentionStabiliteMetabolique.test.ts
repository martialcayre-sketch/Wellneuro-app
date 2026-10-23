import { describe, expect, it } from 'vitest';

import { MENTION_POIDS_NON_MOTIVE, mentionSourcesStabilite } from './mentionStabiliteMetabolique';

// [[D-333]] §3 : la stabilité nomme les sources présentes et celle qui manque,
// jamais « deux instruments » quand une seule source est là.
describe('mentionSourcesStabilite', () => {
  const sources = (q1: boolean, q2: boolean) => [
    { idQuestionnaire: 'Q_INF_01', presente: q1 },
    { idQuestionnaire: 'Q_INF_02', presente: q2 },
  ];

  it('deux sources présentes : la moyenne à poids égal, les deux nommées', () => {
    expect(mentionSourcesStabilite(sources(true, true))).toBe(
      'Moyenne à poids égal : Hyperexcitabilité SIIN (Q_INF_01) et Magnésium / spasmophilie SIIN (Q_INF_02)',
    );
  });

  it('Q_INF_01 seule : la source présente, puis celle qui manque', () => {
    expect(mentionSourcesStabilite(sources(true, false))).toBe(
      'Sur Hyperexcitabilité SIIN (Q_INF_01) seule ; manque Magnésium / spasmophilie SIIN (Q_INF_02)',
    );
  });

  it('Q_INF_02 seule : la source présente, puis celle qui manque', () => {
    expect(mentionSourcesStabilite(sources(false, true))).toBe(
      'Sur Magnésium / spasmophilie SIIN (Q_INF_02) seule ; manque Hyperexcitabilité SIIN (Q_INF_01)',
    );
  });

  it('aucune source : rien à dire, la tuile dit « Non mesuré »', () => {
    expect(mentionSourcesStabilite(sources(false, false))).toBeNull();
  });

  it('jamais « deux instruments », ni aucun mot qui juge la valeur', () => {
    for (const [q1, q2] of [[true, true], [true, false], [false, true]] as const) {
      const texte = `${MENTION_POIDS_NON_MOTIVE} ${mentionSourcesStabilite(sources(q1, q2))}`;
      expect(texte).not.toMatch(/deux instruments/i);
      expect(texte).not.toMatch(/bon|mauvais|faible|élevé|normal|anormal|risque/i);
    }
  });
});
