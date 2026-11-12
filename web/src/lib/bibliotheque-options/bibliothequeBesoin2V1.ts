import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  FICHES_USAGE_BESOIN2_METADATA,
  FICHES_USAGE_BESOIN2_V1,
  incoherencesDeStructure,
  structureSignee as fichesUsageSignees,
  type ClaimEpingle,
  type FichesUsageMetadata,
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
// rubrique sans renvoi n'est pas documentée. Une option sans précautions
// documentées rend la structure incohérente (§5.1, entré ici sur l'arbitrage
// du 2026-11-12) ; les autres contrôles (deux tables au contrat de fraîcheur,
// contrat des positions citées) relèvent de la PR 4 (§5).
//
// AUCUN LECTEUR (§8) : aucun parcours, courrier, portail, document remis ni
// appel à un modèle ne lit cette structure ; le banc `importeurs.guard.test.ts`
// tient les importeurs ENTRANTS. Qu'elle ne lise aucun dossier (§5.4) est un
// contrôle de la PR 4.
//
// LE PRÉDICAT À CONSOMMER est `etatBibliotheque(...) === 'signee'` : lui seul
// exige aussi que les fiches d'usage soient signées sur l'empreinte recopiée
// (§2). `bibliothequeSignee` juge les cinq termes de la bibliothèque seule.

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
   * re-signature des fiches d'usage la rend « à relire », sans la réécrire :
   * sur leur patron, une re-signature est celle d'une structure modifiée, donc
   * d'une empreinte neuve, et c'est l'empreinte qui se compare (comme le
   * `structure_sha256` des textes et des libellés). Des fiches d'usage qui ne
   * sont plus signées la rendent aussi « à relire ».
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
const CLES_STRUCTURE = ['besoin', 'options', 'optionsRetirees'];
const CLES_OPTION = ['id', 'hypothese', 'populations', 'renvois'];
const memesCles = (objet: object, attendues: readonly string[]) => {
  const cles = Object.keys(objet);
  return cles.length === attendues.length && attendues.every(c => cles.includes(c));
};

/**
 * Les règles de FORMAT que toute structure doit tenir pour se signer, en codes
 * sans texte (`<option>:<règle>` ou `<option>:<rubrique>:<règle>`), plus
 * « aucune option sans précautions » ([[D-480]] §5.1). Vide = cohérente. Les
 * autres contrôles de la PR 4 ([[D-480]] §5) s'y ajouteront.
 */
export function incoherencesDeBibliotheque(
  structure: StructureBibliotheque = BIBLIOTHEQUE_BESOIN2_V1,
  fichesUsage: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
): string[] {
  const anomalies: string[] = [];
  // Ni plus ni moins que les champs du format : une propriété en trop entrerait
  // dans l'empreinte signée sans qu'aucune règle la juge (`wn-reviewer` sur #2006).
  if (!memesCles(structure, CLES_STRUCTURE)) anomalies.push('structure:cles');
  if (!dans(BESOINS, structure.besoin)) anomalies.push('structure:besoin');
  if (doublons(structure.options.map(o => o.id))) anomalies.push('structure:option_en_double');
  if (doublons(structure.optionsRetirees) || structure.optionsRetirees.some(id => !estIdentifiantOption(id))) {
    anomalies.push('structure:options_retirees');
  }
  for (const option of structure.options) {
    const a = (regle: string) => anomalies.push(`${option.id}:${regle}`);
    if (!memesCles(option, CLES_OPTION)) a('cles');
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
      if (!dans(RUBRIQUES_OPTION, rubrique)) continue;
      // Une valeur qui n'est pas une liste (JSON importé, cast) ferme le
      // verrou : elle ne passe jamais pour une rubrique sans renvoi.
      if (!Array.isArray(renvois)) {
        a(`${rubrique}:renvoi`);
        continue;
      }
      // `Array.from` rend chaque case, trous compris (`new Array(1)`), que
      // `map` et `some` sauteraient : une case absente ou qui n'est pas un
      // texte est un renvoi mal formé (revue CodeRabbit de #2006).
      const valeurs: unknown[] = Array.from(renvois);
      if (valeurs.some(v => typeof v !== 'string' || lireRenvoi(v) === null) || doublons(valeurs)) {
        a(`${rubrique}:renvoi`);
      }
      // AUCUNE OPTION SANS PRÉCAUTIONS DOCUMENTÉES ([[D-480]] §5.1, cadrage
      // `:47`, `:260`, DC-38) : une option sans renvoi en précautions rend la
      // structure incohérente, donc non signable. Entré à la PR 3 sur
      // l'arbitrage du responsable du 2026-11-12 (constat de revue de #2006).
      if (rubrique === 'precautions' && renvois.length === 0) a('precautions');
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
 *
 * L'empreinte et la cohérence se CALCULENT ICI, sur la structure jugée : elles
 * ne se passent pas à part, si bien qu'aucun appel ne peut juger une structure
 * avec l'empreinte ou la cohérence d'une autre (revue CodeRabbit de #2006).
 */
export function bibliothequeSignee(
  metadata: BibliothequeMetadata = BIBLIOTHEQUE_BESOIN2_METADATA,
  structure: StructureBibliotheque = BIBLIOTHEQUE_BESOIN2_V1,
  fichesUsage: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
): boolean {
  if (metadata.validationExterne !== true) return false;
  if (!estIsoCanonique(metadata.dateValidation)) return false;
  const cites = sourcesCitees(structure);
  if (!memes([...new Set(metadata.claimsSource.map(cleClaim))].sort(), cites.claims)) return false;
  if (!memes([...new Set(metadata.positionsSource.map(clePosition))].sort(), cites.positions)) return false;
  if (metadata.shaPerimetre !== sha256(JSON.stringify(structure))) return false;
  return incoherencesDeBibliotheque(structure, fichesUsage).length === 0;
}

export type EtatBibliotheque = 'non_signee' | 'a_relire' | 'signee';

/**
 * L'état de la bibliothèque : `signee` si ses cinq termes tiennent ET si la
 * structure des fiches d'usage est encore signée sur l'empreinte recopiée ;
 * `a_relire` si elle est signée mais que l'empreinte des fiches d'usage a
 * changé depuis (re-signature d'une structure modifiée), ou qu'elles ne sont
 * plus signées ([[D-480]] §2) ; sinon `non_signee`.
 *
 * Tout se CALCULE ICI, sur les structures et métadonnées passées : ni la
 * signature de la bibliothèque, ni celle des fiches d'usage, ni leur empreinte
 * ne se passent à part (revue PR-Agent de #2006).
 */
export function etatBibliotheque(
  metadata: BibliothequeMetadata = BIBLIOTHEQUE_BESOIN2_METADATA,
  structure: StructureBibliotheque = BIBLIOTHEQUE_BESOIN2_V1,
  fichesUsage: StructureFichesUsage = FICHES_USAGE_BESOIN2_V1,
  fichesUsageMetadata: FichesUsageMetadata = FICHES_USAGE_BESOIN2_METADATA,
): EtatBibliotheque {
  if (!bibliothequeSignee(metadata, structure, fichesUsage)) return 'non_signee';
  const empreinteFichesUsage = sha256(JSON.stringify(fichesUsage));
  const fichesSignees = fichesUsageSignees(
    fichesUsageMetadata,
    empreinteFichesUsage,
    incoherencesDeStructure(fichesUsage),
    fichesUsage,
  );
  if (!fichesSignees || metadata.shaFichesUsage !== empreinteFichesUsage) return 'a_relire';
  return 'signee';
}
