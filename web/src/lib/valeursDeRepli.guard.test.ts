// Banc des valeurs de repli et des seuils monotones — 2026-07-29.
//
// Ce banc ne rejoue pas la garde « un axe non mesuré vaut `null` » : elle est
// posée, et `axeNonMesure.guard.test.ts` la tient. Il ferme les quatre résidus
// qu'elle laisse passer, tous mesurés sur le moteur tel qu'il était après ce
// lot-là, et tous de la même famille — **une donnée absente ou incomplète prise
// pour une donnée basse**.
//
// La garde précédente répond à « cet axe a-t-il été mesuré ? ». Ces quatre cas
// vivent ailleurs : dans un axe MESURÉ dont une réponse légitime est écrasée par
// un défaut, et dans une GRILLE lue sur un comptage incomplet.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';

const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as any)[id].sections ?? []).flatMap((s: any) => s.questions ?? []);

/** PSQI complet, hors les quatre items d'horaires que chaque cas fixe lui-même. */
const PSQI_SOCLE = {
  Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
  Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
  Q6: 0, Q7: 0, Q8: 0, Q9: 0,
};

describe('valeurs de repli — un défaut ne remplace qu’une ABSENCE', () => {
  it('PSQI : zéro heure de sommeil déclarée ne se lit plus « sept heures »', () => {
    // Le pire cas de la famille. `getVal('Q4') || 7` : `0` étant falsy en
    // JavaScript, la réponse la plus GRAVE de l'échelle — aucune heure dormie —
    // était remplacée par la valeur de repli de sept heures, qui est la plus
    // rassurante. Mesuré avant correctif : `C3 = 1` (« 6 à 7 h »), `C4 = 0` (la
    // meilleure efficacité possible), total 2 sur 21.
    const r: any = calculateScore('Q_SOM_01', { ...PSQI_SOCLE, Q1: 0, Q2: 0, Q3: 7, Q4: 0 });
    // Sept heures au lit, zéro dormie : efficacité nulle, durée au plus mauvais
    // barreau. Attendus écrits à la main.
    expect(r.efficiency).toBe(0);
    expect(r.components.find((c: any) => c.id === 'C3').val).toBe(3);
    expect(r.components.find((c: any) => c.id === 'C4').val).toBe(3);
    expect(r.total).toBe(6);
  });

  it('PSQI : un coucher à minuit ne se lit plus « 23 h », un endormissement immédiat plus « 30 min »', () => {
    // Deux autres réponses légitimes valant `0`. Les valeurs sont choisies pour
    // ENJAMBER un barreau de barème : un attendu que le repli rendrait identique
    // ne prouverait rien.
    //
    // Minuit → 7 h, six heures dormies : sept heures au lit, 86 % d'efficacité,
    // le meilleur barreau. Le repli lisait 23 h, donc huit heures au lit et 75 %,
    // qui vaut un point de plus. Et `Q2 = 0` lu « 30 min » en vaut un autre.
    const r: any = calculateScore('Q_SOM_01', { ...PSQI_SOCLE, Q1: 0, Q2: 0, Q3: 7, Q4: 6 });
    expect(r.efficiency).toBe(86);
    expect(r.components.find((c: any) => c.id === 'C4').val).toBe(0);
    expect(r.components.find((c: any) => c.id === 'C2').val).toBe(0);
    expect(r.total).toBe(1);
  });

  it('PSQI : le repli continue de compléter une composante partiellement renseignée', () => {
    // Le risque symétrique : `??` ne doit pas retirer le comportement voulu. `C2`
    // lit `Q2` et `Q5a` ; `Q5a` absent, la composante reste mesurée et le repli
    // vaut toujours pour lui.
    // Attendu écrit à la main : latence de 45 min → 2 points, plus `Q5a` absent
    // → 0 par repli, soit une somme de 2, qui vaut `C2 = 1`.
    const r: any = calculateScore('Q_SOM_01', { ...PSQI_SOCLE, Q2: 45, Q5a: null } as any);
    expect(r.components.find((c: any) => c.id === 'C2').val).toBe(1);
  });

  it('Francis : une absence de douleur déclarée n’est plus reprise d’un autre item', () => {
    // Les identifiants hérités (`FR1`…`FR5`) et courants (`FR_Q00x`) coexistent.
    // Chaînés en `||`, une intensité déclarée à `0` — « aucune douleur » —
    // retombait sur l'identifiant hérité et pouvait ressortir sous SA valeur.
    const r: any = calculateScore('Q_GAS_02', {
      FR_Q002: 0, FR1: 80,
      FR_Q003: 5, FR_Q005: 10, FR_Q006: 10, FR_Q007: 10,
    });
    expect(r.components.find((c: any) => c.id === 'FR_Q002').val).toBe(0);

    // Et l'identifiant hérité sert toujours quand le courant est ABSENT.
    const herite: any = calculateScore('Q_GAS_02', {
      FR1: 80, FR_Q003: 5, FR_Q005: 10, FR_Q006: 10, FR_Q007: 10,
    });
    expect(herite.components.find((c: any) => c.id === 'FR_Q002').val).toBe(80);
  });
});

describe('seuils monotones — « true » s’affirme tôt, « false » exige le complet', () => {
  it('IDTAS-AE : un dépistage dépressif n’est plus déclaré négatif sur deux items de neuf', () => {
    // `partie1 > 5` rendait `false` dès que la partie était MESURÉE, c'est-à-dire
    // dès un seul item. Deux « oui » sur neuf sortaient donc « pas de dépression
    // majeure probable », d'un patient à qui sept questions n'avaient pas été
    // posées. C'est la moitié du couple de booléens que ce moteur sert au modèle
    // de synthèse, l'autre étant `suicidalIdeation`.
    const deuxOui: any = calculateScore('Q_NEU_12', { IA1: 1, IA2: 1 });
    expect(deuxOui.parts.find((p: any) => p.id === 'P1').total).toBe(2);
    expect(deuxOui.parts.find((p: any) => p.id === 'P1').probableMajorDepression).toBeNull();

    // Franchi : la monotonie autorise à l'affirmer sans attendre le reste. Six
    // « oui » dépassent le seuil de cinq, que les trois derniers items soient
    // renseignés ou non — et effacer un dépistage POSITIF serait l'erreur la plus
    // coûteuse des deux.
    const sixOui: any = calculateScore('Q_NEU_12',
      Object.fromEntries(['IA1','IA2','IA3','IA4','IA5','IA6'].map(i => [i, 1])));
    expect(sixOui.parts.find((p: any) => p.id === 'P1').probableMajorDepression).toBe(true);

    // Non franchi ET complet : c'est un vrai « non ».
    const neufNon: any = calculateScore('Q_NEU_12',
      Object.fromEntries(['IA1','IA2','IA3','IA4','IA5','IA6','IA7','IA8','IA9'].map(i => [i, 0])));
    expect(neufNon.parts.find((p: any) => p.id === 'P1').probableMajorDepression).toBe(false);
  });

  it('IDTAS-AE : un motif saisonnier n’est plus infirmé sur un calendrier incomplet', () => {
    // Même asymétrie sur un instrument SAISONNIER, où l'absence de motif est la
    // conclusion rassurante.
    // Les mois d'hiver déclarés sont `IMA9` à `IMA12` et `IMA1` — `IMA2` n'en
    // fait pas partie et ne compte pas, quel que soit son niveau.
    const deuxMois: any = calculateScore('Q_NEU_12', { IMA9: 8, IMA10: 8, IMA2: 8 });
    const p3a = deuxMois.parts.find((p: any) => p.id === 'P3A');
    expect(p3a.winterHits).toBe(2);
    expect(p3a.winterPatternLikely).toBeNull();

    // Trois mois au-dessus du seuil : le motif est acquis, calendrier complet ou
    // non.
    const troisMois: any = calculateScore('Q_NEU_12', { IMA9: 8, IMA10: 8, IMA11: 8 });
    expect(troisMois.parts.find((p: any) => p.id === 'P3A').winterPatternLikely).toBe(true);
  });

  it('un axe déclaré sans items ne passe pas pour complet', () => {
    // `every` rend `true` sur une liste vide : sans le contrôle de longueur,
    // `estComplet([])` vaudrait « complet » et `seuilMonotone` rendrait `false` —
    // c'est-à-dire un verdict négatif tiré d'un axe que la définition ne peuple
    // même pas. `Q_NEU_12` déclare bien ses mois d'hiver ; le prouver sur le
    // catalogue serait le prouver sur rien, d'où la définition forgée.
    const def = {
      sections: [{ id: 'S', questions: ['IMA1', 'IMA2', 'IMA3'].map(id => (
        { id, type: 'number', min: 0, max: 10 })) }],
      // `winterMonthsA` volontairement absent.
      scoring: { type: 'idtas_ae', monthlyPatternThreshold: 4, monthlyPatternMinMonths: 3 },
    };
    const r: any = computeScoreFromDef(def, { IMA1: 8, IMA2: 8, IMA3: 8 });
    const p3a = r.parts.find((p: any) => p.id === 'P3A');
    expect(p3a.total).toBe(24);
    expect(p3a.winterHits).toBe(0);
    expect(p3a.winterPatternLikely, 'un motif ne s’infirme pas sur une liste vide').toBeNull();
  });
});

describe('lectures de grille — un seuil ne se lit que sur un comptage complet', () => {
  it('QIF : quatre réponses sur vingt ne valent pas une rémission', () => {
    // Les quatre composantes sont MESURÉES — une réponse chacune — donc le total
    // sort, et il sort à zéro : la bande du plancher, « guérison ou très bonne
    // évolution », sur quatre réponses de vingt. La garde des axes ne pouvait pas
    // l'attraper, aucun n'étant vide.
    const uneParBloc: any = calculateScore('Q_FIB_02', { Q1: 0, Q12: 7, Q13: 0, Q14: 0 });
    expect(uneParBloc.components.every((c: any) => c.val === 0)).toBe(true);
    expect(uneParBloc.total).toBe(0);
    expect(uneParBloc.interpretation).toBeNull();

    // La passation COMPLÈTE au plancher rend bien ce verdict-là : la règle ne
    // retire pas une bande légitime.
    const plancher = Object.fromEntries(itemsDe('Q_FIB_02').map((q: any) => [q.id, 0]));
    const complet: any = calculateScore('Q_FIB_02', { ...plancher, Q12: 7 });
    expect(complet.total).toBe(0);
    expect(complet.interpretation?.label).toContain('peu compatible');

    // Et une passation partielle NON nulle garde sa bande : la règle ne mord que
    // sur le plancher, elle ne referme pas l'instrument.
    const partielNonNul: any = calculateScore('Q_FIB_02', { Q1: 10, Q12: 0, Q13: 7, Q14: 10 });
    expect(partielNonNul.total).toBeGreaterThan(0);
    expect(partielNonNul.interpretation?.label).toBeTruthy();
  });

  it('composite_multi_parties : la grille exige le comptage complet, comme celle d’idtas_ae', () => {
    // Ce moteur n'est servi par aucun instrument du catalogue : une définition
    // forgée est le seul moyen d'éprouver la garde. Elle n'exigeait que « le
    // score existe » là où `idtas_ae` exige le complet — « la même garde » n'en
    // était pas une.
    const def = {
      sections: [{ id: 'P2', questions: [
        { id: 'X1', type: 'number', min: 0, max: 12 },
        { id: 'X2', type: 'number', min: 0, max: 12 },
      ] }],
      scoring: {
        type: 'composite_multi_parties',
        parts: [{ id: 'P2', type: 'sum', items: ['X1', 'X2'] }],
        interpretation: [
          { gss_min: 0, gss_max: 5, label: 'Le problème n’est probablement pas saisonnier' },
          { gss_min: 6, gss_max: 24, label: 'Forme légère possible' },
        ],
      },
    };
    const partiel: any = computeScoreFromDef(def, { X1: 3 });
    expect(partiel.gssScore).toBe(3);
    expect(partiel.interpretation).toBeNull();

    const complet: any = computeScoreFromDef(def, { X1: 3, X2: 0 });
    expect(complet.gssScore).toBe(3);
    expect(complet.interpretation?.label).toContain('pas saisonnier');
  });
});
