// L'ÉTAT D'UNE VERSION DE FICHE D'ASSIETTE ([[D-251]] §5, lot 6) — pur.
//
// Une version ne porte aucun champ d'état : son état EST son dernier acte
// (`DC-16`, migration M1). « Dernier » au sens d'`ordre`, clé posée par la base
// et unique — jamais au sens de `le`, horodatage figé par transaction et à la
// milliseconde, où deux actes peuvent être ex æquo (constat de revue, #1233).
//
// CE QUI NE SE LIT PAS NE DEVIENT PAS « À VALIDER » (`DC-24`). Un acte d'un
// genre inconnu, ou dont l'empreinte n'est pas celle de sa version, rend l'état
// ILLISIBLE, nommé comme tel — jamais un état plausible par défaut.
//
// `ordre` est un BigInt : il sort en chaîne, exacte, et revient en chaîne comme
// jeton de concurrence. `NextResponse.json` refuserait un BigInt brut.

export const ACTES_FICHE = ['validee', 'retiree'] as const;

/**
 * CHIFFRE TECHNIQUE, PAS UN SEUIL (`DC-20`) : la longueur d'un motif de
 * retrait, contre un dépôt démesuré. Un motif tient en quelques phrases. Il vit
 * ici, module pur, pour que l'écran borne sa saisie à la même valeur que la
 * décision sans importer Prisma.
 */
export const MOTIF_MAX = 2_000;
export type ActeFiche = (typeof ACTES_FICHE)[number];

export function estActeFiche(valeur: string): valeur is ActeFiche {
  return (ACTES_FICHE as readonly string[]).includes(valeur);
}

/** Un acte tel que la base le rend. */
export type ActeLu = {
  ordre: bigint;
  acte: string;
  contenuSha256: string;
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

export type EtatVersion =
  | { etat: 'a_valider' }
  | { etat: 'validee'; ordre: string; le: string; validateur: string }
  | { etat: 'retiree'; ordre: string; le: string; validateur: string; motif: string }
  | { etat: 'illisible'; raison: 'acte_inconnu' | 'empreinte_acte_divergente' | 'retrait_sans_motif' };

/** Le dernier acte au sens d'`ordre`, ou `null` si la version n'en a aucun. */
export function dernierActe<A extends { ordre: bigint }>(actes: readonly A[]): A | null {
  let dernier: A | null = null;
  for (const acte of actes) if (dernier === null || acte.ordre > dernier.ordre) dernier = acte;
  return dernier;
}

/** Le jeton du dernier acte, tel que l'écran le renvoie : `ordre` en chaîne, ou `null`. */
export function jetonDernierActe(actes: readonly { ordre: bigint }[]): string | null {
  return dernierActe(actes)?.ordre.toString() ?? null;
}

export function etatDeLaVersion(version: { contenuSha256: string }, actes: readonly ActeLu[]): EtatVersion {
  const dernier = dernierActe(actes);
  if (dernier === null) return { etat: 'a_valider' };
  if (!estActeFiche(dernier.acte)) return { etat: 'illisible', raison: 'acte_inconnu' };
  // La base l'interdit par trigger ; la lecture le constate plutôt que de le
  // supposer (`DC-24`).
  if (dernier.contenuSha256 !== version.contenuSha256) return { etat: 'illisible', raison: 'empreinte_acte_divergente' };
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

/**
 * La version qui sera servie : la plus récente (au sens du NUMÉRO de version)
 * dont l'état est « validée ». Une version plus ancienne validée après coup ne
 * la remplace pas — la décision refuse d'ailleurs ce geste (`version_depassee`).
 */
export function derniereVersionValidee<V extends { numero: number; etat: EtatVersion }>(versions: readonly V[]): V | null {
  let retenue: V | null = null;
  for (const v of versions) if (v.etat.etat === 'validee' && (retenue === null || v.numero > retenue.numero)) retenue = v;
  return retenue;
}
