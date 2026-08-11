// Invalidation praticien d'une passation (LOT-00, campagne « chaîne T0 »).
//
// Domaine PUR : décide ce qu'une demande d'invalidation vaut, sans base ni
// session. La route applique, ce module tranche.
//
// DEUX TRANSITIONS, ET DEUX SEULEMENT. `VALID → INVALID` (le praticien retire
// une passation du raisonnement, motif obligatoire) et `INVALID → VALID` (il se
// ravise). `SUPERSEDED` et `HISTORICAL_ONLY` ne sont PAS posables ici : le
// premier accompagne un remplacement — donc une passation de remplacement qui
// n'existe pas encore au moment où l'on invalide —, le second est réservé aux
// reprises de données. Les ouvrir à un bouton d'écran ferait poser à la main
// des statuts dont la sémantique tient à autre chose qu'une intention.
//
// `AMBIGUOUS` non plus : il ne retire rien du raisonnement, il le signale.
// Aucun écran ne le pose aujourd'hui ; l'ouvrir sans lecteur en face
// afficherait un état que personne ne restitue.

export const STATUTS_POSABLES_PAR_LE_PRATICIEN = ['VALID', 'INVALID'] as const;

export type StatutPosable = (typeof STATUTS_POSABLES_PAR_LE_PRATICIEN)[number];

export const MOTIF_MIN = 5;
export const MOTIF_MAX = 500;

export type DemandeInvalidation = {
  statutDemande?: unknown;
  motif?: unknown;
};

export type VerdictInvalidation =
  | { ok: true; statut: StatutPosable; motif: string | null }
  | { ok: false; raison: 'statut_invalide' | 'motif_manquant' | 'motif_trop_long'; message: string };

/**
 * Valide une demande d'invalidation ou de rétablissement.
 *
 * Le motif est OBLIGATOIRE pour invalider et INTERDIT de rester vide : une
 * passation retirée du raisonnement clinique sans raison écrite est une trace
 * qu'on ne saura pas relire dans six mois. Rétablir n'en demande pas — le
 * motif d'invalidation reste en base, et l'effacer serait perdre l'histoire.
 */
export function validerDemandeInvalidation(demande: DemandeInvalidation): VerdictInvalidation {
  const statut = demande.statutDemande;
  if (typeof statut !== 'string' || !(STATUTS_POSABLES_PAR_LE_PRATICIEN as readonly string[]).includes(statut)) {
    return {
      ok: false,
      raison: 'statut_invalide',
      message: 'Seuls les statuts « valide » et « invalide » peuvent être posés depuis cet écran.',
    };
  }

  if (statut === 'VALID') return { ok: true, statut, motif: null };

  const motif = typeof demande.motif === 'string' ? demande.motif.trim() : '';
  if (motif.length < MOTIF_MIN) {
    return {
      ok: false,
      raison: 'motif_manquant',
      message: 'Un motif est requis pour retirer une passation du raisonnement clinique.',
    };
  }
  if (motif.length > MOTIF_MAX) {
    return {
      ok: false,
      raison: 'motif_trop_long',
      message: `Le motif ne peut pas dépasser ${MOTIF_MAX} caractères.`,
    };
  }
  return { ok: true, statut: 'INVALID', motif };
}

/**
 * Champs à écrire pour la transition validée. Rétablir efface la trace
 * d'invalidation — elle ne décrit plus l'état courant — mais n'efface jamais la
 * passation elle-même.
 */
export function champsInvalidation(
  verdict: Extract<VerdictInvalidation, { ok: true }>,
  praticienEmail: string,
  maintenant: Date,
): {
  statutValidite: StatutPosable;
  invalideLe: Date | null;
  invalidePar: string | null;
  motifInvalidation: string | null;
} {
  if (verdict.statut === 'VALID') {
    return { statutValidite: 'VALID', invalideLe: null, invalidePar: null, motifInvalidation: null };
  }
  return {
    statutValidite: 'INVALID',
    invalideLe: maintenant,
    invalidePar: praticienEmail,
    motifInvalidation: verdict.motif,
  };
}
