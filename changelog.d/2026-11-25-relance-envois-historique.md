### Relancer : la fiche ne propose que ce que le serveur relancera (D-562 §2, amendement, 2026-11-25)

Suite de la relance des envois échus. Le dialogue « Relancer » de la
fiche-trajectoire listait tous les envois échus, alors que le serveur
écarte ceux qu'un rappel a couverts il y a moins de 3 jours (la cadence).
Question `20261125-1420-d`, tranchée Q1 A et Q2 A.

- **Historique servi à la fiche** : la lecture des envois porte, pour
  chaque envoi attendu, l'instant où un rappel redevient possible
  (`rappelPossibleLe`). La route de relance et cette lecture appellent la
  même fonction sur les mêmes rappels partis : une seule règle.
- **Bouton masqué sous cadence** : une ligne échue encore sous cadence ne
  porte plus « Relancer » et le dialogue ne la nomme plus ; le badge
  « échéance dépassée le … » reste. Aucun texte neuf, aucune migration,
  aucun drapeau. Le Fil n'est pas visé.
