### Refonte Lien, PAT-3b : signature graphique du hub « Mon parcours » (2026-11-25)

Lot patient ouvert par le responsable le 2026-11-25, après la revalidation écrite du prototype PAT-3 révisé ([[D-481]] §4, complément DOC-21 : « C, 76/88 px, DOC+COM », puis « 52/64 comme dessiné »).

- **Hub patient (U10)** : la carte « Mon parcours » s'ouvre sur le bandeau `quiet-sweep`, bord à bord, 52 px de haut au téléphone et 64 px au bureau. Il est posé par `LienDecor` (emplacement `hub-patient`, COM-2) : hors de l'accessibilité, sans pointeur, absent à l'impression, statique. Aucun texte neuf, aucun chiffre ; le titre reste le premier contenu lisible.
- **Réception** : `e2e/portail-hub-signature.spec.ts` vérifie au téléphone que la première action se lit sans défiler, au-dessus de la barre basse, et la hauteur du bandeau au téléphone et au bureau ; il vérifie aussi que le bandeau est absent de l'arbre d'accessibilité et de l'impression. `MonParcoursAccueil.test.tsx` vérifie la pose en tête de carte.
- **Constat de l'en-tête de U10** laissé ouvert par PAT-7 : `pat7-constat-partiel.md` §6.
