// LE VOCABULAIRE DES STATUTS DE PANEL — et rien d'autre.
//
// POURQUOI CE MODULE EXISTE, et ce n'est pas un rangement. `PropositionBilanPanel`
// porte `'use client'` et importait `STATUTS_PROPOSES` en VALEUR depuis
// `courrier.ts`, qui le prend de `statuts.ts`, lequel importe `evaluerDeclencheur`
// et `sha256` de la couche clinique. Un import de quatre chaînes de caractères
// tirait donc au paquet du navigateur la table d'orientation ENTIÈRE, ses
// seuils, les identifiants de claims qu'elle cite, et crypto-browserify —
// mesuré sur l'artefact : 20 règles sur 20, 52 identifiants de claims, et les
// bornes de comparaison, dans un fichier `/_next/static/…` de 403 Ko.
//
// CE MODULE N'IMPORTE RIEN, ET C'EST SA SEULE PROPRIÉTÉ UTILE. C'est ce qui en
// fait une FEUILLE au sens de `bundleClient.guard.test.ts` : un client peut y
// puiser une valeur sans rien tirer derrière. Y ajouter un import le sortirait
// de la liste des feuilles — et rouvrirait le trou que ce fichier ferme. Le
// garde le vérifie plutôt que de le déclarer.
//
// LE VOCABULAIRE VOYAGE EN ENTIER, ET LA DOCTRINE D'ORIGINE EST INTACTE.
// `STATUTS_PROPOSES` portait cette phrase dans `statuts.ts` : « Le prédicat vit
// ICI, dans le module qui possède le vocabulaire des statuts ». Déplacer la
// seule constante aurait séparé le prédicat de son vocabulaire — exactement ce
// que cette phrase interdit. C'est donc le TYPE et le PRÉDICAT qui bougent
// ensemble, et `statuts.ts` les ré-exporte : aucun appelant ne change.

export type StatutPanel =
  | 'recommande'
  | 'optionnel'
  | 'conditionnel'
  | 'non_indique_actuellement'
  | 'deja_documente'
  | 'a_repeter';

/**
 * Statuts qui constituent une PROPOSITION : ce qui entre dans le courrier
 * médecin, dans le document patient, et ce sur quoi l'écran offre les deux
 * gestes. Le prédicat vit avec le VOCABULAIRE des statuts — ni dans un
 * générateur ni dans l'autre : un formulaire affiché là où le serveur refusera
 * fait journaliser un accès pour un 409 (revue M5), et deux artefacts qui
 * divergeraient sur ce prédicat diraient au patient et au médecin deux
 * propositions différentes.
 */
export const STATUTS_PROPOSES: ReadonlySet<string> =
  new Set(['recommande', 'a_repeter', 'optionnel', 'conditionnel']);

/**
 * LES LIGNES QUI OUVRENT UNE ATTENTE ([[D-190]] §3, tenue au serveur par
 * [[D-305]] §4) : `recommande`, `a_repeter`, ou `conditionnel` à déclencheur
 * REMPLI — jamais un conditionnel non rempli, jamais un optionnel. Plus étroit
 * que `STATUTS_PROPOSES`, et c'est voulu : proposer un bilan au médecin n'est
 * pas suspendre une action sur lui.
 *
 * Il vit ICI pour la même raison que le prédicat ci-dessus : l'écran qui offre
 * les analytes et la route qui refuse les autres lisent le même — deux copies
 * divergeraient, et l'écran offrirait ce que le serveur refuse.
 */
export function ligneOuvreUneAttente(ligne: {
  statut: StatutPanel;
  declencheurRempli: boolean | null;
}): boolean {
  if (ligne.statut === 'recommande' || ligne.statut === 'a_repeter') return true;
  return ligne.statut === 'conditionnel' && ligne.declencheurRempli === true;
}
