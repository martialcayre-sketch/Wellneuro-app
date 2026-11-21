### Gardes : les listes jumelles de racines interdites tenues par un banc (autonomie-pieges-restes, partie 9, 2026-11-21)

Une garde de nommage par liste de mots interdits a presque toujours une sœur :
la même interdiction, tenue sur une autre surface. Corriger la liste d'un
fichier ne corrige pas sa voisine. Le piège a déjà mordu : au LOT-03
d'Alliance 6.0-B, la garde du panneau d'objectif portait encore la liste
française seule, quinze jours après la correction de sa jumelle.

- **Nouveau banc `web/src/lib/racinesInterditesJumelles.guard.test.ts`.** Il
  lit dans le texte chaque déclaration `RACINES_INTERDITES` de `web/src`,
  soit quatre fichiers, et vérifie quatre choses :
  - chaque fichier qui en déclare une est inscrit au banc, et
    réciproquement ;
  - chaque liste contient le socle de sa famille, en français et en anglais
    (« mesure ordonnée » ou « certitude ») ;
  - les deux jumelles exactes, moteur de proposition et panneau d'objectif,
    sont égales ;
  - `CLES_INTERDITES`, qui juge les clés du blob par égalité exacte,
    contient les mots entiers du socle.
- **Défaut réel corrigé.** La garde G2 de
  `comprehensionAppendOnly.guard.test.ts` promettait « en français comme en
  anglais », mais sa liste n'avait que des mots français. Elle reçoit `rank`,
  `confidence`, `threshold` et `weight`, et reste verte sur les quatre
  fichiers qu'elle balaye.
- Mutations jouées, chacune rouge puis rétablie :
  - `rank` retiré du panneau ;
  - une racine ajoutée d'un seul côté ;
  - une sœur non inscrite ;
  - `confidence` retiré de `CLES_INTERDITES`.
- **Trous assumés.** Une liste sœur nommée autrement n'est pas recensée. Une
  racine bâtie par calcul n'est pas lue. Le banc ne juge pas qu'un socle
  suffit, seulement qu'il est partout. Rien n'est modifié sous
  `web/src/lib/clinical/` : la garde de `contradictionFinding` y est lue,
  jamais éditée.
