import type { CleEntree, EntreeAutresEspaces } from '@/components/patient/autres-espaces/entreesAutresEspaces';

/** Ce qu'allume le menu : l'ancre « Mon parcours », une entrée servie, ou rien. */
export type ElementActif = 'parcours' | CleEntree | null;

// Segments qui allument une autre chose que leur propre entrée ([[D-423]] §4).
const SEGMENTS_PARCOURS = new Set(['questionnaires', 'protocole']);
const SEGMENTS_DOSSIER = new Set(['dossier', 'ce-qui-compte', 'comprehension']);

/**
 * L'élément du menu qui porte `aria-current="page"` pour un chemin
 * ([[D-423]] §4, [[D-442]] §3), choisi sur le PREMIER segment qui suit
 * `/portail/{token}/` : `/fiches/<id>` allume comme `/fiches`, et un préfixe
 * n'est jamais pris pour un autre (`/fiches` n'allume pas `fiches-…`).
 *
 * Un seul élément, et seulement parmi les entrées SERVIES : une page atteinte
 * par son adresse alors que son entrée est fermée n'allume rien.
 */
export function elementActif(segment: string | null, servies: readonly EntreeAutresEspaces[]): ElementActif {
  if (!segment) return null;
  if (SEGMENTS_PARCOURS.has(segment)) return 'parcours';
  const servie = (cle: CleEntree) => servies.some(entree => entree.cle === cle);
  if (SEGMENTS_DOSSIER.has(segment)) return servie('dossier') ? 'dossier' : null;
  // `/fiches` allume l'entrée servie, bibliothèque ou fiches : servie, la
  // bibliothèque remplace le lien des fiches ([[D-360]] §2).
  if (segment === 'fiches') return servie('bibliotheque') ? 'bibliotheque' : servie('fiches') ? 'fiches' : null;
  return servies.find(entree => entree.segment === segment)?.cle ?? null;
}
