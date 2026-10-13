### BioFlow : le G3 est ouvert — la lecture d'un compte rendu passera par une file durable et un processus de fond (D-282, 2026-10-13)

- **Décision seule, aucun code** : la production ne change pas.
- **Pourquoi** : la lecture tourne aujourd'hui dans le processus web, après la
  réponse. Un redéploiement ou une panne laisse un import « en cours » en base
  (un fantôme) jusqu'au geste suivant ou à la purge horaire.
- **Retenu** : une table de travaux en PostgreSQL, réclamée par `FOR UPDATE
  SKIP LOCKED`, et un processus `worker` au `Procfile`. Même dépôt, même base,
  sans bibliothèque de file : une bibliothèque migrerait son propre schéma hors
  de la `release-db`.
- **Arbitrages du responsable** : reprise automatique une fois après un
  arrêt ; ancien chemin retiré après constat ; travaux terminés purgés à 30
  jours ; fantômes réconciliés en continu, sans rattrapage rétroactif.
- **Suite** : migration (`release-db`), processus de fond sous drapeau éteint,
  mise en service (conteneur ajouté par le responsable), constat et clôture
  (`D-282` §6).
