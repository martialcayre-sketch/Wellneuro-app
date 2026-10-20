// La structure signée que les constats consomment ([[D-314]], [[D-331]] §1,
// §2) : ses hypothèses, son empreinte, sa signature. Livrée vide, verrou
// éteint : tant qu'elle n'est pas signée, aucune pose n'est possible
// (`structureSignee()` rend `false`). Un seul point de lecture, que les bancs
// remplacent par une structure synthétique.

import {
  FICHES_USAGE_BESOIN2_SHA256,
  FICHES_USAGE_BESOIN2_V1,
  structureSignee,
} from '@/lib/fiches-usage/ficheUsageBesoin2V1';

export type StructureDuParcours = {
  signee: boolean;
  empreinte: string;
  /** Les hypothèses `HYP_…` en vigueur. */
  hypotheses: readonly string[];
};

export function structureDuParcours(): StructureDuParcours {
  return {
    signee: structureSignee(),
    empreinte: FICHES_USAGE_BESOIN2_SHA256,
    hypotheses: FICHES_USAGE_BESOIN2_V1.hypotheses,
  };
}
