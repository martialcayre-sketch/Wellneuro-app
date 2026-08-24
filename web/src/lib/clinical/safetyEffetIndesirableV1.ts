import type { ValidatedClinicalRuleRef } from '@/lib/clinical-engine/types';
import { sha256 } from './corpusSyntheseV1';

// RÈGLE D'INTERRUPTION SUR EFFET INDÉSIRABLE — [[D-101]], LOT-05, `DC-42`.
//
// CE QUE LA RÈGLE DIT : « un effet indésirable déclaré par le patient, rattaché
// par lui à un protocole en cours, et que le praticien n'a pas encore traité,
// interrompt la préparation automatique de la décision — requalification, puis
// validation ». Elle ne dit RIEN de la causalité : le patient a rattaché, la
// machine ne conclut pas qu'il a raison. `DC-27` reste entière — association
// n'est pas causalité, et le mot « associé » de `DC-42` est temporel.
//
// LE SECOND PRODUCTEUR DE L'OBJET DE SÉCURITÉ. Le premier est la cotation des
// signaux d'anamnèse ([[D-099]], LOT-04) ; celui-ci partage son consommateur —
// `evaluerAbstention` passe en `required`, la table des priorités se tait, la
// carte est bloquée, aucun protocole n'est diffusable. L'inhibition RETIRE,
// elle ne s'affiche pas à côté.
//
// L'ASSOCIATION EST DÉCLARÉE, JAMAIS DÉDUITE. Elle vient de la colonne
// `protocol_draft_id`, que le patient renseigne au portail en désignant le
// protocole qu'il suit. Rapprocher un libellé de produit d'une ligne de
// protocole par ressemblance serait une déduction, et l'interdit du lot la
// nomme. Un signalement SANS association ne produit donc aucun constat — mais
// il ne disparaît pas pour autant : `construireSafetyFindings` en fait une
// limitation servie au praticien (`DC-35`).
//
// AUCUNE BORNE DE DURÉE. « Combien de jours après la prise un symptôme reste
// associé » est un seuil clinique qu'aucune source du dépôt ne fixe (`DC-19`).
// La contrainte SQL dit l'ORDRE des deux dates ; la règle ne dit rien de leur
// écart, et n'en lit aucun.

/** Statuts de traitement qui laissent le signalement OUVERT. */
export const STATUTS_EI_NON_TRAITES = ['recu', 'en_cours'] as const;

export const CONDUITE_EFFET_INDESIRABLE =
  'Effet indésirable déclaré par le patient et rattaché par lui à un protocole en cours :'
  + ' la préparation automatique s’interrompt. Ni augmentation ni poursuite sans'
  + ' requalification, puis validation du praticien.';

export type SafetyEffetIndesirableMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  sourceReference: string;
  shaPerimetre: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// À LIRE AVANT DE SIGNER
//
// CE QUE LE SHA COUVRE : `STATUTS_EI_NON_TRAITES` et
// `CONDUITE_EFFET_INDESIRABLE`. Ajouter un statut à la liste des « non
// traités », ou retoucher le texte de conduite, referme le verrou.
//
// CE QUE LA SIGNATURE ASSUMERA, ET QU'IL FAUT AVOIR EXPOSÉ AVANT ELLE :
//
//   1. L'INHIBITION EST TOTALE, PAS GRADUÉE. Un signalement rattaché et non
//      traité retire TOUS les candidats du dossier, quel que soit le protocole
//      visé et quelle que soit la sévérité déclarée. `DC-42` dit « interdit
//      d'augmenter ou de poursuivre » ; le seul levier que le dépôt possède est
//      l'objet de sécurité, et il est binaire. Une inhibition ciblée sur le
//      seul axe concerné n'existe pas — et l'inventer aurait supposé de relier
//      un protocole à un axe candidat, ce que rien ne fait aujourd'hui.
//   2. LA SÉVÉRITÉ DÉCLARÉE N'ENTRE PAS. Elle oriente déjà le MESSAGE PATIENT
//      (`REGLE_ORIENTATION_EI`, v1, propriétaire praticien) ; la reprendre ici
//      en ferait un second usage, gradué, d'une déclaration que rien ne vérifie
//      — c'est-à-dire une gravité chiffrée déguisée (`DC-23`).
//   3. LE VERROU A LE SENS INVERSE DES AUTRES, comme celui du LOT-04 : le
//      refermer RETIRE une inhibition. Contrepoids : tant qu'il est fermé, le
//      producteur reste muet — l'état livré ne change rien, et le dit.
//
//      PHRASE CORRIGÉE LE 2026-08-24 ([[D-107]], LOT-11). Elle ajoutait « et le
//      drapeau `WN_EI_INTERRUPTION` est absent de la production ». C'ÉTAIT VRAI
//      À LA LIVRAISON ET FAUX DEPUIS : le drapeau y vaut `1` depuis le LOT-05,
//      posé exprès pour ouvrir la CAPTURE ([[D-101]]) — la ligne 143 le lit. Le
//      mécanisme n'a jamais changé ; seule la phrase avait vieilli. Ce qui tient
//      l'inhibition fermée aujourd'hui est la SIGNATURE manquante, jamais le
//      drapeau. Une phrase périmée dans un fichier clinique se corrige : c'est
//      elle qu'un relecteur croit avant de croire le code.
// ─────────────────────────────────────────────────────────────────────────────

export const SAFETY_EI_METADATA: SafetyEffetIndesirableMetadata = {
  version: 'safety-effet-indesirable-nnpp2-v1',
  // NON SIGNÉE À LA LIVRAISON — même discipline que les cinq autres tables du
  // dépôt : écrire une règle et la signer sont deux gestes distincts, et le
  // second est un acte PRATICIEN. Il ne se rend pas avant que la migration
  // d'association soit appliquée ET constatée en production : signer une règle
  // qui lit une colonne absente serait signer une règle inapplicable.
  validationExterne: false,
  dateValidation: null,
  sourceReference: '',
  shaPerimetre: null,
};

export const SAFETY_EI_SHA256 = sha256(
  JSON.stringify({ statuts: STATUTS_EI_NON_TRAITES, conduite: CONDUITE_EFFET_INDESIRABLE }),
);

/** Identifiant unique de la règle d'interruption sur effet indésirable. */
export const REGLE_SECURITE_EFFET_INDESIRABLE = 'SAF-EI-01';

/**
 * Le verrou de signature, auto-portant — patron `tableSignauxSecuriteSignee()`.
 *
 * Cinq termes, et le `shaPerimetre` est celui qui compte : une conduite
 * retouchée après signature ferait servir au praticien un texte qu'il n'a pas
 * relu, sous une inhibition qu'il a autorisée pour un autre texte.
 */
export function tableEffetIndesirableSignee(): boolean {
  const dateValidation = SAFETY_EI_METADATA.dateValidation;
  return SAFETY_EI_METADATA.validationExterne
    && dateValidation !== null
    && !Number.isNaN(new Date(dateValidation).getTime())
    && new Date(dateValidation).toISOString() === dateValidation
    && SAFETY_EI_METADATA.sourceReference.trim().length > 0
    && SAFETY_EI_METADATA.shaPerimetre === SAFETY_EI_SHA256;
}

/**
 * Le drapeau d'environnement de l'interruption — NEUF ET ÉTEINT.
 *
 * POURQUOI UN DRAPEAU EN PLUS DU VERROU DE SIGNATURE, alors que le LOT-04 s'en
 * est passé : ce lot livre une MIGRATION, et le code se déploie AVANT qu'elle
 * soit approuvée ([[D-087]]). Sans drapeau, la chaîne C1 lirait
 * `protocol_draft_id` sur une base qui ne la porte pas encore — une erreur
 * Prisma sur le chemin de construction de la carte, c'est-à-dire le cockpit
 * cassé pour tout le monde. Éteint, aucune requête neuve n'est émise.
 *
 * Il s'éteint SEUL sur toute autre valeur que `'1'` : un drapeau absent, mal
 * orthographié ou vide laisse la production dans son état d'avant le lot.
 */
export function interruptionEffetIndesirableActive(): boolean {
  return associationEffetIndesirableDisponible() && tableEffetIndesirableSignee();
}

/**
 * Les colonnes d'association sont-elles UTILISABLES ? Le drapeau seul.
 *
 * DEUX GESTES, ET DANS CET ORDRE — c'est tout l'objet de ce prédicat distinct :
 *
 *   1. la migration est appliquée puis CONSTATÉE en production, et le drapeau
 *      est posé ⇒ le portail commence à CAPTURER l'association ;
 *   2. la règle est signée ⇒ l'association commence à INTERROMPRE.
 *
 * Les inverser inhiberait sur une colonne que personne n'a encore remplie : le
 * premier signalement rattaché serait aussi le premier à retirer les candidats
 * d'un dossier, sans qu'aucun signalement antérieur n'ait pu l'être. La capture
 * précède l'inhibition, et l'écart entre les deux est du temps d'observation.
 */
export function associationEffetIndesirableDisponible(): boolean {
  return process.env.WN_EI_INTERRUPTION === '1';
}

/**
 * La règle en `ValidatedClinicalRuleRef`, ou `null` quand elle n'est pas signée.
 *
 * UNE SEULE RÈGLE POUR TOUS LES SIGNALEMENTS : l'arbitrage est un, sa date sera
 * une, sa source sera une. Le signalement concerné est identifié dans la
 * `rationale` du constat — par son identifiant, jamais par les mots du patient,
 * qui décrivent des symptômes et n'ont rien à faire dans un objet haché puis
 * servi hors du dossier.
 */
export function regleEffetIndesirableValidee(): ValidatedClinicalRuleRef | null {
  if (!tableEffetIndesirableSignee()) return null;
  return {
    ruleId: REGLE_SECURITE_EFFET_INDESIRABLE,
    version: SAFETY_EI_METADATA.version,
    lifecycle: 'clinically_validated',
    validation: {
      validatedAt: SAFETY_EI_METADATA.dateValidation as string,
      validatorRole: 'practitioner',
      sourceReference: SAFETY_EI_METADATA.sourceReference,
    },
  };
}
