### Biologie : la table du contexte de prélèvement est créée (D-497, BP-05, migration)

- Migration seule : une table en ajout seul garde le contexte du
  prélèvement d'un résultat biologique, écrit sur la ligne racine du
  résultat (une correction garde le contexte de sa racine). Sept champs :
  cinq déclarations `oui` / `non` / `inconnu` (à jeun, supplémentation
  arrêtée, traitement susceptible d'interférer, épisode inflammatoire,
  grossesse au prélèvement), le jour du cycle et le délai depuis la
  dernière prise (heure ou jour), chacun avec son état. « Inconnu » est la
  valeur par défaut ; aucun texte libre, aucune catégorie, aucune borne
  haute.
- La base refuse une valeur hors liste, une valeur sans son état ou un état
  sans sa valeur, un jour du cycle inférieur à 1, un délai négatif ou sans
  unité, un résultat d'un autre dossier ou une correction plutôt qu'une
  racine, un autre praticien que celui du dossier, deux contextes en
  vigueur sur un même résultat, toute mise à jour et tout vidage. Un
  contrat SQL l'éprouve forme par forme dans le CI.
- L'effacement d'un dossier vide ces lignes avant les résultats. Aucun
  écran ne les écrit ni ne les lit encore : le code suivra, sous les
  drapeaux existants, après application constatée en production.
