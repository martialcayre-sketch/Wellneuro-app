### Synthèses praticien : un geste qui répond après un changement de patient ne rouvre rien et ne dit rien sous le nouveau (refonte Lien, PRA-6k, 2026-11-21)

- Écran `/dashboard/synthese` (P51). Deux courses de `SynthesePanel`,
  démontrées dans le code, sans occurrence observée (handoff PRA-6c, § 6).
- « Créer le brouillon » (C2 de `wn-reviewer`) : la synthèse créée s'ouvrait
  après la réponse quoi qu'il soit arrivé pendant la requête. Un autre patient
  choisi, le détail de l'ancien paraissait sous « Synthèses de [nouveau] » ;
  une synthèse B ouverte, le brouillon neuf remplaçait B, son édition non
  enregistrée comprise. Il ne s'ouvre plus que si son éditeur est encore
  ouvert, sous le même patient. « Enregistrer le brouillon » et « Vider la
  synthèse » portaient déjà cette garde depuis #2257.
- Retour d'action : « Synthèse générée… », « Synthèse validée. », « Booklet
  envoyé à … » et leurs échecs paraissaient sous le choix du nouveau patient
  si la réponse arrivait après le changement. Ils ne paraissent plus que sous
  le patient du geste — comme le retour déjà affiché, qu'un changement de
  patient efface. Un échec arrivé sous un autre patient ne s'affiche donc
  nulle part ; au retour sur le dossier, la liste dit l'état réel.
- Un échec de création arrivé après l'ouverture d'une autre synthèse paraît
  sous le choix du patient, et non plus dans l'éditeur refermé du brouillon.
- Aucun texte d'interface neuf, ni route, ni garde serveur, ni schéma.
