import { describe, expect, it } from 'vitest';
import { agregerEquilibre, calculerCouvertureBesoin, calculerCouvertureSource, clamp01, evaluerCouvertureSource } from './score';
import { BESOIN_SOURCES, MAX_MESURE_DERIVEE_ALIMENTAIRE } from './constants';
import { QUESTIONNAIRE_CATALOGUE } from '../questions';
import { Q_ALI_01_SIIN_57 } from '../questionnaires/alimentaire';

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
  it('score global sans aucune donnée doit être null', () => {
    const vide = agregerEquilibre({});
    expect(vide.scoreGlobal).toBeNull();
  });

  it('score global parfait (couverture 1.0 partout) doit être 100', () => {
    const couverturesParfaites = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, 1])
    );
    const parfait = agregerEquilibre(couverturesParfaites);
    expect(parfait.scoreGlobal).toBe(100);
  });

  // [[D-547]], [[D-548]] : le plafonnement par fondations critiques est retiré.
  // Ce test était « le plafond se déclenche sur une fondation critique
  // effondrée » : il garde désormais l'inverse, et que les champs du plafond ne
  // sont plus produits.
  it('un besoin effondré (besoin 5) ne plafonne plus : le total est la moyenne directe', () => {
    const couverturesParfaites = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, 1])
    );
    const effondre = agregerEquilibre({ ...couverturesParfaites, 5: 0.1 });

    // (11 × 1 + 0,1) / 12 = 0,9250 → 93 ; plafonné, il aurait rendu 50.
    expect(effondre.scoreGlobal).toBe(93);
    expect(effondre).not.toHaveProperty('plafondApplique');
    expect(effondre).not.toHaveProperty('fondationsCritiquesDeclenchees');
    expect(effondre).not.toHaveProperty('scoreGlobalAvantPlafond');
  });

  it('la moyenne est directe : parts égales entre besoins, quelle que soit leur strate', () => {
    // Trois besoins du CORPS (1, 4, 5) à 1 et un de l'ESPRIT (8) à 0 : sous les
    // parts 60/20/20 de v17 ce total valait 0,6 × 1 + 0,2 × 0 renormalisé ; sous
    // la moyenne directe c'est 3 / 4.
    expect(agregerEquilibre({ 1: 1, 4: 1, 5: 1, 8: 0 }).scoreGlobal).toBe(75);
  });

  it('aucun minimum de besoins mesurés : un seul suffit, le compte dit sur quoi', () => {
    expect(agregerEquilibre({ 4: 0.9 }).scoreGlobal).toBe(90);
  });

  it('un besoin non mesuré sort de la moyenne, il n’y entre jamais comme 0', () => {
    expect(agregerEquilibre({ 1: 1, 2: null, 3: 0.5 }).scoreGlobal).toBe(75);
  });
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

  // Depuis [[D-517]], seule une enquête COMPLÈTE nourrit le besoin 3 : les
  // 53 autres items reçoivent ici la première option de leur liste, sans effet
  // sur les quatre items servis.
  const completer = (rythme: Record<string, number>): Record<string, number> => ({
    ...Object.fromEntries(
      Q_ALI_01_SIIN_57.sections.flatMap(s => s.questions).map(q => [q.id, Number((q.options ?? [])[0]?.v)]),
    ),
    ...rythme,
  });

  it('besoin 3 : une passation SIIN complète le renseigne, et seulement en position SIIN', () => {
    // Les quatre items servis, au repère : SIIN52/53/55 en Oui (1), SIIN54 à
    // 12 h de jeûne. Attendu écrit à la main : 7 points sur 7, donc couverture 1.
    const reponsesAuRepere = completer({ SIIN52: 1, SIIN53: 1, SIIN54: 12, SIIN55: 1 });
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: reponsesAuRepere }))
      .toBe(SIIN57_ACTIF ? 1 : null);
  });

  it('besoin 3 : ses quatre items complets ne suffisent plus si l’enquête est incomplète ([[D-517]])', () => {
    // D-403 §6 à la lettre (arbitrage `20261113-2123-a`) : une passation
    // partielle ne nourrit plus les besoins 1 et 3, même quand les quatre items
    // du rythme sont remplis. Vrai dans les deux positions du drapeau.
    const reponses = completer({ SIIN52: 1, SIIN53: 1, SIIN54: 12, SIIN55: 1 });
    delete reponses.SIIN01;
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: reponses })).toBeNull();
    expect(calculerCouvertureBesoin(1, { Q_ALI_01: reponses })).toBeNull();
    if (SIIN57_ACTIF) {
      const source = BESOIN_SOURCES[3].find(s => s.idQuestionnaire === 'Q_ALI_01')!;
      expect(evaluerCouvertureSource(source, { Q_ALI_01: reponses })).toEqual({ motif: 'recueil_incomplet' });
    }
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
    const horsRepere = completer({ SIIN52: 0, SIIN53: 1, SIIN54: 7, SIIN55: 1 });
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
      { idQuestionnaire: 'Q_STR_02', min: 10, max: 50, inverser: true },
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
// affirmé qu'en commentaire. Ces tests le rendent exécutable. Depuis v18/v19
// ([[D-547]]) il n'y a plus de plafond à déclencher : l'invariant qui reste est
// que `null` ne devient jamais 0 dans la moyenne.
describe('besoins sans source (invariants v4, repris en v18/v19)', () => {
  it('des besoins sans source ne tirent pas le total vers 0', () => {
    // Les besoins 1, 2, 4, 5, 9 sont non renseignés : couverture null. Si null
    // était assimilé à 0, le total tomberait ; il vaut la moyenne des trois.
    const aucuneFondationRenseignee = agregerEquilibre({ 8: 1, 10: 1, 12: 1 });
    expect(aucuneFondationRenseignee.scoreGlobal).toBe(100);
  });

  it('le besoin 2 reste non mesuré, quel que soit le Pichot', () => {
    // Pichot au maximum (fatigue extrême) : la couverture du besoin 2 est null
    // depuis v4, et n'entre pas dans la moyenne.
    const couvertureBesoin2 = calculerCouvertureBesoin(2, {
      Q_SOM_06: { P1: '4', P2: '4', P3: '4', P4: '4', P5: '4', P6: '4', P7: '4', P8: '4' },
    });
    expect(couvertureBesoin2).toBeNull();

    const avecFatigueMaximale = agregerEquilibre({ 1: 1, 2: couvertureBesoin2, 4: 1, 5: 1, 9: 1 });
    expect(avecFatigueMaximale.scoreGlobal).toBe(100);
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

  it('un PSQI dégradé ne plafonne plus le total — il pèse un besoin sur douze', () => {
    // Avant v18/v19, un PSQI complet à 16/21 effondrait le besoin 5 et ramenait
    // le total à 50 ; depuis [[D-547]] il est un besoin parmi les autres de la
    // moyenne directe. Même patient, autres besoins à 1.
    const autresBesoins: Record<number, number> = {};
    for (const id of [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]) autresBesoins[id] = 1;

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
    expect(avec.scoreGlobal).toBe(Math.round(((11 + (couvertureDegradee as number)) / 12) * 100));
    expect(avec.scoreGlobal as number).toBeGreaterThan(50);

    // Le MÊME patient, à qui il manque un seul item : le besoin 5 n'est plus
    // mesuré (la garde du recueil partiel reste), et sort de la moyenne.
    const { Q5j, ...ampute } = psqiDegrade;
    void Q5j;
    expect(calculerCouvertureBesoin(5, { Q_SOM_01: ampute })).toBeNull();
    expect(agregerEquilibre({ ...autresBesoins, 5: null }).scoreGlobal).toBe(100);
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

// ── PSS-10 seule et besoin 9 ([[D-541]] §5.1, [[D-552]]) ────────────────────
//
// Depuis v18/v19 le besoin 9 ne lit que la PSS-10 (`Q_STR_02`), avec sa borne
// basse déclarée (`min: 10`, `max: 50`) : le SIIN stress (`Q_STR_01`) et le
// Cungi (`Q_STR_03`) sortent du calcul. La garde du recueil partiel du moteur de
// la PSS-10 reste, pour la même raison qu'avant : sur une source inversée,
// retirer une mesure basse est rassurant.
describe('besoin 9 — la PSS-10 seule, de 10 à 50', () => {
  const ITEMS_PSS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
  const toutA = (valeur: number): Record<string, number> => Object.fromEntries(ITEMS_PSS.map(id => [id, valeur]));

  it('la source du besoin 9 est la PSS-10 seule, de 10 à 50, inversée', () => {
    expect(BESOIN_SOURCES[9]).toEqual([{ idQuestionnaire: 'Q_STR_02', min: 10, max: 50, inverser: true }]);
  });

  it('un patient au minimum de stress perçu (total 10) atteint 1, et non 0,8', () => {
    // Sans borne basse, 1 − 10/50 = 0,8 : le meilleur résultat possible
    // n'atteignait jamais 1 ([[D-552]] §2).
    expect(calculerCouvertureBesoin(9, { Q_STR_02: toutA(1) })).toBeCloseTo(1, 6);
  });

  it('un patient au maximum de stress perçu (total 50) tombe à 0', () => {
    expect(calculerCouvertureBesoin(9, { Q_STR_02: toutA(5) })).toBeCloseTo(0, 6);
  });

  it('le milieu de la plage (total 30) rend 0,5', () => {
    expect(calculerCouvertureBesoin(9, { Q_STR_02: toutA(3) })).toBeCloseTo(0.5, 6);
  });

  it('un SEUL item manquant rend le besoin 9 non mesuré, et non mieux couvert', () => {
    const { P10, ...neufSurDix } = toutA(1);
    void P10;
    expect(calculerCouvertureBesoin(9, { Q_STR_02: neufSurDix })).toBeNull();
  });

  it('le SIIN stress et le Cungi ne nourrissent plus le besoin 9', () => {
    const items01 = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_01.sections
      .flatMap((sec: any) => sec.questions.map((qu: any) => qu.id));
    const complet01: Record<string, number> = Object.fromEntries(items01.map((id: string) => [id, 0]));
    const items03 = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_03.sections
      .flatMap((sec: any) => sec.questions.map((qu: any) => qu.id));
    const complet03: Record<string, number> = Object.fromEntries(items03.map((id: string) => [id, 5]));
    expect(calculerCouvertureBesoin(9, { Q_STR_01: complet01 })).toBeNull();
    expect(calculerCouvertureBesoin(9, { Q_STR_03: complet03 })).toBeNull();
  });
});

// ── Besoin 1 : la mesure dérivée de l'enquête alimentaire ([[D-516]] §2.1) ──
describe('besoin 1 — la mesure dérivée, sans le sous-score du rythme', () => {
  const SIIN57_ACTIF = process.env.WN_ALI_01_SIIN57 === 'true';

  it('la source du besoin 1 retire le sous-score du rythme, sans autre arithmétique', () => {
    const source = BESOIN_SOURCES[1][0];
    expect(source.idQuestionnaire).toBe('Q_ALI_01');
    expect(source.sansSousScore).toBe('RYTHME_CHRONO');
    expect(source.sousScore).toBeUndefined();
    expect(source.max).toBe(MAX_MESURE_DERIVEE_ALIMENTAIRE);
  });

  it('sous la forme courte, le besoin 1 n’a aucune source utilisable : non évalué', () => {
    // Forme courte : aucun sous-score servi, donc max dérivé 0 — la source est
    // refusée avant toute division, jamais une couverture sur un barème que le
    // dossier ne couvre pas ([[D-516]] §6.2).
    if (SIIN57_ACTIF) return;
    expect(MAX_MESURE_DERIVEE_ALIMENTAIRE).toBe(0);
    expect(calculerCouvertureBesoin(1, { Q_ALI_01: { AL1: '1', AL2: '2' } })).toBeNull();
  });

  it('sous la forme complète, la mesure est le total moins les points du rythme', () => {
    if (!SIIN57_ACTIF) return;
    const completer = (rythme: Record<string, number>): Record<string, number> => ({
      ...Object.fromEntries(
        Q_ALI_01_SIIN_57.sections.flatMap(sec => sec.questions).map(qu => [qu.id, Number((qu.options ?? [])[0]?.v)]),
      ),
      ...rythme,
    });
    // Rythme au repère (7 points) ou à zéro : la mesure dérivée ne bouge pas,
    // alors que le total de l'instrument bouge de 7 — le double compte avec le
    // besoin 3 a disparu.
    const auRepere = calculerCouvertureBesoin(1, { Q_ALI_01: completer({ SIIN52: 1, SIIN53: 1, SIIN54: 12, SIIN55: 1 }) });
    const aZero = calculerCouvertureBesoin(1, { Q_ALI_01: completer({ SIIN52: 0, SIIN53: 0, SIIN54: 0, SIIN55: 0 }) });
    expect(auRepere).not.toBeNull();
    expect(aZero).not.toBeNull();
    expect(auRepere).toBeCloseTo(aZero as number, 9);
    // Le rythme, lui, bouge bien le besoin 3.
    expect(calculerCouvertureBesoin(3, { Q_ALI_01: completer({ SIIN52: 1, SIIN53: 1, SIIN54: 12, SIIN55: 1 }) })).toBe(1);
  });

  it('une enquête incomplète ne nourrit pas le besoin 1 (garde du recueil partiel)', () => {
    if (!SIIN57_ACTIF) return;
    const reponses: Record<string, number> = Object.fromEntries(
      Q_ALI_01_SIIN_57.sections.flatMap(sec => sec.questions).map(qu => [qu.id, Number((qu.options ?? [])[0]?.v)]),
    );
    delete reponses.SIIN01;
    expect(calculerCouvertureBesoin(1, { Q_ALI_01: reponses })).toBeNull();
  });
});

// [[D-329]] §1 — sur le vrai catalogue, les trois cas que l'audit de D-312
// (section 10) a mesurés : une réponse isolée sur un axe à sous-score rendait
// une couverture, haute ou effondrée selon le sens de la source.
describe('sous-score partiel — non mesuré, sur le vrai catalogue', () => {
  const tous = (ids: string[], valeur: string) => Object.fromEntries(ids.map(id => [id, valeur]));
  const ITEMS_HAD_D = ['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'];
  const ITEMS_ACTIVITE = [1, 2, 3, 4, 5].map(n => `ACTIVITE_PHYSIQUE_Q00${n}`);
  const ITEMS_ME = Array.from({ length: 10 }, (_, i) => `ME${i + 1}`);
  const ITEMS_RELATION = [1, 2, 3, 4, 5].map(n => `RELATION_AUX_AUTRES_Q00${n}`);

  it('besoin 8 : un seul item HAD-D répondu au minimum ne rend pas « bien couvert »', () => {
    expect(calculerCouvertureBesoin(8, { Q_NEU_11: { D2: '0' } })).toBeNull();
  });

  it('besoin 8 : l’axe D complet se lit', () => {
    expect(calculerCouvertureBesoin(8, { Q_NEU_11: tous(ITEMS_HAD_D, '0') })).toBe(1);
  });

  it('besoin 5 : un seul item d’activité au pire ne fait pas effondrer le mouvement', () => {
    // Avant D-329 : 0/20 sur le groupe « mouvement », sous le seuil
    // d'effondrement, donc un total plafonné à 50 sur une réponse.
    expect(calculerCouvertureBesoin(5, { Q_MOD_01: { ACTIVITE_PHYSIQUE_Q001: '0' } })).toBeNull();
  });

  it('besoin 5 : le bloc activité complet se lit', () => {
    expect(calculerCouvertureBesoin(5, { Q_MOD_01: tous(ITEMS_ACTIVITE, '4') })).toBe(1);
  });

  // Depuis v20/v21 ([[D-565]]), le besoin 12 lit la sous-échelle « Relation aux
  // autres » de `Q_MOD_01` : plus haut vaut mieux, chaque item se cote de 0 à 4.
  it('besoin 12 : un seul item de relation répondu au pire ne rend pas « effondré »', () => {
    expect(calculerCouvertureBesoin(12, { Q_MOD_01: { RELATION_AUX_AUTRES_Q001: '0' } })).toBeNull();
  });

  it('besoin 12 : l’axe de relation complet se lit, au mieux comme au pire', () => {
    expect(calculerCouvertureBesoin(12, { Q_MOD_01: tous(ITEMS_RELATION, '4') })).toBe(1);
    expect(calculerCouvertureBesoin(12, { Q_MOD_01: tous(ITEMS_RELATION, '0') })).toBe(0);
  });

  it('besoin 5 et besoin 12 tirés de Q_MOD_01 : chacun jugé sur son propre axe (D-565)', () => {
    // Activité physique complète, relation partielle : le besoin 5 se mesure, le 12 reste non mesuré.
    const reponses = { Q_MOD_01: { ...tous(ITEMS_ACTIVITE, '4'), RELATION_AUX_AUTRES_Q001: '4' } };
    expect(calculerCouvertureBesoin(5, reponses)).not.toBeNull();
    expect(calculerCouvertureBesoin(12, reponses)).toBeNull();
  });

  it('besoin 12 : le sous-score ME de Q_INF_03 ne l’alimente plus (D-565)', () => {
    // Même axe ME complet qu'avant : le besoin n'a plus de source dans ce questionnaire.
    expect(calculerCouvertureBesoin(12, { Q_INF_03: tous(ITEMS_ME, '0') })).toBeNull();
  });

  it('besoin 10 : seuls les axes complets entrent dans la moyenne', () => {
    const daComplet = tous(Array.from({ length: 10 }, (_, i) => `D${i + 1}`), '0');
    // Axe DA complet au mieux, axe NA à une réponse au pire : NA ne compte pas.
    expect(calculerCouvertureBesoin(10, { Q_INF_03: { ...daComplet, N1: '4' } })).toBe(1);
  });
});

describe('compterBesoinsMesures et sa mention ([[D-329]] §3)', () => {
  it('compte les seuls besoins dont la couverture n’est pas null', async () => {
    const { compterBesoinsMesures } = await import('./score');
    const resultat = agregerEquilibre({ 1: 0.5, 3: 0.8, 9: null, 12: 0.2 });
    expect(compterBesoinsMesures(resultat)).toBe(3);
    expect(compterBesoinsMesures(agregerEquilibre({}))).toBe(0);
  });

  it('accorde la mention au singulier et au pluriel', async () => {
    const { mentionBesoinsMesures } = await import('./natureIndiceGlobal');
    expect(mentionBesoinsMesures(1, 12)).toBe('Calculé sur 1 besoin mesuré sur 12');
    expect(mentionBesoinsMesures(8, 12)).toBe('Calculé sur 8 besoins mesurés sur 12');
    // Aucun besoin mesuré : aucun calcul n'est affirmé ([[D-352]] §4).
    expect(mentionBesoinsMesures(0, 12)).toBe('Non calculé : aucun besoin mesuré');
  });
});

describe('un axe partiel ne produit aucune couverture au pire ([[D-329]] §1)', () => {
  it('une seule réponse d’activité au pire ne tire pas le total', async () => {
    const { calculerEquilibre } = await import('./score');
    // Besoin 8 bien couvert (axe D complet au mieux), plus une seule réponse
    // d'activité au pire. Avant D-329 : mouvement à 0, besoin 5 effondré,
    // fondation critique déclenchée, total plafonné.
    const axeD = Object.fromEntries(['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'].map(id => [id, '0']));
    const resultat = calculerEquilibre({
      Q_NEU_11: axeD,
      Q_MOD_01: { ACTIVITE_PHYSIQUE_Q001: '0' },
    });
    expect(resultat.scoreGlobal).toBe(100);
  });
});
