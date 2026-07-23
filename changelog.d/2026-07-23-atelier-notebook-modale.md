### Modifié

- **Atelier corpus — organisation par notebook et voie rapide en modale** :
  l'entrée de la revue est désormais la table des sources groupée par notebook
  (registre sanitaire), avec pour chacune les comptes voie rapide / revue
  individuelle et l'état « revue en cours ». La voie rapide s'ouvre en modale
  plein écran sur une source (fini la saisie manuelle d'identifiant et le
  défilement sous la vue principale) ; Échap interrompt sans conclure, le
  tirage ouvert se reprend. Le filtre notebook s'applique aussi à la file de
  revue individuelle (paramètre `notebook` de l'API claims). Corrigé au
  passage : la modale chargeait la file avec un paramètre ignoré (`sourceId`
  au lieu de `source`), faussant la couverture affichée — le serveur, lui,
  vérifiait déjà juste.
