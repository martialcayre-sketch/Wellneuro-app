// Vocabulaire des noms d'ingrédient du catalogue C4, pour le garde de
// restitution (`D-056`, arbitrage 5).
//
// Le garde `verifierRestitutionOrientation` reste PUR : il reçoit la liste, il
// ne la lit pas. Ce module est le seul point qui la lit, et il la met en cache
// par processus — le catalogue matière compte ~3 400 ingrédients, il ne bouge
// qu'à une ingestion, et une synthèse n'a aucune raison de le relire à chaque
// appel.

import { prisma } from '@/lib/prisma';

let cache: string[] | null = null;

/**
 * Noms français des ingrédients actifs. Le garde n'en fait un écart que
 * lorsqu'ils apparaissent en contexte prescriptif : la liste est un
 * vocabulaire, pas une liste d'interdits.
 *
 * Best-effort assumé : si la lecture échoue, on rend une liste vide plutôt que
 * de faire échouer une synthèse. Un garde muet est un défaut de surveillance,
 * pas un défaut clinique — le déterministe, lui, n'a rien laissé passer.
 */
export async function chargerVocabulaireIngredients(): Promise<string[]> {
  if (cache !== null) return cache;
  try {
    const lignes = await prisma.supplementIngredient.findMany({
      where: { actif: true },
      select: { nomFr: true },
    });
    cache = lignes.map(ligne => ligne.nomFr).filter(nom => nom.trim().length > 0);
  } catch {
    cache = [];
  }
  return cache;
}

/** Réservé aux tests : vide le cache de processus. */
export function reinitialiserVocabulaireIngredients(): void {
  cache = null;
}
