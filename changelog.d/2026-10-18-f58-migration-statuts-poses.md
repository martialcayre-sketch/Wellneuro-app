### Biologie : la table des statuts posés près d'une valeur est créée (D-322, F58, migration)

- Migration seule : une table en ajout seul garde chaque pose et chaque
  retrait d'un statut par le praticien, sur la ligne exacte du résultat. La
  base refuse un statut hors des six de la liste, un autre praticien que
  celui du dossier, une ligne déjà corrigée, une pose qui ne change rien et
  un retrait sans statut. Aucune valeur recopiée, aucun texte libre.
- L'effacement d'un dossier la vide avec les autres tables de biologie.
  Aucun écran ne l'écrit ni ne la lit encore : le code suivra, après
  application constatée en production.
