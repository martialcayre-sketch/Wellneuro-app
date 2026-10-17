import type { ValidatedClinicalRuleRef } from '@/lib/clinical-engine/types';
import {
  TEXTE_PAUSE_AVIS_RENDU,
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
} from '@/lib/trust/pauseEffetIndesirable';
import { sha256 } from './corpusSyntheseV1';

// RÈGLE D'INTERRUPTION SUR EFFET INDÉSIRABLE — [[D-101]] amendée par
// [[D-281]], `DC-42`.
//
// CE QUE LA RÈGLE DIT (D-281 §2 à §5) : le patient attribue l'effet à UN
// élément de son programme diffusé, ou répond « Je ne sais pas » / « un autre
// produit ». L'élément désigné — ou tous les compléments — passe en pause au
// portail, et AUCUN programme ne se diffuse pour le dossier tant que le
// praticien n'a pas rendu son avis : impliqué (l'élément reste en pause et ne
// repart ni à l'identique ni augmenté) ou non impliqué (la pause est levée).
// Elle ne dit RIEN de la causalité : le patient a rattaché, la machine ne
// conclut pas qu'il a raison (`DC-27`).
//
// LA DIFFUSION SEULE EST BLOQUÉE. La règle livrée par [[D-101]] produisait un
// constat de sécurité qui retirait tous les candidats du dossier ; le
// responsable l'a écartée (D-281 §1, « aménager, pas bloquer »). La carte, les
// propositions et la préparation restent ouvertes : la garde vit dans la route
// de diffusion (`signalementsEnAttente`), la pause dans la route du programme.
//
// LE STATUT NE LÈVE RIEN (§5) : seul le verdict en tête de chaîne lève
// l'attente. Le rattachement est DÉCLARÉ, jamais déduit ; un signalement sans
// rattachement ni programme ne met rien en pause et reste examiné sur la
// surface des signalements — compté par son statut au panneau, au Fil du jour
// et au prévol (`effetsNonTraites`, `DC-35`), jamais sur la carte : la phrase
// qui l'y disait faisait dériver la carte servie (D-281 §5, 2026-10-17). Celui qui répond « oui » au programme sans élément (formulaire d'avant)
// bloque la diffusion comme les autres (D-281 §5, arbitrage du 2026-10-14),
// sans rien mettre en pause : la migration
// `20261014230000_saf_ei_verdict_formulaire_avant_v1` y a ouvert l'avis.
//
// AUCUNE BORNE DE DURÉE. « Combien de jours après la prise un symptôme reste
// associé » est un seuil clinique qu'aucune source du dépôt ne fixe (`DC-19`).
// La contrainte SQL dit l'ORDRE des deux dates ; la règle ne dit rien de leur
// écart, et n'en lit aucun.

export const CONDUITE_EFFET_INDESIRABLE =
  'Effet indésirable que le patient associe à un élément de son programme, ou sans pouvoir le'
  + ' préciser : l’élément désigné, ou ses compléments, est en pause, et aucun programme ne se'
  + ' diffuse pour ce dossier avant l’avis du praticien. Impliqué : l’élément ne repart ni à'
  + ' l’identique ni augmenté. Non impliqué : la pause est levée. Le statut ne lève rien.';

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
// CE QUE LE SHA COUVRE : `CONDUITE_EFFET_INDESIRABLE` et les trois textes
// patient signés de D-281 §4. Retoucher l'un d'eux referme le verrou. Les
// statuts ouverts en sont sortis le 2026-10-17 (D-281 §5) : ils ne servaient
// qu'à compter, sur la carte, les signalements hors règle — la règle ne les
// compte plus, les surfaces d'affichage les comptent hors de l'empreinte.
//
// CE QUE LA SIGNATURE ASSUMERA, ET QU'IL FAUT AVOIR EXPOSÉ AVANT ELLE :
//
//   1. LA DIFFUSION EST BLOQUÉE POUR TOUT LE DOSSIER. Un signalement rattaché
//      sans avis refuse la diffusion de tout programme, quelle que soit la
//      version visée, la priorité ou la sévérité déclarée (D-281 §3) ; seuls
//      l'élément désigné, ou les compléments, sont en pause au portail.
//   2. LA SÉVÉRITÉ DÉCLARÉE N'ENTRE PAS. Elle oriente déjà le MESSAGE PATIENT
//      (`REGLE_ORIENTATION_EI`, v2 depuis [[D-278]] §1 — « incertaine » y a
//      son propre message —, propriétaire praticien) ; la reprendre ici
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
  JSON.stringify({
    conduite: CONDUITE_EFFET_INDESIRABLE,
    textes: [TEXTE_PAUSE_ELEMENT, TEXTE_PAUSE_COMPLEMENTS, TEXTE_PAUSE_AVIS_RENDU],
  }),
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
 * premier signalement rattaché serait aussi le premier à bloquer la diffusion
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
 * une, sa source sera une. Elle est jointe à la revue clinique, qui ne porte
 * aucun constat d'effet indésirable (D-281 §3) : les signalements en attente
 * sont nommés par le refus de diffusion, jamais par les mots du patient.
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
