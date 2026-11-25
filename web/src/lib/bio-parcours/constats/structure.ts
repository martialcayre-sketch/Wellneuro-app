// La structure signée que les constats consomment ([[D-314]], [[D-331]] §1,
// §2) : ses hypothèses, son empreinte, sa signature. Signée le 2026-11-01
// ([[D-401]]) sans hypothèse, puis re-signée depuis : elle déclare aujourd'hui
// les hypothèses `HYP_…` de son vocabulaire (`FICHES_USAGE_BESOIN2_V1.hypotheses`,
// lu ici, jamais recopié) — la date et la décision de la dernière signature sont
// dans `FICHES_USAGE_BESOIN2_METADATA`. Une pose ne vise qu'une hypothèse de ce
// vocabulaire ; non signée (`structureSignee()` rend `false`), aucune pose.
// Un seul point de lecture, que les bancs remplacent par une structure
// synthétique.

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
