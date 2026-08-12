import { FUSEAU_CLINIQUE, jourCivilClinique } from './contradictionsEngine';
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
   * LES PASSATIONS CONFRONTÉES, datées — corrigé après revue.
   *
   * La première version de ce type jetait `sources` et `justificationClaims`
   * pour ne garder qu'un écart en jours. Un constat clinique doit être
   * explicable par les données qui l'ont produit (`DC-34`, `DC-35`) : sans les
   * passations nommées, le praticien lisait une affirmation qu'il ne pouvait
   * pas ouvrir. Pire, l'écart nu sous un intitulé d'ancienneté invitait à
   * décoter le constat par sa vétusté — la lecture de fiabilité que [[D-048]]
   * refuse, obtenue sans champ de fiabilité.
   */
  passations: { idQuestionnaire: string; date: string; dateLisible: string }[];
  /**
   * Écart en jours entre la plus ancienne et la plus récente, ou `null` s'il
   * n'est pas applicable. Rendu EN COMPLÉMENT des dates, jamais seul : ancré
   * par elles, c'est un fait ; nu, il se lit comme une décote de fiabilité.
   */
  ecartJours: number | null;
  /** Les claims qui fondent la règle : sans eux, rien n'est traçable (`DC-01`, `DC-26`). */
  claims: { claimId: string; versionClaim: string }[];
  /**
   * `DC-30` est ACTÉE, donc opposable, et elle énumère l'objet minimal d'une
   * discordance : « sources, description, importance, hypothèses, action
   * suggérée, résolue ou non ». La première conversion en jetait trois. Le
   * motif de `importance` a même fait l'objet d'un arbitrage entier ([[D-048]])
   * pour une valeur qui n'atteignait pas l'écran.
   */
  importance: ContradictionFinding['importance'];
  resolution: ContradictionFinding['resolution'];
  /** La règle qui a mordu : sans elle, un faux positif n'est pas remontable. */
  regleId: string;
  /** Reprise telle quelle ; absente quand la règle n'en porte pas. */
  recoupementJustifie?: string;
};

/** `JJ/MM/AAAA` dans le fuseau clinique — le format du reste du cockpit. */
function dateLisible(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU_CLINIQUE }).format(new Date(iso));
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
  return constats.map(constat => {
    // Une passation par `reponseId`, pas une par source : une règle peut viser
    // deux sous-scores du même questionnaire, et l'écran n'a pas à afficher
    // deux fois la même passation.
    const vues = new Map<string, { idQuestionnaire: string; date: string; dateLisible: string }>();
    for (const source of constat.sources) {
      if (source.type !== 'instrument') continue;
      const date = jourCivilClinique(source.dateReponse);
      if (date === null) continue;
      vues.set(source.reponseId, {
        idQuestionnaire: source.idQuestionnaire,
        date,
        dateLisible: dateLisible(source.dateReponse),
      });
    }

    return {
      id: constat.id,
      description: constat.description,
      actionSuggeree: constat.actionSuggeree,
      hypotheses: constat.hypotheses,
      limitations: constat.limitations,
      // Triées par date : le praticien lit une chronologie, pas l'ordre des
      // déclencheurs de la règle.
      passations: [...vues.values()].sort((a, b) => a.date.localeCompare(b.date)),
      ecartJours: constat.ecartJoursEntreSources,
      claims: constat.justificationClaims,
      importance: constat.importance,
      resolution: constat.resolution,
      regleId: constat.regleId,
      ...(constat.recoupementJustifie ? { recoupementJustifie: constat.recoupementJustifie } : {}),
    };
  });
}
