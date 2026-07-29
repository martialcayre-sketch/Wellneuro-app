// Banc du sous-score non mesuré — 2026-07-29.
//
// Ce que ce banc protège : un axe auquel personne n'a répondu valait **zéro**, et
// zéro est une valeur. Il décrochait une bande, déclenchait les seuils « faible si
// < X », et entrait dans le total global.
//
// Mesuré sur le catalogue entier avant d'écrire une ligne : une passation ne
// renseignant que le PREMIER sous-score de chaque instrument produisait
// **37 sous-scores à zéro, 16 bandes fabriquées et 2 `atRisk`** — dans les deux
// directions. « Iso-Strain — risque burnout élevé » (Karasek) et « Risque élevé de
// chute » (Tinetti) d'un côté ; « B — Troubles fonctionnels modérés à importants »
// sur une section de cinq (`Q_GAS_01`) de l'autre.
//
// La garde de passation vide (#451) ne mordait que sur l'instrument ENTIER. Celle-ci
// vit un étage plus bas, par axe.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';
import { calculerCouvertureBesoin } from '@/lib/equilibre/score';
import { calculerNiveauPreuveBesoin } from '@/lib/equilibre/evidence';

const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as any)[id].sections ?? []).flatMap((s: any) => s.questions ?? []);

const valMax = (q: any) => (q.options?.length
  ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value)))
  : (q.max ?? 1));

/** Répond au maximum, mais UNIQUEMENT aux items du sous-score nommé. */
function seulement(id: string, sousScore: string) {
  const items = Object.fromEntries(itemsDe(id).map((q: any) => [q.id, q]));
  const sc = (QUESTIONNAIRE_CATALOGUE as any)[id].scoring;
  const liste = sc.subScores?.find((s: any) => s.id === sousScore)?.items ?? sc[`subscales${sousScore}`] ?? [];
  return Object.fromEntries(
    liste.filter((i: string) => items[i]).map((i: string) => [i, valMax(items[i])]));
}

/**
 * Instruments qui ÉMETTENT au moins deux sous-scores.
 *
 * Le premier jet sélectionnait sur la DÉCLARATION (`scoring.subScores`) — et
 * `Q_NEU_11` (HAD) porte ses axes sous `subscalesA`/`subscalesD`. Le balayage était
 * donc aveugle précisément là où le défaut était le plus coûteux : HAD est la source
 * UNIQUE du besoin 8, en `inverser: true`. Sélectionner sur ce que le moteur rend,
 * jamais sur ce que la définition annonce.
 */
function instrumentsAPlusieursAxes() {
  const sortie: Array<{ id: string; premier: string; items: string[] }> = [];
  for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE as any)) {
    const tous = itemsDe(id);
    if (!tous.length) continue;
    const sature: any = calculateScore(id, Object.fromEntries(tous.map((q: any) => [q.id, valMax(q)])));
    if (!Array.isArray(sature?.subScores) || sature.subScores.length < 2) continue;

    // Les items du premier axe se déduisent de la définition quand elle les
    // déclare, et du bloc `subscales*` sinon.
    const sc = (QUESTIONNAIRE_CATALOGUE as any)[id].scoring;
    const premier = sature.subScores[0];
    const items = sc.subScores?.find((s: any) => s.id === premier.id)?.items
      ?? sc[`subscales${premier.id}`];
    if (!Array.isArray(items) || !items.length) continue;
    sortie.push({ id, premier: premier.id, items });
  }
  return sortie;
}

describe('sous-score non mesuré — null, jamais zéro', () => {
  it('aucun axe non répondu ne reçoit de total ni de bande, sur tout le catalogue', () => {
    const instruments = instrumentsAPlusieursAxes();
    // Le balayage doit mordre : une liste vide passerait pour un succès.
    expect(instruments.length).toBe(14);

    const coupables: string[] = [];
    let axesNonMesures = 0;
    for (const { id, premier } of instruments) {
      const r: any = calculateScore(id, seulement(id, premier));
      if (r?.scored === false || !Array.isArray(r?.subScores)) continue;
      for (const s of r.subScores) {
        if (s.id === premier) continue;
        axesNonMesures++;
        if (s.total !== null) coupables.push(`${id}/${s.id} total=${s.total}`);
        if (s.interpretation?.label) coupables.push(`${id}/${s.id} bande « ${s.interpretation.label} »`);
        if (s.atRisk === true) coupables.push(`${id}/${s.id} atRisk=true`);
        if (s.scaled !== undefined && s.scaled !== null) coupables.push(`${id}/${s.id} scaled=${s.scaled}`);
      }
    }
    // Valeur EXACTE : un plancher lâche laisserait passer une régression sur une
    // dizaine d'axes sans rougir.
    expect(axesNonMesures).toBe(38);
    expect(coupables, `axes non mesurés portant une valeur :\n  ${coupables.join('\n  ')}`).toEqual([]);
  });

  it('le total global tombe dès qu’un axe contributeur manque', () => {
    // Sommer les axes mesurés donnerait un nombre juste sur un dénominateur faux :
    // `maxTotal` compte TOUS les axes. C'est ce qui faisait passer `Q_GAS_01` à
    // 3 items sur 31 pour une mesure de l'instrument.
    const tfd: any = calculateScore('Q_GAS_01', seulement('Q_GAS_01', 'C1'));
    expect(tfd.subScores.find((s: any) => s.id === 'C1').total).not.toBeNull();
    expect(tfd.total).toBeNull();
    expect(tfd.interpretation).toBeNull();
  });

  it('un axe HORS TOTAL ne fait pas tomber le total global', () => {
    // `Q_URO_01/QdV` est déclaré `horsTotal` : il ne contribue pas, donc son absence
    // ne peut pas invalider un total qui ne l'a jamais compté.
    const ipss: any = calculateScore('Q_URO_01', seulement('Q_URO_01', 'IPSS'));
    expect(ipss.subScores.find((s: any) => s.id === 'QdV').total).toBeNull();
    expect(ipss.total).toBe(35);
  });

  it('Karasek : un Iso-Strain ne se déduit plus de trois absences', () => {
    const demSeule: any = calculateScore('Q_STR_06', seulement('Q_STR_06', 'DEM'));
    const par = Object.fromEntries(demSeule.subScores.map((s: any) => [s.id, s]));

    // L'axe mesuré garde tout : son total, son seuil et son verdict.
    expect(par.DEM.total).toBe(33);
    expect(par.DEM.atRisk).toBe(true);
    // Les autres ne valent plus zéro et ne déclenchent plus leur seuil « < X ».
    for (const id of ['LAT', 'SOU', 'REC']) {
      expect(par[id].total, `${id}`).toBeNull();
      expect(par[id].atRisk, `${id}`).toBe(false);
    }
    expect(demSeule.jobStrain).toBe(false);
    expect(demSeule.isoStrain).toBe(false);
    expect(demSeule.interpretation.label).toBe('Forte demande psychologique');
  });

  it('« Mon équilibre » ne compte plus une passation d’un axe sur cinq', () => {
    // Le cas nommé par la revue de #451 : `Q_GAS_01` à 3 items sur 31 rendait
    // « A — Absence de troubles fonctionnels » et **0,978 de couverture** sur le
    // besoin 4, qui est une fondation critique.
    const troisItems = { Q_GAS_01: { C1_1: 1, C1_2: 1, C1_3: 0 } };
    expect(calculerCouvertureBesoin(4, troisItems)).toBeNull();
    expect(calculerNiveauPreuveBesoin(4, troisItems)).toBe('NON_MESURE');

    // Et une passation complète reste une mesure.
    const complet = Object.fromEntries(itemsDe('Q_GAS_01').map((q: any) => [q.id, valMax(q)]));
    expect(calculerCouvertureBesoin(4, { Q_GAS_01: complet })).not.toBeNull();
  });

  it('la garde ne mord QUE sur l’axe entièrement vide', () => {
    // Le risque symétrique, et le plus coûteux : effacer des mesures légitimes.
    // Un seul item répondu dans un axe suffit à le rendre mesuré.
    const items = Object.fromEntries(itemsDe('Q_MOD_01').map((q: any) => [q.id, q]));
    const sub = (QUESTIONNAIRE_CATALOGUE as any).Q_MOD_01.scoring.subScores
      .find((s: any) => s.id === 'SOMMEIL');
    const unSeul: any = calculateScore('Q_MOD_01', { [sub.items[0]]: valMax(items[sub.items[0]]) });
    const sommeil = unSeul.subScores.find((s: any) => s.id === 'SOMMEIL');
    expect(sommeil.total).not.toBeNull();

    // Et une passation COMPLÈTE garde tous ses axes et son total.
    const complet = Object.fromEntries(itemsDe('Q_MOD_01').map((q: any) => [q.id, valMax(q)]));
    const entier: any = calculateScore('Q_MOD_01', complet);
    expect(entier.subScores.every((s: any) => s.total !== null)).toBe(true);
    expect(entier.total).toBe(180);
  });

  it('un multiplicateur ne ressuscite pas un axe non mesuré', () => {
    // `null * multiplier` vaut 0 en JavaScript : sans garde, l'axe non mesuré
    // revenait par la porte du score pondéré. Aucun sous-score du catalogue ne
    // déclare de `multiplier` aujourd'hui — le prouver sur le catalogue serait le
    // prouver sur rien, il l'est donc sur une définition forgée.
    const def = {
      sections: [{ id: 'S', questions: [
        { id: 'A1', type: 'number', min: 0, max: 10 },
        { id: 'B1', type: 'number', min: 0, max: 10 },
      ] }],
      scoring: {
        type: 'subscore',
        subScores: [
          { id: 'A', label: 'Axe A', items: ['A1'], max: 10, multiplier: 3 },
          { id: 'B', label: 'Axe B', items: ['B1'], max: 10, multiplier: 3 },
        ],
      },
    };
    const r: any = computeScoreFromDef(def, { A1: 4 });
    const a = r.subScores.find((s: any) => s.id === 'A');
    const b = r.subScores.find((s: any) => s.id === 'B');
    expect(a.total).toBe(4);
    expect(a.scaled).toBe(12);
    // L'axe non mesuré : ni total, ni score pondéré.
    expect(b.total).toBeNull();
    expect(b.scaled).toBeNull();
  });

  it('le dominant de group_majority n’est atteint que sur des axes tous mesurés', () => {
    // Invariant PORTANT, et non local : le bloc du protocole n'est atteint que si
    // l'interprétation existe, donc si le total global existe, donc — par
    // `totalGlobalDepuisSousScores` — si tous les axes contributeurs sont mesurés.
    // C'est ce qui permet au calcul du dominant de se passer de filtre. Si cette
    // chaîne se rompt un jour, ce test rougira.
    const def = {
      sections: [{ id: 'S', questions: [
        { id: 'A1', type: 'number', min: 0, max: 20 },
        { id: 'B1', type: 'number', min: 0, max: 20 },
      ] }],
      scoring: {
        type: 'group_majority',
        subScores: [
          { id: 'A', label: 'Axe A', items: ['A1'], max: 20 },
          { id: 'B', label: 'Axe B', items: ['B1'], max: 20 },
        ],
        interpretation: [{ min: 0, max: 42, label: 'unique' }],
      },
    };
    // Un axe manquant : pas de total, donc pas d'interprétation, donc pas de
    // protocole — la grille couvre pourtant 0 à 42.
    const partiel: any = computeScoreFromDef(def, { A1: 9 });
    expect(partiel.subScores.find((s: any) => s.id === 'B').total).toBeNull();
    expect(partiel.total).toBeNull();
    expect(partiel.interpretation).toBeNull();

    // Les deux mesurés : le dominant est le plus haut.
    const complet: any = computeScoreFromDef(def, { A1: 3, B1: 9 });
    expect(complet.total).toBe(12);
    expect(complet.interpretation?.dominant).toBe('B');
  });

  it('HAD : zéro item de dépression ne vaut plus « couverture parfaite » du besoin 8', () => {
    // Le pire cas du lot, et celui que mon premier balayage ne voyait pas : HAD
    // porte ses axes sous `subscalesA`/`subscalesD`, pas sous `scoring.subScores`.
    // Il est la source UNIQUE du besoin 8, en `inverser: true` — zéro donnée de
    // dépression rendait un ratio de 0, inversé en 1,000 de couverture et un grade
    // de preuve A, avec « Absence de symptomatologie » servi en vert.
    const anxieteSeule = calculateScore('Q_NEU_11', seulement('Q_NEU_11', 'A')) as any;
    const parAxe = Object.fromEntries(anxieteSeule.subScores.map((s: any) => [s.id, s]));

    expect(parAxe.A.total).not.toBeNull();
    expect(parAxe.D.total).toBeNull();
    expect(parAxe.D.interpretation).toBeNull();
    expect(anxieteSeule.total).toBeNull();

    expect(calculerCouvertureBesoin(8, { Q_NEU_11: seulement('Q_NEU_11', 'A') })).toBeNull();
    expect(calculerNiveauPreuveBesoin(8, { Q_NEU_11: seulement('Q_NEU_11', 'A') })).toBe('NON_MESURE');

    // Et une passation complète reste une preuve du besoin 8.
    const complet = Object.fromEntries(itemsDe('Q_NEU_11').map((q: any) => [q.id, valMax(q)]));
    expect(calculerNiveauPreuveBesoin(8, { Q_NEU_11: complet })).not.toBe('NON_MESURE');
  });

  it('Karasek : un axe PRESQUE complet ne déclenche plus son seuil', () => {
    // `karasekValue` rend 0 sur une absence, et la latitude pondère jusqu'à 4 :
    // deux items sautés retiraient 16 points sur 96 pour un seuil à 72. Un patient
    // déclarant une autonomie MAXIMALE sur 7 items de 9 ressortait « Job Strain ».
    const sc = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_06.scoring;
    const items = Object.fromEntries(itemsDe('Q_STR_06').map((q: any) => [q.id, q]));
    const lat = sc.subScores.find((s: any) => s.id === 'LAT');
    const reponses: Record<string, number> = { ...seulement('Q_STR_06', 'DEM') };
    // Tous les items de latitude SAUF deux, au maximum.
    for (const id of lat.items.slice(0, -2)) reponses[id] = valMax(items[id]);

    const r: any = calculateScore('Q_STR_06', reponses);
    const parAxe = Object.fromEntries(r.subScores.map((s: any) => [s.id, s]));
    expect(parAxe.LAT.atRisk, 'un axe incomplet ne peut pas franchir son seuil').toBe(false);
    expect(r.jobStrain).toBe(false);
  });

  it('Karasek : un axe déclaré sans items ne franchit pas son seuil', () => {
    // `repondus === items.length` vaut `0 === 0` sur un axe sans items : il passerait
    // pour « complet », et `null >= seuil` referait le défaut que ce lot ferme.
    // Aucun axe du catalogue n'est dans ce cas — prouvé sur définition forgée.
    const def = {
      sections: [{ id: 'S', questions: [{ id: 'D1', type: 'number', min: 1, max: 4 }] }],
      scoring: {
        type: 'karasek',
        subScores: [
          { id: 'DEM', label: 'Demande', items: ['D1'], max: 4, seuil: 2, seuilDir: 'gte' },
          { id: 'LAT', label: 'Latitude', items: [], max: 0, seuil: 72, seuilDir: 'lt' },
        ],
      },
    };
    const r: any = computeScoreFromDef(def, { D1: 4 });
    const lat = r.subScores.find((s: any) => s.id === 'LAT');
    expect(lat.total).toBeNull();
    expect(lat.atRisk, 'un axe sans items ne peut pas être « à risque »').toBe(false);
  });

  it('Karasek : « situation équilibrée » exige les deux axes qui la fondent', () => {
    // `REC` est le seul axe sans seuil : le renseigner seul laissait tous les
    // `atRisk` à faux, et l'échelle retombait sur son verdict rassurant.
    const recSeul: any = calculateScore('Q_STR_06', seulement('Q_STR_06', 'REC'));
    const parAxe = Object.fromEntries(recSeul.subScores.map((s: any) => [s.id, s]));
    expect(parAxe.DEM.total).toBeNull();
    expect(parAxe.LAT.total).toBeNull();
    expect(recSeul.interpretation).toBeNull();
  });

  it('sur une passation complète, aucun instrument ne perd son total', () => {
    // Balayage anti-sur-filtrage : la garde ne doit retirer AUCUNE mesure réelle.
    const perdus: string[] = [];
    for (const { id } of instrumentsAPlusieursAxes()) {
      const complet = Object.fromEntries(itemsDe(id).map((q: any) => [q.id, valMax(q)]));
      const r: any = calculateScore(id, complet);
      if (!Array.isArray(r?.subScores)) continue;
      const axesNuls = r.subScores.filter((s: any) => s.total === null).map((s: any) => s.id);
      if (axesNuls.length) perdus.push(`${id} → ${axesNuls.join(', ')}`);
    }
    expect(perdus, `axes perdus sur une passation complète :\n  ${perdus.join('\n  ')}`).toEqual([]);
  });
});
