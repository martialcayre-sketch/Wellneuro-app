/**
 * LA GRILLE D'INTERPRÉTATION DU PSQI — sortie du corps du calculateur pour
 * qu'une signature puisse enfin la couvrir.
 *
 * Elle vivait en `const` local dans `computeScoreFromDefBrut` (`questions.ts`),
 * parce que `Q_SOM_01.scoring` vaut `{type: 'psqi', …}` et rien d'autre : c'est
 * LA seule grille du catalogue qui ne soit pas dans le `scoring.interpretation`
 * de son questionnaire. Invisible au catalogue, donc invisible à toute
 * dérivation générique de périmètre — et c'est exactement par là que le trou de
 * signature est passé ([[D-180]] : la borne bougée, deux tables signées qui
 * changent de comportement, aucun sha qui bouge).
 *
 * MODULE-FEUILLE, ET IL DOIT LE RESTER : il n'importe rien. `questions.ts` le
 * lit pour calculer, `grillesSignees.ts` le lit pour hacher. Lui faire importer
 * l'un ou l'autre fermerait un cycle.
 *
 * AUCUNE BORNE, AUCUN LIBELLÉ, AUCUNE COULEUR NE CHANGE ICI — le déplacement
 * est le plus petit geste qui rende la grille hachable.
 */

/** Une bande d'interprétation, telle que `interpretRanges` la lit. */
export type BandeInterpretation = {
  min: number;
  max: number;
  label: string;
  color: string;
  protocol?: string;
};

// Les quatre bandes, sorties de la cascade de ternaires où elles vivaient pour
// prendre la forme `{min, max}` du reste du catalogue. Ce n'est pas un
// reformatage : `bandePlancher` a besoin des BORNES pour savoir laquelle est la
// plus basse — la seule qui ne fasse pas un plancher —, et une cascade ne les
// expose pas.
//
// PROVENANCE — corrigé le 2026-09-13 : ce paragraphe disait « l'échelle de
// Buysse 1989 ». Il revendiquait une source qui ne porte pas cette grille.
// Buysse et al. (Psychiatry Research 28:193-213, 1989) ne publient AUCUNE
// stratification de sévérité : le PSQI y est DICHOTOMIQUE — bon dormeur /
// mauvais dormeur, une seule frontière, « a global PSQI score greater than 5 ».
// Les quatre bandes ci-dessous et leurs libellés sont une construction
// WellNeuro. Seule la coupure 4/5 a un répondant dans la littérature, et décalé
// d'un point ; 10/11 et 16/17 n'en ont aucun.
//
// BORNE DÉPLACÉE 4/5 → 5/6 LE 2026-09-13, sur arbitrage praticien ([[D-180]]).
// Ce n'est pas un ajustement d'affichage : c'est ainsi que `R-SOM-01` cesse de
// s'allumer à 5. Sa zone cite des COULEURS, pas des nombres ; le seul endroit où
// le point d'allumage se règle est donc cette grille. La conséquence qui a été
// découverte APRÈS coup, et qui a motivé ce module : `BIO-SOM-01` recopie la
// même zone couleur sur le même instrument, et a suivi ce déplacement sans
// avoir été éditée — une prescription de panel qui change sans re-signature.
//
// CE QUE 5 DEVIENT, ET CE QUE PERSONNE NE PEUT DIRE À SA PLACE. Buysse ne classe
// PAS un total de 5 : sa feuille de cotation écrit « TOTAL < 5 » bon, « TOTAL >
// 5 » mauvais, et laisse la valeur exacte sans case. Le ranger en « Pas de
// trouble du sommeil » est donc un choix WellNeuro, au même titre que le ranger
// en « légers » l'était avant — l'arbitrage tranche en faveur de la spécificité,
// et de l'alignement sur le cut-off strict.
export const BANDES_PSQI: BandeInterpretation[] = [
  {min: 0,  max: 5,  label: 'Pas de trouble du sommeil',    color: 'success'},
  {min: 6,  max: 10, label: 'Troubles du sommeil légers',   color: 'info'},
  {min: 11, max: 16, label: 'Troubles du sommeil modérés',  color: 'warning'},
  {min: 17, max: 21, label: 'Troubles du sommeil sévères',  color: 'danger'},
];
