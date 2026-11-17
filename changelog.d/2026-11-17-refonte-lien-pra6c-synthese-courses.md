### Synthèses praticien : une réponse tardive ne s'affiche plus sous une autre synthèse ni sous un autre patient (refonte Lien, PRA-6c, 2026-11-17)

- Écran `/dashboard/synthese` (P51). Deux courses de `SynthesePanel`,
  démontrées dans le code, sans occurrence observée (rapport PRA-6 §3.3,
  routées par la revue `wn-reviewer` de #2224).
- Aperçu du booklet : la réponse n'était pas rattachée à la synthèse
  demandée. Si l'on ouvrait une autre synthèse, ou fermait le détail, avant
  la réponse, le HTML de la première paraissait dans l'aperçu de la seconde.
  On pouvait alors cocher « J'ai relu… » et envoyer un booklet que l'on
  n'avait pas lu. Désormais, chaque prévisualisation prend un numéro : une
  réponse qui n'est pas la dernière, ou dont la synthèse n'est plus ouverte,
  ne pose ni aperçu, ni information d'envoi, ni retour d'erreur.
- Relecture de la liste après une génération, une action ou un envoi : elle
  visait le patient du clic. Si le patient avait changé pendant la requête, la
  liste de l'ancien paraissait sous le titre du nouveau. Elle ne s'applique
  plus que si le patient est encore le courant.
- Envoi : la réponse « mot signalé » d'un envoi de A arrivée pendant qu'on
  prévisualisait B faisait paraître sous B la case « Envoyer tel quel malgré
  le mot … » de A, qui aurait levé la garde du registre de B. Les cases de
  l'aperçu ne bougent plus que pour la synthèse encore ouverte (revue
  `wn-reviewer`).
- Aucun texte d'interface neuf, ni route, ni garde serveur, ni schéma.
