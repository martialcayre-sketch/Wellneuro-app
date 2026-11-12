### Biologie : le praticien note le contexte du prélèvement (D-497, BP-05, code)

- À la saisie d'un bilan et à la validation d'un import, un bloc
  « Contexte du prélèvement » recueille, une fois pour tout le
  prélèvement, à jeun, supplémentation arrêtée, traitement susceptible
  d'interférer, épisode inflammatoire, grossesse au prélèvement (oui, non
  ou inconnu), le jour du cycle et le délai depuis la dernière prise.
  Tout part à « inconnu ». Les déclarations du dossier (sexe, statut
  menstruel, grossesse, traitements en cours) s'affichent à côté, datées,
  en lecture seule : elles ne préremplissent rien.
- Sous chaque point de la série d'un analyte, l'écran dit le contexte, ou
  « Contexte de prélèvement non recueilli » pour une mesure antérieure, et
  si l'heure a été lue sur un compte rendu. La série garde « contexte non
  renseigné » tant qu'un champ est inconnu et ajoute « contextes de
  prélèvement différents » ; elle ne se dit jamais comparable.
- « Vos données personnelles » passe en v23, les conditions d'utilisation
  en v6, avec le gabarit d'e-mail `conditions_utilisation@6`.
- L'effacement d'un dossier supprime les contextes sans tolérance à une
  table absente. Correctif : les lignes de l'import ne se dupliquent plus
  entre les trois listes repliables (clés en collision).
