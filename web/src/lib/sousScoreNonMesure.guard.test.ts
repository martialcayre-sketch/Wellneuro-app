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
    // Quinze le 2026-07-31 au matin : le MFI-20 reconstruit passe du scoring
    // `sum` à `subscore` et déclare ses cinq sous-échelles. Quatorze le même
    // soir : `Q_ALI_03`, reconstruit à son tour, QUITTE `subscore` — sa source
    // est une feuille de calcul qui rend deux grandeurs pondérées, pas des
    // sous-scores ordinaux.
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
    // dizaine d'axes sans rougir. Le 2026-07-31, deux reconstructions se
    // compensent presque : le MFI-20 en apporte quatre (ses sous-échelles non
    // premières), `Q_ALI_03` en retire quatre en quittant `subscore`.
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
    // Depuis le lot des drapeaux (2026-07-29), leur `atRisk` vaut `null` et non
    // plus `false` : `false` affirmait « pas à risque » sur un axe jamais rempli.
    // `REC` fait exception — il ne publie AUCUN seuil, son `atRisk` reste `false`
    // par défaut et ne signifie rien, ce que la consigne de synthèse décrit déjà.
    for (const id of ['LAT', 'SOU']) {
      expect(par[id].total, `${id}`).toBeNull();
      expect(par[id].atRisk, `${id}`).toBeNull();
    }
    expect(par.REC.total).toBeNull();
    expect(par.REC.atRisk).toBe(false);
    expect(par.REC.seuil ?? null).toBeNull();
    // Indéterminés, et surtout jamais `true` : c'est ce que ce test protège.
    expect(demSeule.jobStrain).toBeNull();
    expect(demSeule.isoStrain).toBeNull();
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
    // `null`, et non `false` : un axe incomplet ne franchit pas son seuil, mais
    // il ne permet pas non plus d'affirmer qu'il ne le franchirait pas.
    expect(parAxe.LAT.atRisk, 'un axe incomplet ne peut pas franchir son seuil').toBeNull();
    expect(r.jobStrain, 'DEM à risque et LAT indéterminé ⇒ indéterminé').toBeNull();
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
    expect(lat.atRisk, 'un axe sans items ne peut pas être « à risque »').toBeNull();
    expect(lat.atRisk, 'et surtout jamais vrai').not.toBe(true);
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

  // ── Drapeaux composites du Karasek (2026-07-29, second lot) ────────────────
  //
  // Dernier résidu du contrat « non mesuré » : `atRisk`, `jobStrain` et
  // `isoStrain` valaient `false` sur un axe jamais rempli — « pas à risque » sur
  // trois questions jamais posées. Le « et » du Job Strain devient donc un ET à
  // TROIS valeurs, monotone comme la règle du Berlin.

  /** Réponses saturées à la borne haute ou basse d’un axe nommé. */
  function axeALaBorne(sousScore: string, borne: 'min' | 'max') {
    const items = Object.fromEntries(itemsDe('Q_STR_06').map((q: any) => [q.id, q]));
    const sc = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_06.scoring;
    const liste = sc.subScores.find((s: any) => s.id === sousScore).items;
    return Object.fromEntries(liste.map((i: string) => {
      const vals = items[i].options.map((o: any) => Number(o.v ?? o.value));
      return [i, borne === 'max' ? Math.max(...vals) : Math.min(...vals)];
    }));
  }

  it('Karasek : le « et » du Job Strain est ÉTABLI faux, jamais deviné faux', () => {
    // Un « et » se conclut faux dès qu'un seul opérande est faux — peu importe ce
    // qu'on ignore de l'autre. C'est ce qui distingue « établi » d'« ignoré », et
    // c'est la seule chose qui autorise encore un verdict sur une passation
    // partielle.
    const demBasse: any = calculateScore('Q_STR_06', axeALaBorne('DEM', 'min'));
    const par = Object.fromEntries(demBasse.subScores.map((s: any) => [s.id, s]));
    expect(par.DEM.atRisk, 'DEM complet et sous son seuil').toBe(false);
    expect(par.LAT.atRisk, 'LAT jamais rempli').toBeNull();
    // DEM établi hors risque ⇒ pas de Job Strain, quoi qu'on ignore de LAT.
    expect(demBasse.jobStrain).toBe(false);
    expect(demBasse.isoStrain).toBe(false);
    // Mais « équilibrée » exige les DEUX axes jugeables, et LAT ne l’est pas.
    expect(demBasse.interpretation).toBeNull();
  });

  it('Karasek : « équilibrée » exige deux axes JUGEABLES, pas seulement mesurés', () => {
    // Le cas que l’ancienne garde laissait passer : elle exigeait `total !== null`.
    // Un axe à moitié rempli a bien un total — et c’est justement celui où
    // `karasekValue` sous-estime le plus, puisqu’il compte l’absence pour zéro.
    const sc = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_06.scoring;
    const lat = sc.subScores.find((s: any) => s.id === 'LAT');
    const items = Object.fromEntries(itemsDe('Q_STR_06').map((q: any) => [q.id, q]));
    const reponses: Record<string, number> = { ...axeALaBorne('DEM', 'min') };
    for (const id of lat.items.slice(0, -2)) reponses[id] = valMax(items[id]);

    const r: any = calculateScore('Q_STR_06', reponses);
    const parAxe = Object.fromEntries(r.subScores.map((s: any) => [s.id, s]));
    expect(parAxe.LAT.total, 'LAT partiel porte bien un total').not.toBeNull();
    expect(parAxe.LAT.atRisk, 'mais il n’est pas jugeable').toBeNull();
    expect(r.jobStrain, 'DEM hors risque ⇒ établi faux').toBe(false);
    expect(r.interpretation, 'et pourtant aucun verdict rassurant').toBeNull();
  });

  it('Karasek : `null && false` vaut null, et c’est pourquoi le ET est écrit', () => {
    // Le cas qui distingue le ET à trois valeurs de l’opérateur natif. `&&` rend
    // son opérande GAUCHE quand il est falsy : `null && false` vaut donc `null`
    // — « on ne sait pas » — alors que la réponse est ÉTABLIE : une latitude
    // complète et au-dessus de son seuil suffit à exclure le Job Strain, quoi
    // qu’on ignore de la demande. S’en remettre à `&&` donnerait le bon résultat
    // sur trois cas et le mauvais sur celui-ci.
    const latSeule: any = calculateScore('Q_STR_06', axeALaBorne('LAT', 'max'));
    const par = Object.fromEntries(latSeule.subScores.map((s: any) => [s.id, s]));
    expect(par.DEM.atRisk, 'DEM jamais rempli').toBeNull();
    expect(par.LAT.atRisk, 'LAT complet, au-dessus de son seuil').toBe(false);
    expect(latSeule.jobStrain, 'établi faux par LAT seul').toBe(false);
    expect(latSeule.isoStrain).toBe(false);
    // Mais toujours pas de verdict rassurant : DEM n’est pas jugeable.
    expect(latSeule.interpretation).toBeNull();
  });

  it('Karasek : un axe de soutien ABSENT de la définition ne conclut pas l’Iso-Strain', () => {
    // Aucun instrument du catalogue n’est dans ce cas — prouvé sur définition
    // forgée, seul moyen d’éprouver la branche. `sou` absent ne vaut pas
    // « soutien social suffisant » : l’Iso-Strain reste indéterminé.
    const def = {
      sections: [{ id: 'S', questions: [
        { id: 'D1', type: 'number', min: 1, max: 4 },
        { id: 'L1', type: 'number', min: 1, max: 4 },
      ] }],
      scoring: {
        type: 'karasek',
        subScores: [
          { id: 'DEM', label: 'Demande', items: ['D1'], max: 4, seuil: 2, seuilDir: 'gte' },
          { id: 'LAT', label: 'Latitude', items: ['L1'], max: 4, seuil: 3, seuilDir: 'lt' },
        ],
      },
    };
    const r: any = computeScoreFromDef(def, { D1: 4, L1: 1 });
    expect(r.jobStrain, 'les deux axes sont à risque').toBe(true);
    expect(r.isoStrain, 'mais le soutien n’existe pas : indéterminé').toBeNull();
    expect(r.interpretation.label).toBe('Job Strain — stress professionnel');
  });

  it('Karasek : un axe SANS SEUIL publié ne fonde pas « équilibrée »', () => {
    // Régression introduite par ce lot, corrigée avant le merge. `atRisk` est
    // initialisé à `false` et n'est réécrit que si l'axe publie un seuil : un axe
    // sans seuil ET sans une seule réponse le conserve donc à `false`, et
    // satisfaisait le nouveau test du verdict vert. L'ancienne garde `mesure()`
    // l'attrapait ; la remplacer par le seul `atRisk === false` l'avait perdue.
    //
    // Aucun instrument du catalogue n'est dans ce cas — `DEM` et `LAT` publient
    // tous deux leur seuil. D'où la définition forgée : c'est le seul chemin.
    const def = {
      sections: [{ id: 'S', questions: [
        { id: 'D1', type: 'number', min: 1, max: 4 },
        { id: 'L1', type: 'number', min: 1, max: 4 },
        { id: 'S1', type: 'number', min: 1, max: 4 },
      ] }],
      scoring: {
        type: 'karasek',
        subScores: [
          { id: 'DEM', label: 'Demande', items: ['D1'], max: 4, seuil: 2, seuilDir: 'gte' },
          { id: 'LAT', label: 'Latitude', items: ['L1'], max: 4 },
          { id: 'SOU', label: 'Soutien', items: ['S1'], max: 4, seuil: 2, seuilDir: 'lt' },
        ],
      },
    };
    const r: any = computeScoreFromDef(def, { D1: 1, S1: 4 });
    const lat = r.subScores.find((s: any) => s.id === 'LAT');
    expect(lat.total, 'LAT n’a aucune réponse').toBeNull();
    expect(lat.atRisk, 'faute de seuil publié, il reste false PAR DÉFAUT').toBe(false);
    expect(r.interpretation, 'et ce false ne fonde aucun verdict rassurant').toBeNull();

    // Anti-sur-filtrage : le même axe RENSEIGNÉ, toujours sans seuil, laisse bien
    // sortir le verdict — la garde porte sur la mesure, pas sur le seuil.
    const rempli: any = computeScoreFromDef(def, { D1: 1, L1: 4, S1: 4 });
    expect(rempli.interpretation.label).toBe('Situation professionnelle équilibrée');
  });

  it('Karasek : « équilibrée » exige aussi le soutien social hors risque', () => {
    // Arbitrage praticien du 2026-07-29. « Équilibrée » ne portait que sur les
    // deux axes du Job Strain : un patient à demande basse, latitude haute et
    // soutien social ÉTABLI à risque ressortait en vert. C'était le dernier
    // verdict rassurant du moteur, et le seul qui contredisait son propre
    // `atRisk`.
    const items = Object.fromEntries(itemsDe('Q_STR_06').map((q: any) => [q.id, q]));
    const sc = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_06.scoring;
    const sou = sc.subScores.find((s: any) => s.id === 'SOU');

    // Passation complète au MAXIMUM — demande à risque mise à part, tous les
    // axes sont au-dessus de leurs seuils — puis le soutien social effondré.
    const base = Object.fromEntries(itemsDe('Q_STR_06').map((q: any) => [q.id, valMax(q)]));
    const demBasse = { ...base, ...axeALaBorne('DEM', 'min') };
    const parBase: any = calculateScore('Q_STR_06', demBasse);
    const axes = Object.fromEntries(parBase.subScores.map((s: any) => [s.id, s]));
    expect(axes.DEM.atRisk, 'demande hors risque').toBe(false);
    expect(axes.LAT.atRisk, 'latitude hors risque').toBe(false);
    expect(axes.SOU.atRisk, 'soutien hors risque').toBe(false);
    expect(parBase.interpretation.label,
      'les trois axes hors risque ⇒ le verdict vert existe toujours')
      .toBe('Situation professionnelle équilibrée');

    // Le même patient, soutien social effondré : plus de vert.
    const souBas: Record<string, number> = { ...demBasse };
    for (const id of sou.items) {
      const vals = items[id].options.map((o: any) => Number(o.v ?? o.value));
      souBas[id] = Math.min(...vals);
    }
    const r: any = calculateScore('Q_STR_06', souBas);
    const parSou = Object.fromEntries(r.subScores.map((s: any) => [s.id, s]));
    expect(parSou.DEM.atRisk, 'demande toujours hors risque').toBe(false);
    expect(parSou.LAT.atRisk, 'latitude toujours hors risque').toBe(false);
    expect(parSou.SOU.atRisk, 'mais le soutien est établi à risque').toBe(true);
    expect(r.jobStrain, 'ce n’est pas un Job Strain — SOU n’y entre pas').toBe(false);
    expect(r.interpretation, 'et plus aucun verdict rassurant').toBeNull();
  });

  it('Karasek : « équilibrée » exige TOUS les axes mesurés, seuil ou pas', () => {
    // Relevé en revue sur la première rédaction de ce lot, qui nommait trois axes
    // au lieu d’énoncer la règle. Elle fermait le cas du soutien social et
    // laissait sortir le vert sur une reconnaissance au plus bas — « on me traite
    // injustement » et « ma sécurité d’emploi est menacée » au maximum — et même
    // sur une section reconnaissance ENTIÈREMENT VIDE.
    //
    // `REC` ne publie aucun seuil : il ne peut donc pas entrer dans le test de
    // RISQUE (son `atRisk` vaut `false` par défaut et ne signifie rien), mais il
    // entre dans le test de MESURE. Les deux conditions ne portent pas sur les
    // mêmes axes, et c’est le fond de la règle.
    const sc = (QUESTIONNAIRE_CATALOGUE as any).Q_STR_06.scoring;
    const par = Object.fromEntries(sc.subScores.map((s: any) => [s.id, s.items]));
    const serein = {
      ...axeALaBorne('DEM', 'min'), ...axeALaBorne('LAT', 'max'), ...axeALaBorne('SOU', 'max'),
    };
    // Référence : les trois axes à seuil hors risque ET la reconnaissance
    // renseignée ⇒ le verdict vert existe.
    const complet: any = calculateScore('Q_STR_06', { ...serein, ...axeALaBorne('REC', 'max') });
    expect(complet.interpretation.label).toBe('Situation professionnelle équilibrée');

    // Reconnaissance au PLUS BAS : le vert sortait quand même.
    const recBasse: any = calculateScore('Q_STR_06', { ...serein, ...axeALaBorne('REC', 'min') });
    const parRec = Object.fromEntries(recBasse.subScores.map((s: any) => [s.id, s]));
    expect(parRec.REC.total, 'reconnaissance minimale, et mesurée').toBe(12);
    expect(parRec.REC.seuil ?? null, 'aucun seuil publié').toBeNull();
    expect(recBasse.interpretation?.label,
      'mesurée : le verdict reste rendu — c’est un seuil qui manque, pas une mesure')
      .toBe('Situation professionnelle équilibrée');

    // Reconnaissance ENTIÈREMENT VIDE : là, plus de verdict.
    const recVide: any = calculateScore('Q_STR_06', serein);
    expect(recVide.subScores.find((s: any) => s.id === 'REC').total).toBeNull();
    expect(recVide.interpretation, 'un quart de l’instrument non rempli ⇒ rien à conclure')
      .toBeNull();

    // Et le soutien social non mesuré, ou PARTIEL, retire aussi le verdict — la
    // moitié « mesure » de la règle, distincte de la moitié « hors risque ».
    const sansSou: any = calculateScore('Q_STR_06',
      { ...axeALaBorne('DEM', 'min'), ...axeALaBorne('LAT', 'max'), ...axeALaBorne('REC', 'max') });
    expect(sansSou.subScores.find((s: any) => s.id === 'SOU').atRisk).toBeNull();
    expect(sansSou.interpretation).toBeNull();

    const items = Object.fromEntries(itemsDe('Q_STR_06').map((q: any) => [q.id, q]));
    const souPartiel: Record<string, number> = { ...serein, ...axeALaBorne('REC', 'max') };
    for (const id of par.SOU.slice(-3)) delete souPartiel[id];
    const partiel: any = calculateScore('Q_STR_06', souPartiel);
    expect(partiel.subScores.find((s: any) => s.id === 'SOU').total,
      'un axe partiel porte bien un total').not.toBeNull();
    expect(partiel.interpretation, 'mais il n’est pas jugeable').toBeNull();
    expect(items).toBeDefined();
  });

  it('Karasek : une définition sans axe à seuil ne conclut pas à l’équilibre', () => {
    // Non-vacuité. `every` sur un tableau vide vaut `true` : sans cette garde, un
    // instrument dont aucun axe ne publie de seuil ressortirait « équilibrée » du
    // seul fait d’avoir été rempli. Aucun instrument du catalogue n’est dans ce
    // cas — d’où la définition forgée, qui est le seul chemin vers la branche.
    const def = {
      sections: [{ id: 'S', questions: [{ id: 'A1', type: 'number', min: 1, max: 4 }] }],
      scoring: {
        type: 'karasek',
        subScores: [{ id: 'REC', label: 'Reconnaissance', items: ['A1'], max: 4 }],
      },
    };
    const r: any = computeScoreFromDef(def, { A1: 4 });
    expect(r.subScores[0].total, 'l’axe est bien mesuré').toBe(4);
    expect(r.interpretation, 'mais aucun seuil ne fonde l’absence de risque').toBeNull();
  });

  it('Karasek : sur une passation complète, les verdicts restent ÉTABLIS', () => {
    // Anti-sur-filtrage : une garde qui annulerait tous les drapeaux passerait
    // chacun des tests ci-dessus. Aux deux bornes, tout ce qui est jugeable doit
    // l’être — aucun `null` sur un axe complet portant un seuil.
    const items = itemsDe('Q_STR_06');
    const haut: any = calculateScore('Q_STR_06',
      Object.fromEntries(items.map((q: any) => [q.id, valMax(q)])));
    const bas: any = calculateScore('Q_STR_06', Object.fromEntries(items.map((q: any) => {
      const vals = q.options.map((o: any) => Number(o.v ?? o.value));
      return [q.id, Math.min(...vals)];
    })));
    for (const r of [haut, bas]) {
      for (const s of r.subScores) {
        if (typeof s.seuil === 'number') expect(s.atRisk, `${s.id} complet`).not.toBeNull();
      }
      expect(r.jobStrain, 'passation complète ⇒ verdict établi').not.toBeNull();
      expect(r.isoStrain).not.toBeNull();
    }
    // Attendus écrits à la main. À la borne HAUTE : forte demande, mais latitude
    // et soutien au-dessus de leurs seuils — pas de Job Strain.
    expect(haut.interpretation.label).toBe('Forte demande psychologique');
    expect(haut.jobStrain).toBe(false);

    // À la borne BASSE, un TROU DE GRILLE que ce lot met au jour sans le créer.
    // Demande faible (12 < 21, hors risque) mais latitude 42 < 72 ET soutien
    // 8 < 24, tous deux À RISQUE. Le Job Strain se conclut faux — il exige les
    // deux —, et aucune des quatre bandes ne décrit cette situation : elles ne
    // parlent que de la demande et de la conjonction demande × latitude.
    //
    // L’ancienne version rendait ici « Situation professionnelle équilibrée », en
    // vert, à un patient dont DEUX axes sont sous leur seuil : elle n’exigeait que
    // des totaux non nuls. C’est une fausse réassurance de moins ; en contrepartie
    // l’instrument ne dit plus rien de ce profil, que le modèle de Karasek nomme
    // pourtant (« job passif »). Ajouter la bande est une décision de seuil
    // clinique — elle ne se prend pas dans un lot de code, et elle est portée au
    // changelog comme réserve.
    const parBas = Object.fromEntries(bas.subScores.map((s: any) => [s.id, s]));
    expect(parBas.DEM.atRisk).toBe(false);
    expect(parBas.LAT.atRisk).toBe(true);
    expect(parBas.SOU.atRisk).toBe(true);
    expect(bas.jobStrain).toBe(false);
    expect(bas.interpretation, 'aucune bande ne décrit ce profil').toBeNull();
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
