import { describe, expect, it } from 'vitest';
import { agregerEquilibre, calculerCouvertureBesoin, calculerCouvertureSource, clamp01 } from './score';
import { PLAFOND_FONDATION_CRITIQUE } from './constants';
import { QUESTIONNAIRE_CATALOGUE } from '../questions';

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
// deux tiers pour le questionnaire scoré.
describe('besoin 5 — mouvement et repos à parts égales', () => {
  // PSQI parfait → couverture 1 ; agenda au plateau → couverture 1.
  // Sous-échelle « activité physique » de Q_MOD_01, avec ses VRAIS identifiants.
  // Les fixtures écrivaient `MOD_AP_01`…`MOD_AP_04`, qui n'existent pas au
  // catalogue : l'instrument ne reconnaissait aucune de ces réponses et sortait
  // pourtant un score. La garde de passation vide (2026-07-29) le refuse
  // désormais — ces tests mesuraient donc une couverture bâtie sur rien.
  const ACTIVITE_NULLE = {
    ACTIVITE_PHYSIQUE_Q001: 0, ACTIVITE_PHYSIQUE_Q002: 0, ACTIVITE_PHYSIQUE_Q003: 0,
    ACTIVITE_PHYSIQUE_Q004: 0, ACTIVITE_PHYSIQUE_Q005: 0,
  };
  const ACTIVITE_PARTIELLE = {
    ACTIVITE_PHYSIQUE_Q001: 1, ACTIVITE_PHYSIQUE_Q002: 1, ACTIVITE_PHYSIQUE_Q003: 0,
    ACTIVITE_PHYSIQUE_Q004: 0, ACTIVITE_PHYSIQUE_Q005: 0,
  };

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
      Q_MOD_01: ACTIVITE_NULLE,
    });
    // (2×1 + 1×1 + 3×0) / 6 = 0,5
    expect(couverture).toBeCloseTo(0.5, 6);
  });

  it('dans le repos, le questionnaire scoré pèse deux fois l’agenda', () => {
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
      Q_MOD_01: ACTIVITE_NULLE,
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
      Q_MOD_01: ACTIVITE_PARTIELLE,
    });
    const psqiSeul = calculerCouvertureBesoin(5, { Q_SOM_01: psqiModere })!;
    const activiteSeule = calculerCouvertureBesoin(5, {
      Q_MOD_01: ACTIVITE_PARTIELLE,
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

  // ── Recueil partiel : la couverture ne se lit pas sur un instrument tronqué ──
  //
  // Ici le total N'EST PAS servi à côté d'une bande, il EST la lecture :
  // couverture = total ÷ `max` de la forme COMPLÈTE. Un item non répondu étant
  // ignoré et non compté 0, le total sort trop bas — et sur une source
  // `inverser: true` l'erreur devient RASSURANTE.

  it('Q_STR_03 partiel — la couverture ne monte plus quand la mesure manque', () => {
    // Le cas qui mord. `Q_STR_03` sert le besoin 9 avec `inverser: true` et
    // `max: 55` : moins le patient répond, plus le total est bas, plus
    // `1 - ratio` est haut. Trois items sur onze suffisaient à faire sortir
    // « besoin bien couvert » d'un instrument qu'on n'a presque pas administré.
    const items = QUESTIONNAIRE_CATALOGUE.Q_STR_03.sections
      .flatMap((s: any) => s.questions.map((q: any) => q.id));
    const partiel: Record<string, number> = {};
    for (const id of items.slice(0, 3)) partiel[id] = 5;

    const source = { idQuestionnaire: 'Q_STR_03', max: 55, inverser: true } as const;
    expect(calculerCouvertureSource(source, { Q_STR_03: partiel })).toBeNull();

    // Et sur la forme complète, la source compte toujours : sans cette moitié,
    // une garde qui rendrait `null` en toutes circonstances passerait.
    const complet: Record<string, number> = {};
    for (const id of items) complet[id] = 5;
    const couvertureComplete = calculerCouvertureSource(source, { Q_STR_03: complet });
    expect(couvertureComplete).not.toBeNull();
  });

  it('toutes les sources partielles — le besoin est NON MESURÉ, jamais 0', () => {
    // La distinction qui compte pour « Mon équilibre » : `null` sort du calcul,
    // `0` y entre et passe sous le seuil d'effondrement, plafonnant le score
    // global sur une mesure qui n'existe pas. C'est la doctrine « non mesuré,
    // jamais 0 » du dépôt, appliquée un étage plus bas que les moteurs.
    const partielDe = (id: 'Q_STR_01' | 'Q_STR_02' | 'Q_STR_03', combien: number) => {
      const items = (QUESTIONNAIRE_CATALOGUE as any)[id].sections
        .flatMap((s: any) => s.questions.map((q: any) => q.id));
      const r: Record<string, number> = {};
      for (const q of items.slice(0, combien)) r[q] = 1;
      return r;
    };
    const couverture = calculerCouvertureBesoin(9, {
      Q_STR_01: partielDe('Q_STR_01', 2),
      Q_STR_02: partielDe('Q_STR_02', 3),
      Q_STR_03: partielDe('Q_STR_03', 2),
    });
    expect(couverture).toBeNull();
    expect(couverture).not.toBe(0);
  });

  it('une source suspendue reste non mesurée dans Mon Équilibre (fail-closed)', () => {
    const couverture = calculerCouvertureSource(
      { idQuestionnaire: 'Q_PED_03', max: 324, inverser: true },
      {
        Q_PED_03: {
          CP001: 3,
          CP002: 3,
          CP003: 3,
        },
      },
    );
    expect(couverture).toBeNull();
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

// ── PSQI partiel et besoin 5 ────────────────────────────────────────────────
//
// EFFET DE BORD DU LOT DE SIGNATURE (2026-08-04), relevé en revue adversariale
// et resté sans aucune assertion jusqu'ici.
//
// `Q_SOM_01` est source du besoin 5, en `inverser: true` et `max: 21`. Depuis que
// le moteur `psqi` publie `missing`, `extraireValeurBrute` écarte une passation
// partielle — et la DIRECTION de cet effet n'est pas celle qu'on attend. Sur une
// source inversée, retirer une mesure basse est RASSURANT : le besoin 5 est une
// fondation critique, un PSQI dégradé l'effondre, et un PSQI partiel ne
// l'effondre plus. Le score global remonte au lieu de baisser.
//
// C'est ce qui a imposé le bump `VERSION_SCORE_EQUILIBRE` v8/v9 → v10/v11 : deux
// définitions du besoin 5 ne peuvent pas partager une étiquette.
describe('besoin 5 — le PSQI partiel n’est plus une mesure', () => {
  /** Les 18 items cotés. Total 0/21 : sommeil au mieux, couverture 1. */
  const PSQI_COMPLET_AU_MIEUX: Record<string, number> = {
    Q1: 23, Q2: 10, Q3: 7, Q4: 8,
    Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
    Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
    Q6: 0, Q7: 0, Q8: 0, Q9: 0,
  };

  it('une passation COMPLÈTE renseigne toujours le besoin 5', () => {
    // Contre-épreuve : sans elle, une garde qui écarterait TOUTE passation
    // passerait le test suivant sans rien protéger.
    const couverture = calculerCouvertureBesoin(5, { Q_SOM_01: PSQI_COMPLET_AU_MIEUX });
    expect(couverture).toBeCloseTo(1, 6);
  });

  it('un SEUL item manquant rend le besoin 5 non mesuré, et non mieux couvert', () => {
    const { Q5j, ...dixSeptSurDixHuit } = PSQI_COMPLET_AU_MIEUX;
    void Q5j;
    expect(calculerCouvertureBesoin(5, { Q_SOM_01: dixSeptSurDixHuit })).toBeNull();
  });

  it('LE PLAFOND DE FONDATION CRITIQUE TOMBE — c’est ce qui impose le bump', () => {
    // LA contre-épreuve du bump de version, et elle manquait : les trois autres
    // bancs s'arrêtent à « la couverture devient null », alors que la phrase qui
    // motive tout est « la fondation critique disparaît, le plafond de 50 tombe,
    // le score global REMONTE ». Sans cette assertion, la justification du bump
    // n'est tenue par rien.
    //
    // Même patient, mêmes réponses aux autres besoins. Seul change le PSQI :
    // complet et dégradé d'un côté, amputé d'un item de l'autre.
    const autresBesoins: Record<number, number> = {};
    for (const id of [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]) autresBesoins[id] = 1;

    // PSQI complet à 16/21 → couverture repos 1 − 16/21 = 0,238, sous le seuil
    // d'effondrement 0,34 du besoin 5. Le total est celui du moteur, mesuré :
    // une première rédaction de ce banc visait 14 et sortait à 10, donc au-dessus
    // du seuil — le test rougissait pour la bonne raison.
    const psqiDegrade = {
      Q1: 0, Q2: 60, Q3: 7, Q4: 4,
      Q5a: 3, Q5b: 3, Q5c: 2, Q5d: 1, Q5e: 1,
      Q5f: 1, Q5g: 1, Q5h: 1, Q5i: 2, Q5j: 0,
      Q6: 2, Q7: 1, Q8: 2, Q9: 2,
    };
    const couvertureDegradee = calculerCouvertureBesoin(5, { Q_SOM_01: psqiDegrade });
    expect(couvertureDegradee).not.toBeNull();
    expect(couvertureDegradee as number).toBeLessThan(0.34);

    const avec = agregerEquilibre({ ...autresBesoins, 5: couvertureDegradee });
    expect(avec.plafondApplique).toBe(true);
    expect(avec.scoreGlobal).toBe(PLAFOND_FONDATION_CRITIQUE);

    // Le MÊME patient, à qui il manque un seul item : le besoin 5 n'est plus
    // mesuré, la fondation critique ne peut plus s'effondrer, et le score passe
    // au-dessus du plafond. C'est une remontée, pas une protection.
    const { Q5j, ...ampute } = psqiDegrade;
    void Q5j;
    expect(calculerCouvertureBesoin(5, { Q_SOM_01: ampute })).toBeNull();

    const sans = agregerEquilibre({ ...autresBesoins, 5: null });
    expect(sans.plafondApplique).toBe(false);
    expect(sans.scoreGlobal as number).toBeGreaterThan(PLAFOND_FONDATION_CRITIQUE);
  });

  it('un PSQI partiel DÉGRADÉ ne remonte pas la couverture — il la retire', () => {
    // LE cas qui compte. Huit items sur dix-huit, `Q5b` au pire : le moteur rend
    // un total de 1/21, qui se lirait « 1 − 1/21 = 0,95 » — un sommeil presque
    // parfait, tiré d'un instrument à moitié rempli et d'un patient qui déclare
    // se réveiller trois fois ou plus par semaine.
    const partielDegrade = { Q1: 23, Q2: 10, Q3: 7, Q4: 8, Q5b: 3, Q6: 0, Q7: 0, Q8: 0 };
    expect(calculerCouvertureBesoin(5, { Q_SOM_01: partielDegrade })).toBeNull();
  });
});

// ── Q_STR_01 partiel et besoin 9 ────────────────────────────────────────────
//
// TROISIÈME OCCURRENCE DE LA MÊME CLASSE (D-055 / LOT-08, revue wn-reviewer B1) :
// `group_majority` publie désormais `missing` à la racine, donc
// `extraireValeurBrute` écarte une passation partielle de `Q_STR_01` — source du
// besoin 9, `inverser: true`, `max: 42`, fondation critique. Même direction
// contre-intuitive que le PSQI (besoin 5) et le TFD (besoin 4) : retirer une
// mesure basse est RASSURANT, le plafond de fondation critique peut tomber, et
// c'est ce qui a imposé le bump v12/v13 → v14/v15.
describe('besoin 9 — le Q_STR_01 partiel n’est plus une mesure', () => {
  const ITEMS_STR_01 = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
    'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14',
    'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21',
  ];
  const COMPLET_AU_MIEUX: Record<string, number> = Object.fromEntries(
    ITEMS_STR_01.map(id => [id, 0]),
  );

  it('une passation COMPLÈTE renseigne toujours le besoin 9 — contre-épreuve', () => {
    expect(calculerCouvertureBesoin(9, { Q_STR_01: COMPLET_AU_MIEUX })).toBeCloseTo(1, 6);
  });

  it('un SEUL item manquant rend le besoin 9 non mesuré, et non mieux couvert', () => {
    const { C21, ...vingtSurVingtEtUn } = COMPLET_AU_MIEUX;
    void C21;
    expect(calculerCouvertureBesoin(9, { Q_STR_01: vingtSurVingtEtUn })).toBeNull();
  });

  it('LE PLAFOND DE FONDATION CRITIQUE TOMBE — c’est ce qui impose le bump', () => {
    // Même patient, mêmes réponses aux autres besoins. Seul change `Q_STR_01` :
    // complet et sévère d'un côté, amputé d'un item de l'autre. Le seuil de
    // bascule (total >= 28 → couverture 1 − 28/42 = 0,333 < 0,34) vaut quand
    // `Q_STR_01` est la SEULE source répondue du besoin 9 — c'est le cas ici,
    // ni Q_STR_02 ni Q_STR_03 ne sont fournis.
    const autresBesoins: Record<number, number> = {};
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]) autresBesoins[id] = 1;

    // 14 items à 2 (les groupes A et B entiers), les 7 autres à 0 : total 28/42.
    const severe: Record<string, number> = Object.fromEntries(
      ITEMS_STR_01.map(id => [id, id.startsWith('C') ? 0 : 2]),
    );
    const couvertureSevere = calculerCouvertureBesoin(9, { Q_STR_01: severe });
    expect(couvertureSevere).not.toBeNull();
    expect(couvertureSevere as number).toBeLessThan(0.34);

    const avec = agregerEquilibre({ ...autresBesoins, 9: couvertureSevere });
    expect(avec.plafondApplique).toBe(true);
    expect(avec.scoreGlobal).toBe(PLAFOND_FONDATION_CRITIQUE);

    // Le MÊME patient, à qui il manque un seul item : plus de mesure, plus de
    // fondation critique effondrée, le score passe au-dessus du plafond. Une
    // remontée, pas une protection — la raison exacte du bump d'étiquette.
    const { C21, ...ampute } = severe;
    void C21;
    expect(calculerCouvertureBesoin(9, { Q_STR_01: ampute })).toBeNull();

    const sans = agregerEquilibre({ ...autresBesoins, 9: null });
    expect(sans.plafondApplique).toBe(false);
    expect(sans.scoreGlobal as number).toBeGreaterThan(PLAFOND_FONDATION_CRITIQUE);
  });

  it('un Q_STR_01 partiel BAS ne remonte pas la couverture — il la retire', () => {
    // LE cas qui motive la garde : un item par groupe, à 2. Le moteur rend un
    // total de 6/42, qui se lirait « 1 − 6/42 = 0,86 » — un stress bien géré,
    // tiré d'un instrument rempli à trois items sur vingt et un.
    expect(calculerCouvertureBesoin(9, { Q_STR_01: { A1: 2, B8: 2, C15: 2 } })).toBeNull();
  });
});
