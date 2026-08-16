import { describe, expect, it } from 'vitest';
import type { ContradictionFinding } from './contradictionFinding';
import { evaluerDeclencheur, evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import type { OrientationDeclencheur, OrientationDeclencheurFeuille, OrientationRule } from './orientationRulesV1';
import type { StopRule } from './stopRulesV1';

const CLAIM = { claimId: 'WN-CL-0001-001', versionClaim: 'v1' };

function regle(surcharge: Partial<OrientationRule>): OrientationRule {
  return {
    id: 'R-TEST-01',
    statut: 'publiee',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } },
    ],
    suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 1 }],
    justificationClaims: [CLAIM],
    niveau: 'approfondissement',
    ...surcharge,
  };
}

function reponse(surcharge: Partial<ReponseOrientation>): ReponseOrientation {
  return {
    idQuestionnaire: 'Q_STR_02',
    dateReponse: '2026-07-20T10:00:00.000Z',
    scores: { total: 30 },
    ...surcharge,
  };
}

describe('evaluerOrientation — déclencheurs', () => {
  it('déclenche sur une plage, bornes incluses', () => {
    for (const total of [27, 38, 50]) {
      const recos = evaluerOrientation({
        reponses: [reponse({ scores: { total } })],
        idsQuestionnairesAssignes: [],
        regles: [regle({})],
      });
      expect(recos).toHaveLength(1);
      expect(recos[0].cible).toEqual({ type: 'pack', packId: 'pack_stress_chronique_burnout' });
      expect(recos[0].motifs[0].conditions[0]).toContain(`score ${total}`);
    }
  });

  it('ne déclenche pas hors plage ni sans valeur numérique', () => {
    for (const scores of [{ total: 26 }, { total: 51 }, { total: 'haut' }, {}, null]) {
      const recos = evaluerOrientation({
        reponses: [reponse({ scores: scores as Record<string, unknown> | null })],
        idsQuestionnairesAssignes: [],
        regles: [regle({})],
      });
      expect(recos).toEqual([]);
    }
  });

  it("déclenche sur un libellé d'interprétation exact", () => {
    const r = regle({
      declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'interpretation', labels: ['Niveau élevé de stress'] } }],
    });
    const oui = evaluerOrientation({
      reponses: [reponse({ scores: { interpretation: { label: 'Niveau élevé de stress', color: 'danger' } } })],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(oui[0].motifs[0].conditions[0]).toContain('interprétation « Niveau élevé de stress »');
    const non = evaluerOrientation({
      reponses: [reponse({ scores: { interpretation: { label: 'Stress modéré', color: 'warning' } } })],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(non).toEqual([]);
  });

  it('déclenche sur une couleur de zone, jamais sur success', () => {
    const r = regle({
      declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } }],
    });
    const oui = evaluerOrientation({
      reponses: [reponse({ scores: { interpretation: { label: 'À surveiller', color: 'warning' } } })],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(oui[0].motifs[0].conditions[0]).toContain('zone warning');
    const non = evaluerOrientation({
      reponses: [reponse({ scores: { interpretation: { label: 'Favorable', color: 'success' } } })],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(non).toEqual([]);
  });

  it('opérateurs de comparaison sur score global et sous-score', () => {
    const scoresDnsm = {
      total: 12,
      subScores: [{ id: 'DA', label: 'Dopamine', total: 32, interpretation: { label: 'Axe perturbé', color: 'danger' } }],
    };
    const r = regle({
      declencheurs: [
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 30 },
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', operateur: '<', valeur: 20 },
      ],
      suggestions: [{ packId: 'pack_humeur_motivation_neurochimie', priorite: 1 }],
    });
    const recos = evaluerOrientation({
      reponses: [reponse({ idQuestionnaire: 'Q_INF_03', scores: scoresDnsm })],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].motifs[0].conditions).toEqual([
      'Q_INF_03 (DA) : score 32 >= 30',
      'Q_INF_03 : score 12 < 20',
    ]);
  });

  it('ET logique : un seul déclencheur non atteint annule la règle', () => {
    const r = regle({
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } },
        { type: 'comparaison', idQuestionnaire: 'Q_SOM_01', operateur: '>=', valeur: 11 },
      ],
    });
    const sansSommeil = evaluerOrientation({
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(sansSommeil).toEqual([]);
    const complet = evaluerOrientation({
      reponses: [
        reponse({ scores: { total: 40 } }),
        reponse({ idQuestionnaire: 'Q_SOM_01', scores: { total: 15 } }),
      ],
      idsQuestionnairesAssignes: [],
      regles: [r],
    });
    expect(complet).toHaveLength(1);
    expect(complet[0].motifs[0].conditions).toHaveLength(2);
  });

  it('seules les règles publiées sont évaluées', () => {
    for (const statut of ['brouillon', 'suspendue'] as const) {
      const recos = evaluerOrientation({
        reponses: [reponse({})],
        idsQuestionnairesAssignes: [],
        regles: [regle({ statut })],
      });
      expect(recos).toEqual([]);
    }
  });

  it('résout un sous-score par id puis par label', () => {
    const scoresDnsm = {
      subScores: [{ id: 'DA', label: 'Dopamine', total: 32, interpretation: null }],
    };
    for (const sousScore of ['DA', 'Dopamine']) {
      const recos = evaluerOrientation({
        reponses: [reponse({ idQuestionnaire: 'Q_INF_03', scores: scoresDnsm })],
        idsQuestionnairesAssignes: [],
        regles: [regle({
          declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore, operateur: '>=', valeur: 30 }],
        })],
      });
      expect(recos).toHaveLength(1);
    }
  });
});

describe('evaluerOrientation — agrégation et cibles', () => {
  it('ne retient que la réponse la plus récente par questionnaire', () => {
    const recos = evaluerOrientation({
      reponses: [
        reponse({ dateReponse: '2026-07-01T10:00:00.000Z', scores: { total: 45 } }),
        reponse({ dateReponse: '2026-07-20T10:00:00.000Z', scores: { total: 12 } }),
      ],
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
    });
    expect(recos).toEqual([]);
  });

  it('suggestion au grain questionnaire : priorité, objectif, needIds, drapeaux factuels', () => {
    const r = regle({
      suggestions: [{ questionnaireId: 'Q_SOM_01', priorite: 2, objectif: 'Caractériser la qualité du sommeil' }],
      needIds: [5],
    });
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: ['Q_SOM_01'],
      regles: [r],
    });
    expect(recos).toHaveLength(1);
    expect(recos[0]).toMatchObject({
      cible: { type: 'questionnaire', questionnaireId: 'Q_SOM_01' },
      priorite: 2,
      objectifs: ['Caractériser la qualité du sommeil'],
      needIds: [5],
      dejaAssigne: true,
      dejaRepondu: false,
    });
  });

  it('agrège plusieurs règles sur une même cible et trie par priorité', () => {
    const recos = evaluerOrientation({
      reponses: [
        reponse({ scores: { total: 40 } }),
        reponse({ idQuestionnaire: 'Q_SOM_01', scores: { total: 15 } }),
      ],
      idsQuestionnairesAssignes: [],
      regles: [
        regle({ id: 'R1', suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 2 }] }),
        regle({
          id: 'R2',
          declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_SOM_01', operateur: '>=', valeur: 11 }],
          suggestions: [
            { packId: 'pack_sommeil_chronobiologie', priorite: 1 },
            { packId: 'pack_stress_chronique_burnout', priorite: 3 },
          ],
          needIds: [5],
        }),
      ],
    });
    expect(recos.map(r => r.cible)).toEqual([
      { type: 'pack', packId: 'pack_sommeil_chronobiologie' },
      { type: 'pack', packId: 'pack_stress_chronique_burnout' },
    ]);
    const stress = recos[1];
    expect(stress.priorite).toBe(2);
    expect(stress.motifs.map(m => m.regleId)).toEqual(['R1', 'R2']);
    expect(stress.niveau).toBe('approfondissement');
  });

  it('marque dejaAssigne pour un pack uniquement quand la composition connue est couverte', () => {
    const base = {
      reponses: [reponse({ scores: { total: 40 } })],
      regles: [regle({})],
      compositionPacks: { pack_stress_chronique_burnout: ['Q_STR_04', 'Q_STR_05'] },
    };
    const couvert = evaluerOrientation({ ...base, idsQuestionnairesAssignes: ['Q_STR_04', 'Q_STR_05'] });
    expect(couvert[0].dejaAssigne).toBe(true);
    const partiel = evaluerOrientation({ ...base, idsQuestionnairesAssignes: ['Q_STR_04'] });
    expect(partiel[0].dejaAssigne).toBe(false);
    const inconnu = evaluerOrientation({
      reponses: base.reponses,
      regles: base.regles,
      idsQuestionnairesAssignes: ['Q_STR_04', 'Q_STR_05'],
    });
    expect(inconnu[0].dejaAssigne).toBe(false);
  });

  it('filtre DUR : une exploration non administrable est écartée, pas dépriorisée', () => {
    const r = regle({
      suggestions: [
        { questionnaireId: 'Q_SOM_01', priorite: 1 },
        { questionnaireId: 'Q_SOM_06', priorite: 2 },
      ],
    });
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: [],
      regles: [r],
      estAdministrable: questionnaireId => questionnaireId !== 'Q_SOM_01',
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].cible).toEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_06' });
  });

  it('table vide ou sans déclencheur : aucune recommandation', () => {
    expect(evaluerOrientation({ reponses: [reponse({})], idsQuestionnairesAssignes: [], regles: [] })).toEqual([]);
    expect(evaluerOrientation({
      reponses: [reponse({})],
      idsQuestionnairesAssignes: [],
      regles: [regle({ declencheurs: [] })],
    })).toEqual([]);
  });
});

describe('evaluerOrientation — invariants de doctrine', () => {
  it('une règle sans claim justificatif ne recommande rien (traçabilité)', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({ justificationClaims: [] })],
    });
    expect(recos).toEqual([]);
  });

  it('filtre dur au grain pack : un seul membre non administrable écarte le pack', () => {
    const base = {
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
      compositionPacks: { pack_stress_chronique_burnout: ['Q_STR_04', 'Q_STR_05'] },
    };
    const ecarte = evaluerOrientation({ ...base, estAdministrable: qid => qid !== 'Q_STR_05' });
    expect(ecarte).toEqual([]);
    const admis = evaluerOrientation({ ...base, estAdministrable: () => true });
    expect(admis).toHaveLength(1);
  });

  it('composition de pack inconnue : dejaAssigne et dejaRepondu restent des faits non affirmés', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: ['Q_STR_04'],
      regles: [regle({})],
    });
    expect(recos[0].dejaAssigne).toBe(false);
    expect(recos[0].dejaRepondu).toBeNull();
  });

  it('une même règle visant deux fois la même cible ne compte qu’un motif', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 40 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({
        suggestions: [
          { questionnaireId: 'Q_SOM_01', priorite: 3, objectif: 'Objectif A' },
          { questionnaireId: 'Q_SOM_01', priorite: 1, objectif: 'Objectif B' },
        ],
      })],
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].motifs).toHaveLength(1);
    expect(recos[0].priorite).toBe(1);
    expect(recos[0].objectifs).toEqual(['Objectif A', 'Objectif B']);
  });

  it('cible partagée par deux niveaux : le plus fondamental gagne, quel que soit l’ordre', () => {
    const suggestions = [{ questionnaireId: 'Q_SOM_01', priorite: 1 }] as const;
    const specialise = regle({ id: 'R-SPE', suggestions: [...suggestions], niveau: 'specialise' });
    const socle = regle({ id: 'R-SOC', suggestions: [...suggestions], niveau: 'socle' });
    for (const regles of [[specialise, socle], [socle, specialise]]) {
      const recos = evaluerOrientation({
        reponses: [reponse({ scores: { total: 40 } })],
        idsQuestionnairesAssignes: [],
        regles,
      });
      expect(recos[0].niveau).toBe('socle');
    }
  });

  it('deux réponses au même horodatage : sortie stable quel que soit l’ordre reçu', () => {
    const ancienne = reponse({ idReponse: 'R-A', scores: { total: 40 } });
    const recente = reponse({ idReponse: 'R-B', scores: { total: 10 } });
    for (const reponses of [[ancienne, recente], [recente, ancienne]]) {
      const recos = evaluerOrientation({ reponses, idsQuestionnairesAssignes: [], regles: [regle({})] });
      expect(recos).toEqual([]);
    }
  });

  it('collision id/label entre sous-scores : l’id prime', () => {
    const scores = {
      subScores: [
        { id: 'SE', label: 'Sérotonine', total: 5, interpretation: null },
        { id: 'ME', label: 'SE', total: 35, interpretation: null },
      ],
    };
    const recos = evaluerOrientation({
      reponses: [reponse({ idQuestionnaire: 'Q_INF_03', scores })],
      idsQuestionnairesAssignes: [],
      regles: [regle({
        declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'SE', operateur: '>=', valeur: 30 }],
      })],
    });
    expect(recos).toEqual([]);
  });

  it('scores de forme aberrante : jamais de recommandation, jamais d’exception', () => {
    const formes: unknown[] = [
      [],
      42,
      'texte',
      { subScores: { DA: 32 } },
      { subScores: [{ id: 'DA', total: Number.NaN }] },
      { subScores: [{ id: 'DA', total: Number.POSITIVE_INFINITY }] },
      { total: Number.NaN },
    ];
    for (const scores of formes) {
      const recos = evaluerOrientation({
        reponses: [reponse({ idQuestionnaire: 'Q_INF_03', scores: scores as Record<string, unknown> })],
        idsQuestionnairesAssignes: [],
        regles: [regle({
          declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 1 }],
        })],
      });
      expect(recos).toEqual([]);
    }
  });
});

describe('evaluerOrientation — drapeaux d\'anamnèse (LOT-04/LOT-05)', () => {
  const DRAPEAUX = {
    signauxAlerte: [],
    antecedentsDomaines: ['Cardiovasculaire'],
    facteursDeclenchants: ['Stress aigu / burn-out'],
    attentes: ['Améliorer le sommeil'],
    automedication: [],
    intolerancesAlimentaires: [],
    symptomesFonctionnels: [],
    debut: 'Brutal',
    evolution: null,
    variationPoids: null,
  };

  const regleDrapeau = (surcharge = {}) =>
    regle({
      declencheurs: [{ type: 'drapeau', champ: 'attentes', valeurs: ['Améliorer le sommeil'] }],
      ...surcharge,
    });

  it('déclenche sur un champ liste et nomme la valeur atteinte', () => {
    const recos = evaluerOrientation({
      reponses: [],
      idsQuestionnairesAssignes: [],
      regles: [regleDrapeau()],
      drapeaux: DRAPEAUX,
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].motifs[0].conditions[0]).toContain('Améliorer le sommeil');
  });

  it('déclenche sur un champ radio (valeur unique)', () => {
    const recos = evaluerOrientation({
      reponses: [],
      idsQuestionnairesAssignes: [],
      regles: [regleDrapeau({ declencheurs: [{ type: 'drapeau', champ: 'debut', valeurs: ['Brutal'] }] })],
      drapeaux: DRAPEAUX,
    });
    expect(recos).toHaveLength(1);
  });

  // Fail-closed sur l'absence : aucun déclencheur n'est atteint sans drapeaux.
  //
  // Honnêteté sur ce que ce banc prouve : avec les déclencheurs d'aujourd'hui,
  // des drapeaux ABSENTS et des drapeaux VIDES produisent le même résultat —
  // aucune valeur ne peut matcher dans les deux cas. Il épingle donc le contrat
  // (ne pas lever, ne rien déclencher), pas une différence observable. Elle le
  // deviendrait le jour où un déclencheur testerait une absence.
  it('ne déclenche pas quand les drapeaux sont absents', () => {
    const recos = evaluerOrientation({
      reponses: [],
      idsQuestionnairesAssignes: [],
      regles: [regleDrapeau()],
    });
    expect(recos).toEqual([]);
  });

  it('ne déclenche pas sur une valeur absente du drapeau', () => {
    const recos = evaluerOrientation({
      reponses: [],
      idsQuestionnairesAssignes: [],
      regles: [regleDrapeau({ declencheurs: [{ type: 'drapeau', champ: 'attentes', valeurs: ['Améliorer la digestion / le transit'] }] })],
      drapeaux: DRAPEAUX,
    });
    expect(recos).toEqual([]);
  });

  it('exige TOUS les déclencheurs quand drapeau et score sont combinés', () => {
    const mixte = regle({
      declencheurs: [
        { type: 'drapeau', champ: 'facteursDeclenchants', valeurs: ['Stress aigu / burn-out'] },
        { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } },
      ],
    });
    // Drapeau atteint mais score sous la plage : rien.
    expect(evaluerOrientation({
      reponses: [reponse({ scores: { total: 12 } })],
      idsQuestionnairesAssignes: [],
      regles: [mixte],
      drapeaux: DRAPEAUX,
    })).toEqual([]);
    // Les deux atteints : recommandé.
    expect(evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } })],
      idsQuestionnairesAssignes: [],
      regles: [mixte],
      drapeaux: DRAPEAUX,
    })).toHaveLength(1);
  });
});

describe('evaluerOrientation — couleurs et administrabilité (correctifs LOT-05)', () => {
  // `dark` porte les bandes « Très sévère ». Omise de l'union, elle faisait
  // manquer les patients les plus atteints — sans erreur ni trace.
  it('déclenche sur la couleur `dark`, la plus sévère', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 20, interpretation: { label: 'Très sévère', color: 'dark' } } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({
        declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] } }],
      })],
    });
    expect(recos).toHaveLength(1);
  });

  // Régression de l'écart 3 : la route ne charge que les packs actifs, donc un
  // pack désactivé arrive sans composition. Il doit être ÉCARTÉ, pas recommandé
  // à un praticien qui ne peut pas l'assigner.
  it('écarte un pack de composition inconnue quand un filtre est en place', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
      compositionPacks: {},
      estAdministrable: () => true,
    });
    expect(recos).toEqual([]);
  });

  it('recommande le pack dès que sa composition est connue et administrable', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
      compositionPacks: { pack_stress_chronique_burnout: ['Q_STR_02', 'Q_STR_05'] },
      estAdministrable: () => true,
    });
    expect(recos).toHaveLength(1);
  });

  // Sans filtre du tout (bancs unitaires, lot 10 non branché), l'ancien
  // comportement permissif reste : ne pas exiger une composition qu'on n'a pas
  // demandée.
  it('reste permissif quand aucun filtre d\'administrabilité n\'est fourni', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
    });
    expect(recos).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RÈGLES D'ARRÊT — [[D-053]]
// ─────────────────────────────────────────────────────────────────────────────

const CLAIM_ARRET = { claimId: 'WN-CL-0002-002', versionClaim: 'v1' };

function arret(surcharge: Partial<StopRule>): StopRule {
  return {
    id: 'STOP-TEST',
    statut: 'publiee',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'plage', min: 0, max: 4 } },
    ],
    reglesEteintes: ['R-TEST-01'],
    motif: 'Les instruments spécifiques sont rassurants.',
    justificationClaims: [CLAIM_ARRET],
    ...surcharge,
  };
}

/**
 * Une passation d'arrêt COMPLÈTE — comptes publiés, comme le fait un moteur
 * `sum` ou `subscore`. Sans eux, la garde de complétude du moteur d'arrêt
 * refuse d'éteindre, et c'est précisément ce qu'elle doit faire.
 */
function mesureArret(total: number, items = 21) {
  return { total, repondus: items, items, missing: 0 };
}

/** Le dossier minimal qui allume `R-TEST-01` : un PSS-10 à 30. */
function dossierAllume() {
  return {
    reponses: [reponse({ scores: { total: 30 } })],
    idsQuestionnairesAssignes: [],
    regles: [regle({})],
  };
}

describe('evaluerOrientation — extinction par une règle d\'arrêt', () => {
  // CONTRE-ÉPREUVE D'ANTI-VACUITÉ, en tête plutôt qu'en note : un banc
  // d'extinction qui ne visiterait jamais l'état « allumée » serait vert pour
  // une mauvaise raison.
  it('sans règle d\'arrêt, la recommandation est allumée', () => {
    const recos = evaluerOrientation(dossierAllume());
    expect(recos).toHaveLength(1);
    expect(recos[0].extinction ?? null).toBeNull();
  });

  it('éteint la recommandation, avec son motif, ses conditions et ses claims', () => {
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [reponse({ scores: { total: 30 } }), reponse({ idQuestionnaire: 'Q_STR_01', scores: mesureArret(2) })],
      reglesArret: [arret({})],
    });
    // La ligne RESTE servie : une extinction n'efface pas l'historique.
    expect(recos).toHaveLength(1);
    expect(recos[0].motifs).toHaveLength(1);
    expect(recos[0].motifs[0].regleId).toBe('R-TEST-01');
    expect(recos[0].extinction?.stopRuleId).toBe('STOP-TEST');
    expect(recos[0].extinction?.motif).toContain('rassurants');
    expect(recos[0].extinction?.conditions[0]).toContain('Q_STR_01');
    expect(recos[0].extinction?.claims).toEqual([CLAIM_ARRET]);
  });

  it('RALLUME dès qu\'une passation nouvelle sort de la zone rassurante', () => {
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', dateReponse: '2026-07-01T10:00:00.000Z', scores: mesureArret(2) }),
        // Plus récente, et dégradée : c'est elle qui fait foi.
        reponse({ idQuestionnaire: 'Q_STR_01', dateReponse: '2026-07-25T10:00:00.000Z', scores: mesureArret(12) }),
      ],
      reglesArret: [arret({})],
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].extinction ?? null).toBeNull();
  });

  it('n\'éteint pas sur un score annulé ni sur un recueil sans mesure', () => {
    for (const scores of [null, {}, { total: null }]) {
      const recos = evaluerOrientation({
        ...dossierAllume(),
        reponses: [
          reponse({ scores: { total: 30 } }),
          reponse({ idQuestionnaire: 'Q_STR_01', scores: scores as Record<string, unknown> | null }),
        ],
        reglesArret: [arret({})],
      });
      expect(recos[0].extinction ?? null).toBeNull();
    }
  });

  it('n\'éteint pas une recommandation encore motivée par une règle NON éteinte', () => {
    const autreAxe = regle({
      id: 'R-SOM-99',
      declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'plage', min: 5, max: 21 } }],
    });
    const recos = evaluerOrientation({
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_SOM_01', scores: { total: 9 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: mesureArret(2) }),
      ],
      idsQuestionnairesAssignes: [],
      regles: [regle({}), autreAxe],
      reglesArret: [arret({})],
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].motifs.map(motif => motif.regleId).sort()).toEqual(['R-SOM-99', 'R-TEST-01']);
    expect(recos[0].extinction ?? null).toBeNull();
  });

  it('n\'éteint rien sans claim, sans règle nommée, ou hors statut publié', () => {
    for (const surcharge of [
      { justificationClaims: [] },
      { reglesEteintes: [] },
      { statut: 'brouillon' as const },
      { declencheurs: [] },
    ]) {
      const recos = evaluerOrientation({
        ...dossierAllume(),
        reponses: [reponse({ scores: { total: 30 } }), reponse({ idQuestionnaire: 'Q_STR_01', scores: mesureArret(2) })],
        reglesArret: [arret(surcharge)],
      });
      expect(recos[0].extinction ?? null).toBeNull();
    }
  });

  it('ne déplace pas la ligne éteinte dans l\'ordre servi', () => {
    const seconde = regle({
      id: 'R-TEST-02',
      declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'plage', min: 5, max: 21 } }],
      suggestions: [{ questionnaireId: 'Q_SOM_02', priorite: 2 }],
    });
    const entree = {
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_SOM_01', scores: { total: 9 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: mesureArret(2) }),
      ],
      idsQuestionnairesAssignes: [],
      regles: [regle({}), seconde],
    };
    const sansArret = evaluerOrientation(entree).map(reco => JSON.stringify(reco.cible));
    const avecArret = evaluerOrientation({ ...entree, reglesArret: [arret({})] });
    expect(avecArret.map(reco => JSON.stringify(reco.cible))).toEqual(sansArret);
    expect(avecArret[0].extinction?.stopRuleId).toBe('STOP-TEST');
    expect(avecArret[1].extinction ?? null).toBeNull();
  });
});

describe('evaluerOrientation — une contradiction ouverte interdit l\'extinction ([[D-053]] §5, [[D-055]])', () => {
  /** Un constat minimal du moteur de contradictions, au statut choisi. */
  function constat(statut: 'ouverte' | 'escaladee_praticien' | 'resolue'): ContradictionFinding {
    return {
      forme: 'DISCORDANCE',
      id: 'C-TEST',
      audience: 'praticien_seul',
      sources: [{ type: 'instrument', idQuestionnaire: 'Q_STR_02', reponseId: 'r-c', dateReponse: '2026-08-01T10:00:00.000Z' }],
      description: 'Discordance de test.',
      importance: 'critical_for_decision',
      hypotheses: ['hypothèse'],
      actionSuggeree: 'clarifier en entretien',
      resolution: statut === 'ouverte' ? { statut } : { statut, motif: 'motif' },
      justificationClaims: [CLAIM_ARRET],
      regleId: 'C-TEST',
      limitations: [],
      ecartJoursEntreSources: null,
    };
  }

  /** Le dossier qui ÉTEINDRAIT sans contradiction — celui du banc d'extinction. */
  function entreeEligible() {
    return {
      ...dossierAllume(),
      reponses: [reponse({ scores: { total: 30 } }), reponse({ idQuestionnaire: 'Q_STR_01', scores: mesureArret(2) })],
      reglesArret: [arret({})],
    };
  }

  it('une contradiction OUVERTE empêche l\'extinction — et une ESCALADÉE aussi', () => {
    for (const statut of ['ouverte', 'escaladee_praticien'] as const) {
      const recos = evaluerOrientation({ ...entreeEligible(), contradictions: [constat(statut)] });
      expect(recos).toHaveLength(1);
      expect(recos[0].extinction ?? null).toBeNull();
      // La ligne ne perd RIEN d'autre : motifs et place intacts.
      expect(recos[0].motifs.map(motif => motif.regleId)).toEqual(['R-TEST-01']);
    }
  });

  it('une contradiction RÉSOLUE n\'empêche rien — contre-épreuve', () => {
    const recos = evaluerOrientation({ ...entreeEligible(), contradictions: [constat('resolue')] });
    expect(recos[0].extinction?.stopRuleId).toBe('STOP-TEST');
  });

  it('une CONVERGENCE non résolue n\'empêche rien — un accord de sources n\'est pas une contradiction', () => {
    // Le type prévoit trois formes ; seule une INCOHÉRENCE ouverte bloque
    // (DISCORDANCE, CONFLIT_SOURCES). Figé ici avant que CONVERGENCE soit
    // peuplée — sans ce banc, le partage se déciderait le jour où elle l'est.
    const convergence: ContradictionFinding = {
      ...constat('ouverte'),
      forme: 'CONVERGENCE',
      graduation: 'CONVERGENCE_FORTE',
    };
    const recos = evaluerOrientation({ ...entreeEligible(), contradictions: [convergence] });
    expect(recos[0].extinction?.stopRuleId).toBe('STOP-TEST');

    // Et un CONFLIT_SOURCES ouvert bloque comme une discordance.
    const conflit: ContradictionFinding = { ...constat('ouverte'), forme: 'CONFLIT_SOURCES' };
    const bloque = evaluerOrientation({ ...entreeEligible(), contradictions: [conflit] });
    expect(bloque[0].extinction ?? null).toBeNull();
  });

  it('liste vide ou absente : le comportement d\'extinction est inchangé — anti-vacuité', () => {
    for (const contradictions of [undefined, [] as ContradictionFinding[]]) {
      const recos = evaluerOrientation({ ...entreeEligible(), contradictions });
      expect(recos[0].extinction?.stopRuleId).toBe('STOP-TEST');
    }
  });

  it('une contradiction ne DÉCLENCHE jamais rien : hors extinction, la sortie est identique', () => {
    // Le sens unique de DC-30, mesuré plutôt qu'affirmé : sur un dossier SANS
    // règle d'arrêt, ajouter une contradiction ouverte ne change pas un octet
    // de la sortie — ni ligne, ni motif, ni ordre.
    const sans = evaluerOrientation(dossierAllume());
    const avec = evaluerOrientation({ ...dossierAllume(), contradictions: [constat('ouverte')] });
    expect(avec).toEqual(sans);
  });
});

describe('evaluerOrientation — `dejaRepondu` excluant', () => {
  const cibleQuestionnaire = regle({ suggestions: [{ questionnaireId: 'Q_STR_05', priorite: 1 }] });

  it('sans le drapeau, la cible déjà renseignée reste proposée', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } }), reponse({ idQuestionnaire: 'Q_STR_05', scores: { total: 12 }, statutValidite: 'VALID' })],
      idsQuestionnairesAssignes: [],
      regles: [cibleQuestionnaire],
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].dejaRepondu).toBe(true);
  });

  it('exclut la cible dont la dernière passation est EXPLOITABLE', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } }), reponse({ idQuestionnaire: 'Q_STR_05', scores: { total: 12 }, statutValidite: 'VALID' })],
      idsQuestionnairesAssignes: [],
      regles: [cibleQuestionnaire],
      exclureDejaRepondu: true,
    });
    expect(recos).toEqual([]);
  });

  // LE CŒUR DE L'ARBITRAGE 7. Le service met le score à `null` — sans retirer la
  // ligne — quand la passation est invalidée ou non interprétable. Le praticien
  // qui invalide ATTEND une re-passation : l'exclure serait lui retirer la
  // recommandation qu'il vient de provoquer.
  it('n\'exclut PAS sur une passation dont le score a été annulé', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } }), reponse({ idQuestionnaire: 'Q_STR_05', scores: null, statutValidite: 'VALID' })],
      idsQuestionnairesAssignes: [],
      regles: [cibleQuestionnaire],
      exclureDejaRepondu: true,
    });
    expect(recos).toHaveLength(1);
    // Le badge, lui, continue de dire le fait administratif.
    expect(recos[0].dejaRepondu).toBe(true);
  });

  it('n\'exclut jamais un pack à composition inconnue', () => {
    const recos = evaluerOrientation({
      reponses: [reponse({ scores: { total: 30 } })],
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
      exclureDejaRepondu: true,
    });
    expect(recos).toHaveLength(1);
    expect(recos[0].dejaRepondu).toBeNull();
  });

  it('n\'exclut un pack que si TOUS ses membres sont exploitables', () => {
    const base = {
      idsQuestionnairesAssignes: [],
      regles: [regle({})],
      compositionPacks: { pack_stress_chronique_burnout: ['Q_STR_02', 'Q_STR_05'] },
      exclureDejaRepondu: true,
    };
    const partiel = evaluerOrientation({
      ...base,
      reponses: [reponse({ scores: { total: 30 }, statutValidite: 'VALID' })],
    });
    expect(partiel).toHaveLength(1);

    const complet = evaluerOrientation({
      ...base,
      reponses: [
        reponse({ scores: { total: 30 }, statutValidite: 'VALID' }),
        reponse({ idQuestionnaire: 'Q_STR_05', scores: { total: 12 }, statutValidite: 'VALID' }),
      ],
    });
    expect(complet).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CE QUE LA REVUE ADVERSARIALE DU 2026-08-12 A OUVERT
//
// Trois défauts bloquants y ont été trouvés, tous de la même famille : un test
// de nullité pris pour un test de mesure, et une complétude supposée plutôt que
// lue. Les bancs ci-dessous les tiennent fermés.
// ─────────────────────────────────────────────────────────────────────────────

describe('exclusion `dejaRepondu` — un objet de score n\'est pas une mesure', () => {
  const cibleQuestionnaire = regle({ suggestions: [{ questionnaireId: 'Q_STR_05', priorite: 1 }] });

  function avec(scores: unknown, statutValidite: string | null = 'VALID') {
    return evaluerOrientation({
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_05', scores: scores as Record<string, unknown> | null, statutValidite }),
      ],
      idsQuestionnairesAssignes: [],
      regles: [cibleQuestionnaire],
      exclureDejaRepondu: true,
    });
  }

  // LE PIÈGE DU LOT-02, REPOSÉ ICI À L'IDENTIQUE. `calculateScore` ne rend pas
  // `null` sur une passation vide : il rend un objet truthy portant
  // `scored:false`. Une passation ouverte et abandonnée à deux items rend, elle,
  // un total biaisé vers le bas et AUCUNE interprétation.
  it('une passation VIDE n\'exclut pas', () => {
    expect(avec({ type: 'sum', scored: false, total: null, interpretation: null })).toHaveLength(1);
  });

  it('un recueil PARTIEL sans interprétation n\'exclut pas', () => {
    expect(avec({ total: 12, missing: 8, repondus: 2, interpretation: null })).toHaveLength(1);
  });

  it('un objet de score SANS mesure ni bande n\'exclut pas', () => {
    for (const scores of [{}, { note: 'rien' }, { total: null, interpretation: null }]) {
      expect(avec(scores)).toHaveLength(1);
    }
  });

  it('une mesure complète, elle, exclut — contre-épreuve', () => {
    expect(avec({ total: 12, repondus: 10, items: 10, interpretation: { label: 'Élevé', color: 'danger' } })).toEqual([]);
  });

  // `AMBIGUOUS` N'EST JAMAIS ÉCARTÉ EN SILENCE — doctrine de `lib/scoring/
  // validite.ts`, qui nomme `dejaRepondu` comme l'un des endroits où la ligne
  // survit. Faire de `dejaRepondu` un filtre sans relire le statut aurait
  // retourné cette phrase contre elle-même.
  it('une passation AMBIGUOUS, INVALID ou de statut inconnu n\'exclut pas', () => {
    for (const statut of ['AMBIGUOUS', 'INVALID', 'SUPERSEDED', 'HISTORICAL_ONLY', null]) {
      expect(avec({ total: 12, interpretation: { label: 'Élevé', color: 'danger' } }, statut)).toHaveLength(1);
    }
  });
});

describe('extinction — un instrument qui ne dit pas sa complétude n\'éteint pas', () => {
  // LE DÉFAUT EXACT QUI A FAIT ÉCARTER STOP-APN, retrouvé sur le déclencheur
  // PORTEUR de STOP-STR. `group_majority` (`Q_STR_01`) ne publie ni `missing`,
  // ni `repondus`, ni `items`, et `totalSousScore` rend un total dès un item par
  // groupe : trois réponses sur vingt et une produisent la bande la plus
  // favorable de la grille. Sans cette garde, l'extinction naissait d'un
  // instrument quasi vide.
  const arretParBande = arret({
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'interpretation', labels: ['Oriente vers les conseils de vie antistress'] } },
    ],
  });

  const bandeFavorable = { label: 'Oriente vers les conseils de vie antistress', color: 'success' };

  it('n\'éteint pas quand le porteur ne publie AUCUN compte', () => {
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        // La forme RÉELLE de `group_majority` : total, sous-scores, bande — et
        // pas un compte.
        reponse({
          idQuestionnaire: 'Q_STR_01',
          scores: { type: 'group_majority', total: 0, subScores: [{ id: 'A', total: 0, max: 14 }], interpretation: bandeFavorable },
        }),
      ],
      reglesArret: [arretParBande],
    });
    expect(recos[0].extinction ?? null).toBeNull();
  });

  it('n\'éteint pas non plus sur un recueil déclaré incomplet', () => {
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: { total: 0, repondus: 3, items: 21, interpretation: bandeFavorable } }),
      ],
      reglesArret: [arretParBande],
    });
    expect(recos[0].extinction ?? null).toBeNull();
  });

  // CONTRE-ÉPREUVE — sans elle, une garde qui refuserait TOUT passerait les deux
  // cas ci-dessus.
  it('éteint quand le recueil est complet ET la bande favorable', () => {
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: { total: 0, repondus: 21, items: 21, interpretation: bandeFavorable } }),
      ],
      reglesArret: [arretParBande],
    });
    expect(recos[0].extinction?.stopRuleId).toBe('STOP-TEST');
  });

  // LA SECONDE MOITIÉ DE LA GARDE « muet OU incomplet » ([[D-055]] arbitrage 3),
  // et le SEUL chemin où elle n'est pas une redite de la garde générale : la
  // zone garantie par un `bandePlancher` atteint un déclencheur SANS mesure,
  // sur un recueil incomplet — c'est sa raison d'être. Une règle d'arrêt ne
  // doit jamais s'appuyer dessus. Retirer `comptes.manquants > 0` de la garde
  // fait rougir CE banc et lui seul.
  it('un plancher n\'éteint JAMAIS — même sur une zone qu\'il garantit', () => {
    const arretSurPlancher = arret({
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'interpretation', labels: ['Élevé'] } },
      ],
    });
    const porteurAvecPlancher = {
      total: 30,
      repondus: 15,
      items: 21,
      interpretation: null,
      bandePlancher: {
        garanti: true,
        label: 'Élevé',
        color: 'danger',
        labelsPossibles: ['Élevé'],
        couleursPossibles: ['danger'],
      },
    };
    // Le déclencheur EST atteint par le plancher — contre-épreuve d'abord, sur
    // une règle d'ORIENTATION : sans elle, ce banc serait vert même si le
    // plancher ne garantissait rien.
    const regleOrientation = regle({
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'interpretation', labels: ['Élevé'] } },
      ],
    });
    const allumee = evaluerOrientation({
      reponses: [reponse({ idQuestionnaire: 'Q_STR_01', scores: porteurAvecPlancher })],
      idsQuestionnairesAssignes: [],
      regles: [regleOrientation],
    });
    expect(allumee).toHaveLength(1);
    expect(allumee[0].motifs[0].conditions[0]).toContain('au moins');

    // La MÊME zone, portée par une règle d'ARRÊT : la garde de complétude lit
    // `manquants > 0` et refuse — un plancher propose, il n'éteint pas.
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: porteurAvecPlancher }),
      ],
      reglesArret: [arretSurPlancher],
    });
    expect(recos[0].extinction ?? null).toBeNull();
  });
});

describe('extinction — la garde de complétude lit l\'axe visé, avec la résolution d\'extraireCible', () => {
  const bandeNormale = { label: 'Normal', color: 'success' };

  function arretSurAxe(sousScore: string) {
    return arret({
      declencheurs: [
        { type: 'zone' as const, idQuestionnaire: 'Q_STR_04', sousScore, zone: { type: 'interpretation' as const, labels: ['Normal'] } },
      ],
    });
  }

  it('un axe visé INTROUVABLE refuse — jamais de repli sur les comptes de la racine', () => {
    // La racine publie des comptes COMPLETS : un repli racine conclurait
    // « complet » et laisserait le déclencheur trancher. L'axe `S` n'existe
    // pas chez ce porteur : illisible, donc refus.
    //
    // HONNÊTETÉ DE BANC : ce cas est DOUBLEMENT fermé — le déclencheur échoue
    // aussi, `extraireCible` ne trouvant pas l'axe. La mutation « repli
    // racine » ne rougit donc pas ici (mesuré) ; ce qui la rattrape est le
    // banc suivant, où l'ORDRE de résolution est le seul juge. Celui-ci épingle
    // le comportement, il ne prouve pas la garde seule.
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({
          idQuestionnaire: 'Q_STR_04',
          scores: { total: 0, repondus: 21, items: 21, subScores: [{ id: 'D', total: 0, repondus: 7, items: 7, interpretation: bandeNormale }] },
        }),
      ],
      reglesArret: [arretSurAxe('S')],
    });
    expect(recos[0].extinction ?? null).toBeNull();
  });

  it('l\'id prime sur le libellé — la garde lit le MÊME axe que le déclencheur', () => {
    // Un axe `S` complet et favorable, et un axe voisin dont le LABEL vaut
    // « S », incomplet. Si la garde résolvait par libellé d'abord — ou dans un
    // autre ordre qu'`extraireCible` —, elle lirait l'axe incomplet et
    // refuserait une extinction légitime.
    const recos = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({
          idQuestionnaire: 'Q_STR_04',
          scores: {
            subScores: [
              { id: 'X', label: 'S', total: 1, repondus: 1, items: 7, interpretation: null },
              { id: 'S', label: 'Stress', total: 0, repondus: 7, items: 7, interpretation: bandeNormale },
            ],
          },
        }),
      ],
      reglesArret: [arretSurAxe('S')],
    });
    expect(recos[0].extinction?.stopRuleId).toBe('STOP-TEST');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Disjonction ([[D-060]]). Les bancs listés par la décision, un par défaut
// qu'ils ferment : la sémantique fail-closed du recueil incomplet est ce que la
// revue doit pouvoir tenir — chaque banc rougit seul si on la relâche.
describe('evaluerDeclencheur — disjonction (D-060)', () => {
  const brancheStress: OrientationDeclencheurFeuille = {
    type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 },
  };
  const brancheSommeil: OrientationDeclencheurFeuille = {
    type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'plage', min: 5, max: 21 },
  };
  const ou: OrientationDeclencheur = { type: 'ou', declencheurs: [brancheStress, brancheSommeil] };
  // Comptes publiés et rien de manquant : la seule forme qu'une branche accepte.
  const complet = (total: number) => ({ total, repondus: 10, items: 10 });
  const dernieres = (...reponses: ReponseOrientation[]) =>
    new Map(reponses.map(r => [r.idQuestionnaire, r]));

  it('vrai dès qu\'UNE branche complète est atteinte — l\'autre peut être absente', () => {
    const atteint = evaluerDeclencheur(ou, dernieres(
      reponse({ idQuestionnaire: 'Q_SOM_01', scores: complet(7) }),
    ), undefined);
    expect(atteint?.motif).toContain('Q_SOM_01');
    expect(atteint?.instruments).toEqual([{ idQuestionnaire: 'Q_SOM_01' }]);
  });

  it('faux si toutes les branches complètes sont fausses', () => {
    const atteint = evaluerDeclencheur(ou, dernieres(
      reponse({ scores: complet(10) }),
      reponse({ idQuestionnaire: 'Q_SOM_01', scores: complet(2) }),
    ), undefined);
    expect(atteint).toBeNull();
  });

  // FAIL-CLOSED SUR RECUEIL INCOMPLET (`DC-24`). Le cas est écrit sur une zone
  // COULEUR garantie par un `bandePlancher`, et pas sur une plage nue : sur une
  // plage, `extraireCible` annule déjà la mesure et le cas serait vert même
  // sans la garde de branche — il ne prouverait rien. Ici, la feuille EST
  // atteinte (contre-épreuve juste en dessous), et seule la garde l'éteint.
  it('faux si la branche est sur recueil incomplet — même quand un plancher l’atteindrait', () => {
    const zoneGarantie: OrientationDeclencheurFeuille = {
      type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'couleur', couleurs: ['danger', 'dark'] },
    };
    const incompletAvecPlancher = dernieres(reponse({
      idQuestionnaire: 'Q_STR_01',
      scores: {
        total: null,
        repondus: 15,
        items: 21,
        interpretation: null,
        bandePlancher: {
          garanti: true,
          label: 'Élevé',
          color: 'danger',
          labelsPossibles: ['Élevé'],
          couleursPossibles: ['danger'],
        },
      },
    }));
    // La feuille, elle, s'allume : le plancher garantit la zone.
    expect(evaluerDeclencheur(zoneGarantie, incompletAvecPlancher, undefined)?.motif).toContain('au moins');
    // La même feuille en branche : éteinte. Retirer la garde fait rougir ici.
    expect(evaluerDeclencheur(
      { type: 'ou', declencheurs: [zoneGarantie] }, incompletAvecPlancher, undefined,
    )).toBeNull();
  });

  // LE CAS QUI DISTINGUE LA BRANCHE DE LA FEUILLE. Un moteur qui ne publie
  // aucun compte passe la garde générale (rien à lire) et une FEUILLE
  // s'allume ; une BRANCHE, jamais — dans le doute, elle ne compte pas
  // ([[D-060]] §2). Sans la contre-épreuve, ce banc serait vert même si
  // l'évaluateur refusait tout.
  it('un moteur muet n\'allume jamais une branche — la même feuille hors `ou` s\'allume', () => {
    const muettes = dernieres(reponse({ scores: { total: 30 } }));
    expect(evaluerDeclencheur(ou, muettes, undefined)).toBeNull();
    expect(evaluerDeclencheur(brancheStress, muettes, undefined)?.motif).toContain('Q_STR_02');
  });

  // Extension du banc « un plancher n'éteint jamais » : il n'allume pas non
  // plus une disjonction. Contre-épreuve d'abord, même discipline.
  it('un plancher n\'allume JAMAIS un OU — même sur une zone qu\'il garantit', () => {
    const porteurAvecPlancher = {
      total: 30,
      repondus: 15,
      items: 21,
      interpretation: null,
      bandePlancher: {
        garanti: true,
        label: 'Élevé',
        color: 'danger',
        labelsPossibles: ['Élevé'],
        couleursPossibles: ['danger'],
      },
    };
    const feuille: OrientationDeclencheurFeuille = {
      type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'interpretation', labels: ['Élevé'] },
    };
    const reponses = dernieres(reponse({ idQuestionnaire: 'Q_STR_01', scores: porteurAvecPlancher }));
    expect(evaluerDeclencheur(feuille, reponses, undefined)?.motif).toContain('au moins');
    expect(evaluerDeclencheur({ type: 'ou', declencheurs: [feuille] }, reponses, undefined)).toBeNull();
  });

  it('la traçabilité ne cite que la branche atteinte — la première, dans l\'ordre de la règle', () => {
    const atteint = evaluerDeclencheur(ou, dernieres(
      reponse({ scores: complet(30) }),
      reponse({ idQuestionnaire: 'Q_SOM_01', scores: complet(7) }),
    ), undefined);
    expect(atteint?.instruments).toEqual([{ idQuestionnaire: 'Q_STR_02' }]);
    expect(atteint?.motif).toContain('Q_STR_02');
    expect(atteint?.motif).not.toContain('Q_SOM_01');
  });

  it('un `ou` sans branche n\'est jamais atteint', () => {
    expect(evaluerDeclencheur({ type: 'ou', declencheurs: [] }, dernieres(), undefined)).toBeNull();
  });

  it('une branche de drapeau d\'anamnèse s\'évalue sans instrument à citer', () => {
    const atteint = evaluerDeclencheur(
      { type: 'ou', declencheurs: [{ type: 'drapeau', champ: 'attentes', valeurs: ['Retrouver le sommeil'] }] },
      dernieres(),
      {
        signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [],
        attentes: ['Retrouver le sommeil'], automedication: [], intolerancesAlimentaires: [],
        symptomesFonctionnels: [], debut: null, evolution: null, variationPoids: null,
      },
    );
    expect(atteint?.motif).toContain('attentes');
    expect(atteint?.instruments).toEqual([]);
  });

  // Le moteur d'arrêt délègue la complétude des branches à l'évaluateur : une
  // branche complète éteint, une branche muette n'éteint pas — si la garde
  // statique du moteur redevenait aveugle au `ou`, le second cas rougirait.
  it('une règle d\'arrêt à disjonction éteint par une branche complète, jamais par une muette', () => {
    const arretOu = arret({
      declencheurs: [{
        type: 'ou',
        declencheurs: [
          { type: 'zone', idQuestionnaire: 'Q_STR_01', zone: { type: 'interpretation', labels: ['Faible'] } },
        ],
      }],
    });
    const bandeFavorable = { label: 'Faible', color: 'success' };
    const eteinte = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: { total: 0, repondus: 21, items: 21, interpretation: bandeFavorable } }),
      ],
      reglesArret: [arretOu],
    });
    expect(eteinte[0].extinction?.stopRuleId).toBe('STOP-TEST');

    const muette = evaluerOrientation({
      ...dossierAllume(),
      reponses: [
        reponse({ scores: { total: 30 } }),
        reponse({ idQuestionnaire: 'Q_STR_01', scores: { total: 0, interpretation: bandeFavorable } }),
      ],
      reglesArret: [arretOu],
    });
    expect(muette[0].extinction ?? null).toBeNull();
  });
});
