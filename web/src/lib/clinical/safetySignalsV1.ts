import type { ValidatedClinicalRuleRef } from '@/lib/clinical-engine/types';
import { sha256 } from './corpusSyntheseV1';

// Table des SIGNAUX DE SÉCURITÉ d'anamnèse — [[D-099]], campagne « Doctrine
// exécutable », LOT-04.
//
// CE QUE LA TABLE DIT, ET QU'AUCUNE AUTRE NE DIT : « ce signal-là, déclaré par
// le patient dans l'anamnèse, appelle un adressage médical dont le DÉLAI est
// lui-même le risque — la préparation de la décision s'arrête tant qu'il n'a
// pas été revu ». Elle ne dit rien d'autre : ni ce dont le signal relève, ni
// ce qu'il faut en faire cliniquement. Elle range, elle n'interprète pas.
//
// D'OÙ VIENT LA COTATION, ET CE QU'ELLE N'EST PAS. Elle ne dérive d'aucun
// claim du corpus : elle est un ARBITRAGE PRATICIEN daté (2026-08-23,
// [[D-099]]), rendu item par item en session sur les douze libellés existants.
// Sa provenance est doctrinale et décisionnelle, jamais bibliographique —
// même régime que `ABSTENTION_PROCEDURE_V1` ([[D-062]]), et `DC-26` est
// satisfaite par le registre des DÉCISIONS, pas par celui des claims. Si le
// praticien veut des claims `VALIDE` à l'appui, ils restent à écrire.
//
// LE CRITÈRE DE LA COUPE EST ÉCRIT, PARCE QU'IL EST RÉFUTABLE. Rang
// `adressage` : le signal appelle un avis médical dont le report est lui-même
// le risque. Rang `vigilance` : le signal appelle un avis médical que le
// praticien porte dans la consultation en cours. Le critère cote le DÉLAI, pas
// la gravité — conséquence assumée et nommée au moment de l'arbitrage : le
// trio d'orientation classique (sang dans les selles ou les urines, perte de
// poids involontaire, fièvre prolongée) s'en trouve SÉPARÉ, le premier en
// `adressage` et les deux autres en `vigilance`. Un critère « tout signal
// appelant un adressage » les réunirait en `adressage` ; il a été exposé et
// n'a pas été retenu.
//
// CE QUE LE RANG `vigilance` NE FAIT PAS : rien. Il ne produit aucun constat,
// ne change aucun comportement, et les six signaux qui le portent continuent
// de remonter EXACTEMENT comme avant par `extraireVigilanceDeterministe`
// (`consultation/contexteClinique.ts`), qui ne filtre rien. Le rang n'est pas
// une mise en sourdine : c'est le refus d'ajouter une inhibition là où
// l'arbitrage n'en a pas demandé.
//
// AUCUNE GRAVITÉ, AUCUN RANG NUMÉRIQUE, AUCUN POIDS (`DC-19`, `DC-23`). Les
// deux rangs ne sont pas ordonnés par un nombre et n'entrent dans aucun
// calcul : un constat de sécurité n'ajoute ni ne retire de points, sous aucun
// nom. `safetyFindings.guard.test.ts` le garde structurellement.
//
// LES LIBELLÉS SONT VERBATIM CEUX D'`anamnese.ts`, et le banc anti-dérive les
// confronte aux options réelles — dans les deux sens. Un libellé qui dérive
// sans que la table suive ferait taire un signal de sécurité, ce qui est le
// mode de défaillance que ce lot existe pour fermer.

export type SafetySignalRang = 'adressage' | 'vigilance';

export type SafetySignal = {
  /** Libellé verbatim de l'option d'`anamnese.ts`. Jamais paraphrasé. */
  readonly libelle: string;
  readonly rang: SafetySignalRang;
  /**
   * Domaine d'appartenance, DESCRIPTIF et rien de plus : il oriente la lecture
   * du praticien, il ne commande aucun comportement du moteur. Aucun code ne
   * branche dessus, et c'est délibéré — brancher dessus reviendrait à faire
   * dire à un libellé de rangement une conduite que personne n'a décidée.
   */
  readonly domaine: string;
};

/**
 * La conduite est portée par le RANG, jamais recopiée sur chaque item.
 *
 * Douze textes pour deux rangs inventeraient onze distinctions que l'arbitrage
 * n'a pas rendues — et chacune serait, au sens de `DC-19`, un contenu clinique
 * sans provenance. Le texte du rang `adressage` reprend délibérément la phrase
 * déjà servie en production par `extraireVigilanceDeterministe` : elle est
 * éprouvée sur les dossiers vivants, et la remplacer aurait été un arbitrage
 * de plus, non demandé.
 */
export const SAFETY_SIGNAL_CONDUITES = {
  adressage:
    'Signal d’alerte signalé par le patient : avis médical à évaluer en priorité,'
    + ' avant toute proposition de priorité ou de protocole.',
  vigilance:
    'Signal d’alerte signalé par le patient : avis médical à évaluer ;'
    + ' le praticien le porte dans la consultation en cours.',
} as const satisfies Record<SafetySignalRang, string>;

export const SAFETY_SIGNALS_V1: readonly SafetySignal[] = [
  { libelle: 'Perte de poids involontaire importante', rang: 'vigilance', domaine: 'systémique' },
  { libelle: 'Fièvre prolongée / sueurs nocturnes', rang: 'vigilance', domaine: 'systémique' },
  { libelle: 'Sang dans les selles ou les urines', rang: 'adressage', domaine: 'digestif / urologique' },
  { libelle: 'Douleur thoracique / oppression', rang: 'adressage', domaine: 'cardio-respiratoire' },
  { libelle: 'Essoufflement inhabituel', rang: 'adressage', domaine: 'cardio-respiratoire' },
  { libelle: 'Malaise / perte de connaissance', rang: 'adressage', domaine: 'cardio-neurologique' },
  { libelle: 'Perte de force ou de sensibilité brutale', rang: 'adressage', domaine: 'neurologique' },
  { libelle: 'Idées noires ou suicidaires', rang: 'adressage', domaine: 'psychiatrique' },
  // DÉFAUT DE LIBELLÉ, CONSIGNÉ PLUTÔT QUE COTÉ. « Douleur intense et
  // inhabituelle » ne porte ni siège ni domaine : la cotation en `vigilance`
  // est un constat de non-qualifiabilité, PAS un jugement clinique sur la
  // douleur. Requalifier ce signal suppose de réécrire son libellé dans
  // `anamnese.ts` — une modification de questionnaire, donc un autre lot et un
  // autre arbitrage ([[D-099]], réserve 2).
  { libelle: 'Douleur intense et inhabituelle', rang: 'vigilance', domaine: 'non spécifié' },
  { libelle: 'Vomissements persistants', rang: 'vigilance', domaine: 'digestif' },
  { libelle: 'Diarrhée persistante ou nocturne', rang: 'vigilance', domaine: 'digestif' },
  { libelle: 'Constipation récente inexpliquée', rang: 'vigilance', domaine: 'digestif' },
];

export type SafetySignalsMetadata = {
  version: string;
  validationExterne: boolean;
  /** ISO canonique le jour de la signature — devient `validation.validatedAt`. */
  dateValidation: string | null;
  /** Ce que le praticien a relu et signé, en une phrase opposable. */
  sourceReference: string;
  /**
   * SHA du périmètre relu à la signature — patron [[D-063]], étendu par
   * [[D-067]]. LITTÉRAL FIGÉ, jamais la constante calculée : la comparaison
   * serait tautologique et la péremption invisible. Une cotation retouchée
   * après signature referme le verrou SEULE.
   */
  shaPerimetre: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// À LIRE AVANT DE RE-SIGNER
//
// CE QUE LE SHA COUVRE : `SAFETY_SIGNALS_V1` (libellés, rangs, domaines) ET
// `SAFETY_SIGNAL_CONDUITES` (les deux textes servis au praticien). Déplacer un
// signal d'un rang à l'autre, ou retoucher un texte de conduite, referme le
// verrou — et la sortie de secours est de RE-SIGNER, jamais de recopier le
// nouveau sha en silence.
//
// CE QUE LA SIGNATURE ASSUME, ET QUI A ÉTÉ EXPOSÉ AVANT ELLE :
//
//   1. La coupe cote le DÉLAI et non la gravité (voir l'en-tête). Le trio
//      d'orientation classique s'en trouve séparé.
//   2. « Douleur intense et inhabituelle » est cotée faute de libellé
//      qualifiable, pas sur un jugement clinique.
//   3. Le rang `adressage` INHIBE : sur les dossiers concernés, le cockpit ne
//      propose plus aucune priorité et aucun protocole n'est diffusable.
//      Mesuré en production le 2026-08-23 (lecture seule, agrégats) : 6
//      dossiers sur 25 portent au moins un signal de rang `adressage`.
// ─────────────────────────────────────────────────────────────────────────────

export const SAFETY_SIGNALS_METADATA: SafetySignalsMetadata = {
  version: 'safety-signals-nnpp2-v1',
  // SIGNÉE le 2026-08-23 — arbitrage praticien explicite en session, rendu
  // item par item sur les douze libellés ([[D-099]]).
  validationExterne: true,
  dateValidation: '2026-08-23T00:00:00.000Z',
  sourceReference:
    'Arbitrage praticien du 2026-08-23 ([[D-099]]) : cotation des douze signaux d’alerte'
    + ' d’anamnèse en deux rangs, sur le critère « le report est lui-même le risque ».'
    + ' Prolonge l’arbitrage praticien du 2026-08-03 (orientationRulesV1.ts) : un signal'
    + ' d’alerte appelle un adressage, jamais une exploration.',
  // SURTOUT PAS `shaPerimetre: SAFETY_SIGNALS_SHA256` — la constante est
  // déclarée APRÈS cet objet, et la comparaison serait tautologique (piège
  // documenté sur le verrou biologie, et repris tel quel ici).
  shaPerimetre: '4b09590f578800418decfc4915fa8856be4a5e1b6c7c99fe6a718f20079e422c',
};

export const SAFETY_SIGNALS_SHA256 = sha256(
  JSON.stringify({ signaux: SAFETY_SIGNALS_V1, conduites: SAFETY_SIGNAL_CONDUITES }),
);

/**
 * La table des signaux de sécurité est-elle signée ?
 *
 * Même verrou auto-portant que `tablePrioritesSignee()` : un `validationExterne`
 * seul serait un booléen qu'un flip isolé suffirait à ouvrir.
 *
 * LA CONSÉQUENCE D'UN VERROU FERMÉ EST ICI L'INVERSE DE CELLE DES AUTRES
 * TABLES, et il faut la dire. Ailleurs, un verrou fermé fait TAIRE le moteur —
 * l'extinction ne s'applique pas, aucun candidat n'est produit : le défaut est
 * sûr. Ici, un verrou fermé retirerait une INHIBITION, donc rendrait le
 * dispositif moins prudent. C'est pourquoi le producteur, verrou fermé, ne
 * produit pas « rien » : il produit un constat qui DIT que la cotation n'est
 * pas signée (voir `construireSafetyFindings`).
 */
export function tableSignauxSecuriteSignee(): boolean {
  const dateValidation = SAFETY_SIGNALS_METADATA.dateValidation;
  return SAFETY_SIGNALS_METADATA.validationExterne
    && dateValidation !== null
    && !Number.isNaN(new Date(dateValidation).getTime())
    && new Date(dateValidation).toISOString() === dateValidation
    && SAFETY_SIGNALS_METADATA.sourceReference.trim().length > 0
    && SAFETY_SIGNALS_METADATA.shaPerimetre === SAFETY_SIGNALS_SHA256;
}

/** Identifiant unique de la règle de sécurité d'anamnèse. */
export const REGLE_SECURITE_ANAMNESE = 'SAF-ANAM-01';

/**
 * La règle de sécurité en `ValidatedClinicalRuleRef` — ou `null`.
 *
 * UNE SEULE RÈGLE POUR LES DOUZE SIGNAUX, et non une par item : l'arbitrage
 * rendu est un, sa date est une, sa source est une. Douze règles porteraient
 * douze fois la même validation et laisseraient croire à douze relectures.
 * Le signal concerné est cité verbatim dans la `rationale` du constat.
 */
export function regleSecuriteValidee(): ValidatedClinicalRuleRef | null {
  if (!tableSignauxSecuriteSignee()) return null;
  return {
    ruleId: REGLE_SECURITE_ANAMNESE,
    version: SAFETY_SIGNALS_METADATA.version,
    lifecycle: 'clinically_validated',
    validation: {
      // Non-null par `tableSignauxSecuriteSignee()`, qui vérifie aussi que la
      // date est ISO canonique — la forme exacte qu'exige `buildClinicalReview`.
      validatedAt: SAFETY_SIGNALS_METADATA.dateValidation as string,
      validatorRole: 'practitioner',
      sourceReference: SAFETY_SIGNALS_METADATA.sourceReference,
    },
  };
}

/** Le rang coté pour ce libellé, ou `null` si la table ne le connaît pas. */
export function rangDuSignal(libelle: string): SafetySignalRang | null {
  return SAFETY_SIGNALS_V1.find(signal => signal.libelle === libelle)?.rang ?? null;
}
