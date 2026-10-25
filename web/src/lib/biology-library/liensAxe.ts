// Liens analyte → axe biologique (F79, [[D-351]]) tels que la fiche analyte du
// rayon biologie les affiche — PRATICIEN SEUL, connaissance documentaire
// globale au cabinet : aucun dossier lu, aucune valeur patient confrontée au
// sens du lien (cette lecture-là n'est fixée par aucune décision, F53).
//
// MODULE PUR : importé par la fiche (`'use client'`), il ne tire ni Prisma ni
// `node:*`.
//
// LE NUL N'EST PAS UNE LETTRE ([[D-351]] §4). `niveau_preuve` nul veut dire
// « non gradé » : le responsable n'a pas noté la preuve. Le type le porte en
// union discriminée, si bien qu'aucun appelant ne peut trier, compter ou
// comparer un nul comme s'il valait A à D — il n'y a pas de lettre à lire.
//
// Les dix codes sont ceux de la liste fermée de [[D-348]] §2, dans son ordre ;
// leurs libellés et ceux des trois sens sont des noms d'affichage, proposés
// puis validés par le responsable le 2026-10-25 — aucun texte de claim n'entre
// ici.

export const LIBELLE_AXE: Record<string, string> = {
  methylation: 'Méthylation',
  inflammation: 'Inflammation',
  stress_oxydant: 'Stress oxydant',
  energie_mitochondriale: 'Énergie mitochondriale',
  regulation_glycemique: 'Régulation glycémique',
  acides_gras_polyinsatures: 'Acides gras polyinsaturés',
  thyreotrope: 'Axe thyréotrope',
  corticotrope: 'Axe corticotrope',
  barriere_intestinale: 'Barrière intestinale',
  microbiote_cerveau: 'Axe microbiote-cerveau',
};

/** Ordre d'affichage : celui de la liste fermée ([[D-348]] §2). */
const ORDRE_AXES = Object.keys(LIBELLE_AXE);

export const LIBELLE_SENS: Record<string, string> = {
  haut_evocateur: 'évocateur quand la valeur est haute',
  bas_evocateur: 'évocateur quand la valeur est basse',
  hors_plage_evocateur: 'évocateur quand la valeur est hors plage',
};

const LETTRES = ['A', 'B', 'C', 'D'] as const;
type Lettre = (typeof LETTRES)[number];

export type NiveauPreuveLien =
  | { statut: 'gradé'; lettre: Lettre }
  | { statut: 'non_gradé' };

export type LienAxe = {
  axe: string;
  sens: string;
  claimId: string;
  versionClaim: string;
  niveauPreuve: NiveauPreuveLien;
};

/** Ligne telle que Prisma la sert (`cible_type = 'axe'`, actifs seuls). */
export type LigneLienAxe = {
  cibleCode: string;
  direction: string;
  claimId: string;
  versionClaim: string;
  niveauPreuve: string | null;
};

function lireNiveau(valeur: string | null): NiveauPreuveLien | null {
  if (valeur === null) return { statut: 'non_gradé' };
  return (LETTRES as readonly string[]).includes(valeur)
    ? { statut: 'gradé', lettre: valeur as Lettre }
    : null;
}

/**
 * Lignes de la base → liens affichables, dans l'ordre de la liste fermée puis
 * du claim. Une ligne hors vocabulaire (axe, sens ou lettre que les CHECK de
 * la base refusent pourtant) est écartée plutôt qu'affichée sous un jeton brut
 * ou une lettre inventée. Le tri ne lit JAMAIS le niveau de preuve.
 */
export function lireLiensAxe(lignes: LigneLienAxe[]): LienAxe[] {
  const liens: LienAxe[] = [];
  for (const ligne of lignes) {
    const niveauPreuve = lireNiveau(ligne.niveauPreuve);
    if (!niveauPreuve || !Object.hasOwn(LIBELLE_AXE, ligne.cibleCode) || !Object.hasOwn(LIBELLE_SENS, ligne.direction)) {
      continue;
    }
    liens.push({
      axe: ligne.cibleCode,
      sens: ligne.direction,
      claimId: ligne.claimId,
      versionClaim: ligne.versionClaim,
      niveauPreuve,
    });
  }
  return liens.sort(
    (a, b) =>
      ORDRE_AXES.indexOf(a.axe) - ORDRE_AXES.indexOf(b.axe) ||
      a.claimId.localeCompare(b.claimId),
  );
}

export function libelleNiveauPreuve(niveau: NiveauPreuveLien): string {
  return niveau.statut === 'gradé' ? niveau.lettre : 'non gradé';
}
