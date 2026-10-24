// Ce que le constat sur un besoin lit du référentiel des douze besoins
// ([[D-347]] §2, §5.3) : le libellé praticien, et si le besoin porte une
// source de score. Un seul point de lecture de `BESOIN_SOURCES`, pour que la
// route et la lecture suivent ensemble un besoin qui gagne un score — et que
// les tests passent l'ensemble en argument plutôt que de nommer la table.

import { BESOIN_SOURCES, BESOINS } from '@/lib/equilibre/constants';
import { BESOINS_CONSTATABLES } from './liste';

/** Les besoins constatables qui portent une source de score (`BESOIN_SOURCES` non vide). */
export function besoinsConstatablesAvecScore(): Set<number> {
  return new Set(BESOINS_CONSTATABLES.filter(b => (BESOIN_SOURCES[b] ?? []).length > 0));
}

export type BesoinOffert = { besoin: number; libelle: string; avecScore: boolean };

/** Les quatre besoins, dans l'ordre, avec leur libellé praticien. */
export function besoinsOfferts(avecScore: ReadonlySet<number>): BesoinOffert[] {
  return BESOINS_CONSTATABLES.map(b => ({
    besoin: b,
    libelle: BESOINS.find(d => d.id === b)?.libellePraticien ?? `Besoin ${b}`,
    avecScore: avecScore.has(b),
  }));
}
