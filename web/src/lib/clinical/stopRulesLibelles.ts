// Libellés des règles d'arrêt — MODULE FEUILLE, SANS AUCUN IMPORT.
//
// Il existe pour une raison précise, relevée en revue adversariale le
// 2026-08-12 : `OrientationPanel.tsx` est un composant `'use client'`, et
// importer une VALEUR depuis `stopRulesV1.ts` y ferait entrer tout ce que ce
// module charge — `sha256`, donc `crypto`, donc `corpusSyntheseV1` et son
// instantané du référentiel clinique, retenu par l'appel `sha256(...)` en portée
// module. Le bundle client du cockpit aurait embarqué le corpus, et un asset
// `/_next/static/…` n'est derrière aucune authentification. Ni le T1 ni le T2
// n'auraient rougi.
//
// Tous les autres imports de `@/lib/clinical` faits par un composant client sont
// des `import type`, qui disparaissent à la compilation. Celui-ci est le premier
// qui ne pouvait pas l'être : il tient donc dans un module qui n'importe rien.

/**
 * Ce qu'une extinction affiche, partout où elle s'affiche — cockpit et
 * synthèse. Le `motif` de la règle dit ensuite POURQUOI, instrument par
 * instrument.
 */
export const LIBELLE_EXTINCTION =
  'Information suffisante — pas d’exploration supplémentaire actuellement.';
