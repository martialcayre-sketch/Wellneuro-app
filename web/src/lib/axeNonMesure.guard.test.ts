// Banc de l'axe non mesuré, hors `subScores` déclarés — 2026-07-29.
//
// Suite du banc `sousScoreNonMesure.guard.test.ts`, qui ne couvrait que les six
// moteurs déclarant `scoring.subScores`, plus HAD. Neuf autres moteurs portaient
// le même défaut sous quatre autres porteurs — `parts`, `components`, `phases`,
// `categories` — et sous les `dimensions` de `sum`. Ils ne passent pas par
// `sumItems` : leur découpage est CODÉ EN DUR, et ils lisaient leurs items en
// `getVal(x) || 0`. L'absence entrait donc dans le calcul sous la valeur la plus
// basse, indiscernable d'un vrai zéro.
//
// Mesuré avant d'écrire une ligne, par balayage de ce que le moteur ÉMET (et non
// de ce que les définitions déclarent) : **43 valeurs fabriquées** sur dix
// instruments. Les plus coûteuses ne sont pas les plus nombreuses :
//   · `Q_GEO_06` (5 mots de Dubois) — le test se passe EN DEUX TEMPS. Entre les
//     deux, la phase de rappel différé vaut 0/5, donc « ≤ 2 », et l'alerte
//     « évocateur de maladie d'Alzheimer » se déclenchait sur un test inachevé.
//   · `Q_SOM_01` (PSQI) — une seule réponse suffisait à passer la garde de
//     passation vide, et les six autres composantes retombaient sur leurs
//     défauts. Un PSQI dont seule la qualité subjective est renseignée, à sa
//     pire valeur, sortait « Troubles du sommeil légers » sur 21.
//   · `Q_FIB_02` (QIF) — un questionnaire vide rendait exactement 0, et la bande
//     de tête du QIF est `total === 0` : « Score peu compatible avec le
//     diagnostic de fibromyalgie ».
//   · `Q_SOM_03` (Berlin) — ce moteur n'appelle pas `interpretRanges` ; la garde
//     de #450 ne le couvrait pas, comme Bristol. Il rendait une bande dans TOUS
//     les cas, et celle de l'absence était « Risque faible d'apnée du sommeil ».
//   · `Q_NEU_12` (IDTAS-AE) — `suicidalIdeation` et `probableMajorDepression`
//     valaient `false` sur des questions jamais posées.
//
// MÉTHODE. Les périmètres d'axes ci-dessous sont ÉCRITS À LA MAIN pour les
// moteurs qui codent leur découpage en dur : c'est ce qui donne au banc sa
// valeur. Un périmètre dérivé du moteur bougerait avec lui et ne prouverait
// rien. En contrepartie, deux gardes : chaque identifiant du périmètre doit
// exister dans l'instrument (sinon la fixture mesure une couverture bâtie sur
// rien — la classe de défaut trouvée en revue le 2026-07-29), et tout instrument
// émettant l'un des cinq porteurs doit être déclaré ici (sinon le balayage rate
// en silence celui qu'il fallait voir — la leçon de HAD).
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';

const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as any)[id].sections ?? []).flatMap((s: any) => s.questions ?? []);

const valMax = (q: any) => (q.options?.length
  ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value)))
  : (q.max ?? 1));

/** Réponses saturées à tous les items SAUF ceux listés. */
function toutSauf(id: string, exclus: string[]): Record<string, number> {
  const hors = new Set(exclus);
  return Object.fromEntries(
    itemsDe(id).filter((q: any) => !hors.has(q.id)).map((q: any) => [q.id, valMax(q)]));
}

const sequence = (prefixe: string, de: number, a: number) =>
  Array.from({ length: a - de + 1 }, (_, i) => `${prefixe}${de + i}`);

/**
 * Périmètre de chaque axe, par instrument.
 *
 * Écrit à la main là où le moteur code son découpage en dur (`psqi`, `francis`,
 * `qif`, `idtas_ae`, `berlin`) ; lu dans la définition là où elle le déclare
 * (`phases`, `dimensions`, `domains`, `groupA`/`groupB`/`dualItems`), parce que
 * c'est alors la définition elle-même que le moteur lit.
 */
const PERIMETRES: Record<string, Record<string, string[]>> = {
  // psqi — sept composantes, dénominateur 21. `Q4` sert à DEUX composantes.
  Q_SOM_01: {
    C1: ['Q6'], C2: ['Q2', 'Q5a'], C3: ['Q4'], C4: ['Q1', 'Q3', 'Q4'],
    C5: ['Q5b', 'Q5c', 'Q5d', 'Q5e', 'Q5f', 'Q5g', 'Q5h', 'Q5i', 'Q5j'],
    C6: ['Q7'], C7: ['Q8', 'Q9'],
  },
  // francis — cinq échelles visuelles de 0 à 100. Deux identifiants par échelle :
  // la forme courante `FR_Q00x` et la forme héritée `FRx`, que le moteur lit en
  // repli. Une garde qui n'en couvrirait qu'une laisserait l'autre fabriquer.
  Q_GAS_02: {
    FR_Q002: ['FR_Q002', 'FR1'], FR_Q003: ['FR_Q003', 'FR2'],
    FR_Q005: ['FR_Q005', 'FR3'], FR_Q006: ['FR_Q006', 'FR4'],
    FR_Q007: ['FR_Q007', 'FR5'],
  },
  // qif — quatre composantes de poids très inégaux (9,9 + 10 + 10 + 70).
  Q_FIB_02: {
    FN: sequence('Q', 1, 11), JB: ['Q12'], AB: ['Q13'], EV: sequence('Q', 14, 20),
  },
  // idtas_ae — cinq parties. Les identifiants internes IA/IG/IMA/IMB/IS sont
  // aussi déclarés sous `scoring.parts`, mais le moteur ne les y lit pas.
  Q_NEU_12: {
    P1: sequence('IA', 1, 9), P2: sequence('IG', 1, 6),
    P3A: sequence('IMA', 1, 12), P3B: sequence('IMB', 1, 12), P4: sequence('IS', 1, 9),
  },
  // berlin — trois catégories, verdict à « au moins deux positives ».
  Q_SOM_03: {
    C1: ['BE1', 'BE2', 'BE3', 'BE4'], C2: ['BE5', 'BE6', 'BE7'], C3: ['BE8', 'BE9'],
  },
};

/**
 * Périmètres déclarés, lus dans la définition que le moteur lit lui-même.
 *
 * CUMULATIFS, jamais « le premier trouvé » : `Q_ALI_01` déclare `dimensions` ET
 * `sousScoresBesoins`, deux découpages du même instrument à périmètres
 * différents. Une lecture au premier match n'aurait éprouvé que l'un des deux.
 */
function perimetresDeclares(id: string): Record<string, string[]> {
  const sc = (QUESTIONNAIRE_CATALOGUE as any)[id].scoring;
  const sortie: Record<string, string[]> = {};
  for (const p of sc.phases ?? []) sortie[p.id] = p.items;
  for (const d of sc.dimensions ?? []) sortie[d.id] = d.items;
  for (const b of sc.sousScoresBesoins ?? []) sortie[b.id] = b.items;
  for (const d of sc.domains ?? []) sortie[d.id] = [d.item];
  if (Array.isArray(sc.groupA)) {
    const dual = sc.dualItems ?? [];
    sortie.A = [...sc.groupA, ...dual];
    sortie.B = [...sc.groupB, ...dual];
    sortie.Q15_Q17 = dual;
  }
  return sortie;
}

const PORTEURS = ['parts', 'components', 'phases', 'categories', 'dimensions', 'scoresBesoins'] as const;
const CHAMPS_VALEUR = ['total', 'val', 'count', 'score'] as const;

/** Les axes émis par un résultat, tous porteurs confondus, y compris subScores. */
function axesEmis(r: any): Array<{ porteur: string; axe: any }> {
  const sortie: Array<{ porteur: string; axe: any }> = [];
  for (const p of [...PORTEURS, 'subScores']) {
    if (!Array.isArray(r?.[p])) continue;
    for (const axe of r[p]) sortie.push({ porteur: p, axe });
  }
  return sortie;
}

/** Instruments que ce banc doit couvrir : ceux qui émettent l'un des porteurs. */
function instrumentsAPorteurs(): string[] {
  const sortie: string[] = [];
  for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE as any)) {
    const tous = itemsDe(id);
    if (!tous.length) continue;
    const sature: any = calculateScore(id, Object.fromEntries(tous.map((q: any) => [q.id, valMax(q)])));
    if (PORTEURS.some(p => Array.isArray(sature?.[p]) && sature[p].length > 0)) sortie.push(id);
  }
  return sortie;
}

/**
 * `Q_ALI_01` n'émet ses `dimensions` et ses `scoresBesoins` que drapeau
 * `WN_ALI_01_SIIN57` ALLUMÉ — la forme courte à 14 items n'en porte aucun. Un
 * banc qui ne lirait qu'une position du drapeau serait aveugle à l'autre : c'est
 * la leçon du 2026-07-28, et `npm run check` exécute justement les deux.
 */
const SIIN57 = process.env.WN_ALI_01_SIIN57 === 'true';

const COUVERTS = [
  ...Object.keys(PERIMETRES), 'Q_GEO_06', 'Q_CAR_01', 'Q_GEO_04', 'Q_MOD_03', 'Q_NEU_03',
  ...(SIIN57 ? ['Q_ALI_01'] : []),
];

describe('axe non mesuré hors subScores déclarés — null, jamais zéro', () => {
  it('aucun instrument à porteur n’échappe au banc', () => {
    // La leçon de HAD, appliquée à l'envers : la liste des instruments à couvrir
    // se déduit de ce que le moteur ÉMET, jamais de ce que je crois avoir vu.
    // `Q_NEU_03` et `Q_MOD_03` ne sont pas dans cette liste — ils émettent des
    // `subScores` — mais le banc précédent les laissait passer, faute de trouver
    // leurs items sous `scoring.subScores` : ils sont couverts ici.
    const aPorteurs = instrumentsAPorteurs();
    expect(aPorteurs.sort()).toEqual([
      'Q_CAR_01', 'Q_FIB_02', 'Q_GAS_02', 'Q_GEO_04', 'Q_GEO_06', 'Q_NEU_12', 'Q_SOM_01', 'Q_SOM_03',
      ...(SIIN57 ? ['Q_ALI_01'] : []),
    ].sort());
    for (const id of aPorteurs) expect(COUVERTS).toContain(id);
  });

  it('chaque identifiant de périmètre existe réellement dans son instrument', () => {
    // Une fixture bâtie sur des identifiants absents mesure une couverture bâtie
    // sur rien, et PASSE — c'est la classe de défaut trouvée en revue le
    // 2026-07-29 sur quatre fixtures de `Q_SOM_01`, `Q_MOD_01` et `Q_GAS_01`.
    // Exception assumée : les identifiants HÉRITÉS de `Q_GAS_02` (`FR1`…`FR5`),
    // que le moteur lit en repli et que le catalogue ne sert plus.
    const HERITES = new Set(['FR1', 'FR2', 'FR3', 'FR4', 'FR5']);
    let verifies = 0;
    for (const [id, axes] of Object.entries(PERIMETRES)) {
      const connus = new Set(itemsDe(id).map((q: any) => q.id));
      for (const items of Object.values(axes)) {
        for (const item of items) {
          if (HERITES.has(item)) continue;
          expect(connus, `${id} : ${item} n’existe pas`).toContain(item);
          verifies++;
        }
      }
    }
    expect(verifies).toBe(101);
  });

  it('un axe dont AUCUN item n’est renseigné ne porte ni valeur ni drapeau', () => {
    const coupables: string[] = [];
    let axesEprouves = 0;
    for (const id of COUVERTS) {
      const perimetres = { ...perimetresDeclares(id), ...(PERIMETRES[id] ?? {}) };
      for (const [axeId, items] of Object.entries(perimetres)) {
        const r: any = calculateScore(id, toutSauf(id, items));
        if (r?.scored === false) continue;
        const trouve = axesEmis(r).find(({ axe }) => axe.id === axeId);
        if (!trouve) { coupables.push(`${id}/${axeId} : axe absent du résultat`); continue; }
        axesEprouves++;
        // Règle GÉNÉRALE, et non liste blanche de noms de champs : sur un axe
        // dont aucun item n'est renseigné, AUCUN nombre et AUCUN booléen n'a de
        // sens, quel que soit son nom. Une première rédaction énumérait
        // `total`/`val`/`count`/`score` et six drapeaux — et laissait passer
        // `winterHits: 0` à côté de `winterPatternLikely: null`, sur un
        // instrument de trouble affectif SAISONNIER, où « zéro mois d'hiver
        // au-dessus du seuil » est le signal rassurant central. Relevé en revue
        // adversariale : une liste blanche sur un moteur qui invente des champs
        // a la même faiblesse structurelle que le balayage par déclaration qui
        // avait raté HAD. La polarité est donc inversée — tout champ nouveau est
        // coupable par défaut, à charge de l'exempter ici avec sa raison.
        for (const [champ, valeur] of Object.entries(trouve.axe)) {
          // Exemptés : les DÉNOMINATEURS et les comptes de QUESTIONS (combien la
          // catégorie en contient, combien ont répondu), qui décrivent l'axe et
          // ne mesurent rien ; et `horsTotal`, drapeau déclaratif de structure.
          if (['max', 'maxTotal', 'maxScaled', 'items', 'repondus', 'missing',
            'answered', 'seuil', 'horsTotal'].includes(champ)) continue;
          if (champ === 'interpretation') {
            if ((valeur as any)?.label) coupables.push(`${id}/${axeId} bande « ${(valeur as any).label} »`);
            continue;
          }
          if (typeof valeur === 'number' || typeof valeur === 'boolean') {
            coupables.push(`${id}/${axeId}.${champ} = ${valeur}`);
          }
        }
      }
    }
    // Valeur EXACTE : un plancher lâche laisserait passer une régression sur une
    // dizaine d'axes sans rougir.
    // 45 axes drapeau éteint ; 58 allumé — les treize découpages de l'Enquête
    // SIIN (six `dimensions` d'affichage, sept `scoresBesoins`) s'y ajoutent.
    expect(axesEprouves).toBe(SIIN57 ? 58 : 45);
    expect(coupables, `axes non mesurés portant une valeur :\n  ${coupables.join('\n  ')}`).toEqual([]);
  });

  it('le total global tombe avec l’axe — sauf pour une dimension, qui n’y entrait pas', () => {
    // `dimensions` est un découpage d'AFFICHAGE : il ne contribue pas au total,
    // son absence ne peut donc pas le faire tomber. Le distinguer est le seul
    // point où ce lot n'applique pas la règle uniformément, et c'est délibéré.
    const sansC5: any = calculateScore('Q_SOM_01', toutSauf('Q_SOM_01', PERIMETRES.Q_SOM_01.C5));
    expect(sansC5.components.find((c: any) => c.id === 'C1').val).toBe(3);
    expect(sansC5.total).toBeNull();
    expect(sansC5.interpretation).toBeNull();
    expect(sansC5.maxTotal).toBe(21);

    const sansEva: any = calculateScore('Q_FIB_02', toutSauf('Q_FIB_02', PERIMETRES.Q_FIB_02.EV));
    expect(sansEva.components.find((c: any) => c.id === 'AB').val).toBe(10);
    expect(sansEva.total).toBeNull();
    expect(sansEva.interpretation).toBeNull();

    // La dimension, elle, ne fait pas tomber le TOTAL : le total reste la somme
    // de tous les items répondus, sur son dénominateur d'origine.
    const dims = perimetresDeclares('Q_CAR_01');
    const sansUneDim: any = calculateScore('Q_CAR_01', toutSauf('Q_CAR_01', dims.FAM));
    expect(sansUneDim.dimensions.find((d: any) => d.id === 'FAM').total).toBeNull();
    expect(sansUneDim.total).not.toBeNull();
    // La BANDE, si. Ces deux lignes attendaient l'inverse — c'était le défaut du
    // moteur `sum`, qui jetait le `missing` de `sumItems` : les items de la
    // dimension absente n'entrent pas dans la dimension, mais ils entrent dans
    // le total, où ils comptaient pour zéro. Le total sortait donc plus bas
    // qu'il ne devait, et décrochait une bande calibrée sur l'instrument
    // COMPLET — « Risque faible », en vert, sur une passation tronquée.
    //
    // Le total et la bande ne sont pas la même affirmation : le total est un
    // nombre vérifiable à côté duquel `missing` dit ce qui lui manque, la bande
    // est un verdict. Le premier survit à l'incomplétude, le second non.
    expect(sansUneDim.interpretation).toBeNull();
    expect(sansUneDim.missing).toBe(dims.FAM.length);
  });

  it('PSQI : une seule réponse ne rend plus un verdict sur les sept composantes', () => {
    // Les items du barème du PSQI entrent TOUS dans une composante — vérifié
    // ici, parce que la première rédaction de ce banc supposait le contraire et
    // cherchait un item « hors barème » qui n'existe pas. Le cas vivant est donc
    // une réponse à un item du barème, et une seule : les six autres composantes
    // retombaient sur leurs défauts — 23 h, 30 min, 7 h.
    //
    // Les SIX items hors barème sont nommés, et pas seulement tolérés : depuis le
    // passage aux 24 items de la source (2026-07-31), le volet « conjoint ou
    // camarade de chambre » est servi sans être coté — Buysse 1989 bâtit ses
    // sept composantes sur les seules questions 1 à 9. Les énumérer garde à
    // l'assertion sa morsure : un item du barème qui sortirait d'un périmètre
    // la fait toujours tomber, une liste ouverte ne l'aurait pas fait.
    const dansUnAxe = new Set(Object.values(PERIMETRES.Q_SOM_01).flat());
    expect(itemsDe('Q_SOM_01').filter((q: any) => !dansUnAxe.has(q.id)).map((q: any) => q.id))
      .toEqual(['Q10', 'Q11a', 'Q11b', 'Q11c', 'Q11d', 'Q11e']);

    // Q6 seul, à sa PIRE valeur : « qualité de sommeil très mauvaise ». Le PSQI
    // rendait alors 3 + 1 + 1 + 0 + 0 + 0 + 0 = 5 sur 21, « Troubles du sommeil
    // légers » — un verdict d'ensemble tiré d'un septième de l'instrument, et
    // rassurant là où la seule réponse disponible ne l'était pas.
    const q6Seul: any = calculateScore('Q_SOM_01', { Q6: 3 });
    expect(q6Seul.scored).not.toBe(false);
    expect(q6Seul.components.map((c: any) => c.val)).toEqual([3, null, null, null, null, null, null]);
    expect(q6Seul.total).toBeNull();
    expect(q6Seul.interpretation).toBeNull();
    // L'efficacité de sommeil se calculait sur les défauts : 7 h dormies pour 8 h
    // au lit, soit 88 %. Un chiffre d'allure clinique, servi au modèle de
    // synthèse, entièrement fabriqué.
    expect(q6Seul.efficiency).toBeNull();
  });

  it('PSQI : l’efficacité exige ses TROIS items, numérateur et dénominateur', () => {
    // Un rapport n'est pas mesuré parce qu'un de ses trois items l'est : le
    // numérateur (`Q4`) et le dénominateur (`Q1`/`Q3`) sont indépendants. Avec
    // la frontière « au moins un item », l'heure du coucher SEULE rendait
    // encore 88 % et `C4 = 0` — la meilleure valeur de la composante. Trouvé en
    // revue adversariale : le correctif fermait « aucun des trois » et laissait
    // ouvert « un des trois », qui est justement le cas du 88 %.
    for (const seul of ['Q1', 'Q3', 'Q4']) {
      const r: any = calculateScore('Q_SOM_01', { [seul]: seul === 'Q4' ? 4 : 7 });
      expect(r.efficiency, `${seul} seul`).toBeNull();
      expect(r.components.find((c: any) => c.id === 'C4').val, `${seul} seul`).toBeNull();
    }
    // Deux des trois ne suffisent pas davantage.
    const deux: any = calculateScore('Q_SOM_01', { Q1: 23, Q4: 7 });
    expect(deux.efficiency).toBeNull();

    // Anti-sur-filtrage : les trois renseignés, l'efficacité redevient un nombre.
    const trois: any = calculateScore('Q_SOM_01', { Q1: 23, Q3: 7, Q4: 7 });
    expect(trois.efficiency).toBe(88);
    expect(trois.components.find((c: any) => c.id === 'C4').val).toBe(0);
    // …et `C3`, qui ne dépend que de `Q4`, garde bien sa frontière à un item.
    expect(trois.components.find((c: any) => c.id === 'C3').val).toBe(1);
  });

  it('IDTAS-AE : le décompte de mois hivernaux tombe avec sa partie', () => {
    // `winterHits: 0` à côté de `winterPatternLikely: null` et `total: null`
    // disait « non mesuré » et « zéro mois d'hiver au-dessus du seuil » dans le
    // MÊME objet — sur un instrument de trouble affectif saisonnier, le second
    // est le signal rassurant central.
    const sansP3: any = calculateScore('Q_NEU_12',
      toutSauf('Q_NEU_12', [...PERIMETRES.Q_NEU_12.P3A, ...PERIMETRES.Q_NEU_12.P3B]));
    expect(sansP3.parts.find((p: any) => p.id === 'P3A').winterHits).toBeNull();
    expect(sansP3.parts.find((p: any) => p.id === 'P3B').inverseHits).toBeNull();

    // Anti-sur-filtrage : renseignée, la partie 3A rend bien son décompte.
    const p3aRempli: any = calculateScore('Q_NEU_12',
      Object.fromEntries(PERIMETRES.Q_NEU_12.P3A.map(i => [i, 0])));
    expect(p3aRempli.parts.find((p: any) => p.id === 'P3A').winterHits).toBe(0);
    expect(p3aRempli.parts.find((p: any) => p.id === 'P3A').winterPatternLikely).toBe(false);
  });

  it('Dubois : un test inachevé n’évoque plus la maladie d’Alzheimer', () => {
    const phases = perimetresDeclares('Q_GEO_06');
    const immediatSeul: any = calculateScore('Q_GEO_06', toutSauf('Q_GEO_06', phases.phase2));
    expect(immediatSeul.phases.find((p: any) => p.id === 'phase1').total).toBe(5);
    expect(immediatSeul.phases.find((p: any) => p.id === 'phase2').total).toBeNull();
    // `false` affirmerait un rappel préservé ; seul `null` dit qu'on ne sait pas.
    expect(immediatSeul.alertMA).toBeNull();
    expect(immediatSeul.alertLabel).toBeNull();
    expect(immediatSeul.total).toBeNull();

    // L'alerte exige un rappel différé COMPLET, pas seulement entamé
    // ([[D-066]], revue finding M1) : deux items de rappel sur cinq, cotés 0,
    // rendaient `total = 0 ≤ 2` — « évocateur de maladie d'Alzheimer » servi
    // sur un test aux trois cinquièmes non administré. Un rappel amputé ne
    // peut qu'abaisser le total : c'est le biais même qui fabriquait l'alerte.
    const differePartiel: any = calculateScore('Q_GEO_06',
      { ...Object.fromEntries(phases.phase1.map(i => [i, 1])), [phases.phase2[0]]: 1 });
    expect(differePartiel.phases.find((p: any) => p.id === 'phase2').missing).toBe(4);
    expect(differePartiel.alertMA).toBeNull();
    expect(differePartiel.alertLabel).toBeNull();

    // Et l'alerte reste rendue quand le rappel différé COMPLET est faible —
    // sans cette contre-épreuve, un `alertMA` toujours nul passerait les deux
    // cas du dessus.
    const differeFaible: any = calculateScore('Q_GEO_06', {
      ...Object.fromEntries(phases.phase1.map(i => [i, 1])),
      ...Object.fromEntries(phases.phase2.map(i => [i, 0])),
    });
    expect(differeFaible.phases.find((p: any) => p.id === 'phase2').missing).toBe(0);
    expect(differeFaible.phases.find((p: any) => p.id === 'phase2').total).toBe(0);
    expect(differeFaible.alertMA).toBe(true);
    expect(differeFaible.alertLabel).toContain('Alzheimer');
  });

  it('Berlin : le risque élevé se conclut incomplet, le risque faible non', () => {
    // La règle de Berlin est « au moins DEUX catégories positives ». Elle reste
    // donc concluante dans UN sens même incomplète — et pas dans l'autre.
    const C = PERIMETRES.Q_SOM_03;

    // Deux catégories positives, la troisième non mesurée : le risque élevé est
    // établi, et la bande doit sortir.
    const deuxPositives: any = calculateScore('Q_SOM_03', toutSauf('Q_SOM_03', C.C3));
    expect(deuxPositives.categories.find((c: any) => c.id === 'C3').positive).toBeNull();
    expect(deuxPositives.highRisk).toBe(true);
    expect(deuxPositives.interpretation?.label).toContain('Risque élevé');
    // Le décompte, lui, n'a pas de dénominateur : deux positives sur combien ?
    expect(deuxPositives.positiveCategoryCount).toBeNull();

    // Une seule réponse, et rien d'autre : rien ne se conclut.
    const presqueVide: any = calculateScore('Q_SOM_03', { BE9: 22 });
    expect(presqueVide.categories.map((c: any) => c.positive)).toEqual([null, null, false]);
    expect(presqueVide.highRisk).toBeNull();
    expect(presqueVide.interpretation).toBeNull();

    // Anti-sur-filtrage : sur une passation complète, le verdict négatif existe
    // toujours, avec son décompte.
    const complet: any = calculateScore('Q_SOM_03',
      Object.fromEntries(itemsDe('Q_SOM_03').map((q: any) => [q.id, 0])));
    expect(complet.highRisk).toBe(false);
    expect(complet.positiveCategoryCount).toBe(0);
    expect(complet.interpretation?.label).toContain('Risque faible');
  });

  it('QIF : un questionnaire vide n’écarte plus le diagnostic de fibromyalgie', () => {
    // La bande de tête du QIF se déclenche sur `total === 0`. Q12 rend le cas
    // indiscernable : `(7 - n) × 1.43` vaut 0 pour sept bons jours comme pour une
    // absence de réponse.
    const q12Seul: any = calculateScore('Q_FIB_02', { Q12: 7 });
    expect(q12Seul.components.find((c: any) => c.id === 'JB').val).toBe(0);
    expect(q12Seul.components.find((c: any) => c.id === 'FN').val).toBeNull();
    expect(q12Seul.total).toBeNull();
    expect(q12Seul.interpretation).toBeNull();

    // Les deux zéros côte à côte, qui étaient indiscernables : sept bons jours
    // DÉCLARÉS rendent 0 ; Q12 non posée rend `null`.
    const sansQ12: any = calculateScore('Q_FIB_02', toutSauf('Q_FIB_02', ['Q12']));
    expect(sansQ12.components.find((c: any) => c.id === 'JB').val).toBeNull();
    const q12Bon: any = calculateScore('Q_FIB_02',
      Object.fromEntries(itemsDe('Q_FIB_02').map((q: any) => [q.id, q.id === 'Q12' ? 7 : valMax(q)])));
    expect(q12Bon.components.find((c: any) => c.id === 'JB').val).toBe(0);

    // Un vrai zéro reste un zéro : passation complète, tout au minimum.
    const complet: any = calculateScore('Q_FIB_02',
      Object.fromEntries(itemsDe('Q_FIB_02').map((q: any) => [q.id, q.id === 'Q12' ? 7 : 0])));
    expect(complet.total).toBe(0);
    expect(complet.interpretation?.label).toContain('peu compatible');
  });

  it('IDTAS-AE : trois drapeaux cliniques cessent de valoir « non » par défaut', () => {
    const sansP1: any = calculateScore('Q_NEU_12', toutSauf('Q_NEU_12', PERIMETRES.Q_NEU_12.P1));
    const p1 = sansP1.parts.find((p: any) => p.id === 'P1');
    // `false` affirmait « pas d'idéation suicidaire » sur une question jamais
    // posée — celle que la source Drive assortit d'une appréciation clinique
    // immédiate.
    expect(p1.suicidalIdeation).toBeNull();
    expect(p1.probableMajorDepression).toBeNull();

    const sansP2: any = calculateScore('Q_NEU_12', toutSauf('Q_NEU_12', PERIMETRES.Q_NEU_12.P2));
    // Le score GSS à 0 décrochait « Le problème n'est probablement pas
    // saisonnier », en vert : le verdict le plus rassurant, rendu sur rien.
    expect(sansP2.gssScore).toBeNull();
    expect(sansP2.interpretation).toBeNull();

    const sansP3A: any = calculateScore('Q_NEU_12', toutSauf('Q_NEU_12', PERIMETRES.Q_NEU_12.P3A));
    expect(sansP3A.parts.find((p: any) => p.id === 'P3A').winterPatternLikely).toBeNull();

    // Anti-sur-filtrage : renseignée, la partie 1 rend bien ses drapeaux.
    const p1Rempli: any = calculateScore('Q_NEU_12',
      Object.fromEntries(PERIMETRES.Q_NEU_12.P1.map(i => [i, 1])));
    const p1R = p1Rempli.parts.find((p: any) => p.id === 'P1');
    expect(p1R.total).toBe(9);
    expect(p1R.suicidalIdeation).toBe(true);
    expect(p1R.probableMajorDepression).toBe(true);
  });

  it('SIGH-SAD-SA : les items 15 à 17 appartiennent aux DEUX groupes', () => {
    // Le score corrigé 15-17 est reporté dans le groupe A et dans le groupe B.
    // Un groupe est donc mesuré dès qu'un de SES items ou un item 15-17 répond —
    // et le renseigner seul mesure les deux groupes.
    const p = perimetresDeclares('Q_NEU_03');
    const dualSeul: any = calculateScore('Q_NEU_03', Object.fromEntries(p.Q15_Q17.map(i => [i, 2])));
    const par = Object.fromEntries(dualSeul.subScores.map((s: any) => [s.id, s.total]));
    expect(par.Q15_Q17).toBe(1);
    expect(par.A).toBe(1);
    expect(par.B).toBe(1);
    expect(dualSeul.total).toBe(2);

    // Sans eux et sans le groupe B, seul A subsiste.
    const aSeul: any = calculateScore('Q_NEU_03', toutSauf('Q_NEU_03', [...p.B, ...p.Q15_Q17]));
    const parA = Object.fromEntries(aSeul.subScores.map((s: any) => [s.id, s.total]));
    expect(parA.A).not.toBeNull();
    expect(parA.B).toBeNull();
    expect(parA.Q15_Q17).toBeNull();
    expect(aSeul.total).toBeNull();
  });

  it('composite_multi_parties : la garde préventive tient sur définition forgée', () => {
    // Ce moteur n'est servi par AUCUN instrument du catalogue — mesuré par le
    // balayage des porteurs ci-dessus, qui ne le rencontre jamais. La garde y est
    // donc préventive, et une définition forgée est le seul moyen de l'éprouver :
    // sans elle, la ligne serait modifiée sans qu'aucun test ne puisse rougir.
    const def = {
      scoring: {
        type: 'composite_multi_parties',
        parts: [
          { id: 'P1', type: 'count_oui', items: ['A1', 'A2'], maxTotal: 2 },
          { id: 'P2', type: 'sum', items: ['B1', 'B2'], maxTotal: 8 },
        ],
        interpretation: [{ gss_min: 0, gss_max: 4, label: 'Bande basse' }],
      },
      sections: [{ questions: [
        { id: 'A1', options: [{ v: 0 }, { v: 1 }] }, { id: 'A2', options: [{ v: 0 }, { v: 1 }] },
        { id: 'B1', options: [{ v: 0 }, { v: 4 }] }, { id: 'B2', options: [{ v: 0 }, { v: 4 }] },
      ] }],
    };
    const sansP2: any = computeScoreFromDef(def as any, { A1: 1, A2: 1 });
    expect(sansP2.parts.find((p: any) => p.id === 'P1').count).toBe(2);
    expect(sansP2.parts.find((p: any) => p.id === 'P2').total).toBeNull();
    expect(sansP2.gssScore).toBeNull();
    expect(sansP2.interpretation).toBeNull();

    const sansP1: any = computeScoreFromDef(def as any, { B1: 0, B2: 0 });
    expect(sansP1.parts.find((p: any) => p.id === 'P1').count).toBeNull();
    expect(sansP1.gssScore).toBe(0);
    expect(sansP1.interpretation?.label).toBe('Bande basse');
  });

  it('sur une passation complète, aucun instrument ne perd son total', () => {
    // Anti-sur-filtrage général : une garde qui annulerait tout passerait chacun
    // des tests ci-dessus. Ce balayage refuse le remède qui tue le patient.
    const perdus: string[] = [];
    for (const id of COUVERTS) {
      const tous = itemsDe(id);
      const r: any = calculateScore(id, Object.fromEntries(tous.map((q: any) => [q.id, valMax(q)])));
      if (r?.scored === false) continue;
      // `undefined` n'est pas une perte : `Q_NEU_12` et `Q_SOM_03` n'ont jamais
      // émis de total global — la règle est « ne pas en fabriquer », pas « en avoir un ».
      if (r.total === null) perdus.push(`${id} total=${r.total}`);
      for (const { porteur, axe } of axesEmis(r)) {
        const valeur = CHAMPS_VALEUR.map(c => axe[c]).find(v => v !== undefined);
        if (valeur === null) perdus.push(`${id}/${porteur}/${axe.id}`);
      }
    }
    expect(perdus, `axes ou totaux perdus sur passation complète :\n  ${perdus.join('\n  ')}`).toEqual([]);
  });
});
