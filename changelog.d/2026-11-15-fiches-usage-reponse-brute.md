### Fiches d'usage : la réponse illisible du rédacteur est gardée hors dépôt (F05, 2026-11-15)

- **Plus d'échec sans trace** : six fiches avaient échoué sur une
  `SyntaxError`, sans que l'outil garde quoi que ce soit de la réponse du
  modèle. `rediger.mjs` écrit désormais un rapport `…-revue.json`, hors dépôt
  (`~/.wellneuro/corpus/fiches-usage/<fiche>/`, mode 0600). Il est produit
  quand la réponse du rédacteur n'est pas un objet JSON lisible ou n'a pas
  les rubriques attendues. Il contient le texte brut, le code d'arrêt du
  modèle et le nombre de jetons de sortie.
- **Ce qu'affiche le terminal** : `ÉCHEC (reponse_illisible, arrêt <code>)`
  et le chemin du rapport. Il ne cite jamais le texte, et le code d'arrêt
  n'est gardé que s'il a la forme d'un code.
- **Ce qui ne change pas** : la consigne, la structure signée, la
  contre-lecture et la rédaction des libellés. Un nouveau banc dans
  `lib/preparation.test.mjs` porte sur du texte synthétique.
