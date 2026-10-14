### D-298 : l'effectif de masquage des agrégats est de cinq dossiers distincts, partout (F25, 2026-10-14)

- **Documentation seule, aucun code** : la production ne change pas ; aucune
  migration, aucun drapeau, aucun seuil clinique, aucun texte patient.
- `docs/DECISIONS.md` : D-298 chiffre la constante produit de D-266 §14
  (fiche F25, rang 0). Cinq dossiers distincts, jamais cinq cycles (séance
  du 2026-10-12, réponse 3) ; l'effectif reste affiché, répartitions et
  statistiques sont masquées en dessous ; la règle vaut pour les écrans
  praticien et pour les constats écrits dans le dépôt qui décrivent des
  dossiers. Le repère de cabinet servi, qui compte des cycles, se corrige par
  un lot de code (file A, avant y).
- `docs/claude/PLAN_WELLNEURO.md` : F25, H06, H07, H58, file D et §8 (dette
  du repère de cabinet) renvoient à D-298.
- `docs/claude/REGISTRE_FRONTIERES.md` : le repère de cabinet (A6-2) porte la
  précision datée.
