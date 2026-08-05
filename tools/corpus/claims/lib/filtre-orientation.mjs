// Filtre « par construction » du drafting d'orientation (lot 8).
//
// Deux exclusions, et rien d'autre :
// - la quarantaine sanitaire (`lifecycleStatus: 'quarantined'`) — gate
//   indépendant de la décision f ; les sources prescriptives du périmètre
//   d'orientation sont réintégrées par la levée actée le 2026-08-02, les
//   autres restent exclues ;
// - la perfusion, seule survivante de A-009 après l'amendement du 2026-08-01
//   (décision f : sevrages médicamenteux, psychotropes et Alzheimer sont
//   réintégrés dans le drafting). Par sourceId : WN-SRC-0244 est l'unique
//   notice perfusion du registre, et `requiredAction: 'Hors périmètre moteur'`
//   couvrirait aussi des sources que la décision f réintègre.

export const EXCLUSIONS_A009 = ['WN-SRC-0244'];

export function exclureDeLOrientation(notice) {
  if (notice.lifecycleStatus === 'quarantined' && notice.prescriptive !== true) {
    return { exclu: true, motif: 'quarantaine sanitaire — source non prescriptive (prescriptives levées le 2026-08-02)' };
  }
  if (EXCLUSIONS_A009.includes(notice.sourceId)) {
    return { exclu: true, motif: 'perfusion — A-009 amendé (décision f, 2026-08-01)' };
  }
  return { exclu: false, motif: null };
}
