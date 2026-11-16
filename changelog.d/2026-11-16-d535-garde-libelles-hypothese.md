### Fiches d'usage : la garde des libellés d'hypothèse (D-535, D-477 §2) (2026-11-16)

Le code tient désormais le registre des libellés d'hypothèse. La liste
`registreLibelleHypothese.ts` est fermée : elle reprend les cinq termes de
D-331 §3, la racine « diagnos » et six formulations dictées par le
responsable. La comparaison ignore la casse et les accents, et se fait par
sous-chaîne.

- Au dépôt par l'atelier, un libellé d'hypothèse qui porte un terme de la
  liste est refusé avec l'anomalie `libelle_hors_registre`. L'anomalie nomme
  les termes trouvés, jamais le texte.
- À la validation par acte, le refus `registre` (422) ne pose aucun acte. Le
  retrait n'est pas contrôlé.
- Les populations ne relèvent pas de la liste. Aucun schéma, aucune
  migration, aucun texte n'est touché, ni la structure signée : pas de
  release-db.
- Le seul libellé d'hypothèse en production tombe sous la liste. Le
  responsable le retirera et en fera rédiger un conforme (D-535 §4).
