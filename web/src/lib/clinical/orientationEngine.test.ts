import { describe, expect, it } from 'vitest';
import { evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import type { OrientationRule } from './orientationRulesV1';

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
