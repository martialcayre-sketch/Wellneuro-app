### Modifié

- **Les conduites cliniques sortent des bandes d'interprétation du scoring**
  (arbitrage du 2026-07-26). Une bande dit *ce que vaut la mesure* ; une
  conduite dit *ce qu'il faut faire*. Les deux cohabitaient dans le même objet,
  si bien que la conduite voyageait partout où voyageait l'interprétation —
  jusque dans le prompt envoyé au modèle de synthèse, qui recevait
  « Consultation pneumologue — polysomnographie recommandée » au même rang
  qu'un résultat de mesure. Elle sort désormais sous une clé `conduite`,
  distincte de `interpretation`.
  Le texte n'a pas changé, les seuils non plus, et **la fiche praticien affiche
  exactement la même phrase** : `buildMiniSynthese` lit la nouvelle clé, et
  garde le repli sur l'ancienne forme pour les réponses déjà enregistrées —
  8 passations de `Q_ALI_01` en base portent `interpretation.protocol` et ne
  sont pas réécrites.
  La séparation se fait en **un seul endroit**, l'entonnoir par lequel passent
  les 17 moteurs de scoring : aucune des 43 bandes du catalogue n'est éditée.
  Deux gardes CI verrouillent le résultat, l'une et l'autre vérifiées en échec :
  aucune interprétation servie ne porte de conduite (balayage des 64
  instruments aux deux bornes), et la liste des 13 instruments qui en servent
  une est figée — un ajout comme une perte se voit en revue.
  **13, et non les 12 que déclare le catalogue** : le questionnaire de Berlin
  (`Q_SOM_03`) construit son interprétation dans le moteur, en dur, et aucune
  inspection des définitions ne pouvait le montrer. Seule l'exécution le révèle.
