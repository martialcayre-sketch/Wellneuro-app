### Refonte Lien, PRA-3a décor : motif d'alliance dans l'en-tête de la fiche (2026-11-26)

Lot praticien ouvert par le responsable le 2026-11-26 (« Décor PAT-2 et PRA-3a »), après la validation écrite du prototype de l'en-tête ([[D-481]] §4, question 20261126-2231-d : « A, arcs contre l'identité »).

- **En-tête de la fiche patient (P04)** : les arcs d'alliance (`alliance-arcs`, 106 × 44 px) suivent le nom et l'e-mail du dossier. Ils sont posés par `LienDecor` (emplacement `entete-fiche`, [[D-481]] §1 bis), donc hors de l'accessibilité, sans pointeur, absents à l'impression et statiques. Aucun texte neuf ; le `h1` du nom et la cascade des titres ne changent pas.
- **Sans diminuer l'espace utile** : le motif n'occupe que l'espace libre de la rangée, et une marge négative annule l'écart qu'il ajouterait. Une requête de conteneur l'affiche entier ou pas du tout. Il est visible au téléphone et au bureau large ; à la tablette, où la rangée est pleine, il s'efface. La hauteur de l'en-tête ne change à aucune largeur.
- **Réception** : `e2e/fiche-entete-decor.spec.ts` compare l'en-tête à son témoin à 640, 768, 1024, 1280 et 1440 px et au téléphone. Il vérifie aussi que le motif est absent de l'arbre d'accessibilité et de l'impression. `FichePatientPanel.test.tsx` vérifie la pose.
