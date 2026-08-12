import { describe, expect, it } from 'vitest';
import { computeScoreFromDef } from '@/lib/questions';
import { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57 } from '@/lib/questionnaires/alimentaire';
import { ORIENTATION_RULES_V1 } from '@/lib/clinical/orientationRulesV1';

// LA GARDE SUR LAQUELLE [[D-051]] S'APPUIE, ENFIN ÉPROUVÉE.
//
// `D-051` retire le repère de passation courante sur `Q_ALI_01`, mais laisse
// hors de sa portée l'orientation et les contradictions, qui groupent par le
// même identifiant. Le motif écrit au registre est qu'une garde existante les
// protège : une passation d'une forme, relue contre la définition de l'AUTRE
// forme, ne partage aucun identifiant d'item, donc `calculateScore` rend
// `scored: false, interpretation: null` — et `R2-ALI-01`, dont le déclencheur
// porte sur l'interprétation, ne peut pas mordre.
//
// CE MOTIF N'ÉTAIT QU'UNE PROSE. Aucun banc ne le faisait mordre, dans un lot
// dont quatre revues successives ont reproché des affirmations non vérifiées.
// Une garde citée au registre comme protection doit pouvoir rougir : sinon
// c'est le registre qui promet ce que le code ne tient pas.
//
// Ce banc est indépendant de `WN_ALI_01_SIIN57` : il passe les DEUX définitions
// explicitement, au lieu de dépendre de celle qui est servie.

/** Une passation saturée de la forme courte : clés `AL1`…`AL14`. */
function reponsesForme14(): Record<string, number> {
  const reponses: Record<string, number> = {};
  for (const section of Q_ALI_01_COURT_14.sections) {
    for (const question of section.questions) reponses[question.id] = 3;
  }
  return reponses;
}

/** Une passation saturée de la forme SIIN 57. */
function reponsesForme57(): Record<string, number> {
  const reponses: Record<string, number> = {};
  for (const section of Q_ALI_01_SIIN_57.sections) {
    for (const question of section.questions) reponses[question.id] = 2;
  }
  return reponses;
}

describe('Q_ALI_01 — une forme relue contre l’autre définition ne produit aucune mesure', () => {
  it('les deux formes ne partagent AUCUN identifiant d’item', () => {
    // Le fait dont tout le reste dépend. S'il tombait — une forme réécrite avec
    // des clés communes —, les deux cas suivants deviendraient silencieusement
    // faux, et le motif de `D-051` avec eux.
    const ids14 = new Set(Object.keys(reponsesForme14()));
    const ids57 = new Set(Object.keys(reponsesForme57()));
    const communs = [...ids14].filter(id => ids57.has(id));
    expect(communs).toEqual([]);
  });

  it('forme courte relue contre la définition SIIN 57 ⇒ non scorée, sans interprétation', () => {
    const resultat = computeScoreFromDef(Q_ALI_01_SIIN_57, reponsesForme14());
    expect(resultat.scored).toBe(false);
    expect(resultat.total).toBeNull();
    // C'est `interpretation: null` qui ferme la porte à `R2-ALI-01` : un
    // déclencheur de zone sur l'interprétation ne peut pas s'allumer sur du
    // vide (`DC-24` — une absence n'est ni zéro ni normale).
    expect(resultat.interpretation).toBeNull();
  });

  it('forme SIIN 57 relue contre la définition courte ⇒ non scorée aussi', () => {
    // L'autre sens, et il compte autant : le drapeau peut être éteint alors que
    // le dossier porte déjà des passations 57 items.
    const resultat = computeScoreFromDef(Q_ALI_01_COURT_14, reponsesForme57());
    expect(resultat.scored).toBe(false);
    expect(resultat.total).toBeNull();
    expect(resultat.interpretation).toBeNull();
  });

  it('la règle publiée qui cible `Q_ALI_01` déclenche bien sur l’INTERPRÉTATION', () => {
    // Le motif de `D-051` ne tient que tant que c'est vrai. Une règle qui
    // déclencherait demain sur un total, un nombre de passations ou une date
    // retrouverait le piège intact — la réserve est nommée au registre, ce banc
    // la rend visible le jour où elle mordrait.
    const ciblantAli01 = ORIENTATION_RULES_V1.filter(
      regle => regle.statut === 'publiee'
        && regle.declencheurs.some(d => 'idQuestionnaire' in d && d.idQuestionnaire === 'Q_ALI_01'),
    );
    // S'il n'y en a plus aucune, ce banc ne garde plus rien : on le dit.
    expect(ciblantAli01.length).toBeGreaterThan(0);
    for (const regle of ciblantAli01) {
      for (const declencheur of regle.declencheurs) {
        if (!('idQuestionnaire' in declencheur) || declencheur.idQuestionnaire !== 'Q_ALI_01') continue;
        expect(
          'zone' in declencheur && declencheur.zone?.type,
          `${regle.id} déclenche sur autre chose que l'interprétation — la garde de D-051 ne le couvre plus`,
        ).toBe('interpretation');
      }
    }
  });
});
