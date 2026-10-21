### Constructeur de protocole : la charge suggérée ignore les actions vides (D-339, F76)

- Un emplacement d'action ajouté d'avance et resté vierge ne compte plus dans
  la charge suggérée. « Reprendre cette charge » ne pose donc plus un niveau
  gonflé, qui restait après la suppression des emplacements. Une action sans
  type mais déjà saisie compte toujours. Aucune ligne de barème, aucune
  signature et aucune version enregistrée ne change.
