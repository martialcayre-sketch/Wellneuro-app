// LES ARBITRAGES LISTÉS AU COCKPIT, À CÔTÉ D'UN CONFLIT DÉCLENCHÉ
// ([[D-439]] A2, arbitrage 6 de la fiche LOT-28 ; [[D-452]] §5).
//
// Au cockpit, rien ne change pour un conflit qui n'est pas déclenché par la
// proposition de bilan. Pour un conflit déclenché, ses arbitrages éventuels se
// LISTENT à côté du constat, chacun étiqueté par sa fiche d'usage :
//   - AUCUN N'EST DÉSIGNÉ COMME APPLICABLE AU DOSSIER : un arbitrage répond à la
//     question d'une fiche, jamais à ce patient ;
//   - AUCUN N'EST MIS EN AVANT : l'ordre est celui des identifiants, pas une
//     préférence ;
//   - L'OUTIL NE CHOISIT JAMAIS ENTRE EUX, même s'ils divergent ; le constat
//     d'escalade reste affiché, intact (`DC-30`, `DC-55`).
// Un arbitrage « à relire » (A3) se liste avec cette mention, jamais comme
// courant.
//
// SOUS `WN_POSITIONS_EXPERT` : drapeau éteint, rien ne se lit et rien ne
// s'affiche. Aucune donnée patient n'entre ici : la seule entrée est la liste
// des identifiants de conflit déjà constatés.

import { positionsExpertActif } from './drapeau';
import { lireAtelierPositions, type CoupleLu } from './lecture';

export type ArbitrageAuCockpit = {
  conflitId: string;
  /** La fiche d'usage dont l'arbitrage répond à la question — son étiquette. */
  ficheId: string;
  /** `WN-PE-NNNN@vN.M` ou `identifiant@version` du claim retenu. */
  retenu: string;
  motif: string;
  /** Date ISO de la pose. */
  le: string;
  /** Une de ses références a changé ([[D-439]] A3) : il ne se lit pas comme courant. */
  aRelire: boolean;
};

/** Pure : les têtes d'arbitrage des conflits constatés, triées par conflit puis par fiche. */
export function arbitragesDesConflits(
  couples: readonly CoupleLu[],
  conflitsConstates: readonly string[],
): ArbitrageAuCockpit[] {
  const constates = new Set(conflitsConstates);
  const liste: ArbitrageAuCockpit[] = [];
  for (const couple of couples) {
    if (!constates.has(couple.conflitId) || !couple.tete) continue;
    const retenu = couple.tete.positionRetenue ?? couple.tete.claimRetenu;
    if (!retenu) continue; // Jamais : la base exige l'un des deux à la pose.
    liste.push({
      conflitId: couple.conflitId,
      ficheId: couple.ficheId,
      retenu,
      motif: couple.tete.motif,
      le: couple.tete.le,
      aRelire: couple.causesARelire.length > 0,
    });
  }
  return liste.sort((a, b) => a.conflitId.localeCompare(b.conflitId) || a.ficheId.localeCompare(b.ficheId));
}

/**
 * Les arbitrages à lister au cockpit pour ces conflits constatés. Drapeau
 * éteint, ou aucun conflit constaté : liste vide, sans lecture en base.
 */
export async function lireArbitragesAuCockpit(
  conflitsConstates: readonly string[],
  lire: () => Promise<{ couples: CoupleLu[] }> = lireAtelierPositions,
): Promise<ArbitrageAuCockpit[]> {
  if (!positionsExpertActif() || conflitsConstates.length === 0) return [];
  const { couples } = await lire();
  return arbitragesDesConflits(couples, conflitsConstates);
}
