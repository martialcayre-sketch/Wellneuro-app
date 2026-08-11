### Corrigé

- Le garde de fraîcheur Git **réévalue désormais à chaque tentative d'édition**
  au lieu de figer un verdict au démarrage de la session. Une branche remise à
  niveau en cours de session lève le refus dès l'édition suivante, sans reprise.
  Le garde refusait auparavant sur *absence de preuve* : en cas de divergence,
  de fetch échoué ou de session hors dépôt, aucun marqueur n'était écrit et plus
  rien ne pouvait le réécrire — y compris pour réparer le garde lui-même. Le
  verdict est maintenant porté par l'état Git réel, jamais par l'absence d'un
  fichier.
- L'appartenance d'`origin/main` à `HEAD` est recalculée en local à chaque
  édition ; seul le **fetch réseau** est limité à une tentative toutes les
  15 minutes. Fetch impossible avec une vérification antérieure : mode dégradé
  signalé sur la dernière référence connue. Fetch impossible sans aucune
  vérification aboutie : refus, comme avant. Un refus nomme désormais les deux
  SHA en cause. Le garde ne fait toujours ni pull, ni merge, ni rebase, ni
  checkout.
- Les commandes Git du garde ont désormais un délai de 10 s : un `fetch` qui
  pend faisait tuer le hook avant qu'il n'ait rien émis — donc sans rien
  interdire, et sans même le contrôle local d'appartenance.
- Le garde s'applique aussi à `MultiEdit` et `NotebookEdit`, que le déclencheur
  laissait entrer mais que le hook ignorait, et s'exécute après un `compact`,
  qui manquait au déclencheur `SessionStart`.
