// Biologie arbitrée sans révision (LOT-06, Lot G) — différence entre deux
// artefacts PERSISTÉS, au patron `jalonsJ21` : un arbitrage `confirme` ou
// `infirme` existe sur une version de protocole, et aucune version ne la
// supplante encore. Tant que la révision manque, le protocole diffusé ne
// reflète pas le bilan — c'est exactement ce que la carte doit dire.
//
// Un verdict `sans_objet` n'appelle AUCUNE révision (il ne fonde aucune
// résolution, voir `biology-library/revision.ts`) : il ne produit pas de carte.

export type ArbitrageFilRow = {
  idPatient: string;
  protocolDraftId: string;
  intentionId: string;
  verdict: string;
  arbitreLe: Date;
};

export type VersionFilRow = {
  id: string;
  supersedesDraftId: string | null;
};

export type BiologieArbitreeRow = {
  idPatient: string;
  protocolDraftId: string;
  /** Date de l'arbitrage le plus récent sur cette version. */
  arbitreLe: Date;
  /** Nombre d'intentions arbitrées (confirme/infirme) en attente de révision. */
  nbIntentions: number;
};

/**
 * Arbitrages qui réclament une révision : verdict résolutif, version non
 * supplantée. Une ligne par (patient, version), datée du dernier arbitrage.
 */
export function arbitragesSansRevision(
  arbitrages: ArbitrageFilRow[],
  versions: VersionFilRow[],
): BiologieArbitreeRow[] {
  const supplantees = new Set(
    versions.map(v => v.supersedesDraftId).filter((id): id is string => id !== null),
  );
  const parVersion = new Map<string, BiologieArbitreeRow>();
  for (const arbitrage of arbitrages) {
    if (arbitrage.verdict !== 'confirme' && arbitrage.verdict !== 'infirme') continue;
    if (supplantees.has(arbitrage.protocolDraftId)) continue;
    const existante = parVersion.get(arbitrage.protocolDraftId);
    if (!existante) {
      parVersion.set(arbitrage.protocolDraftId, {
        idPatient: arbitrage.idPatient,
        protocolDraftId: arbitrage.protocolDraftId,
        arbitreLe: arbitrage.arbitreLe,
        nbIntentions: 1,
      });
    } else {
      existante.nbIntentions += 1;
      if (arbitrage.arbitreLe > existante.arbitreLe) existante.arbitreLe = arbitrage.arbitreLe;
    }
  }
  return [...parVersion.values()];
}
