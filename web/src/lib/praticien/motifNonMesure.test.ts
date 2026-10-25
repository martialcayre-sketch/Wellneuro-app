import { describe, expect, it } from 'vitest';
import { LIBELLE_GESTE_ECART, ligneEcartDecision, ligneMotif, type MotifNonMesure } from './motifNonMesure';

// Les libellés relus et validés par le responsable le 2026-10-24, avant le
// code (r3_08, Q4) : au mot près. Un changement ici est un changement de texte
// arbitré, pas un détail.
describe('ligneMotif — les libellés validés, au mot près', () => {
  const attendu: Record<MotifNonMesure, string> = {
    hors_score: 'Non mesuré · hors score (D-122)',
    sans_instrument: 'Non mesuré · aucun instrument au mapping',
    aucune_passation: 'Non mesuré · aucune passation exploitable (Q_STR_01)',
    passation_ecartee: 'Non mesuré · passation écartée par le filtre de validité (Q_STR_01)',
    source_suspendue: 'Non mesuré · source suspendue (Q_STR_01)',
    // Précisé par r3_10 (Q5, validé le 2026-10-25) : le motif décrit les routes.
    recueil_incomplet: 'Non mesuré · recueil incomplet sur les items lus, à la dernière passation, du 12/10/2026 (Q_STR_01)',
    forme_sans_sous_score: 'Non mesuré · sous-score non servi par la forme du questionnaire (Q_STR_01)',
    calcul_en_erreur: 'Non mesuré · calcul du questionnaire en erreur (Q_STR_01)',
    sous_score_absent_ou_double: 'Non mesuré · sous-score absent ou en double dans le résultat (Q_STR_01)',
  };

  for (const [motif, ligne] of Object.entries(attendu) as [MotifNonMesure, string][]) {
    it(motif, () => {
      const sansSource = motif === 'hors_score' || motif === 'sans_instrument';
      expect(
        ligneMotif({
          motif,
          idsQuestionnaire: sansSource ? [] : ['Q_STR_01'],
          dateDernierePassation: motif === 'recueil_incomplet' ? '2026-10-12T08:00:00.000Z' : null,
        })
      ).toBe(ligne);
    });
  }

  it('plusieurs questionnaires sur une ligne, séparés par une virgule', () => {
    expect(
      ligneMotif({ motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_01', 'Q_STR_03'], dateDernierePassation: null })
    ).toBe('Non mesuré · aucune passation exploitable (Q_STR_01, Q_STR_03)');
  });

  it('la date suit le fuseau de Paris, pas celui du serveur', () => {
    expect(
      ligneMotif({ motif: 'recueil_incomplet', idsQuestionnaire: ['Q_STR_01'], dateDernierePassation: '2026-10-11T22:30:00.000Z' })
    ).toContain('du 12/10/2026');
  });

  it('aucun mot ne juge la valeur ni ne se lit comme une relance', () => {
    const toutes = Object.values(attendu).join(' ');
    expect(toutes).not.toMatch(/faible|bas|élevé|mauvais|bon\b|à relancer|à compléter|manque :/i);
    expect(toutes).not.toMatch(/\d+ sur \d+/);
  });
});

// r3_10 (Q5) — le libellé relu et validé par le responsable le 2026-10-25,
// avant le code : au mot près.
describe('ligneEcartDecision — le libellé validé, au mot près', () => {
  it('daté de la passation retenue', () => {
    expect(
      ligneEcartDecision({ idQuestionnaire: 'Q_INF_03', dateDernierePassation: '2026-10-12T08:00:00.000Z' })
    ).toBe('N’entre pas dans la décision · passation incomplète hors des items lus, du 12/10/2026 (Q_INF_03)');
  });

  it('sans date, la ligne se tait sur elle plutôt que d’en deviner une', () => {
    expect(ligneEcartDecision({ idQuestionnaire: 'Q_NEU_11', dateDernierePassation: null })).toBe(
      'N’entre pas dans la décision · passation incomplète hors des items lus (Q_NEU_11)'
    );
  });

  it('le geste porte son propre nom, distinct du motif', () => {
    expect(LIBELLE_GESTE_ECART).toBe('Écart avec la décision');
  });

  it('aucun mot ne juge la valeur ni ne se lit comme une relance', () => {
    const ligne = ligneEcartDecision({ idQuestionnaire: 'Q_INF_03', dateDernierePassation: null });
    expect(ligne).not.toMatch(/faible|bas|élevé|mauvais|bon\b|fausse|erron|à relancer|à compléter|\d+ ?%/i);
  });
});
