### Atelier des positions d'expert : iode et sélénium, polyphénols et antioxydants proposés (BP-12b, D-464, 2026-11-09)

- La liste « Dossier de preuve » de l'atelier propose sept dossiers :
  « Iode et sélénium » et « Polyphénols et antioxydants » rejoignent les
  cinq d'origine. La route de versement les accepte et refuse toujours une
  valeur hors liste.
- Arrive après l'application constatée de la migration
  `positions_expert_dossiers_v2` (release-db du 2026-11-09, constat par
  conteneur).
- Bancs : la liste du code recopie, dans son ordre, la contrainte posée par
  la dernière migration (le code peut seulement avoir un dossier de retard,
  pendant la fenêtre de D-464 §5) ; sur base réelle, une version se verse
  dans chacun des deux dossiers, une valeur hors liste est refusée par la
  base, et la liste du code est lue contre la définition du CHECK.
- Aucun texte de position ni de claim au dépôt ; le versement et la
  signature restent un geste du responsable.
