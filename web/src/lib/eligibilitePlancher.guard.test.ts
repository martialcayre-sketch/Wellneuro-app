// Banc de l'ÉLIGIBILITÉ AU PLANCHER — 2026-08-05.
//
// CE QU'IL TIENT. `bandePlancher` ne sert une bande que si l'instrument DÉCLARE
// `severiteCroissante`. Le défaut — ne rien déclarer — est le comportement
// d'avant le lot : aucun plancher. C'est délibéré et c'est la garde principale,
// parce que le sens d'une grille ne se déduit ni du moteur, ni de l'ordre
// d'écriture des bandes, ni de leurs couleurs. Les deux indices trompent, et pas
// sur les mêmes instruments : TROIS grilles sont écrites en `min` décroissant
// (`Q_ALI_01`, `Q_ALI_02`, `Q_GEO_04`), tandis que `Q_TAB_01` est écrit en `min`
// CROISSANT et inverse le sens — `danger` en bas, `success` en haut. Trier par
// `min` ne suffit donc pas, et lire les couleurs non plus.
//
// SUR UNE GRILLE DÉCROISSANTE, un plancher de SCORE est un plafond de SÉVÉRITÉ.
// Déclarer `Q_GEO_04` (MMSE) croissant ferait dire « au moins Démence sévère » à
// un patient dont le score ne peut plus que MONTER vers « Normal ».
//
// CE QUE CE BANC EMPÊCHE CONCRÈTEMENT : qu'un instrument `sum` ajouté demain
// échappe à l'arbitrage. Il ne peut pas être « oublié » — il n'est dans aucune
// des deux listes, et le banc rougit.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';

/**
 * Grilles CROISSANTES : la sévérité monte avec le score. Relevé sur le catalogue
 * RÉSOLU, première et dernière bande triées par `min` — jamais au grep, qui
 * attrape les `parts` des moteurs composites et ignore la résolution des
 * drapeaux.
 */
const ELIGIBLES = new Set([
  'Q_SOM_02', 'Q_SOM_06', 'Q_INF_01', 'Q_INF_02', 'Q_INF_04', 'Q_FIB_01',
  'Q_TAB_02', 'Q_STR_02', 'Q_STR_03', 'Q_STR_08', 'Q_GEO_02', 'Q_GEO_03',
  'Q_TAB_05', 'Q_CAR_01', 'Q_NEU_01', 'Q_NEU_02', 'Q_NEU_04', 'Q_NEU_06',
  'Q_NEU_09', 'Q_NEU_10', 'Q_SOM_04',
]);

/**
 * Grilles NON éligibles, chacune avec sa raison. L'absence de déclaration n'est
 * pas un oubli : elle est ici, écrite, pour qu'une relecture ne la prenne pas
 * pour un trou.
 */
const NON_ELIGIBLES: Record<string, string> = {
  Q_TAB_01: 'grille décroissante — « peu ou pas motivé » en bas, « fortement motivé » en haut',
  Q_ALI_01: 'grille décroissante — « très déséquilibrée » en bas, « haute qualité » en haut',
  Q_ALI_02: 'grille décroissante — « très faible adhérence » en bas, « bonne adhérence » en haut',
  Q_GEO_04: 'grille décroissante (MMSE) — « démence sévère » en bas, « normal » en haut',
  Q_TAB_04: 'aucune grille d\'interprétation (`sansTotalGlobal`)',
};

function instrumentsSum(): any[] {
  return (Object.values(QUESTIONNAIRE_CATALOGUE as any) as any[])
    .filter((def: any) => def?.scoring?.type === 'sum');
}

describe('éligibilité au plancher garanti', () => {
  it('tout instrument `sum` est classé — éligible ou non, jamais oublié', () => {
    for (const def of instrumentsSum()) {
      const connu = ELIGIBLES.has(def.id) || def.id in NON_ELIGIBLES;
      expect(
        connu,
        `${def.id} sert le moteur \`sum\` sans figurer dans aucune des deux listes de ce banc. Le sens de sa grille n'a donc jamais été arbitré : lire sa première et sa dernière bande triées par \`min\`, puis l'ajouter à ELIGIBLES (sévérité croissante) ou à NON_ELIGIBLES avec sa raison.`,
      ).toBe(true);
    }
  });

  it('la déclaration portée par chaque instrument suit exactement son classement', () => {
    for (const def of instrumentsSum()) {
      const attendu = ELIGIBLES.has(def.id);
      expect(
        def.scoring.severiteCroissante === true,
        `${def.id} — déclaration \`severiteCroissante\` et classement du banc divergent${attendu ? '' : ` (${NON_ELIGIBLES[def.id] ?? 'non classé'})`}.`,
      ).toBe(attendu);
    }
  });

  /** Tous les instruments éligibles, `sum` compris mais pas seulement. */
  function tousEligibles(): any[] {
    return (Object.values(QUESTIONNAIRE_CATALOGUE as any) as any[])
      .filter((def: any) => def?.scoring?.severiteCroissante === true);
  }

  it('aucun instrument éligible ne porte de valeur d\'item négative', () => {
    // Condition de monotonie : une réponse ajoutée doit ajouter au moins zéro.
    // Une option à valeur négative la romprait sans qu'aucune grille ne change,
    // et `monotonieMoteurs.guard.test.ts` ne la verrait que si elle était
    // atteignable depuis l'une de ses trois lignes de base.
    //
    // Le balayage porte sur TOUS les éligibles, `Q_SOM_01` et `Q_GAS_01` compris :
    // une première rédaction ne visitait que les `sum`, laissant hors garde les
    // deux instruments dont la grille est écrite dans le moteur.
    for (const def of tousEligibles()) {
      for (const sec of def.sections || []) {
        for (const q of sec.questions || []) {
          for (const o of q.options || []) {
            expect(o.v, `${def.id}/${q.id} porte une option à valeur négative (${o.v}).`).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it('aucun instrument éligible ne porte d\'item conditionnel ni d\'item inversé', () => {
    // Deux conditions de monotonie que l'éligibilité doit garder à l'entrée,
    // plutôt que de laisser le banc de monotonie les rattraper par hasard.
    //
    // CONDITIONNEL : un item peut ENTRER dans le barème quand une réponse
    // antérieure change — `evalConditionnel` accepte `<=` et `<`, donc répondre
    // peut faire DISPARAÎTRE un item déjà compté, et le total baisser.
    // INVERSÉ : `sumItems` applique `minV + maxV - v`. La somme reste croissante
    // en le nombre de réponses, mais la déclaration doit rester visible : le jour
    // où une inversion apparaît sur un éligible, elle se relit ici.
    for (const def of tousEligibles()) {
      for (const sec of def.sections || []) {
        for (const q of sec.questions || []) {
          // `horsBareme` n'exempte QUE `psqi` et `tfd`, et surtout pas `sum`.
          //
          // Sur `psqi`, le volet conjoint (`Q10`, `Q11a-e`) est réellement hors
          // total : Buysse 1989 construit ses sept composantes sur les seules
          // questions 1 à 9, et le moteur lit une liste d'items écrite en dur.
          // Garder ces items ici rendrait le PSQI inéligible pour une raison qui
          // ne le concerne pas.
          //
          // Sur `sum`, l'exemption serait FAUSSE : le moteur construit ses items
          // par `allQ.map(q => q.id)` — toutes les questions — et `sumItems` ne
          // consulte `horsBareme` nulle part. Un item marqué hors barème y entre
          // donc bel et bien dans le total. Aucun instrument `sum` éligible n'en
          // porte aujourd'hui ; écrire l'exemption comme une vérité générale
          // aurait couvert le seul moteur pour lequel elle ne l'est pas.
          const exemptable = def.scoring.type === 'psqi' || def.scoring.type === 'tfd';
          if (exemptable && (q.meta?.horsBareme === true || q.horsBareme === true)) continue;
          expect(
            q.meta?.conditionnel ?? q.conditionnel ?? null,
            `${def.id}/${q.id} est conditionnel et entre dans le barème : un item qui entre ou sort selon une autre réponse rompt la monotonie sur laquelle repose le plancher.`,
          ).toBeNull();
        }
      }
      expect(
        def.scoring.reversed ?? null,
        `${def.id} déclare des items inversés : relire la monotonie avant de le laisser éligible.`,
      ).toBeNull();
    }
  });

  it('les deux instruments hors `sum` déclarent leur éligibilité au même endroit', () => {
    // `psqi` et `tfd` écrivent leur grille dans le moteur, pas sur l'instrument.
    // Leur éligibilité, elle, se déclare comme celle des autres — sans quoi il y
    // aurait deux endroits où la lire.
    expect((QUESTIONNAIRE_CATALOGUE as any).Q_SOM_01.scoring.severiteCroissante).toBe(true);
    expect((QUESTIONNAIRE_CATALOGUE as any).Q_GAS_01.scoring.severiteCroissante).toBe(true);
  });

  it('le classement couvre le catalogue tel qu\'il est résolu aujourd\'hui', () => {
    // Compte-témoin : il périme au premier instrument ajouté, ce qui est le but.
    // `Q_ALI_01` quitte le moteur `sum` quand `WN_ALI_01_SIIN57` est allumé — le
    // total descend alors à 25, et le banc reste vrai dans les deux positions.
    const ids = instrumentsSum().map((d: any) => d.id);
    expect(ids.length === 26 || ids.length === 25).toBe(true);
    expect(ids.filter((id: string) => ELIGIBLES.has(id))).toHaveLength(21);
  });
});
