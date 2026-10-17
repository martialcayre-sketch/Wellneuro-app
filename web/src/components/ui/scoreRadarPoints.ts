// Radar des douze besoins : un besoin non mesuré est un trou nommé « non
// mesuré », jamais un zéro ([[D-301]], lettre ac, `DC-24`).
//
// MODULE PUR, sans 'use client' : le radar (`ScoreRadar`) et le panneau qui le
// nourrit (`DetailBesoinsPanel`) en lisent la règle, et le banc la tient sans
// rendre recharts.

import type { BesoinDetail } from '@/app/api/praticien/besoins/route';

export const LIBELLE_NON_MESURE = 'non mesuré';

/** Une valeur mesurée : un nombre fini. Un `0` mesuré EST une mesure. */
export function estMesure(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Les points du radar, un par besoin, dans l'ordre reçu. La couverture
 * absente reste absente (`null`) : c'est le radar qui en fait un trou.
 */
export function donneesRadarBesoins(
  besoins: readonly Pick<BesoinDetail, 'id' | 'couverture'>[],
): { axe: string; value: number | null }[] {
  return besoins.map(b => ({ axe: `B${b.id}`, value: estMesure(b.couverture) ? b.couverture : null }));
}

/**
 * Les sommets du contour, avec un TROU sur chaque axe non mesuré.
 *
 * recharts (3.9) place une valeur absente AU CENTRE — c'est-à-dire qu'il la
 * trace comme un zéro, l'écart même que [[D-301]] corrige. Son `Polygon`, lui,
 * coupe le tracé sur un sommet invalide : coordonnées `NaN`, le contour
 * s'interrompt sur cet axe au lieu de plonger au centre, et il n'est plus
 * rempli (un contour ouvert n'enclôt rien).
 */
export function pointsAvecTrous<P extends { x?: number; y?: number; value?: unknown }>(points: readonly P[]): P[] {
  return points.map(p => (estMesure(p.value) ? p : { ...p, x: Number.NaN, y: Number.NaN }));
}
