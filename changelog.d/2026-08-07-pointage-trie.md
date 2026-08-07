### Outillage — `next_action` trié, et la frontière rapporter/réparer écrite

- **10 lignes closes sur 31 quittent `next_action`** pour le fragment de handoff
  du jour, qui est par convention le récit daté et permanent. Le champ passe de
  5 993 à 3 768 caractères (−37 %). Chaque ligne a été vérifiée contre le dépôt
  — PR mergées, `statut` des `CAMPAGNE.md`, fichiers cités — et non sur la foi
  du texte. Aucune perte : la comparaison contre `892a5ff:.wn/state.json`
  montre que les 10 retirées sont toutes dans l'archive.
  Achève ce que le LOT-01 (#575) avait laissé en réserve ; le découpage
  mécanique de #612 avait rendu le champ fusionnable sans rien trier.
- **`wn-etat-reel.mjs` entre dans les « Commandes utiles » de `CLAUDE.md`**, avec
  la frontière que `PROJET_CONTEXTE.md:109` posait déjà et que `CLAUDE.md`
  ignorait : il **rapporte**, `wn-cycle --appliquer` **répare**. Il n'est
  volontairement branché dans aucun skill — un appel coûte un `gh` et un
  balayage de `web/src`. Il n'était pas « sans appelant » comme annoncé la
  veille : c'est un outil à la main, par conception.
- **« `dirty` était toujours faux » corrigé dans les deux commentaires de banc.**
  Dans un texte qui parle d'un booléen nommé `dirty`, « faux » se lit comme la
  valeur, alors que la valeur stockée était toujours `true` — et donc toujours
  inexacte. Retour de la revue Copilot sur #612, publiée après son merge.
  **L'entrée de journal du même jour n'est pas réécrite** : `SESSION_LOG.md` est
  append-only, une entrée datée dit ce qui a été pensé ce jour-là et la
  correction se consigne dans l'entrée suivante. Réserve soulevée par la revue
  Copilot sur la présente PR.
