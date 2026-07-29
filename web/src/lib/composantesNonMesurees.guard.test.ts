// Banc des composantes non mesurées — 2026-07-29.
//
// Suite directe du banc `sousScoreNonMesure.guard.test.ts`, et clôture de la
// réserve qu'il nommait : la garde « un axe non répondu vaut null, jamais zéro »
// n'y portait que sur les moteurs déclarant `scoring.subScores`, plus HAD. Huit
// instruments rendaient encore un axe à zéro sur une passation partielle, via
// SEPT autres moteurs — `idtas_ae` (`parts`), `psqi` (`components`), `qif`,
// `francis`, `sigh_sad_sa`, `sum_two_phases` (`phases`) et les `dimensions` de
// `sum` — auxquels s'ajoutait le total global de `plaintes_actuelles`.
//
// Mesuré sur le catalogue avant d'écrire une ligne : en ne renseignant que le
// PREMIER axe de chacun, **25 axes sur 31 sortaient chiffrés**, avec des verdicts
// dans les deux directions. « Trouble de la mémoire épisodique — consultation
// neurologique » sur un rappel différé jamais demandé ; « Pas de trouble du
// sommeil » sur un PSQI d'un item ; « pas d'idéation suicidaire » sur un
// dépistage non passé.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { calculerCouvertureBesoin } from '@/lib/equilibre/score';
import { calculerNiveauPreuveBesoin } from '@/lib/equilibre/evidence';

const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as any)[id].sections ?? []).flatMap((s: any) => s.questions ?? []);
const valMax = (q: any) => (q.options?.length
  ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value)))
  : (q.max ?? 1));
const valMin = (q: any) => (q.options?.length
  ? Math.min(...q.options.map((o: any) => Number(o.v ?? o.value)))
  : (q.min ?? 0));
const saturer = (id: string) =>
  Object.fromEntries(itemsDe(id).map((q: any) => [q.id, valMax(q)]));

/** Instrument → clé sous laquelle son moteur émet ses axes. */
const PORTEUR: Record<string, string> = {
  Q_NEU_12: 'parts', Q_SOM_01: 'components', Q_FIB_02: 'components',
  Q_GAS_02: 'components', Q_NEU_03: 'subScores', Q_GEO_06: 'phases',
  Q_CAR_01: 'dimensions', Q_GEO_04: 'dimensions', Q_MOD_03: 'subScores',
};

/**
 * Items dont la variation change la valeur d'un axe — DÉDUITS du moteur, jamais
 * lus dans la définition.
 *
 * C'est la leçon de méthode du lot précédent, appliquée d'emblée : son premier
 * balayage sélectionnait sur la DÉCLARATION (`scoring.subScores`) et était donc
 * aveugle à HAD, qui porte ses axes ailleurs — précisément là où le défaut coûtait
 * le plus. Ici la correspondance axe → items ne peut pas mentir sur ce que le
 * moteur fait, puisqu'elle est mesurée sur ce qu'il rend.
 */
function itemsParAxe(id: string, cle: string) {
  const tous = itemsDe(id);
  const plancher = Object.fromEntries(tous.map((q: any) => [q.id, valMin(q)]));
  const valeurs = (reponses: any) => {
    const r: any = calculateScore(id, reponses);
    return Object.fromEntries((r?.[cle] ?? []).map((a: any) => [a.id, JSON.stringify(a.total ?? a.val)]));
  };
  const reference = valeurs(plancher);
  const map: Record<string, string[]> = {};
  for (const q of tous) {
    const apres = valeurs({ ...plancher, [q.id]: valMax(q) });
    for (const axe of Object.keys(reference)) {
      if (apres[axe] !== reference[axe]) (map[axe] ??= []).push(q.id);
    }
  }
  return map;
}

describe('composantes non mesurées — null, jamais zéro', () => {
  it('aucun axe sans un seul item répondu ne porte de valeur, sur les neuf instruments', () => {
    const coupables: string[] = [];
    let axesNonMesures = 0;
    for (const [id, cle] of Object.entries(PORTEUR)) {
      const map = itemsParAxe(id, cle);
      const axes = Object.keys(map);
      // Le balayage doit mordre : un instrument sans axe détecté passerait pour
      // un succès.
      expect(axes.length, `${id} : aucun axe influençable détecté`).toBeGreaterThan(1);

      const parId = Object.fromEntries(itemsDe(id).map((q: any) => [q.id, q]));
      const premier = axes[0];
      const reponses = Object.fromEntries(map[premier].map((i: string) => [i, valMax(parId[i])]));
      const r: any = calculateScore(id, reponses);
      for (const axe of r?.[cle] ?? []) {
        if (axe.id === premier) continue;
        if ((map[axe.id] ?? []).some((i: string) => reponses[i] !== undefined)) continue;
        axesNonMesures++;
        const valeur = axe.total ?? axe.val;
        if (valeur !== null && valeur !== undefined) coupables.push(`${id}/${axe.id} = ${valeur}`);
        if (axe.interpretation?.label) coupables.push(`${id}/${axe.id} bande « ${axe.interpretation.label} »`);
        for (const cleBool of ['probableMajorDepression', 'suicidalIdeation',
                               'winterPatternLikely', 'inversePatternLikely']) {
          if (axe[cleBool] === true || axe[cleBool] === false) {
            coupables.push(`${id}/${axe.id}.${cleBool} = ${axe[cleBool]}`);
          }
        }
      }
    }
    // Valeur EXACTE : un plancher lâche laisserait repasser une dizaine d'axes
    // sans rougir. 25 de ces 31 sortaient chiffrés avant ce lot.
    expect(axesNonMesures).toBe(31);
    expect(coupables, `axes non mesurés portant une valeur :\n  ${coupables.join('\n  ')}`).toEqual([]);
  });

  it('sur une passation complète, aucun des neuf ne perd son total', () => {
    // Le risque symétrique, et le plus coûteux : effacer des mesures réelles.
    const perdus: string[] = [];
    for (const [id, cle] of Object.entries(PORTEUR)) {
      const r: any = calculateScore(id, saturer(id));
      const nuls = (r?.[cle] ?? [])
        .filter((a: any) => (a.total ?? a.val) === null).map((a: any) => a.id);
      if (nuls.length) perdus.push(`${id} → ${nuls.join(', ')}`);
      // `Q_NEU_12` n'émet aucun total global : ne pas lui en exiger un.
      if (id !== 'Q_NEU_12' && r?.total === null) perdus.push(`${id} → total global`);
    }
    expect(perdus, `mesures perdues sur une passation complète :\n  ${perdus.join('\n  ')}`).toEqual([]);
  });

  it('PSQI : un item sur dix-huit ne vaut plus « Pas de trouble du sommeil »', () => {
    // Le cas le plus coûteux du lot. `Q_SOM_01` est source de POIDS 2 du besoin 5
    // de « Mon équilibre », en `inverser: true` et en niveau de preuve A : un
    // total bas y devient une COUVERTURE HAUTE du repos.
    const unItem: any = calculateScore('Q_SOM_01', { Q6: 1 });
    expect(unItem.components.find((c: any) => c.id === 'C1').val).toBe(1);
    expect(unItem.components.filter((c: any) => c.val === null).map((c: any) => c.id))
      .toEqual(['C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
    expect(unItem.total).toBeNull();
    expect(unItem.interpretation).toBeNull();
    expect(unItem.efficiency).toBeNull();

    expect(calculerCouvertureBesoin(5, { Q_SOM_01: { Q6: 1 } })).toBeNull();
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: { Q6: 1 } })).toBe('NON_MESURE');

    // Et une passation complète reste une mesure du besoin 5. Attendu écrit à la
    // main : 15 et non le maximum de 21, parce que saturer les OPTIONS ne sature
    // pas les composantes — un lever à 12 h pour 14 h dormies rend une efficacité
    // de 155 % et une durée hors barème, soit deux composantes au meilleur
    // barreau. Un attendu dérivé du moteur n'aurait rien prouvé.
    const complet = saturer('Q_SOM_01');
    expect((calculateScore('Q_SOM_01', complet) as any).total).toBe(15);
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: complet })).toBe('A');
  });

  it('PSQI : une réponse valant 0 n’est plus lue comme une absence de réponse', () => {
    // `getVal('Q1') || 23` : un coucher à MINUIT vaut `0`, donc faux en
    // JavaScript, donc remplacé par la valeur de repli de 23 h. Zéro heure de
    // sommeil se lisait sept de la même façon. Le patient qui répondait le plus
    // mal recevait les habitudes d'un dormeur moyen.
    // Les valeurs sont choisies pour ENJAMBER un barreau de barème dans chacun des
    // trois cas : un attendu que le repli rendrait identique ne prouverait rien.
    const socle = {
      Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
      Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
      Q6: 0, Q7: 0, Q8: 0, Q9: 0,
    };

    // Couché à minuit, levé à 7 h, six heures dormies. Sept heures au lit, donc
    // 86 % d'efficacité — le meilleur barreau. Le repli lisait 23 h, soit huit
    // heures au lit et 75 %, qui vaut un point de PLUS. Et un endormissement
    // immédiat (`Q2 = 0`) se lisait « 30 minutes », soit un point de plus encore.
    const minuit: any = calculateScore('Q_SOM_01', { ...socle, Q1: 0, Q2: 0, Q3: 7, Q4: 6 });
    expect(minuit.efficiency).toBe(86);
    expect(minuit.components.find((c: any) => c.id === 'C4').val).toBe(0);
    expect(minuit.components.find((c: any) => c.id === 'C2').val).toBe(0);
    expect(minuit.total).toBe(1);

    // Zéro heure de sommeil, la réponse la plus grave de l'échelle, se lisait
    // « sept heures » — c'est-à-dire la plus rassurante.
    const sansSommeil: any = calculateScore('Q_SOM_01', { ...socle, Q1: 0, Q2: 0, Q3: 7, Q4: 0 });
    expect(sansSommeil.efficiency).toBe(0);
    expect(sansSommeil.components.find((c: any) => c.id === 'C3').val).toBe(3);
    expect(sansSommeil.components.find((c: any) => c.id === 'C4').val).toBe(3);
    expect(sansSommeil.total).toBe(6);
  });

  it('Francis : quatre dimensions sur cinq jamais posées ne rendent plus de verdict', () => {
    // La grille conclut dans les deux sens, et les deux sorties étaient
    // atteignables depuis un seul item : « Valeurs normales » en cotant bas,
    // « Troubles fonctionnels significatifs » en cotant haut.
    for (const valeur of [0, 100]) {
      const r: any = calculateScore('Q_GAS_02', { FR_Q002: valeur });
      expect(r.components.find((c: any) => c.id === 'FR_Q002').val).toBe(valeur);
      expect(r.components.filter((c: any) => c.val === null)).toHaveLength(4);
      expect(r.total).toBeNull();
      expect(r.interpretation).toBeNull();
    }

    // Et une passation complète garde son total et sa bande.
    const complet: any = calculateScore('Q_GAS_02', saturer('Q_GAS_02'));
    expect(complet.total).toBe(500);
    expect(complet.interpretation?.label).toBeTruthy();
  });

  it('QIF : un questionnaire d’impact non rempli ne se lit plus comme une rémission', () => {
    // La bande dédiée à la valeur ZÉRO de cet instrument dit « Score peu
    // compatible avec le diagnostic de fibromyalgie, sauf guérison ou très bonne
    // évolution ». Les trois composantes absentes valant 0, un QIF où seule la
    // capacité fonctionnelle était renseignée au minimum sortait guéri.
    const r: any = calculateScore('Q_FIB_02', { Q1: 0 });
    expect(r.components.find((c: any) => c.id === 'FN').val).toBe(0);
    expect(r.components.filter((c: any) => c.val === null).map((c: any) => c.id))
      .toEqual(['JB', 'AB', 'EV']);
    expect(r.total).toBeNull();
    expect(r.interpretation).toBeNull();

    // Une passation complète au minimum, elle, rend bien ce verdict-là — la
    // garde ne retire pas une bande légitime.
    const plancher = Object.fromEntries(itemsDe('Q_FIB_02').map((q: any) => [q.id, 0]));
    const complet: any = calculateScore('Q_FIB_02', { ...plancher, Q12: 7 });
    expect(complet.total).toBe(0);
    expect(complet.interpretation?.label).toContain('peu compatible');
  });

  it('IDTAS-AE : « pas d’idéation suicidaire » ne se déduit plus d’un silence', () => {
    // Deux booléens à très forte charge clinique, servis au modèle de synthèse
    // par `scoresPourPrompt` sans aucune consigne jusqu'à la v11.
    const rien: any = calculateScore('Q_NEU_12', { IG1: 2 });
    const p1Rien = rien.parts.find((p: any) => p.id === 'P1');
    expect(p1Rien.total).toBeNull();
    expect(p1Rien.suicidalIdeation).toBeNull();
    expect(p1Rien.probableMajorDepression).toBeNull();

    // L'item posé et répondu NON reste un « non » : la garde ne mord que sur
    // l'absence.
    const repondu: any = calculateScore('Q_NEU_12', { IA9: 0 });
    expect(repondu.parts.find((p: any) => p.id === 'P1').suicidalIdeation).toBe(false);
    const positif: any = calculateScore('Q_NEU_12', { IA9: 1 });
    expect(positif.parts.find((p: any) => p.id === 'P1').suicidalIdeation).toBe(true);
  });

  it('IDTAS-AE : un seuil monotone franchi s’affirme sans attendre les items restants', () => {
    // `probableMajorDepression` compte les « oui » et se déclenche au-delà de 5.
    // Six « oui » sur neuf items le franchissent DÉFINITIVEMENT : les trois
    // derniers ne peuvent que faire monter le compte. Exiger la complétude ici
    // effacerait un dépistage positif, ce qui est l'erreur inverse et pire.
    const sixOui = Object.fromEntries(['IA1','IA2','IA3','IA4','IA5','IA6'].map(i => [i, 1]));
    const r: any = calculateScore('Q_NEU_12', sixOui);
    expect(r.parts.find((p: any) => p.id === 'P1').probableMajorDepression).toBe(true);

    // Non franchi ET incomplet : on ne sait pas.
    const deuxOui: any = calculateScore('Q_NEU_12', { IA1: 1, IA2: 1 });
    expect(deuxOui.parts.find((p: any) => p.id === 'P1').probableMajorDepression).toBeNull();

    // Non franchi et COMPLET : c'est un vrai « non ».
    const neufNon = Object.fromEntries(
      ['IA1','IA2','IA3','IA4','IA5','IA6','IA7','IA8','IA9'].map(i => [i, 0]));
    const complet: any = calculateScore('Q_NEU_12', neufNon);
    expect(complet.parts.find((p: any) => p.id === 'P1').probableMajorDepression).toBe(false);
  });

  it('IDTAS-AE : la bande GSS exige le score complet, jamais une somme partielle', () => {
    // Somme partielle ⇒ biaisée vers le bas ⇒ borne basse de la grille, qui est
    // « Le problème n'est probablement pas saisonnier ».
    const partiel: any = calculateScore('Q_NEU_12', { IG1: 4 });
    expect(partiel.gssScore).toBe(4);
    expect(partiel.interpretation).toBeNull();

    const complet: any = calculateScore('Q_NEU_12',
      Object.fromEntries(['IG1','IG2','IG3','IG4','IG5','IG6'].map(i => [i, 0])));
    expect(complet.gssScore).toBe(0);
    expect(complet.interpretation?.label).toContain('pas saisonnier');
  });

  it('IDTAS-AE : les listes d’items du moteur sont celles que déclare l’instrument', () => {
    // Le moteur code ses cinq listes en dur. Elles doivent rester celles de la
    // définition, sinon la garde protégerait un autre découpage que celui qui est
    // scoré — un défaut silencieux, sans ligne fautive à pointer.
    const declare = Object.fromEntries(
      (QUESTIONNAIRE_CATALOGUE as any).Q_NEU_12.scoring.parts.map((p: any) => [p.id, p.items]));
    const mesure = itemsParAxe('Q_NEU_12', 'parts');
    for (const [axe, items] of Object.entries(declare)) {
      expect(mesure[axe], `partie ${axe}`).toEqual(items);
    }
  });

  it('Test des 5 mots : l’alerte Alzheimer ne sort plus d’un rappel jamais demandé', () => {
    // Le seuil se lit PAR LE BAS (« ≤ 2/5 ») : une phase 2 absente valant 0 le
    // franchissait à coup sûr. Un rappel immédiat parfait sortait donc
    // « Trouble de la mémoire épisodique — consultation neurologique ».
    const immediatSeul: any = calculateScore('Q_GEO_06',
      Object.fromEntries(['DU1a','DU2a','DU3a','DU4a','DU5a'].map(i => [i, 1])));
    expect(immediatSeul.phases.find((p: any) => p.id === 'phase1').total).toBe(5);
    expect(immediatSeul.phases.find((p: any) => p.id === 'phase2').total).toBeNull();
    expect(immediatSeul.total).toBeNull();
    expect(immediatSeul.alertMA).toBeNull();
    expect(immediatSeul.alertLabel).toBeNull();
    expect(immediatSeul.interpretation).toBeNull();

    // Un rappel différé RÉELLEMENT bas garde son alerte : c'est la mesure que
    // l'instrument existe pour produire.
    const differeBas: any = calculateScore('Q_GEO_06', {
      DU1a: 1, DU2a: 1, DU3a: 1, DU4a: 1, DU5a: 1,
      DU1b: 1, DU2b: 1, DU3b: 0, DU4b: 0, DU5b: 0,
    });
    expect(differeBas.alertMA).toBe(true);
    expect(differeBas.alertLabel).toContain('Alzheimer');
    expect(differeBas.total).toBe(7);

    // Et un rappel différé complet et haut ne la déclenche pas.
    const complet: any = calculateScore('Q_GEO_06', saturer('Q_GEO_06'));
    expect(complet.alertMA).toBe(false);
    expect(complet.total).toBe(10);
  });

  it('SIGH-SAD-SA : un groupe dont aucun item n’est posé ne vaut plus zéro', () => {
    // La charnière 15-17 appartient aux DEUX groupes : le cas à exercer est celui
    // où seul le groupe B est renseigné, charnière comprise ou non.
    const bSeul: any = calculateScore('Q_NEU_03',
      Object.fromEntries(['SIGH_Q003','SIGH_Q007','SIGH_Q008'].map(i => [i, 2])));
    expect(bSeul.scoreGroupeB).not.toBeNull();
    expect(bSeul.scoreGroupeA).toBeNull();
    expect(bSeul.total).toBeNull();
    // La charnière non posée n'est pas un « ni hypersomnie ni hyperphagie ».
    expect(bSeul.scoreDual1517).toBeNull();
    expect(bSeul.dualRawMax).toBeNull();

    // Passation complète : les deux groupes et le total reviennent.
    const complet: any = calculateScore('Q_NEU_03', saturer('Q_NEU_03'));
    expect(complet.scoreGroupeA).not.toBeNull();
    expect(complet.scoreGroupeB).not.toBeNull();
    expect(complet.total).toBe(complet.scoreGroupeA + complet.scoreGroupeB);
  });

  it('MMSE : une dimension non passée est vide, et le total global ne bouge pas', () => {
    // Une dimension est un découpage DESCRIPTIF qui n'entre pas dans le total —
    // le rendre `null` ne doit donc pas faire tomber le score de l'instrument.
    // C'est la différence exacte avec les composantes, et elle se teste.
    const orientation = Object.fromEntries(
      itemsDe('Q_GEO_04').slice(0, 10).map((q: any) => [q.id, valMax(q)]));
    const r: any = calculateScore('Q_GEO_04', orientation);
    expect(r.dimensions.filter((d: any) => d.total === null).length).toBe(5);
    expect(r.dimensions.find((d: any) => d.total !== null).total).toBe(10);
    expect(r.total).toBe(10);
    expect(r.interpretation?.label).toBeTruthy();
  });

  it('Q_MOD_03 : le total global cesse de compter les plaintes non posées pour zéro', () => {
    // Les axes portaient déjà leur `null` ; le total, lui, divisait par sept. Une
    // fatigue à 10/10 seule renseignée rendait « Intensité faible ou absente » —
    // la bande RASSURANTE — sur le même écran que « Intensité très élevée » servie
    // par son propre domaine.
    const uneSeule: any = calculateScore('Q_MOD_03', { Q001: 10 });
    expect(uneSeule.subScores.find((s: any) => s.id === 'fatigue').interpretation?.label)
      .toBe('Intensité très élevée');
    expect(uneSeule.total).toBeNull();
    expect(uneSeule.average).toBeNull();
    expect(uneSeule.interpretation).toBeNull();

    // Complète, elle garde total, moyenne et bande.
    const complet: any = calculateScore('Q_MOD_03',
      Object.fromEntries(itemsDe('Q_MOD_03').map((q: any) => [q.id, 5])));
    expect(complet.total).toBe(35);
    expect(complet.average).toBe(5);
    expect(complet.interpretation?.label).toBe('Intensité modérée');
  });
});
