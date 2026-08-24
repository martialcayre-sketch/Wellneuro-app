import { describe, expect, it } from 'vitest';

import {
  PLAFOND_FONDATION_CRITIQUE,
  SEUIL_EFFONDREMENT,
  VERSION_SCORE_EQUILIBRE,
} from './constants';

// LOT-11 « Doctrine exécutable » — [[D-107]], dette nommée par [[D-106]].
//
// LA RÈGLE ÉTAIT ÉCRITE, RIEN NE L'OPPOSAIT. `constants.ts` exige désormais en
// toutes lettres qu'une modification de `SEUIL_EFFONDREMENT` ou de
// `PLAFOND_FONDATION_CRITIQUE` s'accompagne d'un bump de
// `VERSION_SCORE_EQUILIBRE` — et aucun contrôle ne le vérifiait. C'est le patron
// exact de la « décision due » que `DC-21` porte déjà : une règle écrite qu'un
// diff peut enfreindre sans que rien ne bronche.
//
// POURQUOI CETTE FORME, ET PAS UN SIMPLE `toBe`. Épingler les deux valeurs
// (`expect(SEUIL_EFFONDREMENT).toBe(0.34)`) ne garde PAS la règle : l'auteur qui
// change la valeur change l'assertion dans le même diff, et le banc redevient
// vert sans qu'aucun bump n'ait eu lieu. Ici, les valeurs sont épinglées PAR
// VERSION. Changer une valeur sans bump laisse l'entrée de la version COURANTE
// en désaccord avec le code — le banc rougit, et le seul moyen de le refermer
// honnêtement est d'ajouter une entrée pour une version NEUVE, donc de bumper.
//
// LA LIMITE, DITE : réécrire l'entrée d'une version DÉJÀ PUBLIÉE referme aussi
// le banc. C'est un geste qu'aucune bonne foi n'accomplit par distraction, et
// qu'une relecture voit — les entrées ci-dessous sont un registre, pas un cache.

/**
 * Les deux valeurs de plafonnement, par étiquette de version de score.
 *
 * `v14` et `v15` coexistent parce que `VERSION_SCORE_EQUILIBRE` dépend de la
 * FORME SERVIE de `Q_ALI_01` (`maxTotal === 90` ⇒ `v15`, sinon `v14`) : les
 * deux positions du drapeau `WN_ALI_01_SIIN57` doivent donc être couvertes, sans
 * quoi le banc ne garderait que la position dans laquelle il tourne.
 *
 * Les deux portent les MÊMES valeurs, et c'est exact : elles n'ont jamais
 * changé. `D-106` les a **validées telles quelles** le 2026-08-24 — validation
 * sans modification, donc délibérément sans bump, puisque aucune valeur calculée
 * ne bouge et qu'un bump aurait cassé l'historique de tous les patients pour
 * n'enregistrer qu'une signature.
 */
const VALEURS_PAR_VERSION: Record<string, { seuil: number; plafond: number }> = {
  v14: { seuil: 0.34, plafond: 50 },
  v15: { seuil: 0.34, plafond: 50 },
};

describe('plafonnement — une valeur ne change pas sans bump de version', () => {
  // Anti-vacuité : une étiquette inconnue rendrait la comparaison `undefined`
  // contre `undefined` sur un `toEqual` mal écrit. Ici elle rougit d'abord.
  it('la version courante est couverte par le registre', () => {
    expect(Object.keys(VALEURS_PAR_VERSION)).toContain(VERSION_SCORE_EQUILIBRE);
  });

  it('les deux valeurs correspondent à celles de la version courante', () => {
    const attendu = VALEURS_PAR_VERSION[VERSION_SCORE_EQUILIBRE];
    expect({ seuil: SEUIL_EFFONDREMENT, plafond: PLAFOND_FONDATION_CRITIQUE }).toEqual(attendu);
  });

  // Le registre couvre les DEUX positions du drapeau, pas seulement celle qui
  // tourne : sans ce cas, supprimer l'entrée de la position inactive passerait
  // inaperçu jusqu'au jour où le drapeau bascule.
  it('les deux positions du drapeau restent couvertes', () => {
    expect(Object.keys(VALEURS_PAR_VERSION).sort()).toEqual(['v14', 'v15']);
  });
});
