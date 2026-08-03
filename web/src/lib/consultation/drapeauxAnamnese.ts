// Extraction déterministe de drapeaux d'anamnèse nommés — pendant typé de
// `contexteClinique.ts` (qui produit du texte pour un LLM), destiné à un
// moteur de règles d'orientation qui a besoin de valeurs structurées plutôt
// que de prose. Purement défensif : les JSON stockés en base ne sont pas
// garantis conformes au schéma (données historiques, saisie partielle).
//
// Les valeurs autorisées sont lues dynamiquement dans `ANAMNESE_SECTIONS` —
// jamais recopiées ici — pour qu'un changement de libellé dans `anamnese.ts`
// se répercute automatiquement, sans risque de divergence.

import { ANAMNESE_SECTIONS } from './anamnese';
import { asRecord, texte } from './contexteClinique';

export type DrapeauxAnamnese = {
  // Filtré contre l'énuméré courant de `anamnese.ts` : un signal dont le
  // libellé stocké en base ne correspond plus exactement à l'énuméré actuel
  // disparaît silencieusement d'ici. `extraireVigilanceDeterministe`
  // (contexteClinique.ts), lui, ne filtre PAS et remonte tout signal brut en
  // texte pour le praticien — c'est la garantie de sécurité, pas ce champ.
  // Ce drapeau nourrit un moteur de règles déterministe (LOT-05), pas une
  // vigilance clinique.
  signauxAlerte: string[];
  antecedentsDomaines: string[];
  facteursDeclenchants: string[];
  attentes: string[];
  automedication: string[];
  debut: string | null;
  evolution: string | null;
  variationPoids: string | null;
};

function optionsDuChamp(champId: string): readonly string[] {
  for (const section of ANAMNESE_SECTIONS) {
    const champ = section.champs?.find((c) => c.id === champId);
    if (champ?.options) return champ.options;
  }
  return [];
}

// Ne garde que les valeurs présentes dans les options actuelles du champ,
// dans l'ordre de l'énuméré clinique (pas l'ordre de stockage) — dédupliqué
// de fait puisqu'on itère sur les options, chacune retenue au plus une fois.
// Une valeur hors énuméré est ignorée, jamais devinée. Ne s'appuie pas sur
// `liste()` (bornée à 50 éléments bruts) : le nombre d'options possibles est
// déjà petit (≤ 12), donc borner ici reviendrait à risquer de perdre une
// valeur valide noyée derrière des entrées parasites.
function listeFiltree(v: unknown, champId: string): string[] {
  if (!Array.isArray(v)) return [];
  const brutes = new Set(
    v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean)
  );
  return optionsDuChamp(champId).filter((option) => brutes.has(option));
}

// Idem pour un champ `radio` : une valeur unique, ou null si absente/hors énuméré.
function radioFiltre(v: unknown, champId: string): string | null {
  const autorisees = optionsDuChamp(champId);
  const val = texte(v);
  return val && autorisees.includes(val) ? val : null;
}

/**
 * Construit les drapeaux d'anamnèse à partir du JSON stocké sur la
 * consultation. Toujours un objet complet (8 clés) — listes vides / `null`
 * plutôt qu'absence de clé — jamais d'exception, quelle que soit l'entrée.
 */
export function extraireDrapeauxAnamnese(anamnese: unknown): DrapeauxAnamnese {
  const a = asRecord(anamnese);
  return {
    signauxAlerte: listeFiltree(a.signaux_alerte, 'signaux_alerte'),
    antecedentsDomaines: listeFiltree(a.antecedents_domaines, 'antecedents_domaines'),
    facteursDeclenchants: listeFiltree(a.facteurs_declenchants, 'facteurs_declenchants'),
    attentes: listeFiltree(a.attentes, 'attentes'),
    automedication: listeFiltree(a.automedication, 'automedication'),
    debut: radioFiltre(a.debut, 'debut'),
    evolution: radioFiltre(a.evolution, 'evolution'),
    variationPoids: radioFiltre(a.variation_poids, 'variation_poids'),
  };
}
