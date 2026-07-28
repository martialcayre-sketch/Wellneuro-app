import { describe, expect, it } from 'vitest';
import { agregerEquilibre, calculerCouvertureBesoin, calculerCouvertureSource, clamp01 } from './score';
import { PLAFOND_FONDATION_CRITIQUE } from './constants';

// Scénarios portés depuis l'ancien score.check.ts (auto-vérification
// "zéro dépendance", supprimé au profit de ce fichier Vitest). Rationale
// et libellés français conservés à l'identique.

describe('clamp01', () => {
  it('borne une valeur négative à 0', () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it('borne une valeur supérieure à 1 à 1', () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("laisse inchangée une valeur déjà comprise entre 0 et 1", () => {
    expect(clamp01(0.42)).toBe(0.42);
  });
});

describe('agregerEquilibre', () => {
  it('score global sans aucune donnée doit être null, pas de plafond', () => {
    const vide = agregerEquilibre({});
    expect(vide.scoreGlobal).toBeNull();
    expect(vide.plafondApplique).toBe(false);
  });

  it('score global parfait (couverture 1.0 partout) doit être 100, pas de plafond', () => {
    const couverturesParfaites = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, 1])
    );
    const parfait = agregerEquilibre(couverturesParfaites);
    expect(parfait.scoreGlobal).toBe(100);
    expect(parfait.plafondApplique).toBe(false);
  });

  it(
    // "aucune moyenne ne masque une carence sévère" (MON_EQUILIBRE_CONTEXTE.md §2)
    'le plafond se déclenche sur une fondation critique effondrée (besoin 5) même si la moyenne brute serait haute',
    () => {
      const couverturesParfaites = Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [i + 1, 1])
      );
      const couverturesAvecEffondrement = { ...couverturesParfaites, 5: 0.1 };
      const effondre = agregerEquilibre(couverturesAvecEffondrement);

      expect(effondre.scoreGlobalAvantPlafond).not.toBeNull();
      expect(effondre.scoreGlobalAvantPlafond as number).toBeGreaterThan(PLAFOND_FONDATION_CRITIQUE);
      expect(effondre.plafondApplique).toBe(true);
      expect(effondre.scoreGlobal).toBe(PLAFOND_FONDATION_CRITIQUE);
      expect(effondre.fondationsCritiquesDeclenchees.some(f => f.besoin === 5)).toBe(true);
    }
  );
});

describe('calculerCouvertureBesoin', () => {
  // Le besoin 3 A une source depuis le 2026-07-28 : le sous-score `RYTHME_CHRONO`
  // de l'Enquête SIIN. Le test qui vivait ici s'intitulait « aucune source
  // mappée » et serait resté VERT en devenant faux — ses réponses `{MO1:'4'}` ne
  // correspondent à aucun item, donc la couverture reste nulle par un tout autre
  // chemin. Un test qui ne peut plus échouer pour la raison qu'il annonce ne
  // garde rien ; ceux-ci disent ce qui est vrai, dans les deux positions du
  // drapeau.
  const SIIN57_ACTIF = process.env.WN_ALI_01_SIIN57 === 'true';

  it('besoin 3 : une passation de la forme COURTE ne le renseigne pas', () => {
    // Les 8 passations de production portent des clés `AL*`. Relues sous la
    // forme SIIN, elles ne correspondent à aucun item : le moteur rend
    // `total: null` (parade anti-zéro), jamais 0. Vrai dans les deux positions,
    // pour deux raisons différentes — forme courte : pas de sous-score déclaré ;
    // forme SIIN : aucune réponse correspondante.
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: { AL1: '1', AL2: '2' } })).toBeNull();
  });

  it('besoin 3 : une passation SIIN complète le renseigne, et seulement en position SIIN', () => {
    // Les quatre items servis, au repère : SIIN52/53/55 en Oui (1), SIIN54 à
    // 12 h de jeûne. Attendu écrit à la main : 7 points sur 7, donc couverture 1.
    const reponsesAuRepere = { SIIN52: 1, SIIN53: 1, SIIN54: 12, SIIN55: 1 };
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: reponsesAuRepere }))
      .toBe(SIIN57_ACTIF ? 1 : null);
  });

  it('besoin 3 : une passation SIIN qui n’aborde AUCUN item de rythme reste non mesurée', () => {
    // LE cas qui exerce la parade anti-zéro du sous-score, et le seul. Le test
    // « forme courte » ci-dessus passe par le retour anticipé du moteur (aucune
    // réponse correspondante du tout) et ne l'atteint jamais : mesuré par
    // mutation, remplacer `sousRepondus > 0 ? sousTotal : null` par `sousTotal`
    // le laissait vert. Ici la passation est valide et scorée — seuls les
    // quatre items servis manquent. Rendre 0 dirait « rythme au plus bas »
    // d'un patient qu'on n'a pas interrogé, et tirerait la strate CORPS vers
    // le bas sur une mesure absente.
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: { SIIN01: 13, SIIN08: 6 } })).toBeNull();
  });

  it.each([
    ['1 item sur 4', { SIIN54: 12 }],
    ['2 items sur 4', { SIIN52: 1, SIIN53: 1 }],
    ['3 items sur 4', { SIIN52: 1, SIIN53: 1, SIIN54: 12 }],
  ])('besoin 3 : %s ne suffit pas — partiel vaut « pas de mesure »', (_nom, reponses) => {
    // Trouvé en revue : sans cette règle, `{SIIN54: 12}` — un patient au repère
    // sur la SEULE question qu'il a lue — rendait 2/7, soit 28,6 %, SOUS le
    // seuil d'effondrement. Un sous-score à 4 items n'a pas la tolérance d'un
    // total à 57 : la sensibilité y est ~14 fois plus grande. Une mesure basse
    // et une absence de mesure ne se confondent pas.
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: reponses })).toBeNull();
  });

  it('besoin 3 : hors du repère, la couverture chute sans jamais devenir nulle', () => {
    // Contrôle négatif du test ci-dessus : sans lui, une couverture figée à 1
    // passerait au vert. SIIN54 à 7 h (< 10) et SIIN52 en Non retirent 4 points
    // sur 7 — il en reste 3, soit 3/7.
    const horsRepere = { SIIN52: 0, SIIN53: 1, SIIN54: 7, SIIN55: 1 };
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: horsRepere }))
      .toBe(SIIN57_ACTIF ? 3 / 7 : null);
  });

  // v4 : la fatigue de Pichot n'est plus une source du besoin 2. Répondre au
  // Q_SOM_06 ne doit donc plus produire de couverture « micronutriments » —
  // sans quoi une fatigue élevée replafonnerait le score global à 50 (le
  // besoin 2 est une fondation critique) au nom d'une carence non mesurée.
  it('besoin 2 (micronutriments) reste non évaluable : le Pichot ne le renseigne plus', () => {
    const couvertureBesoin2 = calculerCouvertureBesoin(2, {
      Q_SOM_06: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' },
    });
    expect(couvertureBesoin2).toBeNull();
  });

  // Le corollaire qui compte cliniquement : un patient très fatigué ne
  // déclenche plus le plafond de fondation critique par le besoin 2.
  it('une fatigue sévère ne déclenche plus le plafond via le besoin 2', () => {
    const couvertureBesoin2 = calculerCouvertureBesoin(2, {
      Q_SOM_06: { P1: '4', P2: '4', P3: '4', P4: '4', P5: '4', P6: '4', P7: '4', P8: '4' },
    });
    expect(couvertureBesoin2).toBeNull();
  });

  it('besoin 5 : l’agenda du sommeil (Q_SOM_09) au plateau donne une couverture de 1', () => {
    const couverture = calculerCouvertureBesoin(5, {
      Q_SOM_09: {
        AGD_NB_NUITS: 21,
        AGD_TST_MOY: 470,
        AGD_EFF_MOY: 95,
        AGD_LAT_MED: 10,
        AGD_REV_MOY: 0.5,
        AGD_REG_ECT: 20,
      },
    });
    expect(couverture).toBeCloseTo(1, 6);
  });

  it('besoin 5 : agenda absent → la couverture vient des autres sources, jamais diluée à 0', () => {
    // Seul le PSQI est répondu (score parfait inversé → couverture 1). L'agenda
    // non clôturé n'ajoute pas une source à 0 : couverture = 1, pas 0,5.
    const couverture = calculerCouvertureBesoin(5, {
      Q_SOM_01: {
        Q1: 23, Q2: 5, Q3: 7, Q4: 8, Q6: 0, Q7: 0, Q8: 0, Q9: 0,
        Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0, Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
      },
    });
    expect(couverture).toBeCloseTo(1, 6);
  });
});

// Pondération du besoin 5 (2026-07-27). Avant cette date la moyenne était
// SIMPLE : les deux sources sommeil pesaient 2/3 du besoin « Bouger et se
// reposer », non par décision mais parce qu'une troisième source y avait été
// ajoutée. Ces tests fixent la structure voulue — mouvement 1/2, repos 1/2 dont
// deux tiers pour le questionnaire validé.
describe('besoin 5 — mouvement et repos à parts égales', () => {
  // PSQI parfait → couverture 1 ; agenda au plateau → couverture 1.
  const PSQI_PARFAIT = {
    Q1: 23, Q2: 5, Q3: 7, Q4: 8, Q6: 0, Q7: 0, Q8: 0, Q9: 0,
    Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0, Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
  };
  const AGENDA_PLATEAU = {
    AGD_NB_NUITS: 18,
    AGD_INDICE_ELIGIBLE: 1,
    AGD_TIB_MOY: 480,
    AGD_TST_MOY: 470,
    AGD_EFF_MOY: 95,
    AGD_LAT_MED: 10,
    AGD_REG_ECT: 20,
    AGD_QUAL_MOY: 5,
  };

  it('sommeil parfait et activité nulle : le besoin plafonne à 1/2, pas à 2/3', () => {
    const couverture = calculerCouvertureBesoin(5, {
      Q_SOM_01: PSQI_PARFAIT,
      Q_SOM_09: AGENDA_PLATEAU,
      // Q_MOD_01 répondu au minimum → sous-score activité physique à 0.
      Q_MOD_01: { MOD_AP_01: 0, MOD_AP_02: 0, MOD_AP_03: 0, MOD_AP_04: 0 },
    });
    // (2×1 + 1×1 + 3×0) / 6 = 0,5
    expect(couverture).toBeCloseTo(0.5, 6);
  });

  it('dans le repos, le questionnaire validé pèse deux fois l’agenda', () => {
    // Sans activité renseignée, le repos se partage 2/3 PSQI + 1/3 agenda.
    const psqiSeul = calculerCouvertureBesoin(5, { Q_SOM_01: PSQI_PARFAIT });
    const agendaSeul = calculerCouvertureBesoin(5, { Q_SOM_09: AGENDA_PLATEAU });
    // Chacun seul est renormalisé à 1 — c'est leur poids RELATIF qui diffère.
    expect(psqiSeul).toBeCloseTo(1, 6);
    expect(agendaSeul).toBeCloseTo(1, 6);
    // Un PSQI parfait contre un agenda nul : 2/3, et non 1/2.
    const mixte = calculerCouvertureBesoin(5, {
      Q_SOM_01: PSQI_PARFAIT,
      Q_SOM_09: { ...AGENDA_PLATEAU, AGD_TST_MOY: 60, AGD_EFF_MOY: 10, AGD_REG_ECT: 360, AGD_QUAL_MOY: 1 },
    });
    expect(mixte).toBeCloseTo(2 / 3, 6);
  });

  it('une source absente ne tire jamais vers 0 (renormalisation)', () => {
    const sansAgenda = calculerCouvertureBesoin(5, {
      Q_SOM_01: PSQI_PARFAIT,
      Q_MOD_01: { MOD_AP_01: 0, MOD_AP_02: 0, MOD_AP_03: 0, MOD_AP_04: 0 },
    });
    // L'agenda manquant ne compte ni pour 0 ni pour 1 : le repos se réduit au
    // PSQI, et les deux groupes restent à parts égales → (1 + 0) / 2 = 0,5.
    expect(sansAgenda).toBeCloseTo(0.5, 6);
  });

  // Constat B3 de la revue du 2026-07-28. Une pondération PLATE (3/2/1)
  // renormalisée sur les sources disponibles ne tient pas la promesse « parts
  // égales » quand l'agenda manque — le cas de presque tous les patients : le
  // repos serait retombé à 2/5, faisant basculer sous le seuil d'effondrement
  // des patients dont AUCUNE réponse n'avait changé. Le regroupement l'évite.
  it('un patient sans agenda garde exactement le score qu’il avait avant la pondération', () => {
    // Référence : la moyenne simple des deux sources répondues, telle qu'elle
    // était calculée avant l'introduction des poids.
    const psqiModere = {
      ...PSQI_PARFAIT,
      Q2: 2, Q4: 6, Q5a: 1, Q5b: 1, Q5c: 1,
    };
    const couverture = calculerCouvertureBesoin(5, {
      Q_SOM_01: psqiModere,
      Q_MOD_01: { MOD_AP_01: 1, MOD_AP_02: 1, MOD_AP_03: 0, MOD_AP_04: 0 },
    });
    const psqiSeul = calculerCouvertureBesoin(5, { Q_SOM_01: psqiModere })!;
    const activiteSeule = calculerCouvertureBesoin(5, {
      Q_MOD_01: { MOD_AP_01: 1, MOD_AP_02: 1, MOD_AP_03: 0, MOD_AP_04: 0 },
    })!;
    expect(couverture).toBeCloseTo((psqiSeul + activiteSeule) / 2, 6);
  });

  it('un besoin non groupé passe la couverture de ses sources sans la regrouper', () => {
    // Besoin 9 (stress), sources sans `groupe` : le regroupement du besoin 5 ne
    // doit pas y fuiter. La couverture du besoin reste la moyenne simple des
    // couvertures de ses sources disponibles — ici la seule fournie. On la
    // compare à ce que rend directement `calculerCouvertureSource`, sans coder
    // de valeur en dur : robuste au barème réel du PSS-10 (items P1..P10, dont
    // certains inversés). Une clé fantaisiste rendrait `null` depuis que la
    // garde « aucune réponse ne correspond » existe — d'où de vraies clés.
    const reponses = {
      Q_STR_02: { P1: 3, P2: 2, P3: 4, P4: 2, P5: 3, P6: 1, P7: 4, P8: 3, P9: 2, P10: 1 },
    };
    const attendu = calculerCouvertureSource(
      { idQuestionnaire: 'Q_STR_02', max: 50, inverser: true },
      reponses,
    );
    expect(attendu).not.toBeNull();
    expect(calculerCouvertureBesoin(9, reponses)).toBeCloseTo(attendu!, 6);
  });
});

// Invariants ancrés par la revue adversariale du 2026-07-27 (P0 métrologique).
// Le correctif « le besoin 2 n'est plus mesuré par la fatigue » repose sur un
// raisonnement — « une couverture null n'est pas un zéro » — qui n'était
// affirmé qu'en commentaire. Ces tests le rendent exécutable.
describe('fondations critiques sans source (invariants v4)', () => {
  it('une fondation critique sans source ne déclenche jamais le plafond', () => {
    // Toutes les fondations critiques (1, 2, 4, 5, 9) sont non renseignées :
    // couverture null. Si null était assimilé à 0, le plafond tomberait.
    const aucuneFondationRenseignee = agregerEquilibre({ 8: 1, 10: 1, 12: 1 });

    expect(aucuneFondationRenseignee.fondationsCritiquesDeclenchees).toEqual([]);
    expect(aucuneFondationRenseignee.plafondApplique).toBe(false);
  });

  it('le besoin 2 ne peut plus déclencher le plafond, quel que soit le Pichot', () => {
    // Pichot au maximum (fatigue extrême) : avant v4, la couverture du besoin 2
    // tombait sous SEUIL_EFFONDREMENT et plafonnait tout le score global.
    const couvertureBesoin2 = calculerCouvertureBesoin(2, {
      Q_SOM_06: { P1: '4', P2: '4', P3: '4', P4: '4', P5: '4', P6: '4', P7: '4', P8: '4' },
    });
    expect(couvertureBesoin2).toBeNull();

    const avecFatigueMaximale = agregerEquilibre({ 1: 1, 2: couvertureBesoin2, 4: 1, 5: 1, 9: 1 });
    expect(avecFatigueMaximale.fondationsCritiquesDeclenchees.some(f => f.besoin === 2)).toBe(false);
    expect(avecFatigueMaximale.plafondApplique).toBe(false);
    expect(avecFatigueMaximale.scoreGlobal).toBeGreaterThan(PLAFOND_FONDATION_CRITIQUE);
  });

  it('répondre au seul Pichot ne produit plus aucun indice global', () => {
    // Conséquence assumée et mesurée en production le 2026-07-27 : zéro patient
    // n'a le Pichot pour seule réponse exploitable. Le test fige la décision
    // plutôt que de la laisser se découvrir en exploitation.
    const seulPichot = agregerEquilibre({
      2: calculerCouvertureBesoin(2, {
        Q_SOM_06: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' },
      }),
    });
    expect(seulPichot.scoreGlobal).toBeNull();
    expect(seulPichot.scoreGlobalAvantPlafond).toBeNull();
  });
});
