// L'ÉTAT DU TEXTE DES FICHES D'USAGE ([[D-314]] §3, §5, §8) — pur.
//
// Ni une version, ni un libellé ne portent de champ d'état : leur état se
// DÉRIVE de leurs actes (`DC-16`). « Dernier acte » au sens d'`ordre`, clé posée
// par la base — jamais au sens de `le` (constat de revue du patron, #1233).
//
// UN ACTE PAR RUBRIQUE (arbitrage 5). Une version est validée quand TOUTES les
// rubriques que la structure attend pour sa fiche le sont — ni plus, ni moins
// de rubriques que la structure n'en attend. Rien ne stocke cette validité.
//
// LE LIEN À LA STRUCTURE (arbitrages 10, 15). Une version ou un libellé dont
// l'empreinte de structure n'est pas celle du jour est « à relire », quels que
// soient ses actes : il rédige une structure qui n'est plus. Seule une version
// neuve, déposée sur la structure du jour, et ses actes le remplacent.
//
// CE QUI NE SE LIT PAS NE DEVIENT PAS « À VALIDER » (`DC-24`). Un acte d'un
// genre inconnu, dont l'empreinte n'est pas celle du texte visé, ou un retrait
// sans motif rendent l'état ILLISIBLE, nommé comme tel. L'illisible l'emporte
// sur tout le reste : un état plausible par défaut serait un mensonge.
//
// Module PUR : les empreintes des textes lui sont données, calculées côté
// serveur (`empreintes.ts`). L'écran l'importe.

import { estActeFicheUsage } from './vocabulaire';

/** Un acte tel que la base le rend. */
export type ActeLu = {
  ordre: bigint;
  acte: string;
  empreinte: string;
  validateur: string;
  relectureIntegrale: boolean;
  motif: string | null;
  le: Date;
};

/** Un acte tel qu'il sort d'une route : `ordre` en chaîne, `le` en ISO. */
export type ActeSerialise = {
  ordre: string;
  acte: string;
  validateur: string;
  relectureIntegrale: boolean;
  motif: string | null;
  le: string;
};

export type RaisonIllisible = 'acte_inconnu' | 'empreinte_acte_divergente' | 'retrait_sans_motif';

/** L'état d'un texte (une rubrique, un libellé) au vu de ses seuls actes. */
export type EtatTexte =
  | { etat: 'a_valider' }
  | { etat: 'validee'; ordre: string; le: string; validateur: string }
  | { etat: 'retiree'; ordre: string; le: string; validateur: string; motif: string }
  | { etat: 'illisible'; raison: RaisonIllisible };

/** Le dernier acte au sens d'`ordre`, ou `null` s'il n'y en a aucun. */
export function dernierActe<A extends { ordre: bigint }>(actes: readonly A[]): A | null {
  let dernier: A | null = null;
  for (const acte of actes) if (dernier === null || acte.ordre > dernier.ordre) dernier = acte;
  return dernier;
}

/** Le jeton du dernier acte, tel que l'écran le renvoie : `ordre` en chaîne, ou `null`. */
export function jetonDernierActe(actes: readonly { ordre: bigint }[]): string | null {
  return dernierActe(actes)?.ordre.toString() ?? null;
}

/** L'état d'un texte dont l'empreinte est `empreinte`, au vu de ses actes. */
export function etatDuTexte(empreinte: string, actes: readonly ActeLu[]): EtatTexte {
  const dernier = dernierActe(actes);
  if (dernier === null) return { etat: 'a_valider' };
  if (!estActeFicheUsage(dernier.acte)) return { etat: 'illisible', raison: 'acte_inconnu' };
  // La base l'interdit par trigger ; la lecture le constate plutôt que de le
  // supposer (`DC-24`).
  if (dernier.empreinte !== empreinte) return { etat: 'illisible', raison: 'empreinte_acte_divergente' };
  const commun = { ordre: dernier.ordre.toString(), le: dernier.le.toISOString(), validateur: dernier.validateur };
  if (dernier.acte === 'validee') return { etat: 'validee', ...commun };
  if (dernier.motif === null || !/\S/u.test(dernier.motif)) return { etat: 'illisible', raison: 'retrait_sans_motif' };
  return { etat: 'retiree', ...commun, motif: dernier.motif };
}

export function serialiserActe(acte: ActeLu): ActeSerialise {
  return {
    ordre: acte.ordre.toString(),
    acte: acte.acte,
    validateur: acte.validateur,
    relectureIntegrale: acte.relectureIntegrale,
    motif: acte.motif,
    le: acte.le.toISOString(),
  };
}

// ─── Une version de fiche ────────────────────────────────────────────────────

/** Une rubrique d'une version : son empreinte (SHA-256 du texte) et ses actes. */
export type RubriqueLue = { rubrique: string; empreinte: string; actes: readonly ActeLu[] };

export type EtatVersionUsage =
  /** Un acte d'une rubrique est illisible : rien d'autre ne se conclut. */
  | { etat: 'illisible'; rubriques: string[] }
  /** La fiche n'est plus (ou pas) dans la structure signée. */
  | { etat: 'hors_structure' }
  /** La version rédige une autre structure que celle du jour (arbitrage 10). */
  | { etat: 'a_relire' }
  /** Les rubriques ne sont pas exactement celles que la structure attend. */
  | { etat: 'non_conforme'; manquantes: string[]; enTrop: string[] }
  /** Au moins une rubrique attendue est retirée. */
  | { etat: 'retiree'; rubriques: string[] }
  /** Des rubriques attendues restent à valider. */
  | { etat: 'a_valider'; validees: number; attendues: number }
  /** Toutes les rubriques attendues sont validées. */
  | { etat: 'validee' };

export type ContexteStructure = {
  /** L'empreinte de la structure du jour. */
  empreinteStructure: string;
  /** Les rubriques que la structure attend pour cette fiche, ou `null` si elle n'y est pas. */
  rubriquesAttendues: readonly string[] | null;
};

/**
 * L'état d'une version : l'illisible d'abord, puis le lien à la structure,
 * puis la conformité des rubriques, puis leurs actes.
 */
export function etatDeLaVersion(
  version: { structureSha256: string; rubriques: readonly RubriqueLue[] },
  contexte: ContexteStructure,
): EtatVersionUsage {
  const etats = version.rubriques.map(r => ({ rubrique: r.rubrique, etat: etatDuTexte(r.empreinte, r.actes) }));
  const illisibles = etats.filter(e => e.etat.etat === 'illisible').map(e => e.rubrique);
  if (illisibles.length > 0) return { etat: 'illisible', rubriques: illisibles };

  if (contexte.rubriquesAttendues === null) return { etat: 'hors_structure' };
  if (version.structureSha256 !== contexte.empreinteStructure) return { etat: 'a_relire' };

  const presentes = new Set(version.rubriques.map(r => r.rubrique));
  const attendues = new Set(contexte.rubriquesAttendues);
  const manquantes = [...attendues].filter(r => !presentes.has(r));
  const enTrop = [...presentes].filter(r => !attendues.has(r));
  if (manquantes.length > 0 || enTrop.length > 0) return { etat: 'non_conforme', manquantes, enTrop };

  const retirees = etats.filter(e => e.etat.etat === 'retiree').map(e => e.rubrique);
  if (retirees.length > 0) return { etat: 'retiree', rubriques: retirees };

  const validees = etats.filter(e => e.etat.etat === 'validee').length;
  if (validees < attendues.size) return { etat: 'a_valider', validees, attendues: attendues.size };
  return { etat: 'validee' };
}

/**
 * La version qui sera lue : la plus récente (au sens du NUMÉRO de version)
 * dont l'état est « validée ». Une version plus ancienne validée après coup ne
 * la remplace pas — la décision refuse d'ailleurs ce geste.
 */
export function derniereVersionValidee<V extends { numero: number; etat: EtatVersionUsage }>(
  versions: readonly V[],
): V | null {
  let retenue: V | null = null;
  for (const v of versions) if (v.etat.etat === 'validee' && (retenue === null || v.numero > retenue.numero)) retenue = v;
  return retenue;
}

// ─── Un libellé du vocabulaire ───────────────────────────────────────────────

export type EtatLibelle =
  | { etat: 'hors_structure' }
  | { etat: 'a_relire' }
  | EtatTexte;

/**
 * L'état d'un libellé : l'illisible d'abord (`DC-24`), puis la présence du
 * terme dans la structure, puis le lien à la structure (arbitrage 15), puis
 * ses actes.
 */
export function etatDuLibelle(
  libelle: { libelleSha256: string; structureSha256: string },
  actes: readonly ActeLu[],
  contexte: { empreinteStructure: string; termeDeclare: boolean },
): EtatLibelle {
  const etat = etatDuTexte(libelle.libelleSha256, actes);
  if (etat.etat === 'illisible') return etat;
  if (!contexte.termeDeclare) return { etat: 'hors_structure' };
  if (libelle.structureSha256 !== contexte.empreinteStructure) return { etat: 'a_relire' };
  return etat;
}
