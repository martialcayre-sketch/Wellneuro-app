### Modifié

- Le pilote de lot applique le palier de validation au diff de la session, pas
  au lot entier : un diff purement documentaire reste à T1 même dans un lot
  classé T2/T3 (constaté au LOT-01 chaîne T0 — T3 complet joué sur la PR #656,
  purement documentaire, que le CI a rejoué). Le palier de la classe redevient
  dû dès que le diff touche du code.
- La revue demandée par le pilote de lot émet un bloc « risques » réutilisable
  par la description de PR, et la préparation de PR distille les constats de
  revue déjà rendus au lieu de relancer un agent sur le même diff — le même
  idiome « si elle n'a pas déjà eu lieu » que la clôture de PR applique à sa
  revue de merge.
- La préparation de PR rappelle les tests déjà exécutés sur le diff courant au
  lieu de les rejouer ; seule une modification du diff depuis le dernier run
  justifie une nouvelle exécution.
