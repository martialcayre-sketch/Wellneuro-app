// L'ORDRE DES 12 BESOINS AU COCKPIT — Q1 de l'audit des instruments (arbitrage
// du 2026-10-22), r3_09.
//
// Ordre fixe, B1 à B12, groupé par strate, clé « Bn · libellé » — le même dans
// l'onglet et dans le tiroir, quelle que soit la valeur. Un tri sur la valeur
// est un rang qui juge un chiffre : il exige un seuil signé ([[D-333]] §2
// règle 4), et le tiroir dit qu'aucune priorité n'est déduite. L'ordre reçu
// n'est jamais cru : pendant un déploiement, un ancien conteneur sert encore
// le tri « creux d'abord ».
//
// CE MODULE N'IMPORTE QUE DES TYPES : il est lu par des composants
// `'use client'`.

import type { StrateCode } from '@/lib/equilibre/types';

/** Les noms des strates, ceux des anneaux des cercles du cockpit. */
export const STRATES_BESOINS: { code: StrateCode; nom: string }[] = [
  { code: 'CORPS', nom: 'Corps' },
  { code: 'ANCRAGE', nom: 'Ancrage' },
  { code: 'ESPRIT', nom: 'Esprit' },
];

export function cleBesoin(id: number, libelle: string): string {
  return `B${id} · ${libelle}`;
}

/**
 * Les besoins rangés par numéro, groupés par strate dans l'ordre Corps,
 * Ancrage, Esprit. Une strate sans besoin reçu n'a pas de groupe.
 */
export function grouperBesoinsParStrate<T extends { strate: StrateCode }>(
  besoins: readonly T[],
  id: (b: T) => number
): { code: StrateCode; nom: string; besoins: T[] }[] {
  const ordonnes = [...besoins].sort((a, b) => id(a) - id(b));
  return STRATES_BESOINS.map(s => ({ ...s, besoins: ordonnes.filter(b => b.strate === s.code) })).filter(
    g => g.besoins.length > 0
  );
}
