/**
 * Refus persisté des cartes du Fil (SP-FIL, gate G1) — domaine PUR, aucun
 * accès base.
 *
 * Le garde-fou 5.0 demande trois choses d'un refus : qu'il soit possible, qu'il
 * PERSISTE (la carte ne revient pas le lendemain) et qu'il reste RÉVERSIBLE.
 * La réversibilité passe par un chaînage append-only — annuler n'efface ni ne
 * réécrit rien, c'est une nouvelle ligne qui supplante la précédente. L'état
 * courant d'une carte est donc la tête de sa chaîne.
 *
 * Ce module ne connaît que des clés de carte (`cleCarte`, cf. `cartes.ts`) :
 * ce qui est refusé est une identité, jamais une projection.
 */

import type { CarteFil, TypeCarteFil } from './cartes';

export type LigneRefus = {
  id: string;
  carteCle: string;
  refusee: boolean;
  supersedesRejectionId: string | null;
  refuseLe: Date;
};

/**
 * Tête de chaîne pour une clé donnée : la ligne qu'aucune autre ne supplante,
 * la plus récente en cas d'égalité (même départage que `resolveActiveApproval`).
 */
export function refusCourant<T extends LigneRefus>(lignes: T[], carteCle: string): T | null {
  const pourCle = lignes.filter((ligne) => ligne.carteCle === carteCle);
  if (pourCle.length === 0) return null;

  const supplantees = new Set(
    pourCle.map((ligne) => ligne.supersedesRejectionId).filter((id): id is string => id !== null),
  );
  const tetes = pourCle.filter((ligne) => !supplantees.has(ligne.id));
  const pool = tetes.length > 0 ? tetes : pourCle;
  return [...pool].sort((gauche, droite) => {
    const delta = droite.refuseLe.getTime() - gauche.refuseLe.getTime();
    if (delta !== 0) return delta;
    return gauche.id < droite.id ? 1 : gauche.id > droite.id ? -1 : 0;
  })[0];
}

/**
 * Clés actuellement refusées. Aucune ligne pour une clé ⇒ carte non refusée :
 * c'est l'état de toutes les cartes avant ce gate, et il n'a pas eu besoin
 * d'être écrit.
 */
export function clesRefusees(lignes: LigneRefus[]): Set<string> {
  const refusees = new Set<string>();
  for (const cle of new Set(lignes.map((ligne) => ligne.carteCle))) {
    if (refusCourant(lignes, cle)?.refusee) refusees.add(cle);
  }
  return refusees;
}

/**
 * Retire du Fil les cartes refusées.
 *
 * Point de passage UNIQUE, appliqué après `construireFil` sur les cartes déjà
 * construites : filtrer dans les 5 fonctions de production ferait 5 endroits à
 * garder cohérents.
 */
export function filtrerCartesRefusees(cartes: CarteFil[], refusees: Set<string>): CarteFil[] {
  return cartes.filter((carte) => !refusees.has(carte.cle));
}

// `reponse_recente` retiré (accueil-observatoire LOT-02) : les refus déjà
// posés sur ces clés restent en base, inertes — et un nouveau refus portant ce
// préfixe est refusé comme toute clé d'un type inconnu.
const TYPES_CARTE: readonly TypeCarteFil[] = [
  'signalement_trust',
  'synthese_a_valider',
  'jalon_j21',
  'assignation_en_retard',
  'reprise',
];

/** Longueur au-delà de laquelle une clé n'est plus une clé de carte. */
export const LONGUEUR_MAX_CLE = 256;

/**
 * Une clé reçue d'un client n'est pas crue sur parole : elle doit porter le
 * préfixe d'un type de carte connu. Sans ce contrôle, la table se remplirait de
 * clés arbitraires — inertes, mais impossibles à distinguer plus tard d'un
 * refus réel.
 */
export function cleCarteValide(cle: unknown): cle is string {
  if (typeof cle !== 'string') return false;
  if (cle.length === 0 || cle.length > LONGUEUR_MAX_CLE) return false;
  return TYPES_CARTE.some((type) => cle.startsWith(`${type}:`) && cle.length > type.length + 1);
}
