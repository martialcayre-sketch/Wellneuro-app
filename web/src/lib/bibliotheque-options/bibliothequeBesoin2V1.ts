import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  FICHES_USAGE_BESOIN2_SHA256,
  FICHES_USAGE_BESOIN2_V1,
  structureSignee as fichesUsageSignees,
  type ClaimEpingle,
  type StructureFichesUsage,
} from '@/lib/fiches-usage/ficheUsageBesoin2V1';
import { BESOINS } from '@/lib/fiches-usage/vocabulaire';
import {
  estIdentifiantOption,
  INFORMATION_MANQUANTE,
  lireRenvoi,
  RUBRIQUES_INFORMATION_MANQUANTE,
  RUBRIQUES_OPTION,
  type RubriqueOption,
} from './vocabulaire';

// LA STRUCTURE DE LA BIBLIOTHÈQUE DES OPTIONS DU BESOIN 2 — [[D-480]], BP-17,
// PR 3 du découpage accepté (`20261111-1131-c`).
//
// PREMIÈRE COUCHE DE D-480 §3 : DES RÉFÉRENCES, JAMAIS UN TEXTE. Pour chaque
// option, l'hypothèse à laquelle elle s'accroche, les populations auxquelles
// elle renvoie, et, rubrique par rubrique, les renvois vers ses sources. Le
// dépôt est PUBLIC : aucune valeur ni aucun texte clinique ici — ni produit, ni
// dose, ni durée, ni précaution (garde `aucunePhraseStructureSignee`, BP-01).
// Le texte de chaque rubrique vit en base, saisi à l'atelier par acte daté du
// responsable (seconde couche, tables de la PR 2, atelier de la PR 5).
//
// LIVRÉE VIDE ET NON SIGNÉE. Les contenus sont ceux du responsable, transcrits
// en identifiants et renvois par la file B, puis signés par lui (PR 7, porte
// 23). Une signature ne se pose jamais par l'outil : la déclaration du
// responsable, après lecture du périmètre, précède la recopie de la date et
// des empreintes ([[D-195]] §1-3).
//
// LA CLÉ (§2) : une hypothèse INSCRITE à la structure signée des fiches
// d'usage du besoin 2, et elle seule. Un identifiant réservé et non inscrit
// (`HYP_FER_1`, [[D-477]] §3) ne porte aucune option.
//
// LA POPULATION (§1) : par renvoi au vocabulaire `POP_…` de la structure des
// fiches d'usage, jamais redéfinie ici ([[D-417]] §1, BP-12a).
//
// LES RENVOIS (§4) : un claim `identifiant@version`, une position d'expert
// `WN-PE-NNNN@vN.M`, ou `information_manquante` pour la dose seule. Une
// rubrique sans renvoi n'est pas documentée ; ce que cela emporte (aucune
// option sans précautions, deux tables au contrat de fraîcheur, contrat des
// positions citées) relève des contrôles de la PR 4 (§5), qui s'ajouteront à
// la cohérence ci-dessous.
//
// AUCUN LECTEUR (§8) : aucun parcours, courrier, portail, document remis ni
// appel à un modèle ne lit cette structure, et elle ne lit aucun dossier
// (§5.4). Le banc `importeurs.guard.test.ts` le tient.

/** Une position d'expert épinglée, citée par version ([[D-480]] §5.3). */
export type PositionEpinglee = { positionId: string; version: string };

export type OptionBibliotheque = {
  /** `OPT_…` — opaque, jamais réattribué (`vocabulaire.ts`). */
  id: string;
  /** `HYP_…` — une hypothèse inscrite à la structure des fiches d'usage. */
  hypothese: string;
  /** `POP_…` — au moins une, toutes déclarées par la structure des fiches d'usage. */
  populations: readonly string[];
  /** Les renvois de chacune des neuf rubriques, ni plus ni moins ; une liste vide = non documentée. */
  renvois: Readonly<Record<RubriqueOption, readonly string[]>>;
};

export type StructureBibliotheque = {
  /** Le besoin du guide (1 à 12) : une structure par besoin ([[D-480]] §6). */
  besoin: number;
  options: readonly OptionBibliotheque[];
  /** Les identifiants retirés : ils ne portent plus d'option et ne se réattribuent jamais. */
  optionsRetirees: readonly string[];
};

export const BIBLIOTHEQUE_BESOIN2_V1: StructureBibliotheque = {
  besoin: 2,
  options: [],
  optionsRetirees: [],
};

export type BibliothequeMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  /** Les claims cités, déclarés à la signature : égaux à ceux des renvois. */
  claimsSource: ClaimEpingle[];
  /** Les positions citées, déclarées à la signature : égales à celles des renvois. */
  positionsSource: PositionEpinglee[];
  /**
   * SHA du périmètre relu à la signature. LITTÉRAL FIGÉ, jamais la constante :
   * une structure retouchée change `BIBLIOTHEQUE_BESOIN2_SHA256` et ferme le
   * verrou seule.
   */
  shaPerimetre: string | null;
  /**
   * L'empreinte de la structure des fiches d'usage sur laquelle la
   * bibliothèque a été signée ([[D-480]] §2), recopiée à la signature. Une
   * re-signature des fiches d'usage la rend « à relire », sans la réécrire.
   */
  shaFichesUsage: string | null;
};

export const BIBLIOTHEQUE_BESOIN2_METADATA: BibliothequeMetadata = {
  version: 'bibliotheque-options-besoin2-v1',
  // Non signée : la structure est vide (PR 3). La signature est le geste du
  // responsable, à la PR 7.
  validationExterne: false,
  dateValidation: null,
  claimsSource: [],
  positionsSource: [],
  shaPerimetre: null,
  shaFichesUsage: null,
};

/**
 * L'empreinte de la structure, celle que porte chaque version de texte en base
 * (`structure_sha256`). Elle ne couvre pas les métadonnées : signer ne change
 * pas le contenu.
 */
export const BIBLIOTHEQUE_BESOIN2_SHA256 = sha256(JSON.stringify(BIBLIOTHEQUE_BESOIN2_V1));

const dans = <T>(liste: readonly T[], valeur: unknown): boolean => (liste as readonly unknown[]).includes(valeur);
const doublons = (liste: readonly unknown[]) => new Set(liste).size !== liste.length;

/**
 * Les règles de FORMAT que toute structure doit tenir pour se signer, en codes
 * sans texte (`<option>:<règle>` ou `<option>:<rubrique>:<règle>`). Vide =
 * cohérente. Les contrôles de la PR 4 ([[D-480]] §5) s'y ajouteront.
 */
export function incoherencesDeBibliotheque(
  structure: StructureBibliotheque = BIBLIOTHEQUE_BESOIN2_V1,
  fichesUsage: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
): string[] {
  const anomalies: string[] = [];
  if (!dans(BESOINS, structure.besoin)) anomalies.push('structure:besoin');
  if (doublons(structure.options.map(o => o.id))) anomalies.push('structure:option_en_double');
  if (doublons(structure.optionsRetirees) || structure.optionsRetirees.some(id => !estIdentifiantOption(id))) {
    anomalies.push('structure:options_retirees');
  }
  for (const option of structure.options) {
    const a = (regle: string) => anomalies.push(`${option.id}:${regle}`);
    if (!estIdentifiantOption(option.id)) a('format');
    if (structure.optionsRetirees.includes(option.id)) a('reattribuee');
    if (!fichesUsage.hypotheses.includes(option.hypothese)) a('hypothese');
    if (
      option.populations.length === 0 ||
      doublons(option.populations) ||
      option.populations.some(p => !fichesUsage.populations.includes(p))
    ) {
      a('populations');
    }
    const cles = Object.keys(option.renvois);
    if (cles.length !== RUBRIQUES_OPTION.length || RUBRIQUES_OPTION.some(r => !cles.includes(r))) {
      a('rubriques');
    }
    for (const rubrique of cles) {
      const renvois = (option.renvois as Record<string, readonly string[]>)[rubrique];
      if (!dans(RUBRIQUES_OPTION, rubrique) || !Array.isArray(renvois)) continue;
      const lus = renvois.map(lireRenvoi);
      if (lus.some(r => r === null) || doublons(renvois)) a(`${rubrique}:renvoi`);
      if (renvois.includes(INFORMATION_MANQUANTE)) {
        // Pour la dose seule, et seule : une source citée et « manquante »
        // ensemble se contrediraient.
        if (!RUBRIQUES_INFORMATION_MANQUANTE.includes(rubrique as RubriqueOption) || renvois.length > 1) {
          a(`${rubrique}:information_manquante`);
        }
      }
    }
  }
  return anomalies;
}

/** Calculées une fois : la structure est une constante du module. */
const INCOHERENCES_DU_DEPOT = incoherencesDeBibliotheque();

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` JETTE sur une date invalide, et un
  // verrou doit FERMER, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

const cleClaim = (c: ClaimEpingle) => `${c.claimId}@${c.versionClaim}`;
const clePosition = (p: PositionEpinglee) => `${p.positionId}@${p.version}`;

/** Les claims et positions cités par les renvois, en clés `identifiant@version` triées. */
export function sourcesCitees(structure: StructureBibliotheque = BIBLIOTHEQUE_BESOIN2_V1) {
  const claims = new Set<string>();
  const positions = new Set<string>();
  for (const option of structure.options) {
    for (const renvois of Object.values(option.renvois) as (readonly string[])[]) {
      if (!Array.isArray(renvois)) continue;
      for (const valeur of renvois) {
        const renvoi = lireRenvoi(valeur);
        if (renvoi?.nature === 'claim') claims.add(cleClaim(renvoi));
        if (renvoi?.nature === 'position') positions.add(clePosition(renvoi));
      }
    }
  }
  return { claims: [...claims].sort(), positions: [...positions].sort() };
}

const memes = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * La structure est signée — les cinq termes de [[D-480]] §6, sur le patron des
 * fiches d'usage : verrou posé ; date ISO canonique ; claims ET positions
 * déclarés égaux à ceux que citent les renvois ; périmètre relu égal à
 * l'empreinte calculée ; structure cohérente. Une structure retouchée après
 * signature ne l'est plus ; une structure incohérente ne l'est jamais.
 */
export function bibliothequeSignee(
  metadata: BibliothequeMetadata = BIBLIOTHEQUE_BESOIN2_METADATA,
  empreinte: string = BIBLIOTHEQUE_BESOIN2_SHA256,
  incoherences: readonly string[] = INCOHERENCES_DU_DEPOT,
  structure: StructureBibliotheque = BIBLIOTHEQUE_BESOIN2_V1,
): boolean {
  if (metadata.validationExterne !== true) return false;
  if (!estIsoCanonique(metadata.dateValidation)) return false;
  const cites = sourcesCitees(structure);
  if (!memes([...new Set(metadata.claimsSource.map(cleClaim))].sort(), cites.claims)) return false;
  if (!memes([...new Set(metadata.positionsSource.map(clePosition))].sort(), cites.positions)) return false;
  return metadata.shaPerimetre === empreinte && incoherences.length === 0;
}

export type EtatBibliotheque = 'non_signee' | 'a_relire' | 'signee';

/**
 * L'état de la bibliothèque : `signee` si ses cinq termes tiennent ET si la
 * structure des fiches d'usage est encore signée sur l'empreinte recopiée ;
 * `a_relire` si elle est signée mais que les fiches d'usage ont été
 * re-signées depuis, ou ne le sont plus ([[D-480]] §2) ; sinon `non_signee`.
 */
export function etatBibliotheque(
  signee: boolean = bibliothequeSignee(),
  metadata: BibliothequeMetadata = BIBLIOTHEQUE_BESOIN2_METADATA,
  empreinteFichesUsage: string = FICHES_USAGE_BESOIN2_SHA256,
  fichesUsageSigneesDuJour: boolean = fichesUsageSignees(),
): EtatBibliotheque {
  if (!signee) return 'non_signee';
  if (!fichesUsageSigneesDuJour || metadata.shaFichesUsage !== empreinteFichesUsage) return 'a_relire';
  return 'signee';
}
