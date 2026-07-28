import { describe, expect, it, vi } from 'vitest';

// Réserve de #436 : `extraireValeurBrute` (score.ts) lit un sous-score dans
// DEUX porteurs — `subScores` (forme historique) et `scoresBesoins` (moteurs
// qui déclarent des `dimensions`, à qui la certification interdit `subScores`).
// La boucle rendait le PREMIER trouvé : si un moteur émettait les deux,
// `subScores` gagnait par son seul rang dans le tableau, sans que rien ne le
// signale. Or le `max` de `BESOIN_SOURCES` n'est calibré que sur un porteur :
// lire l'autre rend une couverture FAUSSE, ce qui est pire qu'une absence de
// mesure — celle-ci se voit (`missing_data`), celle-là non.
//
// Mock isolé dans ce fichier : `score.test.ts` exerce le vrai catalogue, on ne
// veut pas y substituer le moteur. Ici on fabrique des retours de scoring
// qu'aucun moteur ne produit aujourd'hui — la certification les interdit aux
// instruments qui DÉCLARENT `sousScoresBesoins`, seul chemin d'émission connu,
// mais rien ne fige cette unicité. C'est précisément le point : éprouver le
// lecteur si l'invariant se relâchait, plutôt que de s'y fier.
const { calculateScore } = vi.hoisted(() => ({ calculateScore: vi.fn() }));
vi.mock('../questions', () => ({ calculateScore }));

import { calculerCouvertureSource } from './score';

const SOURCE = {
  idQuestionnaire: 'Q_TEST',
  sousScore: 'RYTHME',
  max: 10,
  inverser: false,
};
const REPONSES = { Q_TEST: { X1: 1 } };

describe('extraireValeurBrute — un sous-score, deux porteurs possibles', () => {
  it('lit un sous-score porté par `subScores` seul', () => {
    calculateScore.mockReturnValue({ subScores: [{ id: 'RYTHME', total: 5 }] });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBe(0.5);
  });

  it('lit un sous-score porté par `scoresBesoins` seul', () => {
    calculateScore.mockReturnValue({ scoresBesoins: [{ id: 'RYTHME', total: 5 }] });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBe(0.5);
  });

  it('deux porteurs qui DIVERGENT ne sont pas une mesure — null, jamais un choix par ordre', () => {
    // Le cœur de la réserve. Avant le correctif, ceci rendait 7/10 = 0.7 :
    // `subScores` gagnait parce qu'il est écrit en premier dans le tableau des
    // porteurs. Aucune des deux valeurs n'est plus légitime que l'autre.
    calculateScore.mockReturnValue({
      subScores: [{ id: 'RYTHME', total: 7 }],
      scoresBesoins: [{ id: 'RYTHME', total: 3 }],
    });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBeNull();
  });

  it('deux porteurs aux totaux ÉGAUX ne sont pas une mesure non plus', () => {
    // Une première rédaction les acceptait — « la même mesure écrite deux
    // fois ». C'est une inférence, pas une propriété : le contrat `{id, total}`
    // ne porte PAS le dénominateur. `total: 4` sur /10 et sur /7 sont deux
    // couvertures différentes (0,40 et 0,57), et `BESOIN_SOURCES` n'a qu'un
    // `max`. L'égalité des totaux ne prouve donc rien sur l'égalité des
    // mesures : un seul porteur doit répondre.
    calculateScore.mockReturnValue({
      subScores: [{ id: 'RYTHME', total: 4, max: 10 }],
      scoresBesoins: [{ id: 'RYTHME', total: 4, max: 7 }],
    });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBeNull();
  });

  it('sous-score absent des deux porteurs : null, pas 0', () => {
    calculateScore.mockReturnValue({
      subScores: [{ id: 'AUTRE', total: 9 }],
      scoresBesoins: [{ id: 'ENCORE_AUTRE', total: 9 }],
    });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBeNull();
  });

  it('un porteur unique au total NaN traverse — cas NON traité, mesuré inatteignable', () => {
    // Épingle le comportement RÉEL, pas celui qu'on souhaiterait. `typeof NaN
    // === 'number'` : le total est donc collecté, `length === 1`, et il sort
    // tel quel jusqu'à `Math.round(NaN)` dans la moyenne du besoin. Aucun
    // sous-score servi ne produit ce cas (vérifié sur les cinq, à quatre
    // remplissages) — mais une rédaction de changelog l'a un jour annoncé
    // corrigé alors qu'il ne l'était plus : sans test, l'affirmation était
    // devenue fausse en silence. Si un lot futur traite le `NaN`, ce test
    // rougit et force à mettre la réserve à jour.
    calculateScore.mockReturnValue({ scoresBesoins: [{ id: 'RYTHME', total: NaN }] });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBeNaN();
  });

  it('un porteur au total non numérique ne compte pas comme une mesure', () => {
    // `total: null` est la parade anti-zéro des sous-scores servis (aucun item
    // répondu, ou sous-score servi incomplet). Il ne doit pas devenir un 0.
    calculateScore.mockReturnValue({ scoresBesoins: [{ id: 'RYTHME', total: null }] });
    expect(calculerCouvertureSource(SOURCE, REPONSES)).toBeNull();
  });
});
