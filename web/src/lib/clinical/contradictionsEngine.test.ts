import { describe, expect, it } from 'vitest';

import { evaluerContradictions, type EntreeContradictions } from './contradictionsEngine';
import { CONTRADICTIONS_RULES_V1 } from './contradictionsV1';
import type { ReponseOrientation } from './orientationEngine';

// Le moteur de contradictions, éprouvé sur le seul cas qu'il sait produire :
// C-STR. Les fixtures sont des scores, pas des patients — aucune donnée
// nominative n'entre ici.

function sousScore(id: string, total: number | null, extra: Record<string, unknown> = {}) {
  return { id, label: id, total, ...extra };
}

/** Q_MOD_01 avec son axe d'adaptation au stress. */
function modeDeVie(adaptation: number | null, idReponse = 'rep-mod-1'): ReponseOrientation {
  return {
    idQuestionnaire: 'Q_MOD_01',
    dateReponse: '2026-08-10T09:00:00.000Z',
    idReponse,
    scores: { subScores: [sousScore('ADAPTATION_STRESS', adaptation)] },
  };
}

/** Q_STR_04 — DASS-21, ses trois axes. */
function dass(d: number | null, s: number | null, idReponse = 'rep-dass-1'): ReponseOrientation {
  return {
    idQuestionnaire: 'Q_STR_04',
    dateReponse: '2026-08-10T09:30:00.000Z',
    idReponse,
    scores: { subScores: [sousScore('D', d), sousScore('A', 2), sousScore('S', s)] },
  };
}

function evaluer(reponses: ReponseOrientation[], entree: Partial<EntreeContradictions> = {}) {
  return evaluerContradictions({ reponses, ...entree });
}

describe('moteur de contradictions — C-STR se déclenche sur la discordance, et sur elle seule', () => {
  it('adaptation perturbée et DASS-21 normal : la contradiction est constatée', () => {
    const constats = evaluer([modeDeVie(6), dass(2, 5)]);
    expect(constats).toHaveLength(1);
    expect(constats[0]).toMatchObject({
      forme: 'DISCORDANCE',
      regleId: 'C-STR',
      audience: 'praticien_seul',
      resolution: { statut: 'ouverte' },
    });
    // Le constat nomme les passations dont il sort (`DC-34`, `DC-35`).
    expect(constats[0].sources).toEqual([
      { type: 'instrument', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS', reponseId: 'rep-mod-1' },
      { type: 'instrument', idQuestionnaire: 'Q_STR_04', sousScore: 'D', reponseId: 'rep-dass-1' },
      { type: 'instrument', idQuestionnaire: 'Q_STR_04', sousScore: 'S', reponseId: 'rep-dass-1' },
    ]);
    expect(constats[0].justificationClaims).toEqual([
      { claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' },
    ]);
  });

  // LA BORNE HAUTE DE LA BANDE. 8 est dans la bande « Adaptation perturbée »,
  // 9 est le trou laissé ouvert : la règle doit mordre sur l'un et se taire sur
  // l'autre. Sans ces deux cas, un `<` écrit pour un `<=` passerait inaperçu.
  it('la borne 8 mord, la valeur 9 ne mord pas', () => {
    expect(evaluer([modeDeVie(8), dass(2, 5)])).toHaveLength(1);
    expect(evaluer([modeDeVie(9), dass(2, 5)])).toHaveLength(0);
  });

  it('les bornes du DASS-21 sont celles des bandes « Normal »', () => {
    expect(evaluer([modeDeVie(6), dass(4, 7)])).toHaveLength(1);
    // Un point au-dessus de la bande « Normal », d'un côté ou de l'autre : plus
    // de discordance, le DASS-21 confirme le signal.
    expect(evaluer([modeDeVie(6), dass(5, 7)])).toHaveLength(0);
    expect(evaluer([modeDeVie(6), dass(4, 8)])).toHaveLength(0);
  });

  it('une adaptation satisfaisante ne produit rien, même avec un DASS-21 normal', () => {
    expect(evaluer([modeDeVie(20), dass(1, 2)])).toHaveLength(0);
  });
});

describe('moteur de contradictions — fail-closed', () => {
  // `DC-24` : une donnée absente n'est jamais zéro. Un axe non mesuré ne doit
  // pas se lire comme une adaptation effondrée — c'est la garantie héritée du
  // moteur d'orientation, et ce banc vérifie qu'elle traverse bien.
  it('un axe non mesuré n’est pas une adaptation effondrée', () => {
    expect(evaluer([modeDeVie(null), dass(2, 5)])).toHaveLength(0);
  });

  it('un questionnaire absent éteint la règle', () => {
    expect(evaluer([modeDeVie(6)])).toHaveLength(0);
    expect(evaluer([dass(2, 5)])).toHaveLength(0);
    expect(evaluer([])).toHaveLength(0);
  });

  // Un recueil partiel n'est pas une mesure basse : le porteur publie ses
  // comptes, la garde de complétude du moteur d'orientation s'applique ici
  // aussi. Sans elle, un questionnaire abandonné après deux items produirait la
  // vigilance la plus alarmante.
  it('un recueil incomplet n’est pas une mesure', () => {
    const partiel: ReponseOrientation = {
      idQuestionnaire: 'Q_MOD_01',
      dateReponse: '2026-08-10T09:00:00.000Z',
      idReponse: 'rep-mod-partiel',
      scores: {
        subScores: [sousScore('ADAPTATION_STRESS', 3, { repondus: 2, items: 8, missing: 6 })],
      },
    };
    expect(evaluer([partiel, dass(2, 5)])).toHaveLength(0);
  });

  it('un DASS-21 partiel n’est pas une bande « Normal »', () => {
    const partiel: ReponseOrientation = {
      idQuestionnaire: 'Q_STR_04',
      dateReponse: '2026-08-10T09:30:00.000Z',
      idReponse: 'rep-dass-partiel',
      scores: {
        subScores: [
          sousScore('D', 1, { repondus: 3, items: 7, missing: 4 }),
          sousScore('S', 2, { repondus: 3, items: 7, missing: 4 }),
        ],
      },
    };
    expect(evaluer([modeDeVie(6), partiel])).toHaveLength(0);
  });

  // LA LIMITE, ÉCRITE PLUTÔT QUE SUPPOSÉE. La garde de complétude ne mord que
  // si le porteur PUBLIE ses comptes. `repondus`/`items` ne sont servis que
  // depuis la campagne du 2026-08-04 : un `scoresJson` enregistré avant, relu
  // tel quel, passe la garde avec un total partiel — biaisé vers le bas, donc
  // du mauvais côté de trois déclencheurs `<=`.
  //
  // Ce banc FIGE ce comportement au lieu de le laisser croire corrigé. La
  // parade n'est pas ici : elle est chez l'appelant, qui doit recalculer depuis
  // `rawAnswers` comme `orientationService` le fait depuis le 2026-08-04. Tant
  // que le moteur n'est pas câblé, rien n'est exposé — mais le jour du câblage,
  // c'est cette ligne qu'il faut lire.
  it('sans comptes publiés, la garde de complétude ne peut pas mordre (limite connue)', () => {
    const historique: ReponseOrientation = {
      idQuestionnaire: 'Q_MOD_01',
      dateReponse: '2026-07-01T09:00:00.000Z',
      idReponse: 'rep-mod-historique',
      // Forme antérieure au 2026-08-04 : aucun `repondus`, aucun `items`.
      scores: { subScores: [sousScore('ADAPTATION_STRESS', 3)] },
    };
    expect(evaluer([historique, dass(2, 5)])).toHaveLength(1);
  });

  // TRAÇABILITÉ FAIL-CLOSED. Une passation sans identifiant rend le constat
  // non remontable : le praticien ne pourrait pas vérifier ce qu'on lui
  // affirme (`DC-34`, `DC-35`). On préfère ne rien produire.
  it('une passation sans identifiant éteint le constat', () => {
    const sansId: ReponseOrientation = {
      idQuestionnaire: 'Q_STR_04',
      dateReponse: '2026-08-10T09:30:00.000Z',
      scores: { subScores: [sousScore('D', 2), sousScore('S', 5)] },
    };
    expect(evaluer([modeDeVie(6), sansId])).toHaveLength(0);
  });
});

describe('moteur de contradictions — les quatre refus, éprouvés sur des règles injectées', () => {
  // CES QUATRE CAS EXIGENT LE PARAMÈTRE `regles`. La table du dépôt ne contient
  // qu'une règle publiée, `DISCORDANCE`, avec un claim et trois déclencheurs :
  // sans injection, aucun de ces refus ne serait atteignable, et un test
  // « aucune forme autre que DISCORDANCE ne sort » serait une tautologie —
  // exactement le piège que ce lot dénonce ailleurs.
  const declencheursCstr = CONTRADICTIONS_RULES_V1[0].declencheurs;
  const base = { ...CONTRADICTIONS_RULES_V1[0] };
  const atteinte = [modeDeVie(6), dass(2, 5)];

  it('le témoin : la règle de référence, elle, produit bien un constat', () => {
    expect(evaluer(atteinte, { regles: [base] })).toHaveLength(1);
  });

  it('une règle non publiée n’est pas évaluée', () => {
    expect(evaluer(atteinte, { regles: [{ ...base, statut: 'brouillon' }] })).toHaveLength(0);
    expect(evaluer(atteinte, { regles: [{ ...base, statut: 'suspendue' }] })).toHaveLength(0);
  });

  // Une règle sans claim n'est pas traçable jusqu'à sa source (`DC-01`,
  // `DC-26`), et le contrat de fraîcheur n'aurait rien à contrôler.
  it('une règle sans claim justificatif ne produit rien', () => {
    expect(evaluer(atteinte, { regles: [{ ...base, justificationClaims: [] }] })).toHaveLength(0);
  });

  // `every` sur une liste vide rend `true` : une règle sans déclencheur
  // s'allumerait pour TOUT LE MONDE. C'est le pire défaut possible ici, et il
  // ne tient qu'à cette ligne.
  it('une règle sans déclencheur ne s’allume pour personne', () => {
    expect(evaluer(atteinte, { regles: [{ ...base, declencheurs: [] }] })).toHaveLength(0);
    expect(evaluer([], { regles: [{ ...base, declencheurs: [] }] })).toHaveLength(0);
  });

  // [[D-041]] — seule `DISCORDANCE` est peuplée par ce lot. Sans ce refus, une
  // règle déclarée `CONVERGENCE` sortirait étiquetée `DISCORDANCE`, sa
  // graduation perdue en route : produire la mauvaise forme est pire que ne
  // rien produire.
  it('une règle d’une autre forme ne sort pas déguisée en DISCORDANCE', () => {
    for (const forme of ['CONVERGENCE', 'CONFLIT_SOURCES'] as const) {
      expect(evaluer(atteinte, { regles: [{ ...base, forme, declencheurs: declencheursCstr }] }))
        .toHaveLength(0);
    }
  });
});

describe('moteur de contradictions — ce que le moteur ne produit jamais', () => {

  // Le garde de [[D-041]] vu du côté de l'instance : le type l'interdit déjà à
  // la compilation, ce cas vérifie qu'aucune clé de cette famille n'apparaît à
  // l'exécution — un objet construit par épandage pourrait en porter une que le
  // type ne voit pas.
  it('aucun champ de certitude n’apparaît sur l’objet produit', () => {
    const constats = evaluer([modeDeVie(6), dass(2, 5)]);
    expect(constats).toHaveLength(1);
    const cles = Object.keys(constats[0]);
    for (const cle of cles) {
      expect(cle.toLowerCase()).not.toMatch(/confian|confidence|certitud|certain|probabil|vraisembl|fiabilit/);
    }
    expect(cles.sort()).toEqual(
      [
        'actionSuggeree',
        'audience',
        'description',
        'forme',
        'hypotheses',
        'id',
        'importance',
        'justificationClaims',
        'limitations',
        'regleId',
        'resolution',
        'sources',
      ].sort(),
    );
  });
});
