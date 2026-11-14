### Bancs de garde : l'outillage des bancs n'entre pas en production (2026-11-14)

Lot `garde-outillage-bancs` (file C), suites de #2092. Un banc neuf
(`bio-parcours/outillageBancs.guard.test.ts`) prouve que `balayageSources.ts`
et `resolutionImports.ts`, l'outillage des bancs sous `web/src`, ne sont
importés par aucun module de production. Ces deux fichiers lisent le disque,
lancent `git` et chargent `typescript`. Le banc suit la fermeture résolue
depuis tout `web/`, sur le patron du banc de la bibliothèque des options.
Aucun importeur n'est admis. Deux contre-épreuves reportées par #2092
s'ajoutent : `atteintLePaquet` sur un vrai lien `web/node_modules` hors du
dépôt, et la racine conservée d'un asset `@/components` non résolu
(`gamification-patient`). Aucune liste admise n'est modifiée. Ni migration,
ni contenu clinique.
