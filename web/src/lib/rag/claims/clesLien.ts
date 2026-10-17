// LES CLÉS DE LIEN D'UN CLAIM ([[D-320]], amende [[D-312]] §5) — pur.
//
// Deux clés dans la `metadata` du claim : `besoins`, les besoins qu'il sert
// (liste non vide d'entiers de 1 à 12, sans doublon), et `rubrique`, la
// rubrique de la chaîne d'usage où il s'emploie (une des dix des fiches
// d'usage). Elles se posent de la main du praticien, à la signature ou par
// l'acte « étiquetage » — jamais à l'ingestion (validation.ts les refuse).
//
// Le CHECK `rag_claim_decisions_etiquetage_complet` refuse au journal ce que
// ce module refuse ici : la route répond 422 avant tout aller-retour.
//
// Module PUR, sans Prisma : l'atelier l'importe.

import { BESOINS, estRubriqueFicheUsage, type RubriqueFicheUsage } from '@/lib/fiches-usage/vocabulaire';

export type ClesLienClaim = { besoins: number[]; rubrique: RubriqueFicheUsage };

/** Les deux noms de clé, réservés au geste praticien. */
export const CLES_LIEN_CLAIM = ['besoins', 'rubrique'] as const;

function estBesoin(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && (BESOINS as readonly number[]).includes(valeur);
}

/**
 * Lit des clés venues du réseau. `null` si l'une est absente ou hors liste —
 * jamais de correction silencieuse, sauf l'ordre et les doublons des besoins,
 * qui ne changent pas ce qui est dit.
 */
export function lireClesLien(besoins: unknown, rubrique: unknown): ClesLienClaim | null {
  if (!Array.isArray(besoins) || besoins.length === 0 || !besoins.every(estBesoin)) return null;
  if (typeof rubrique !== 'string' || !estRubriqueFicheUsage(rubrique)) return null;
  return { besoins: [...new Set(besoins)].sort((a, b) => a - b), rubrique };
}

/** Les clés que porte déjà un claim, pour l'affichage ; `null` si absentes ou informes. */
export function clesLienDuClaim(metadata: Record<string, unknown>): ClesLienClaim | null {
  return lireClesLien(metadata.besoins, metadata.rubrique);
}
