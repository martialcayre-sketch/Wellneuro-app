import { dateJourParis } from '@/lib/dateParis';

// LE JOUR DU CYCLE COURANT (J2-jourN, H52). Module pur, sans Prisma.
//
// UNE SEULE DATE DE DÉPART : le jour 0 du calendrier du cycle courant
// ([[D-255]]), celui des jalons du momentum ([[D-397]] §1) et de la
// trajectoire. N se compte en jours du calendrier de Paris, le jour de la
// diffusion étant le Jour 0 — la convention du « jour n » de la biologie
// (`positionDansLeSuivi`, `serieParAnalyte.ts`) ; arbitrage du responsable du
// 2026-11-01. Sans jour 0, il n'y a pas de jour du cycle : l'appelant n'en
// invente aucun.

/** La durée du cycle annoncée au cockpit (« Jour N sur 21 »). */
export const JOURS_DU_CYCLE = 21;

/** Jours calendaires de Paris entre le jour 0 et `maintenant` — aucun piège d'heure d'été. */
export function jourDuCycle(jourZero: Date, maintenant: Date): number {
  const [a1, m1, j1] = dateJourParis(jourZero).split('-').map(Number);
  const [a2, m2, j2] = dateJourParis(maintenant).split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, j2) - Date.UTC(a1, m1 - 1, j1)) / 86_400_000);
}
