import { CONTRADICTIONS_METADATA } from './contradictionsV1';
import type { ContradictionFinding } from './contradictionFinding';

/**
 * Ce qui sépare le moteur de contradictions de l'écran.
 *
 * Deux responsabilités, et une seule raison de les tenir ensemble : le verrou
 * et la conversion sont les deux endroits où un constat déterministe peut
 * devenir faux en changeant de forme.
 */

// Verrou auto-portant, calqué sur `tableSignee()` de `orientationService` :
// `validationExterne` seul serait un booléen qu'un flip isolé suffirait à
// ouvrir. Une table réellement signée porte aussi sa date de validation et les
// claims qui la fondent.
function tableSignee(): boolean {
  return CONTRADICTIONS_METADATA.validationExterne
    && CONTRADICTIONS_METADATA.dateValidation !== null
    && CONTRADICTIONS_METADATA.claimsSource.length > 0;
}

/**
 * Double verrou fail-closed : le drapeau d'environnement ET la signature
 * praticien de la table (patron `orientationActive()`, lui-même repris de
 * `CORPUS_CLINIQUE_ACTIF` dans `lib/anthropic.ts`).
 *
 * À la livraison du LOT-01, `validationExterne` est `false` : **rien ne
 * s'allume**, quel que soit le drapeau. Écrire une règle et la signer sont deux
 * gestes distincts, et seul le second met un constat sous les yeux d'un
 * praticien.
 */
export function contradictionsActives(): boolean {
  return process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 === '1' && tableSignee();
}

/**
 * Ce que l'écran reçoit d'un constat de contradiction.
 *
 * POURQUOI CE TYPE, ET PAS `DiscordanceFinding` — la lettre de [[D-044]] dit
 * « l'injection cockpit convertit » ; sa mise en œuvre montre vers quoi elle ne
 * peut pas convertir. `DiscordanceFinding` hérite de `ClinicalFindingBase`, qui
 * porte `confidence: QualitativeConfidence` — et cette énumération ne propose
 * que `solide`, `probable`, `fragile`, `à_documenter`. Aucune de ces quatre
 * valeurs ne dit « non applicable ». Convertir un constat DÉTERMINISTE vers ce
 * type obligerait donc à lui inventer un degré de certitude, c'est-à-dire à
 * faire exactement ce que le garde non négociable de [[D-041]] interdit, et par
 * le chemin que [[D-044]] avait justement identifié comme piégé.
 *
 * La conversion a donc lieu — mais vers un modèle d'AFFICHAGE, qui ne porte
 * aucun champ de cette famille. `DiscordanceFinding` reste en place, inchangé,
 * et ce moteur ne l'emprunte pas.
 */
export type ContradictionAffichee = {
  id: string;
  /** Formulation neutre produite par le déterministe, jamais reformulée ici. */
  description: string;
  actionSuggeree: string;
  hypotheses: string[];
  limitations: string[];
  /**
   * Phrase toute faite décrivant l'ancienneté relative des passations, ou
   * `null` quand l'écart n'est pas applicable. Construite ici plutôt qu'à
   * l'écran : c'est une donnée clinique, et un composant ne doit pas avoir à
   * décider comment on dit « 151 jours ».
   */
  ecartPassations: string | null;
  /** Reprise telle quelle ; absente quand la règle n'en porte pas. */
  recoupementJustifie?: string;
};

/**
 * Rend la phrase d'écart, ou `null`.
 *
 * `null` en entrée signifie « moins de deux passations distinctes, écart NON
 * APPLICABLE » ; il ne devient pas « 0 jour » (`DC-24`). Et `0` en entrée est
 * un fait — deux passations du même jour — qui se dit, parce que « le même
 * jour » est précisément l'information qui écarte l'hypothèse temporelle.
 */
function phraseEcart(ecartJours: number | null): string | null {
  if (ecartJours === null) return null;
  if (ecartJours === 0) return 'Les deux passations datent du même jour.';
  if (ecartJours === 1) return 'Les deux passations sont séparées de 1 jour.';
  return `Les deux passations sont séparées de ${ecartJours} jours.`;
}

/**
 * Convertit les constats pour l'écran, et applique le verrou.
 *
 * LE VERROU EST ICI, pas chez l'appelant : un composant qui recevrait des
 * constats et déciderait lui-même de les taire finirait par les afficher le
 * jour où quelqu'un oublie la condition. Verrou fermé ⇒ liste vide.
 */
export function contradictionsPourAffichage(constats: ContradictionFinding[]): ContradictionAffichee[] {
  if (!contradictionsActives()) return [];
  return constats.map(constat => ({
    id: constat.id,
    description: constat.description,
    actionSuggeree: constat.actionSuggeree,
    hypotheses: constat.hypotheses,
    limitations: constat.limitations,
    ecartPassations: phraseEcart(constat.ecartJoursEntreSources),
    ...(constat.recoupementJustifie ? { recoupementJustifie: constat.recoupementJustifie } : {}),
  }));
}
