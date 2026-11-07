import { describe, expect, it } from 'vitest';
import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import type { ContradictionFinding } from './contradictionFinding';
import {
  BORNES_GRADUATION_CONVERGENCE,
  CONDITIONS_SANS_COMPTE_V1,
  EXCLUSIONS_CONVERGENCE_V1,
  RATTACHEMENTS_CONVERGENCE_V1,
} from './convergenceV1';
import { cleCondition, conditionsDeLaFeuille, evaluerConvergences } from './convergenceEngine';
import { evaluerOrientationDetaillee, type ReponseOrientation } from './orientationEngine';
import {
  FENETRES_FRAICHEUR_ORIENTATION,
  ORIENTATION_RULES_V1,
  feuillesDuDeclencheur,
} from './orientationRulesV1';

// Bancs du producteur de convergence — H98 ([[D-443]] §8, [[D-450]] §6,
// [[D-453]] §8). Ils tournent sur la VRAIE table d'orientation : c'est elle que
// la convergence lit en production, et un banc sur une table de fantaisie
// laisserait passer un rattachement faux.

const MAINTENANT = Date.parse('2026-11-07T12:00:00.000Z');
const FRAIS = '2026-11-05T10:00:00.000Z';
const ANCIEN = '2026-09-01T10:00:00.000Z';

let compteur = 0;
function passation(idQuestionnaire: string, scores: Record<string, unknown>, dateReponse = FRAIS): ReponseOrientation {
  compteur += 1;
  return { idQuestionnaire, dateReponse, idReponse: `rep-${compteur}`, scores, statutValidite: 'VALID' };
}

/** Moteur `subscore` : comptes par axe (`repondus`/`items`). */
function axes(valeurs: Record<string, number>, complet = true): Record<string, unknown> {
  return {
    subScores: Object.entries(valeurs).map(([id, total]) => ({
      id, label: id, total, repondus: complet ? 5 : 3, items: 5,
    })),
  };
}

/** Moteur `plaintes_actuelles` : un domaine EST un item, aucun compte publié. */
function plaintes(valeurs: Record<string, number>): Record<string, unknown> {
  return { subScores: Object.entries(valeurs).map(([id, total]) => ({ id, label: id, total, max: 10 })) };
}

/** Score global coté, recueil complet. */
function global(interpretation: { label?: string; color?: string }): Record<string, unknown> {
  return { total: 12, missing: 0, repondus: 19, interpretation };
}

function drapeaux(partiel: Partial<DrapeauxAnamnese>): DrapeauxAnamnese {
  return {
    signauxAlerte: [], antecedentsDomaines: [], facteursDeclenchants: [], attentes: [],
    automedication: [], intolerancesAlimentaires: [], symptomesFonctionnels: [],
    debut: null, evolution: null, variationPoids: null,
    ...partiel,
  };
}

function convergences(reponses: ReponseOrientation[], d?: DrapeauxAnamnese): ContradictionFinding[] {
  return evaluerConvergences({
    reponses,
    drapeaux: d,
    regles: ORIENTATION_RULES_V1,
    maintenantMs: MAINTENANT,
    fenetres: FENETRES_FRAICHEUR_ORIENTATION,
  });
}

function parId(constats: ContradictionFinding[]): Record<string, ContradictionFinding> {
  return Object.fromEntries(constats.map(c => [c.id, c]));
}

const RESPIRATOIRE = 'Respiratoire / apnée du sommeil';
const PSYCHIATRIQUE = 'Psychiatrique (anxiété, dépression, burn-out)';
const DIGESTIF = 'Digestif (SII, reflux, MICI…)';
const ALI_DEFAVORABLE = 'Alimentation très déséquilibrée et défavorable';

describe('table de convergence — alignement sur les règles publiées ([[D-453]] §8)', () => {
  const publiees = ORIENTATION_RULES_V1.filter(r => r.statut === 'publiee');
  const conditionsDesRegles = new Set(publiees.flatMap(regle => regle.declencheurs
    .flatMap(feuillesDuDeclencheur)
    .flatMap(conditionsDeLaFeuille)
    .map(({ condition }) => cleCondition(condition))));
  const rattachees = RATTACHEMENTS_CONVERGENCE_V1.map(r => cleCondition(r.condition));
  const sansCompte = CONDITIONS_SANS_COMPTE_V1.map(c => cleCondition(c.condition));

  it('chaque condition des règles publiées est rattachée OU déclarée sans compte', () => {
    const orphelines = [...conditionsDesRegles].filter(cle => !rattachees.includes(cle) && !sansCompte.includes(cle));
    expect(orphelines).toEqual([]);
  });

  it('aucune entrée de la table n’est orpheline ni double', () => {
    expect([...rattachees, ...sansCompte].filter(cle => !conditionsDesRegles.has(cle))).toEqual([]);
    expect(rattachees.filter(cle => sansCompte.includes(cle))).toEqual([]);
    expect(new Set(rattachees).size).toBe(rattachees.length);
    expect(new Set(sansCompte).size).toBe(sansCompte.length);
  });

  it('quatorze rattachements et quatre conditions sans compte, comme la décision', () => {
    expect(RATTACHEMENTS_CONVERGENCE_V1).toHaveLength(14);
    expect(CONDITIONS_SANS_COMPTE_V1).toHaveLength(4);
  });

  it('Q_ALI_01 n’est rattaché qu’au besoin 1, et l’exclusion du besoin 4 est écrite', () => {
    const ali = RATTACHEMENTS_CONVERGENCE_V1.filter(r =>
      r.condition.type === 'instrument' && r.condition.idQuestionnaire === 'Q_ALI_01');
    expect(ali.map(r => r.besoins)).toEqual([[1]]);
    expect(EXCLUSIONS_CONVERGENCE_V1).toContainEqual(expect.objectContaining({ idQuestionnaire: 'Q_ALI_01', besoin: 4 }));
  });

  it('une règle ajoutée sans rattachement rougit le banc', () => {
    const regle = {
      ...publiees[0], id: 'R-TEST-NOUVELLE',
      declencheurs: [{ type: 'comparaison' as const, idQuestionnaire: 'Q_NEU_11', operateur: '>=' as const, valeur: 8 }],
    };
    const cles = regle.declencheurs.flatMap(feuillesDuDeclencheur).flatMap(conditionsDeLaFeuille)
      .map(({ condition }) => cleCondition(condition));
    expect(cles.filter(cle => !rattachees.includes(cle) && !sansCompte.includes(cle))).toEqual(['instrument:Q_NEU_11:']);
  });

  it('les bornes de la graduation sont celles de [[D-443]] §1', () => {
    expect(BORNES_GRADUATION_CONVERGENCE).toEqual([
      { minFamilles: 4, graduation: 'CONVERGENCE_FORTE' },
      { minFamilles: 3, graduation: 'CONVERGENCE_MODEREE' },
      { minFamilles: 2, graduation: 'CONVERGENCE_FAIBLE' },
      { minFamilles: 1, graduation: 'SIGNAL' },
    ]);
  });
});

describe('scénarios présentés au responsable ([[D-453]] §8)', () => {
  it('sommeil mesuré et antécédent respiratoire déclaré : CONVERGENCE_FAIBLE au besoin 5', () => {
    const constats = parId(convergences(
      [passation('Q_MOD_01', axes({ SOMMEIL: 10 }))],
      drapeaux({ antecedentsDomaines: [RESPIRATOIRE] }),
    ));
    const b5 = constats['CONV-B5'];
    expect(b5).toMatchObject({ forme: 'CONVERGENCE', graduation: 'CONVERGENCE_FAIBLE' });
    expect(b5.sources.map(s => s.type)).toEqual(['instrument', 'anamnese']);
    expect(b5.description).toContain('antécédent respiratoire / apnée du sommeil déclaré');
    expect(b5.description).toContain('R2-SOM-04');
    expect(b5.description).not.toMatch(/confirm|actif|active/i);
    expect(Object.keys(constats)).toEqual(['CONV-B5']);
  });

  it('questionnaire alimentaire défavorable : SIGNAL au besoin 1, aucun signal digestif', () => {
    const constats = parId(convergences([passation('Q_ALI_01', global({ label: ALI_DEFAVORABLE, color: 'danger' }))]));
    expect(Object.keys(constats)).toEqual(['CONV-B1']);
    expect(constats['CONV-B1']).toMatchObject({ graduation: 'SIGNAL' });
    expect(constats['CONV-B1'].justificationClaims).toEqual([{ claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' }]);
  });

  it('une règle sans condition rattachée n’ouvre rien : « moral » et antécédent psychiatrique seuls', () => {
    expect(convergences(
      [passation('Q_MOD_03', plaintes({ moral: 9 }))],
      drapeaux({ antecedentsDomaines: [PSYCHIATRIQUE] }),
    )).toEqual([]);
  });

  it('la plainte « moral » reste visible sans compter dans la carte du besoin 8', () => {
    const constats = parId(convergences(
      [passation('Q_INF_03', axes({ DA: 12 })), passation('Q_MOD_03', plaintes({ moral: 9 }))],
      drapeaux({ antecedentsDomaines: [PSYCHIATRIQUE] }),
    ));
    const b8 = constats['CONV-B8'];
    expect(b8).toMatchObject({ graduation: 'SIGNAL' });
    // Les sources ne portent que ce qui compte : le DNSM, une fois.
    expect(b8.sources).toEqual([expect.objectContaining({ type: 'instrument', idQuestionnaire: 'Q_INF_03' })]);
    const visibles = b8.limitations.filter(l => l.startsWith('Visible sans compter'));
    expect(visibles).toHaveLength(2);
    expect(visibles[0]).toContain('plainte « moral » — plainte globale, composante à préciser');
    expect(visibles[0]).toContain('le 05/11/2026');
    expect(visibles[1]).toContain(`antécédent « ${PSYCHIATRIQUE} » déclaré`);
  });

  it('source partagée : une condition compte au plus une fois par besoin', () => {
    // Q_MOD_01 / ADAPTATION_STRESS est lue par trois règles (R2-STR-01, -02,
    // -03) : une condition, une famille, un instrument nommé une fois.
    const constats = parId(convergences(
      [passation('Q_MOD_01', axes({ ADAPTATION_STRESS: 5 }))],
      drapeaux({ facteursDeclenchants: ['Stress aigu / burn-out'] }),
    ));
    const b9 = constats['CONV-B9'];
    expect(b9).toMatchObject({ graduation: 'CONVERGENCE_FAIBLE' });
    expect(b9.sources.filter(s => s.type === 'instrument')).toHaveLength(1);
    expect(b9.description).toContain('R2-STR-01, R2-STR-02, R2-STR-03');
  });

  it('digestion à 4 comptée hors de sa règle quand le besoin 4 est ouvert par une autre', () => {
    const sansAntecedent = parId(convergences([
      passation('Q_GAS_01', global({ color: 'warning' })),
      passation('Q_MOD_03', plaintes({ digestion: 5 })),
    ]));
    const b4 = sansAntecedent['CONV-B4'];
    expect(b4).toMatchObject({ graduation: 'SIGNAL' });
    expect(b4.description).toContain('Règle déclenchée sur ce besoin : R-GAS-01.');
    expect(b4.description).toContain('Condition comptée hors de sa règle : Q_MOD_03.');

    const avecAntecedent = parId(convergences([
      passation('Q_GAS_01', global({ color: 'warning' })),
      passation('Q_MOD_03', plaintes({ digestion: 5 })),
    ], drapeaux({ antecedentsDomaines: [DIGESTIF] })));
    expect(avecAntecedent['CONV-B4']).toMatchObject({ graduation: 'CONVERGENCE_FAIBLE' });
    expect(avecAntecedent['CONV-B4'].description).not.toContain('hors de sa règle');
  });

  it('sans règle déclenchée sur le besoin, une condition atteinte ne produit rien', () => {
    // Digestion à 5 seule : R2-GAS-01 (>= 7) ne déclenche pas, R2-GAS-02
    // attend l'antécédent. Le besoin 4 n'est pas ouvert ([[D-450]] §3).
    expect(convergences([passation('Q_MOD_03', plaintes({ digestion: 5 }))])).toEqual([]);
  });
});

describe('ce qui ne compte pas ([[D-450]] §6, `DC-24`)', () => {
  it('une passation périmée ne compte pas, et sa règle n’ouvre rien', () => {
    expect(convergences([passation('Q_MOD_01', axes({ SOMMEIL: 10 }), ANCIEN)])).toEqual([]);
    const constats = parId(convergences([
      passation('Q_MOD_01', axes({ SOMMEIL: 10 }), ANCIEN),
      passation('Q_SOM_01', global({ color: 'warning' })),
    ]));
    expect(constats['CONV-B5'].sources).toEqual([expect.objectContaining({ idQuestionnaire: 'Q_SOM_01' })]);
  });

  it('un axe incomplet n’est pas atteint et ne compte pas', () => {
    expect(convergences([passation('Q_MOD_01', axes({ SOMMEIL: 10 }, false))])).toEqual([]);
  });

  it('une zone atteinte par plancher ouvre le besoin sans compter (arbitrage du 2026-11-07)', () => {
    const psqiPlancher = {
      total: 9, repondus: 15, missing: 4, interpretation: null,
      bandePlancher: {
        garanti: true, label: 'Troubles du sommeil', color: 'warning',
        labelsPossibles: ['Troubles du sommeil'], couleursPossibles: ['warning', 'danger'],
      },
    };
    const reponses = [passation('Q_SOM_01', psqiPlancher)];
    // Contre-épreuve : R-SOM-01 déclenche bien sur ce plancher.
    const orientation = evaluerOrientationDetaillee({
      reponses, idsQuestionnairesAssignes: [], regles: ORIENTATION_RULES_V1,
      maintenantMs: MAINTENANT, fenetres: FENETRES_FRAICHEUR_ORIENTATION,
    });
    expect(orientation.recommandations.some(r => r.motifs.some(m => m.regleId === 'R-SOM-01'))).toBe(true);
    // Le PSQI ne compte pas : sans autre source, aucun constat.
    expect(convergences(reponses)).toEqual([]);
    // Une déclaration rattachée au besoin 5 compte alors seule, hors de sa règle.
    const avecAnamnese = parId(convergences(reponses, drapeaux({ antecedentsDomaines: [RESPIRATOIRE] })));
    expect(avecAnamnese['CONV-B5'].sources).toEqual([expect.objectContaining({ type: 'anamnese' })]);
    expect(avecAnamnese['CONV-B5']).toMatchObject({ graduation: 'SIGNAL' });
  });

  it('une anamnèse non lue n’atteint aucune déclaration', () => {
    const constats = parId(convergences([passation('Q_MOD_01', axes({ SOMMEIL: 10 }))]));
    expect(constats['CONV-B5']).toMatchObject({ graduation: 'SIGNAL' });
    expect(constats['CONV-B5'].sources.every(s => s.type === 'instrument')).toBe(true);
  });

  it('une source qui ne sait pas nommer sa passation n’est pas servie', () => {
    const sansId = { ...passation('Q_MOD_01', axes({ SOMMEIL: 10 })), idReponse: undefined };
    expect(convergences([sansId])).toEqual([]);
  });
});

describe('déduplication par famille ([[D-443]] §2, règle 1)', () => {
  it('quatre instruments concordants restent UNE famille AUTO : SIGNAL', () => {
    const constats = parId(convergences([
      passation('Q_MOD_01', axes({ SOMMEIL: 10, RYTHME_BIOLOGIQUE: 10 })),
      passation('Q_MOD_03', plaintes({ sommeil: 8 })),
      passation('Q_SOM_01', global({ color: 'danger' })),
    ]));
    const b5 = constats['CONV-B5'];
    expect(b5).toMatchObject({ graduation: 'SIGNAL' });
    // Un instrument une fois, dans l'ordre de la table des règles — stable.
    expect(b5.sources.map(s => (s.type === 'instrument' ? s.idQuestionnaire : s.type)))
      .toEqual(['Q_MOD_01', 'Q_MOD_03', 'Q_SOM_01']);
  });
});

describe('garde-fou de [[D-041]] sur l’objet produit (contre-épreuve)', () => {
  const constats = convergences(
    [passation('Q_MOD_01', axes({ SOMMEIL: 10 }))],
    drapeaux({ antecedentsDomaines: [RESPIRATOIRE] }),
  );

  it('les clés réelles sont exactement celles du type, plus la graduation', () => {
    expect(constats).not.toHaveLength(0);
    for (const constat of constats) {
      expect(Object.keys(constat).sort()).toEqual([
        'actionSuggeree', 'audience', 'description', 'ecartJoursEntreSources', 'forme', 'graduation',
        'hypotheses', 'id', 'importance', 'justificationClaims', 'limitations', 'regleId', 'resolution', 'sources',
      ]);
    }
  });

  it('aucune clé ni sous-clé de certitude, de probabilité, de score ou de confiance', () => {
    const interdites = /certitu|probab|score|confian|vraisembl|fiabil|likelihood|confidence|certainty/i;
    const cles: string[] = [];
    const parcourir = (valeur: unknown) => {
      if (!valeur || typeof valeur !== 'object') return;
      for (const [cle, sous] of Object.entries(valeur)) {
        cles.push(cle);
        parcourir(sous);
      }
    };
    parcourir(constats);
    expect(cles.filter(cle => interdites.test(cle))).toEqual([]);
  });

  it('chaque constat porte des claims et des limitations, jamais vides', () => {
    for (const constat of constats) {
      expect(constat.justificationClaims.length).toBeGreaterThan(0);
      expect(constat.limitations.length).toBeGreaterThan(0);
      expect(constat.importance).toBe('useful_not_urgent');
    }
  });
});

describe('aucun effet sur l’extinction ([[D-055]] M8)', () => {
  it('la sortie d’orientation est identique avec et sans les convergences', () => {
    const reponses = [
      passation('Q_MOD_01', axes({ SOMMEIL: 10 })),
      passation('Q_SOM_01', global({ color: 'danger' })),
    ];
    const constats = convergences(reponses, drapeaux({ antecedentsDomaines: [RESPIRATOIRE] }));
    expect(constats.length).toBeGreaterThan(0);
    const entree = {
      reponses, idsQuestionnairesAssignes: [], regles: ORIENTATION_RULES_V1,
      maintenantMs: MAINTENANT, fenetres: FENETRES_FRAICHEUR_ORIENTATION,
    };
    expect(evaluerOrientationDetaillee({ ...entree, contradictions: constats }))
      .toEqual(evaluerOrientationDetaillee({ ...entree, contradictions: [] }));
  });
});
