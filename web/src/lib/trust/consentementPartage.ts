// État du consentement « partage médecin traitant » — lecture PURE, aucune
// dépendance Prisma.
//
// INDICATEUR, PAS GARDE (décision utilisateur du 2026-07-22, C3 LOT-06) : le
// partage avec le médecin a lieu HORS application, par les canaux du
// praticien. Bloquer la consignation n'empêcherait pas le partage — cela
// rendrait seulement le dossier aveugle. L'écran affiche l'état ; la
// responsabilité déontologique reste au praticien, informé.

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
