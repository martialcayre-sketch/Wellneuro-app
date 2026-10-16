import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  BESOINS,
  NATURES_LIEN,
  natureDuTerme,
  RE_FICHE_USAGE,
  RE_QUESTION,
  RUBRIQUES_FICHE_USAGE,
  STATUTS_ADMIS_PAR_NATURE,
  STATUTS_USAGE,
  USAGES_DECISIONNELS,
  type NatureLien,
  type RubriqueFicheUsage,
  type StatutUsage,
  type UsageDecisionnel,
} from './vocabulaire';

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
// LES CHAMPS ARBITRÉS LE 2026-10-16 : la question (identifiant `QC_…` d'une
// liste fermée déclarée ici, en attendant la table signée du cadrage v3 §3.3),
// les besoins (numéros du guide, D-312), et les trois axes de [[D-266]] §3 —
// nature du lien, usage décisionnel (plus le marqueur sécurité / admissibilité),
// statut d'usage —, tenus par la correspondance nature ↔ statut. Une structure
// qui enfreint l'une de ces règles NE SE SIGNE PAS (`incoherencesDeStructure`,
// lue par `structureSignee`).
//
// CE QUE CETTE V1 NE PORTE PAS : le statut réglementaire du produit proposé et
// les renvois aux précautions (cadrage v3, §3.2) — reportés à BP-17, où
// produits et précautions existent. Ajouter un champ change l'empreinte : tant
// que la table est vide, rien ne repasse « à relire ».
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
  /** `QC_…` — la question clinique à laquelle la fiche répond, déclarée par la structure. */
  question: string;
  /** Les besoins du guide (1 à 12) auxquels la fiche se rattache — au moins un. */
  besoins: readonly number[];
  /** La force de preuve du lien besoin ↔ mesure ([[D-266]] §3). */
  nature: NatureLien;
  /** La décision que la mesure sert ([[D-266]] §3). */
  usageDecisionnel: UsageDecisionnel;
  /** Le marqueur sécurité / admissibilité : son affichage est obligatoire ([[D-266]] §3). */
  securiteAdmissibilite: boolean;
  /** Ce que l'assistant a le droit d'en faire ([[D-266]] §3), tenu par la nature. */
  statutUsage: StatutUsage;
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
  /** `QC_…` — la liste fermée des questions cliniques. */
  questions: readonly string[];
  /** `HYP_…` — le vocabulaire d'hypothèses du parcours. */
  hypotheses: readonly string[];
  /** `POP_…` — la liste fermée des populations d'usage (arbitrage 7). */
  populations: readonly string[];
};

export const FICHES_USAGE_BESOIN2_V1: StructureFichesUsage = {
  fiches: [],
  questions: [],
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

const dans = <T>(liste: readonly T[], valeur: unknown): boolean => (liste as readonly unknown[]).includes(valeur);

/**
 * Les règles que toute structure doit tenir pour se signer, en codes sans
 * texte (`<fiche>:<règle>`) : formats, listes fermées, au moins un besoin, une
 * population et une question déclarées, des rubriques fermées et uniques, et
 * la correspondance nature ↔ statut (arbitrage du 2026-10-16). Vide = cohérente.
 */
export function incoherencesDeStructure(structure: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1): string[] {
  const anomalies: string[] = [];
  const doublons = (liste: readonly unknown[]) => new Set(liste).size !== liste.length;
  if (doublons(structure.fiches.map(f => f.id))) anomalies.push('structure:fiche_en_double');
  if (doublons(structure.questions) || structure.questions.some(q => !RE_QUESTION.test(q))) {
    anomalies.push('structure:questions');
  }
  if (doublons(structure.hypotheses) || structure.hypotheses.some(h => natureDuTerme(h) !== 'hypothese')) {
    anomalies.push('structure:hypotheses');
  }
  if (doublons(structure.populations) || structure.populations.some(p => natureDuTerme(p) !== 'population')) {
    anomalies.push('structure:populations');
  }
  for (const f of structure.fiches) {
    const a = (regle: string) => anomalies.push(`${f.id}:${regle}`);
    if (!RE_FICHE_USAGE.test(f.id)) a('format');
    if (!structure.questions.includes(f.question)) a('question');
    if (f.besoins.length === 0 || doublons(f.besoins) || f.besoins.some(b => !dans(BESOINS, b))) a('besoins');
    if (!structure.populations.includes(f.population)) a('population');
    if (doublons(f.hypotheses) || f.hypotheses.some(h => !structure.hypotheses.includes(h))) a('hypotheses');
    if (!dans(NATURES_LIEN, f.nature)) a('nature');
    if (!dans(USAGES_DECISIONNELS, f.usageDecisionnel)) a('usage_decisionnel');
    if (typeof f.securiteAdmissibilite !== 'boolean') a('securite_admissibilite');
    if (!dans(STATUTS_USAGE, f.statutUsage)) a('statut_usage');
    else if (dans(NATURES_LIEN, f.nature) && !STATUTS_ADMIS_PAR_NATURE[f.nature].includes(f.statutUsage)) {
      a('nature_statut');
    }
    if (f.rubriques.length === 0 || doublons(f.rubriques) || f.rubriques.some(r => !dans(RUBRIQUES_FICHE_USAGE, r))) {
      a('rubriques');
    }
  }
  return anomalies;
}

/** Calculées une fois : la structure est une constante du module. */
const INCOHERENCES_DU_DEPOT = incoherencesDeStructure();

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` JETTE sur une date invalide, et un
  // verrou doit FERMER, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

const cleClaim = (c: ClaimEpingle) => `${c.claimId}@${c.versionClaim}`;

/**
 * La structure est signée — les cinq termes de [[D-063]]/[[D-067]] (D-314 §2) :
 * verrou posé, date ISO canonique, `claimsSource` égale à l'union des claims
 * des fiches (le contrat de fraîcheur ne lit qu'elle : un claim de fiche qui
 * n'y serait pas lui échapperait), périmètre relu égal à la structure du jour,
 * ET structure cohérente. Une structure retouchée après signature ne l'est
 * plus ; une structure incohérente ne l'est jamais, même signée.
 */
export function structureSignee(
  metadata: FichesUsageMetadata = FICHES_USAGE_BESOIN2_METADATA,
  empreinte: string = FICHES_USAGE_BESOIN2_SHA256,
  incoherences: readonly string[] = INCOHERENCES_DU_DEPOT,
  structure: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
): boolean {
  if (metadata.validationExterne !== true) return false;
  if (!estIsoCanonique(metadata.dateValidation)) return false;
  const declares = [...new Set(metadata.claimsSource.map(cleClaim))].sort();
  const cites = [...new Set(structure.fiches.flatMap(f => f.claims.map(cleClaim)))].sort();
  if (declares.length !== cites.length || declares.some((claim, i) => claim !== cites[i])) return false;
  return metadata.shaPerimetre === empreinte && incoherences.length === 0;
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
