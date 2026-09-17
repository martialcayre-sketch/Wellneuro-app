// État du consentement « partage médecin traitant » — lecture PURE, aucune
// dépendance Prisma.
//
// GARDE DEPUIS LE 2026-09-17, ET C'EST UN RENVERSEMENT ASSUMÉ ([[D-219]] §3
// amendé, arbitrage du responsable). Ce module portait l'inverse, mot pour mot :
// « INDICATEUR, PAS GARDE — bloquer la consignation n'empêcherait pas le
// partage, cela rendrait seulement le dossier aveugle ». Ce motif de 2026-07-22
// n'était pas faux, et il n'est pas contourné ici : il est PAYÉ, en connaissance
// de cause.
//
// CE QUE LE RENVERSEMENT COÛTE, ÉCRIT POUR QU'ON NE LE REDÉCOUVRE PAS. Un
// partage qui a lieu hors application ne disparaît pas parce que le logiciel
// refuse de l'enregistrer : il devient invisible au dossier ET au registre RGPD,
// qui compte la correspondance comme traitement depuis [[D-222]]. Le dépôt
// accepte cette cécité pour que la phrase lue par le patient — « aucun partage
// sans votre choix » — cesse d'être une promesse que rien ne tient.
//
// TROIS ÉTATS FERMENT, UN SEUL OUVRE. Le refus et le retrait ferment ; le
// SILENCE ferme aussi (fail-closed comme le reste de la maison : « sans un choix
// explicite de votre part » se lit à la lettre). Sa contrepartie n'est pas
// optionnelle — l'écran praticien doit DIRE que le consentement n'a jamais été
// exprimé et donner le chemin pour le recueillir. Un blocage sans chemin de
// sortie serait un mur ; celui-ci est une porte.
//
// CE QUI N'EST PAS GARDÉ PARCE QU'IL NE VA PAS À UN TIERS. Le document remis au
// patient (`biologie/proposition/document-patient`, écrit dans
// `documentPatientBiologie`) et le booklet patient ne passent PAS par cette
// garde, et ne doivent pas y passer : la finalité consentie est
// `partage_medecin_traitant`, elle porte sur la transmission à un MÉDECIN.
// Opposer ce refus à un document que le patient reçoit lui-même reviendrait à
// lui refuser ses propres données au nom de son propre choix. Écrit ici parce
// que c'était tacite, et qu'un lecteur pressé aurait pu « compléter » la garde.
//
// CE QUE LA GARDE NE COUVRE PAS, ET C'EST DÉLIBÉRÉ : la lettre d'adressage sur
// signal d'alerte (`/api/praticien/adressage/courrier`). Fermer là serait fermer
// au moment précis où la décision clinique est déjà suspendue, et sur les
// dossiers où un signe a été repéré. C'est l'exception que
// `donnees_confidentialite@v9` nomme au patient — et le discriminant est LA
// ROUTE, jamais le destinataire : `medecinLibelle` est du texte libre sur tous
// les chemins d'écriture, sans aucun rattachement à `medecinTraitantNom`.

import { projeterChoixCourants } from './securite';
import type { StatutChoix } from './types';

const FINALITE_PARTAGE = 'partage_medecin_traitant';

/**
 * Dernier statut du choix « partage médecin traitant », `null` si le patient
 * ne s'est jamais exprimé. Les événements sont append-only : le dernier par
 * date d'enregistrement fait foi (même projection que le centre TRUST).
 */
export function statutPartageMedecinTraitant(
  evenements: { finalite: string; statut: string; enregistreLe: Date | string }[],
): StatutChoix | null {
  const normalises = evenements.map((evenement) => ({
    finalite: evenement.finalite,
    statut: evenement.statut,
    enregistreLe:
      evenement.enregistreLe instanceof Date
        ? evenement.enregistreLe.toISOString()
        : evenement.enregistreLe,
  }));
  const courant = projeterChoixCourants(normalises).get(FINALITE_PARTAGE);
  if (!courant) return null;
  return courant.statut as StatutChoix;
}


/** Ce que le consentement autorise, du point de vue d'une route qui écrit. */
export type VerdictPartageMedecin =
  | { bloquant: false; motif: 'accorde' }
  | { bloquant: true; motif: 'refuse' | 'retire' | 'jamais_exprime' };

/** Raisons servies par les routes gardées — stables, lues par les bancs. */
export const RAISON_PARTAGE_REFUSE = 'consentement_partage_refuse';
export const RAISON_PARTAGE_RETIRE = 'consentement_partage_retire';
export const RAISON_PARTAGE_JAMAIS_EXPRIME = 'consentement_partage_jamais_exprime';

/**
 * Le message porte LE CHEMIN, pas seulement le refus.
 *
 * C'est la contrepartie exigée par l'arbitrage : un praticien qui lit « refusé »
 * sans savoir quoi faire n'a pas une garde, il a un mur. Les deux messages
 * disent où le patient exprime son choix.
 */
export const MESSAGE_PARTAGE_REFUSE =
  'Le patient a refusé le partage avec son médecin : aucun courrier ne peut être préparé '
  + 'ni consigné depuis Wellneuro. Il peut revenir sur ce choix à tout moment depuis son '
  + 'espace, rubrique « Informations, confidentialité et droits » → « Mes choix et autorisations ».';

// LE RETRAIT A SON PROPRE MESSAGE, et ce n'est pas une nuance de style. Servir
// « le patient a refusé » à un praticien dont le patient avait ACCORDÉ puis
// retiré lui décrit un dossier qui n'existe pas — il a peut-être une lettre
// consignée d'il y a trois mois sous les yeux. Constat de la revue Copilot :
// `verdictPartageMedecin` gardait les deux motifs distincts, et ce traducteur
// les aplatissait aussitôt.
export const MESSAGE_PARTAGE_RETIRE =
  'Le patient a retiré son consentement au partage avec son médecin : aucun courrier ne '
  + 'peut être préparé ni consigné depuis Wellneuro, y compris pour la suite d’un échange '
  + 'déjà engagé. Il peut l’accorder à nouveau depuis son espace, rubrique « Informations, '
  + 'confidentialité et droits » → « Mes choix et autorisations ».';

export const MESSAGE_PARTAGE_JAMAIS_EXPRIME =
  'Le patient n’a jamais exprimé de choix sur le partage avec son médecin : tant qu’il ne '
  + 'l’a pas fait, aucun courrier ne peut être préparé ni consigné depuis Wellneuro. '
  + 'Invitez-le à le renseigner depuis son espace, rubrique « Informations, confidentialité '
  + 'et droits » → « Mes choix et autorisations ».';

/**
 * La garde, telle que les routes d'écriture la lisent.
 *
 * `retire` et `refuse` sont DEUX motifs distincts et non un seul : le premier
 * dit qu'un accord a existé, et un praticien qui lit « retiré » sait qu'il n'a
 * pas rêvé le courrier d'il y a trois mois.
 */
export function verdictPartageMedecin(
  evenements: { finalite: string; statut: string; enregistreLe: Date | string }[],
): VerdictPartageMedecin {
  const statut = statutPartageMedecinTraitant(evenements);
  if (statut === 'accorde') return { bloquant: false, motif: 'accorde' };
  if (statut === 'refuse') return { bloquant: true, motif: 'refuse' };
  if (statut === 'retire') return { bloquant: true, motif: 'retire' };
  // `null` — le patient n'est jamais venu au centre TRUST. Fail-closed.
  return { bloquant: true, motif: 'jamais_exprime' };
}

/** Raison et message d'un verdict bloquant, pour une réponse 409. */
export function refusPartage(
  verdict: Extract<VerdictPartageMedecin, { bloquant: true }>,
): { raison: string; message: string } {
  if (verdict.motif === 'jamais_exprime') {
    return { raison: RAISON_PARTAGE_JAMAIS_EXPRIME, message: MESSAGE_PARTAGE_JAMAIS_EXPRIME };
  }
  if (verdict.motif === 'retire') {
    return { raison: RAISON_PARTAGE_RETIRE, message: MESSAGE_PARTAGE_RETIRE };
  }
  return { raison: RAISON_PARTAGE_REFUSE, message: MESSAGE_PARTAGE_REFUSE };
}
