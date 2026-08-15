import type { ProtocolAction } from '@/lib/clinical-engine/types';
import type { VerdictArbitrage } from './arbitrage';

// Révision de protocole au retour de biologie (LOT-06, Lot G) — domaine PUR.
//
// L'arbitrage n'ouvre PAS la révision tout seul : le praticien la déclenche
// (c'est la différence « arbitrage présent, révision absente » que la carte
// de Fil surveille). La révision passe par la route de versionnement
// EXISTANTE — mêmes préconditions, même chaîne C1, même `supersedesDraftId` —
// et la garde ci-dessous y ajoute l'invariant du lot : résoudre une intention
// `conditionnelle_biologie` sans arbitrage lié est IMPOSSIBLE, et la
// résolution suit le verdict, jamais l'inverse (`confirme` ⇒ `active`,
// `infirme` ⇒ `non_indiquee_actuellement` conservée et motivée).
//
// `sans_objet` n'autorise AUCUNE résolution : le verdict consigne que le
// bilan ne répond pas à la question posée — l'intention reste en attente,
// telle quelle, dans la version suivante (lecture conservatrice de D-059 §4,
// qui ne définit de correspondance que pour `confirme` et `infirme`).

export type ArbitrageLie = {
  intentionId: string;
  verdict: VerdictArbitrage;
  noteCourte: string | null;
  /** ISO 8601 — pour le motif visible sur une intention infirmée. */
  arbitreLe: string;
};

/**
 * Garde serveur de la route de versionnement : compare les intentions
 * `conditionnelle_biologie` de la version ACTIVE aux actions soumises.
 * Rend un motif de refus en français, ou `null` si la soumission est licite.
 */
export function refusResolutionSansArbitrage(entree: {
  actionsActives: ProtocolAction[];
  actionsSoumises: ProtocolAction[];
  arbitrages: ArbitrageLie[];
}): string | null {
  const arbitrages = new Map(entree.arbitrages.map(a => [a.intentionId, a]));
  const soumises = new Map(entree.actionsSoumises.map(a => [a.actionId, a]));

  for (const active of entree.actionsActives) {
    if (active.interventionStatus !== 'conditionnelle_biologie') continue;
    const suivante = soumises.get(active.actionId);
    if (!suivante) {
      return `L’intention « ${active.title} » attend une biologie : elle ne peut pas `
        + 'disparaître du protocole — un verdict infirmé la conserve, non indiquée et motivée.';
    }
    if (suivante.interventionStatus === 'conditionnelle_biologie') continue;

    const arbitrage = arbitrages.get(active.actionId);
    if (!arbitrage) {
      return `Résoudre l’intention « ${active.title} » exige un arbitrage biologique lié : `
        + 'aucun n’est enregistré pour cette version.';
    }
    if (arbitrage.verdict === 'confirme' && suivante.interventionStatus !== 'active') {
      return `L’arbitrage confirme l’intention « ${active.title} » : `
        + 'sa résolution ne peut être que « active ».';
    }
    if (
      arbitrage.verdict === 'infirme'
      && suivante.interventionStatus !== 'non_indiquee_actuellement'
    ) {
      return `L’arbitrage infirme l’intention « ${active.title} » : `
        + 'sa résolution ne peut être que « non indiquée actuellement », conservée et motivée.';
    }
    if (arbitrage.verdict === 'sans_objet') {
      return `L’arbitrage de l’intention « ${active.title} » est sans objet : `
        + 'il ne fonde aucune résolution — l’intention reste en attente de biologie.';
    }
  }
  return null;
}

/**
 * Applique les verdicts aux actions d'une version — la matière de la
 * révision, calculée d'un côté (UI) et re-vérifiée de l'autre (garde
 * ci-dessus). Une action non arbitrée reste inchangée, en attente.
 */
export function appliquerArbitrages(
  actions: ProtocolAction[],
  arbitrages: ArbitrageLie[],
): ProtocolAction[] {
  const parIntention = new Map(arbitrages.map(a => [a.intentionId, a]));
  return actions.map(action => {
    if (action.interventionStatus !== 'conditionnelle_biologie') return action;
    const arbitrage = parIntention.get(action.actionId);
    if (!arbitrage || arbitrage.verdict === 'sans_objet') return action;
    const { waitFor: _attente, ...sansAttente } = action;
    if (arbitrage.verdict === 'confirme') {
      return { ...sansAttente, interventionStatus: 'active' as const };
    }
    const date = arbitrage.arbitreLe.slice(0, 10);
    const motif = `Non indiquée après bilan biologique (arbitrage praticien du ${date})`
      + (arbitrage.noteCourte ? ` : ${arbitrage.noteCourte}` : '.');
    return {
      ...sansAttente,
      interventionStatus: 'non_indiquee_actuellement' as const,
      limitations: [...action.limitations, motif],
    };
  });
}
