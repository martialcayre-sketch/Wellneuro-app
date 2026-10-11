import { createHash } from 'node:crypto';
import { PREFIXE_PRIORITE_LIBRE, type PrioriteLibre } from './prioriteLibre';

// L'IDENTIFIANT D'UNE PRIORITÉ POSÉE PAR LE PRATICIEN — [[D-279]] §3.
//
// SERVEUR SEUL (`node:crypto`) : l'écran transmet domaine et libellé, il ne
// fabrique pas l'identifiant. `libre:<domaine>:<16 premiers hex du SHA-256 du
// libellé>` — le libellé est déjà NORMALISÉ (`normaliserLibellePrioriteLibre`)
// quand il arrive ici. Changer le libellé change donc l'identifiant, et c'est
// un pivot au sens de [[D-255]] ; changer le seul motif ne l'est pas. La base
// tient la forme (CHECK `decision_priority_selections_libre_coherence_check`).

export function identifiantPrioriteLibre(priorite: PrioriteLibre): string {
  const empreinte = createHash('sha256').update(priorite.libelle, 'utf8').digest('hex').slice(0, 16);
  return `${PREFIXE_PRIORITE_LIBRE}${priorite.domaine}:${empreinte}`;
}
