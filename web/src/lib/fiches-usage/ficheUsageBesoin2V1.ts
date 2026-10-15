import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import type { RubriqueFicheUsage } from './vocabulaire';

// LA STRUCTURE SIGNÉE DES FICHES D'USAGE DU BESOIN 2 — [[D-314]] §2, BP-12a.
//
// CE QUE LA STRUCTURE DIT, ET QU'AUCUN TEXTE NE DIT : quelles fiches existent
// (une par question clinique et par usage), pour quelle population d'usage,
// avec quelles hypothèses du parcours, sur quels analytes, épinglées à quels
// claims, et quelles rubriques de texte chacune attend. DES IDENTIFIANTS
// SEULEMENT (garde `aucunePhraseStructureSignee`, BP-01) : le texte et les
// libellés vivent en base, validés par acte (D-314 §3), et ne touchent jamais
// le dépôt, qui est public ([[D-251]] §4).
//
// LIVRÉE VIDE, VERROU ÉTEINT. Écrire la structure et la signer sont deux gestes
// distincts, et les contenus sont ceux du responsable (porte 23, arbitrage 1 :
// toutes les fiches que le dossier de preuve de BP-07 permet d'écrire ; la
// liste des populations, chaque valeur nommée par lui, arbitrage 7). Tant que
// `validationExterne` est `false`, aucun acte de validation ne se pose et rien
// ne se sert (`structureSignee()`). Une signature clinique ne se pose jamais par
// l'outil : le responsable relit le périmètre et recopie son sha à la main.
//
// CE QUE CETTE V1 NE PORTE PAS ENCORE, faute de liste fermée au dépôt : la
// question (table signée par périmètre, cadrage v3 §3.3), les besoins, la
// nature, l'usage décisionnel, le statut d'usage, le statut réglementaire et
// les renvois aux précautions (cadrage v3, §3.2). Chacun entre avec sa liste
// fermée, arbitrée — jamais inventée ici. Ajouter un champ change l'empreinte :
// c'est voulu, tant que la table est vide rien ne repasse « à relire ».
//
// L'EMPREINTE DE LA STRUCTURE porte le texte : chaque version d'une fiche et
// chaque libellé portent `structureSha256`, celle de la structure qu'ils
// rédigent ou nomment. Une structure re-signée rend texte ET libellés « à
// relire » jusqu'à une version neuve et ses actes (arbitrages 10, 15).

/** Un claim épinglé : le patron des tables signées, lu par le contrat de fraîcheur. */
export type ClaimEpingle = { claimId: string; versionClaim: string };

export type FicheUsageStructure = {
  /** `FU_…` — l'identifiant de la fiche, celui que porte son texte en base. */
  id: string;
  /** `POP_…` — obligatoire (DC-14, [[D-095]]) : une population déclarée, jamais un silence. */
  population: string;
  /** `HYP_…` — les hypothèses du parcours que la fiche éclaire (BP-11 les consomme). */
  hypotheses: readonly string[];
  /** Codes d'analyte du catalogue biologique, vérifiés à la signature. */
  codesAnalyte: readonly string[];
  /** Les claims qui portent l'usage — `identifiant@version`, au format du patron. */
  claims: readonly ClaimEpingle[];
  /** Les rubriques de texte que cette fiche attend, toutes, ni plus ni moins. */
  rubriques: readonly RubriqueFicheUsage[];
};

export type StructureFichesUsage = {
  fiches: readonly FicheUsageStructure[];
  /** `HYP_…` — le vocabulaire d'hypothèses du parcours. */
  hypotheses: readonly string[];
  /** `POP_…` — la liste fermée des populations d'usage (arbitrage 7). */
  populations: readonly string[];
};

export const FICHES_USAGE_BESOIN2_V1: StructureFichesUsage = {
  fiches: [],
  hypotheses: [],
  populations: [],
};

export type FichesUsageMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: ClaimEpingle[];
  /**
   * SHA du périmètre relu à la signature — patron [[D-063]], étendu par
   * [[D-067]]. LITTÉRAL FIGÉ, jamais la constante : une fiche retouchée change
   * `FICHES_USAGE_BESOIN2_SHA256` et ferme le verrou seule.
   */
  shaPerimetre: string | null;
};

export const FICHES_USAGE_BESOIN2_METADATA: FichesUsageMetadata = {
  version: 'fiches-usage-besoin2-v1',
  validationExterne: false,
  dateValidation: null,
  claimsSource: [],
  shaPerimetre: null,
};

/**
 * L'empreinte de la structure, celle que portent les versions de texte et les
 * libellés. Elle ne couvre pas les métadonnées : signer ne change pas le
 * contenu, si bien qu'un brouillon déposé avant la signature reste lié à la
 * structure qu'il rédige.
 */
export const FICHES_USAGE_BESOIN2_SHA256 = sha256(JSON.stringify(FICHES_USAGE_BESOIN2_V1));

/**
 * La structure est signée : verrou posé ET périmètre relu égal à la structure
 * du jour. Une structure retouchée après signature ne l'est plus.
 */
export function structureSignee(
  metadata: FichesUsageMetadata = FICHES_USAGE_BESOIN2_METADATA,
  empreinte: string = FICHES_USAGE_BESOIN2_SHA256,
): boolean {
  return metadata.validationExterne === true && metadata.shaPerimetre === empreinte;
}

/** La fiche de la structure, ou `null`. */
export function ficheDeLaStructure(
  ficheId: string,
  structure: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
): FicheUsageStructure | null {
  return structure.fiches.find(f => f.id === ficheId) ?? null;
}

/** Le terme est déclaré au vocabulaire de la structure. */
export function termeDeLaStructure(
  termeId: string,
  structure: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
): boolean {
  return structure.hypotheses.includes(termeId) || structure.populations.includes(termeId);
}
